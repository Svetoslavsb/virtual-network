#!/usr/bin/env bash
#
# Supervisor for a long-running forked Anvil node.
#
# Anvil aborts the whole process when an upstream RPC request fails while it is
# producing a block: foundry unwraps the fetch in `do_mine_block`, so a single
# `timed out` from the fork provider panics the node. With interval mining every
# block reads fork state (the EIP-2935 history-storage ring buffer), which is
# ~300 upstream requests an hour - over a few hours one of them is going to fail.
#
# That unwrap can't be fixed from here, so this script does two things instead:
# keeps chain state on disk, and restarts anvil in place when it dies.

set -uo pipefail

FORK_URL=${FORK_URL:?"FORK_URL is required"}
FORK_BLOCK=${FORK_BLOCK:-""}
BLOCK_TIME=${BLOCK_TIME:-12}
PORT=${PORT:-8545}
CHAIN_ID=${CHAIN_ID:-1}
HARDFORK=${HARDFORK:-""}

# Upstream RPC resilience. Deliberately more forgiving than anvil's defaults
# (5 retries / 45s timeout) because a failed fetch is fatal, not just slow.
FORK_RETRIES=${FORK_RETRIES:-10}
FORK_TIMEOUT=${FORK_TIMEOUT:-120000}   # ms
FORK_RETRY_BACKOFF=${FORK_RETRY_BACKOFF:-2}  # seconds
NO_RATE_LIMIT=${NO_RATE_LIMIT:-true}

# Crash survival. Defaults to /data so this works out of the box; mount a
# persistent volume there so state also survives redeploys, not just crashes.
STATE_DIR=${STATE_DIR:-/data}
STATE_INTERVAL=${STATE_INTERVAL:-30}   # seconds between state dumps

BOOT_TIMEOUT=${BOOT_TIMEOUT:-180}      # seconds to wait for anvil to serve RPC
RESTART_DELAY=${RESTART_DELAY:-2}      # seconds between restart attempts
RESTART_DELAY_MAX=${RESTART_DELAY_MAX:-60}

RPC="http://127.0.0.1:$PORT"
BLOCK_TIME_FILE="/tmp/block_time"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

# --- build the anvil command ------------------------------------------------

ANVIL=(anvil
  --host 0.0.0.0
  --port "$PORT"
  --chain-id "$CHAIN_ID"
  --fork-url "$FORK_URL"
  --retries "$FORK_RETRIES"
  --timeout "$FORK_TIMEOUT"
  --fork-retry-backoff "$FORK_RETRY_BACKOFF"
)

[ -n "$FORK_BLOCK" ] && ANVIL+=(--fork-block-number "$FORK_BLOCK")
[ -n "$HARDFORK" ]   && ANVIL+=(--hardfork "$HARDFORK")
[ "$NO_RATE_LIMIT" = "true" ] && ANVIL+=(--no-rate-limit)

if [ -n "$STATE_DIR" ] && mkdir -p "$STATE_DIR" 2>/dev/null && [ -w "$STATE_DIR" ]; then
    # --state is load-on-start + dump-on-exit. A panic aborts before the exit
    # dump runs, so --state-interval is what actually saves us: worst case we
    # lose STATE_INTERVAL seconds of chain history.
    ANVIL+=(--state "$STATE_DIR/state.json" --state-interval "$STATE_INTERVAL")
    BLOCK_TIME_FILE="$STATE_DIR/block_time"
    log "State persistence: $STATE_DIR/state.json (every ${STATE_INTERVAL}s)"
else
    # Never fatal - a node with no state persistence still beats no node.
    log "WARNING: '$STATE_DIR' is not writable. Running without state"
    log "WARNING: persistence - chain state will be lost on every restart."
fi

# --- lifecycle --------------------------------------------------------------

child_pid=""
shutting_down=0

