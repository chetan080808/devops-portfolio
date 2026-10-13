# syntax=docker/dockerfile:1.7
# Multi-stage build for the Next.js standalone server.
#   deps    → npm ci (cached unless package*.json changes)
#   builder → next build (output: "standalone")
#   runner  → only the traced server + static assets, non-root, no package manager

ARG NODE_IMAGE=node:24.21.0-alpine3.24

# ---------- 1. dependencies ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# libc6-compat: some prebuilt native binaries (e.g. SWC) expect glibc symbols on Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---------- 2. build ----------
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build metadata (CI passes real values; local builds keep the defaults).
# CI_RUN_ID / CI_RUN_NUMBER: the GitHub Actions run, shown in the footer (empty = local build).
ARG GIT_SHA=""
ARG BUILD_TIME=""
ARG CI_RUN_ID=""
ARG CI_RUN_NUMBER=""
ENV GIT_SHA=${GIT_SHA} \
    BUILD_TIME=${BUILD_TIME} \
    CI_RUN_ID=${CI_RUN_ID} \
    CI_RUN_NUMBER=${CI_RUN_NUMBER} \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 3. runtime ----------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The server never installs anything: drop npm/npx/yarn so a shell in the pod can't install
# packages and scanners don't flag CVEs in their bundled deps (bytes stay in the base layer).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/bin/corepack /usr/local/lib/node_modules/corepack /opt/yarn* /usr/local/bin/yarn*

# Standalone server + its traced node_modules, then the assets server.js serves itself.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# OG card artwork: read at build, and again if the OG route revalidates (30 d) at runtime.
COPY --from=builder --chown=node:node /app/src/app/og ./src/app/og

ARG GIT_SHA=""
ARG BUILD_TIME=""
ARG CI_RUN_ID=""
ARG CI_RUN_NUMBER=""
# Same build metadata at runtime, for /api/build-info.
ENV GIT_SHA=${GIT_SHA} \
    BUILD_TIME=${BUILD_TIME} \
    CI_RUN_ID=${CI_RUN_ID} \
    CI_RUN_NUMBER=${CI_RUN_NUMBER}
LABEL org.opencontainers.image.title="devops-portfolio" \
      org.opencontainers.image.source="https://github.com/chetan080808/devops-portfolio" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.created="${BUILD_TIME}"

# The image's built-in unprivileged user (uid 1000). .next/cache must stay writable (ISR / OG).
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/healthz >/dev/null || exit 1

# exec form: node is PID 1 and receives SIGTERM directly (graceful shutdown on pod termination).
CMD ["node", "server.js"]
