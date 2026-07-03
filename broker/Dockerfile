# Self-hosted PeerJS signaling broker (replaces the flaky public 0.peerjs.com).
# Works on any container host that injects $PORT (Cloud Run, Fly.io, Railway…).
FROM node:22-alpine
RUN npm install -g peer@1
ENV PORT=9000
EXPOSE 9000
# PEER_KEY must match the client's VITE_PEER_KEY.
CMD ["sh", "-c", "peerjs --port ${PORT} --key ${PEER_KEY:-peerjs} --path /"]
