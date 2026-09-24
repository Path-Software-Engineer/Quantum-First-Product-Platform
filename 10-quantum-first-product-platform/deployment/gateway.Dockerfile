FROM node:24.19.0-bookworm-slim AS build

ARG P10_PUBLIC_API_URL=""
ARG P10_PUBLIC_SITE_URL="http://127.0.0.1:3000"
ENV P10_PUBLIC_API_URL=${P10_PUBLIC_API_URL} \
    P10_PUBLIC_SITE_URL=${P10_PUBLIC_SITE_URL}

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/control-api/package.json apps/control-api/package.json
COPY apps/portal/package.json apps/portal/package.json
RUN npm ci --no-audit --no-fund

COPY apps/portal apps/portal
RUN npm run build -w portal

FROM caddy:2.10.2-alpine

COPY deployment/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /workspace/apps/portal/build /srv

EXPOSE 8088

