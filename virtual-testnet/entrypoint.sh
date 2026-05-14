#!/bin/bash

FORK_URL=${FORK_URL:?"FORK_URL is required"}
FORK_BLOCK=${FORK_BLOCK:-""}
BLOCK_TIME=${BLOCK_TIME:-12}
PORT=${PORT:-8545}
CHAIN_ID=${CHAIN_ID:-1}

CMD="anvil --host 0.0.0.0 --port $PORT --chain-id $CHAIN_ID"

if [ -n "$FORK_URL" ]; then
    CMD="$CMD --fork-url $FORK_URL"
fi

if [ -n "$FORK_BLOCK" ]; then
    CMD="$CMD --fork-block-number $FORK_BLOCK"
fi

echo "Starting Anvil..."
$CMD &

until cast block-number --rpc-url http://localhost:$PORT 2>/dev/null; do
    sleep 0.5
done

if [ "$BLOCK_TIME" = "auto" ]; then
    echo "Auto-detecting block time..."

    LATEST_NUM=$(cast block-number --rpc-url http://localhost:$PORT)
    PREV_NUM=$(( LATEST_NUM - 1 ))

    LATEST_TS=$(cast block $LATEST_NUM --field timestamp --rpc-url http://localhost:$PORT)
    PREV_TS=$(cast block $PREV_NUM --field timestamp --rpc-url http://localhost:$PORT)

    BLOCK_TIME=$(( LATEST_TS - PREV_TS ))

    if [ "$BLOCK_TIME" -le 0 ]; then
        echo "Could not detect block time, defaulting to 12s"
        BLOCK_TIME=12
    fi

    echo "Detected block time: ${BLOCK_TIME}s"
fi

echo $BLOCK_TIME > /tmp/block_time

# Enable auto-mining with detected block time
echo "Setting auto-mine interval to ${BLOCK_TIME}s..."
cast rpc evm_setIntervalMining $BLOCK_TIME --rpc-url http://localhost:$PORT

echo "Pinning timestamp to now..."
cast rpc evm_setNextBlockTimestamp $(date +%s) --rpc-url http://localhost:$PORT

echo "Ready on port $PORT"
wait