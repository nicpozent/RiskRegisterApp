# ---- build ----
FROM node:26-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/frameworks-data/package.json packages/frameworks-data/
COPY packages/crypto/package.json packages/crypto/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
RUN npm ci --ignore-scripts
COPY packages/crypto packages/crypto
COPY apps/worker apps/worker
# @rr/crypto (the shared encryption seam) is compiled first: the worker decrypts
# recipient addresses that are encrypted at rest.
RUN npm run build -w @rr/crypto && npm run build -w @rr/worker
RUN npm prune --omit=dev

# ---- runtime (distroless, non-root) ----
FROM gcr.io/distroless/nodejs20-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/worker/dist ./dist
COPY --from=build /repo/node_modules ./node_modules
# Workspace deps (@rr/crypto) are symlinked from node_modules into packages/.
COPY --from=build /repo/packages ./packages
USER 10001
CMD ["dist/index.js"]
