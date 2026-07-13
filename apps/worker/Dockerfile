# ---- build ----
FROM node:20-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/frameworks-data/package.json packages/frameworks-data/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
RUN npm ci --ignore-scripts
COPY apps/worker apps/worker
RUN npm run build -w @rr/worker
RUN npm prune --omit=dev

# ---- runtime (distroless, non-root) ----
FROM gcr.io/distroless/nodejs20-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/worker/dist ./dist
COPY --from=build /repo/node_modules ./node_modules
USER 10001
CMD ["dist/index.js"]
