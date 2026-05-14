#!/bin/bash
  set -euo pipefail

  FORK_URL=${FORK_URL:?"FORK_URL is required"}
  FORK_BLOCK=${FORK_BLOCK:-""}
  BLOCK_TIME=${BLOCK_TIME:-12}
  PORT=${PORT:-8545}
  CHAIN_ID=${CHAIN_ID:-1}
  STATE_DIR=${STATE_DIR:-/data}
  STATE_FILE="$STATE_DIR/anvil-state.json"

  mkdir -p "$STATE_DIR"

  CMD=(
    anvil
    --host 0.0.0.0
    --port "$PORT"
    --chain-id "$CHAIN_ID"
    --fork-url "$FORK_URL"
    --retries 10
    --timeout 30000
    --compute-units-per-second 100
    --prune-history 10000          # keep last 10k blocks in memory
    --state "$STATE_FILE"          # load on boot, dump on shutdown
    --state-interval 60            # also dump every 60s
  )

  [ -n "$FORK_BLOCK" ] && CMD+=(--fork-block-number "$FORK_BLOCK")

  echo "Starting Anvil: ${CMD[*]}"
  "${CMD[@]}" &
  ANVIL_PID=$!

  # Fail-fast readiness probe (60s ceiling)
  for i in {1..120}; do
    if cast block-number --rpc-url "http://localhost:$PORT" 2>/dev/null; then
      break
    fi
    if ! kill -0 "$ANVIL_PID" 2>/dev/null; then
      echo "anvil died before becoming ready"; exit 1
    fi
    sleep 0.5
    [ "$i" = "120" ] && { echo "anvil readiness timeout"; exit 1; }
  done

  if [ "$BLOCK_TIME" != "0" ]; then
    echo "Setting auto-mine interval to ${BLOCK_TIME}s..."
    cast rpc evm_setIntervalMining "$BLOCK_TIME" --rpc-url "http://localhost:$PORT"
  fi

  # Forward SIGTERM so Anvil writes state on shutdown
  trap 'kill -TERM "$ANVIL_PID"; wait "$ANVIL_PID"' TERM INT

  echo "Ready on port $PORT"
  wait "$ANVIL_PID"