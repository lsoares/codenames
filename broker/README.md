# Codenames signaling broker

A tiny self-hosted [PeerJS](https://peerjs.com/) server so the game no longer
depends on the public `0.peerjs.com` broker (which rate-limits with HTTP 429).
Signaling only — media/data stay peer-to-peer. NAT traversal is handled by the
TURN servers configured in the client (`src/net/peerMultiplayer.ts`).

The client picks a broker from `VITE_PEER_*` env vars; unset ⇒ public broker.

```
VITE_PEER_HOST=<broker-host>   # e.g. codenames-broker.fly.dev
VITE_PEER_PORT=443
VITE_PEER_PATH=/
VITE_PEER_KEY=peerjs
VITE_PEER_SECURE=true          # wss/https
```

## Run locally

```
npm run broker        # peerjs on :9000 (see root package.json)
```

`.env.local` already points dev at `localhost:9000`.

## Deploy — Fly.io (always-on, no cold start)

```
brew install flyctl && fly auth login
cd broker
fly launch --copy-config --now      # pick a unique app name
```

Then set the GitHub repo **Variables** (Settings → Secrets and variables →
Actions → Variables) so the deployed site uses it:

```
PEER_HOST=<your-app>.fly.dev
PEER_PORT=443
PEER_PATH=/
PEER_KEY=peerjs
PEER_SECURE=true
```

Re-run the Pages deploy (push or "Run workflow").

## Deploy — Google Cloud Run (free tier, cold starts on idle)

```
gcloud run deploy codenames-broker \
  --source broker --allow-unauthenticated --region europe-west1 --port 9000
```

Use the printed URL host for `PEER_HOST` (with `PEER_PORT=443`, `PEER_SECURE=true`).
