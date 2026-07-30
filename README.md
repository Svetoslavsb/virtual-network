# Virtual Testnet

Admin dashboard for managing an Anvil virtual testnet. Fork any EVM chain, manipulate time, impersonate accounts, manage state, and deploy contracts — all from a browser UI.

## Local Development

### Prerequisites

- Node.js 18+
- pnpm
- Docker

### Start the Anvil fork

```bash
cd virtual-testnet
cp .env.example .env   # edit FORK_URL, CHAIN_ID, etc.
docker compose up -d
```

### Start the dashboard

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173. The dashboard connects to Anvil at `http://localhost:8545`.

## Deploy on Railway

Railway runs both the Anvil node and the static dashboard as separate services from the same repo.

### 1. Create a new project on Railway

Link your GitHub repo.

### 2. Add the Anvil service

- Click **New Service** > **GitHub Repo** (same repo)
- Set **Root Directory** to `virtual-testnet`
- Railway auto-detects the Dockerfile
- Add environment variables:
  - `FORK_URL` — your RPC endpoint (e.g. `https://ethereum-rpc.publicnode.com`)
  - `CHAIN_ID` — chain ID (e.g. `1`)
  - `BLOCK_TIME` — `auto` or a number in seconds
  - `PORT` — `8545`
- Attach a **Volume** mounted at `/data` (see [Reliability](#reliability) — without it the chain is wiped on every redeploy)
- Under **Networking**, expose port `8545` (Railway will assign a public URL like `anvil-xxx.up.railway.app`)

> Do **not** set a Railway healthcheck path on this service. Anvil answers `GET /` with HTTP 400 (it is POST-only JSON-RPC), so any healthcheck would fail the deploy.

### 3. Add the Dashboard service

- Click **New Service** > **GitHub Repo** (same repo)
- Set **Root Directory** to `/` (project root)
- Set **Build Command** to `pnpm install && pnpm build`
- Set **Start Command** to `npx serve dist -s -l 3000`
- Under **Networking**, expose port `3000`

### 4. Point the dashboard at the Anvil service

The dashboard defaults to `http://localhost:8545`. On Railway, the Anvil service has a different URL. Set an environment variable on the dashboard service:

- `VITE_RPC_URL` — the internal or public URL of the Anvil service (e.g. `https://anvil-xxx.up.railway.app`)

Then update `src/lib/rpc.ts` to use it:

```ts
const RPC_URL = import.meta.env.VITE_RPC_URL || "http://localhost:8545";
```

This is already handled — just set the env var and redeploy.

### 5. Done

Railway auto-deploys on push to main. Two services:

| Service | Port | Purpose |
|---------|------|---------|
| `anvil` | 8545 | Forked EVM node |
| `dashboard` | 3000 | Admin UI |

## Reliability

A forked Anvil node left running for days will eventually die like this:

```
Message:  pre-execution changes failed: Internal(Other(Database(GetStorage(
  0x0000f90827f1c53a10cb7a02335b175320002935, 2664, error sending request ...
  timed out))))
Location: crates/anvil/src/eth/backend/mem/mod.rs:1324
```

**Why it happens.** `0x0000…2935` is the EIP-2935 history-storage contract. Every
block Anvil writes the parent block hash into its ring buffer, and to do so it
must first read that storage slot — which, on a fork, is a request to your
upstream RPC provider. Foundry unwraps that read in `do_mine_block`, so a single
transient timeout panics and aborts the whole process. At a 12s block time that
is ~300 upstream requests per hour, which is why the node runs fine for hours
and then dies without warning. Nothing you send it causes it; it is a lottery.

**How this repo handles it.** The panic is upstream and can't be fixed from here,
so `entrypoint.sh` makes it survivable instead:

| Mitigation | Effect |
|---|---|
| `--state $STATE_DIR/state.json --state-interval 30` | Chain state is checkpointed to disk. A crash loses at most 30s of history instead of everything. |
| Supervisor restart loop | Anvil is restarted in place with exponential backoff, without cycling the container. |
| Interval mining re-applied on restart | `--load-state` does **not** restore interval mining. Without this the node would come back up and silently never mine again. |
| `--retries 10 --timeout 120000 --fork-retry-backoff 2` | Far more forgiving than Anvil's defaults (5 retries / 45s / no backoff), so fewer blips become fatal. |
| `--no-rate-limit` | Stops Anvil throttling itself to 330 CUPS against a provider that allows more. |
| Cached block-time detection | Avoids two archive lookups against the provider on every restart. |
| `trap TERM` signal forwarding | Railway redeploys shut Anvil down gracefully so the exit-time state dump runs. |

`STATE_DIR` defaults to `/data`, so crash recovery works with no configuration.
Mounting a persistent volume there additionally keeps the chain across
redeploys — otherwise a redeploy re-forks from chain head and you lose every
deployment, snapshot, and balance override.

**Reducing the crash rate further** (optional):

- **Use a paid, reliable `FORK_URL`.** This failure is entirely driven by upstream
  reliability. Free/shared endpoints fail far more often.
- **Set `HARDFORK=shanghai`.** Shanghai predates both EIP-4788 and EIP-2935, so
  no system-contract storage write happens per block and the mining path stops
  touching the upstream RPC altogether. The tradeoff is no blob or Cancun+
  opcode support.
- **Raise `BLOCK_TIME`.** Fewer blocks means proportionally fewer upstream reads.

Note that the per-block fetches self-extinguish over time: the ring buffer holds
8191 slots, so once the node has mined 8191 blocks (~27h at 12s) every slot is
locally owned and the mining path stops hitting the fork provider.

## Features

**Core**
- Chain status (live polling)
- Time manipulation (skip forward, set timestamp)
- Block mining
- Account management (balance, impersonation)
- Snapshots (take / revert)
- Fork management (reset, change RPC/block)
- Contract deployment

**Advanced**
- Node config (interval mining, base fee, coinbase, auto-impersonate, timestamp interval, drop tx)
- State editor (set code, nonce, storage at any address)
- State dump / load (full chain export/import)
- Transaction pool viewer
