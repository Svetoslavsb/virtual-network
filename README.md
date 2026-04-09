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
- Under **Networking**, expose port `8545` (Railway will assign a public URL like `anvil-xxx.up.railway.app`)

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
