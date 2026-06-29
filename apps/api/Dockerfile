# ---- build ----
FROM node:20-alpine AS build
WORKDIR /repo
COPY package*.json ./
COPY packages/frameworks-data/package.json packages/frameworks-data/
COPY apps/api/package.json apps/api/
RUN cd apps/api && npm install
COPY packages/frameworks-data packages/frameworks-data
COPY apps/api apps/api
RUN cd apps/api && npm run build

# ---- runtime (distroless, non-root) ----
FROM gcr.io/distroless/nodejs20-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
USER 10001
EXPOSE 8080
CMD ["dist/index.js"]