shutdown() {
    shutting_down=1
    if [ -n "$child_pid" ]; then
        log "Shutting down, forwarding SIGTERM to anvil (pid $child_pid)..."
        kill -TERM "$child_pid" 2>/dev/null
        wait "$child_pid" 2>/dev/null
    fi
    exit 0
}
trap shutdown TERM INT

# Wait for the RPC to answer, bailing out early if anvil is already dead.
wait_ready() {
    local waited=0
    while [ "$waited" -lt "$BOOT_TIMEOUT" ]; do
        if ! kill -0 "$child_pid" 2>/dev/null; then
            log "anvil exited during startup"
            return 1
        fi
        if cast block-number --rpc-url "$RPC" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        waited=$((waited + 1))
    done
    log "anvil did not become ready within ${BOOT_TIMEOUT}s"
    return 1
}

# Detect the fork's block time once and cache it - re-detecting on every
# restart costs two extra archive lookups against the upstream provider.
resolve_block_time() {
    if [ "$BLOCK_TIME" != "auto" ]; then
        return
    fi

    if [ -s "$BLOCK_TIME_FILE" ]; then
        BLOCK_TIME=$(cat "$BLOCK_TIME_FILE")
        log "Using cached block time: ${BLOCK_TIME}s"
        return
    fi

    log "Auto-detecting block time..."
    local latest prev latest_ts prev_ts
    latest=$(cast block-number --rpc-url "$RPC" 2>/dev/null)
    prev=$(( latest - 1 ))
    latest_ts=$(cast block "$latest" --field timestamp --rpc-url "$RPC" 2>/dev/null)
    prev_ts=$(cast block "$prev" --field timestamp --rpc-url "$RPC" 2>/dev/null)

    if [ -n "$latest_ts" ] && [ -n "$prev_ts" ] && [ "$latest_ts" -gt "$prev_ts" ]; then
        BLOCK_TIME=$(( latest_ts - prev_ts ))
        log "Detected block time: ${BLOCK_TIME}s"
    else
        BLOCK_TIME=12
        log "Could not detect block time, defaulting to 12s"
    fi
}

# Interval mining is a runtime setting - it is NOT restored by --load-state, so
# it has to be re-applied after every restart or the chain silently stops mining.
configure_node() {
    resolve_block_time
    echo "$BLOCK_TIME" > "$BLOCK_TIME_FILE"

    log "Setting auto-mine interval to ${BLOCK_TIME}s..."
    cast rpc evm_setIntervalMining "$BLOCK_TIME" --rpc-url "$RPC" >/dev/null || {
        log "WARNING: failed to enable interval mining"
        return 1
    }

    # Only pin forward. After loading a state snapshot the chain clock is
    # already near real time, and setNextBlockTimestamp rejects the past.
    local now head_ts
    now=$(date +%s)
    head_ts=$(cast block latest --field timestamp --rpc-url "$RPC" 2>/dev/null)
    if [ -n "$head_ts" ] && [ "$now" -gt "$head_ts" ]; then
        log "Pinning next block timestamp to now..."
        cast rpc evm_setNextBlockTimestamp "$now" --rpc-url "$RPC" >/dev/null || \
            log "WARNING: failed to pin timestamp"
    else
        log "Chain clock is ahead of wall clock, leaving timestamp alone"
    fi
}

# --- supervise --------------------------------------------------------------

attempt=0
delay=$RESTART_DELAY

while :; do
    attempt=$(( attempt + 1 ))
    log "Starting Anvil (attempt $attempt)..."

    "${ANVIL[@]}" &
    child_pid=$!

    if wait_ready; then
        configure_node
        log "Ready on port $PORT"
        delay=$RESTART_DELAY   # healthy boot resets the backoff
    fi

    wait "$child_pid"
    exit_code=$?
    child_pid=""

    [ "$shutting_down" -eq 1 ] && exit 0

    log "Anvil exited (code $exit_code). Restarting in ${delay}s..."
    sleep "$delay"
    delay=$(( delay * 2 ))
    [ "$delay" -gt "$RESTART_DELAY_MAX" ] && delay=$RESTART_DELAY_MAX
done
