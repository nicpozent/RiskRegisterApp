# ---- build ----
FROM node:22-alpine AS build
WORKDIR /repo
ARG VITE_ENTRA_TENANT_ID
ARG VITE_ENTRA_SPA_CLIENT_ID
ARG VITE_API_SCOPE
ARG VITE_API_BASE
ENV VITE_ENTRA_TENANT_ID=$VITE_ENTRA_TENANT_ID \
    VITE_ENTRA_SPA_CLIENT_ID=$VITE_ENTRA_SPA_CLIENT_ID \
    VITE_API_SCOPE=$VITE_API_SCOPE \
    VITE_API_BASE=$VITE_API_BASE
COPY package.json package-lock.json ./
COPY packages/frameworks-data/package.json packages/frameworks-data/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
RUN npm ci --ignore-scripts
COPY apps/web apps/web
RUN npm run build -w @rr/web

# ---- runtime (unprivileged nginx, non-root, listens on 8080) ----
FROM nginxinc/nginx-unprivileged:1.31-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
# Base image already runs as non-root uid 101; make it explicit (Trivy DS-0002).
USER 101
EXPOSE 8080
