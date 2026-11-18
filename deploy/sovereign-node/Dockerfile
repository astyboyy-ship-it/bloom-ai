# Bloom Exchange · Sovereign Private Node
# Build from the repository root:  docker build -f deploy/sovereign-node/Dockerfile -t bloom-exchange-sovereign:1.0.0 .
# Air-gapped hosts: build on a connected machine (fonts and npm packages are fetched at build time only), then
#   docker save bloom-exchange-sovereign:1.0.0 | gzip > bloom-node.tar.gz   →   docker load < bloom-node.tar.gz
# The running node needs no internet access.

FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- dependencies (postinstall runs `prisma generate`, so the schema must be present) ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ---- build: Next.js standalone server ----
FROM deps AS build
COPY . .
ENV BLOOM_STANDALONE=1
RUN npx next build

# ---- runtime: only the standalone server, static assets and the Prisma schema ----
FROM base AS runtime
ENV NODE_ENV=production \
    BLOOM_SOVEREIGN_NODE=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=4s --start-period=20s --retries=4 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/exchange/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
