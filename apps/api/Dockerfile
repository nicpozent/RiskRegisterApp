# ---- build ----
FROM node:22-alpine AS build
WORKDIR /repo
# Manifests first for layer caching + reproducible install from the lockfile.
COPY package.json package-lock.json ./
COPY packages/frameworks-data/package.json packages/frameworks-data/
COPY packages/crypto/package.json packages/crypto/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
# --ignore-scripts: the workspace 'prepare' build runs explicitly below, after
# source is copied (it isn't present yet at install time).
RUN npm ci --ignore-scripts
COPY packages/frameworks-data packages/frameworks-data
COPY packages/crypto packages/crypto
COPY apps/api apps/api
RUN npm run build -w @rr/frameworks-data && npm run build -w @rr/crypto && npm run build -w @rr/api
# Drop dev dependencies from the tree we copy into the runtime image.
RUN npm prune --omit=dev

# ---- runtime (distroless, non-root) ----
FROM gcr.io/distroless/nodejs22-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/node_modules ./node_modules
# npm may resolve workspace deps (e.g. the OpenTelemetry 2.x tree, or majors
# like helmet/jose/pino) into the workspace-local node_modules instead of
# hoisting them to the root. Node resolves requires from dist/ against the
# workspace tree before the root, so merge the whole workspace node_modules on
# top of the root copy to keep the runtime image self-contained regardless of
# how npm hoists. Workspace entries win on overlap, matching Node's resolution
# order; the workspace tree carries no @rr symlinks, so the root ones survive.
COPY --from=build /repo/apps/api/node_modules/ ./node_modules/
COPY --from=build /repo/packages ./packages
USER 10001
EXPOSE 8080
CMD ["dist/index.js"]
