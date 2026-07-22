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
# A clean install hoists every dependency to the root node_modules, but a
# version conflict can make npm nest some into the workspace-local tree. Node
# resolves requires from dist/ against the workspace tree first, so flatten any
# such nested deps into the root tree — the runtime image ships only the root
# node_modules, keeping it self-contained however npm hoists. No-op (and the
# workspace dir may not exist) when everything is already hoisted.
RUN cp -a apps/api/node_modules/. node_modules/ 2>/dev/null || true

# ---- runtime (distroless, non-root) ----
FROM gcr.io/distroless/nodejs22-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
# Root node_modules is self-contained: the build stage flattens any
# workspace-nested deps into it before this copy.
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
USER 10001
EXPOSE 8080
CMD ["dist/index.js"]
