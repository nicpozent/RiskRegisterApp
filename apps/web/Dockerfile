FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_ENTRA_TENANT_ID
ARG VITE_ENTRA_SPA_CLIENT_ID
ARG VITE_API_SCOPE
ARG VITE_API_BASE
COPY apps/web/package.json ./
RUN npm install
COPY apps/web .
RUN npm run build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
