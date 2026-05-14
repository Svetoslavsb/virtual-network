#!/bin/bash
  set -euo pipefail

  FORK_URL=${FORK_URL:?"FORK_URL is required"}
  FORK_BLOCK=${FORK_BLOCK:-""}
  BLOCK_TIME=${BLOCK_TIME:-12}
  PORT=${PORT:-8545}
  CHAIN_ID=${CHAIN_ID:-1}
  STATE_DIR=${STATE_DIR:-/data}
  STATE_FILE="$STATE_DIR/anvil-state.json"
  RPC="http://localhost:$PORT"

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
    --prune-history 10000
    --state "$STATE_FILE"
    --state-interval 60
  )

  [ -n "$FORK_BLOCK" ] && CMD+=(--fork-block-number "$FORK_BLOCK")

  echo "Starting Anvil: ${CMD[*]}"
  "${CMD[@]}" &
  ANVIL_PID=$!

  # Fail-fast readiness probe (60s ceiling)
  for i in {1..120}; do
    if cast block-number --rpc-url "$RPC" >/dev/null 2>&1; then
      break
    fi
    if ! kill -0 "$ANVIL_PID" 2>/dev/null; then
      echo "anvil died before becoming ready"; exit 1
    fi
    sleep 0.5
    [ "$i" = "120" ] && { echo "anvil readiness timeout"; exit 1; }
  done

  # Resolve BLOCK_TIME if auto-detection requested
  if [ "$BLOCK_TIME" = "auto" ]; then
    echo "Auto-detecting block time from upstream fork..."
    LATEST_NUM=$(cast block-number --rpc-url "$RPC")
    PREV_NUM=$(( LATEST_NUM - 1 ))
    LATEST_TS=$(cast block "$LATEST_NUM" --field timestamp --rpc-url "$RPC" 2>/dev/null || echo "")
    PREV_TS=$(cast block "$PREV_NUM" --field timestamp --rpc-url "$RPC" 2>/dev/null || echo "")

    if [[ "$LATEST_TS" =~ ^[0-9]+$ && "$PREV_TS" =~ ^[0-9]+$ && "$LATEST_TS" -gt "$PREV_TS" ]]; then
      BLOCK_TIME=$(( LATEST_TS - PREV_TS ))
      echo "Detected block time: ${BLOCK_TIME}s"
    else
      echo "Could not detect block time (latest=$LATEST_TS prev=$PREV_TS), defaulting to 12s"
      BLOCK_TIME=12
    fi
  fi

  # Validate BLOCK_TIME is a non-negative integer before sending to anvil
  if ! [[ "$BLOCK_TIME" =~ ^[0-9]+$ ]]; then
    echo "Invalid BLOCK_TIME='$BLOCK_TIME', defaulting to 12s"
    BLOCK_TIME=12
  fi

  if [ "$BLOCK_TIME" != "0" ]; then
    echo "Setting auto-mine interval to ${BLOCK_TIME}s..."
    cast rpc evm_setIntervalMining "$BLOCK_TIME" --rpc-url "$RPC"
  fi

  trap 'kill -TERM "$ANVIL_PID"; wait "$ANVIL_PID"' TERM INT

  echo "Ready on port $PORT"
  wait "$ANVIL_PID"