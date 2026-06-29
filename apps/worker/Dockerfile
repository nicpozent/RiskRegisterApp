FROM node:20-alpine AS build
WORKDIR /app
COPY apps/worker/package.json ./
RUN npm install
COPY apps/worker .
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER 10001
CMD ["dist/index.js"]
