# Bloom Exchange · Sovereign Private Node

Run the entire clearing engine inside your own perimeter: the A2A gateway, Shield, the double-blind vault, Sovereign, the signer, the omni-protocol ingestion layer and the `/exchange` terminal, with local Redis and PostgreSQL and **your own Ed25519 root key**. No cloud account and no outbound connection are required.

## 1 · Initialize the node

```bash
npm install
npm run sovereign:init -- --org "Northwind Capital"
```

| Output | Contents |
| --- | --- |
| `deploy/sovereign-node/.env` | The node's secrets: `BLOOM_EXCHANGE_SECRET` (root key), `LICENSE_SIGNING_SECRET` (access keys), `SRH_TOKEN`, `POSTGRES_PASSWORD`. Owner-only, git-ignored. |
| `deploy/sovereign-node/root-key.public.json` | The public half of the root key, its `kid` and its full SHA-256 fingerprint. Share it out of band. |
| `deploy/sovereign-node/keys/operator.key` | An Operator access key signed by this node. It is valid only on this node. |

The node never reads your cloud `.env.local`: it has its own root of trust. Re-running keeps existing secrets. `--rotate` regenerates them, which replaces the root key and invalidates every access key the node issued.

## 2 · Run it

**Docker Compose**

```bash
npm run sovereign:up        # docker compose -f deploy/sovereign-node/docker-compose.yml up -d --build
open http://127.0.0.1:3000/exchange
```

Paste `keys/operator.key` into **Desk → Settings → License**, then switch the terminal to **Sovereign Private Node** to see host hardware, the root fingerprint, the egress posture and the Shield audit ledger with its hash chain re-verified live.

| Service | Role | Network |
| --- | --- | --- |
| `exchange` | The clearing engine (Next.js standalone, non-root, read-only filesystem, all capabilities dropped) | `edge` + `data` |
| `redis` | Persistence: tasks, idempotency, ledger, audit, standing mandate | `data` (internal) |
| `srh` | [serverless-redis-http](https://github.com/hiett/serverless-redis-http): the Upstash-compatible REST gateway the store speaks | `data` (internal) |
| `postgres` | Workspaces and the rest of the Bloom platform (Prisma) | `data` (internal) |
| `migrate` | One-shot `prisma migrate deploy` | `data` (internal) |

The `data` network is `internal`, so the datastores have no route out. The exchange publishes on `BLOOM_BIND:BLOOM_PORT` (`127.0.0.1:3000` by default). Put your TLS reverse proxy in front of it.

**Kubernetes**

```bash
docker build -f deploy/sovereign-node/Dockerfile -t registry.internal.example/bloom/exchange-sovereign:1.0.0 .
docker build -f deploy/sovereign-node/Dockerfile --target build -t registry.internal.example/bloom/exchange-sovereign-migrate:1.0.0 .
# push both, fill k8s/secret.yaml from .env (or your secret manager), set images in k8s/kustomization.yaml
kubectl apply -k deploy/sovereign-node/k8s
```

The manifests set up the following:
- **Namespace:** Pod Security `baseline` is enforced, with `restricted` warnings.
- **Data plane:** Redis, the REST gateway and PostgreSQL as stateful services.
- **Exchange:** two replicas, run as non-root on a read-only filesystem, with a migration init container.
- **Network policies:** default-deny egress (DNS excepted), and data-plane ingress limited to the namespace.

## Air-gapped hosts

Fonts and npm packages are fetched when the image is **built**, never at runtime. Build on a connected machine and carry the image across:

```bash
docker save bloom-exchange-sovereign:1.0.0 bloom-exchange-sovereign-migrate:1.0.0 redis:7.4-alpine pgvector/pgvector:pg17 hiett/serverless-redis-http:latest | gzip > bloom-node.tar.gz
# on the air-gapped host
docker load < bloom-node.tar.gz && npm run sovereign:up
```

With no model provider key and no settlement webhook configured (the defaults), the node makes no outbound connections. Apex runs its deterministic strategy, and every Sovereign invariant, signature and proof is unchanged. The terminal's Sovereign console reports this posture live.

## Trust between organizations

Each node signs with its own root key. Any party holding a node's `root-key.public.json` can verify that node's `BLOOM-XCH` certificates **offline** with `@bloom/exchange-sdk` (`verifyCertificate(cert, [jwk])`), without contacting the node or any cloud. Exchange root-key fingerprints through a channel you already trust, and read the full fingerprint aloud when you do.

Direct node-to-node federation (a sovereign node discovering and clearing against another organization's sovereign node) is on the roadmap. It is not part of this release.
