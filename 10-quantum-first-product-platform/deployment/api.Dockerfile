FROM node:24.19.0-bookworm-slim AS build

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/control-api/package.json apps/control-api/package.json
COPY apps/portal/package.json apps/portal/package.json
RUN npm ci --no-audit --no-fund

COPY apps/control-api apps/control-api
COPY contracts contracts
RUN npm run build -w control-api

FROM node:24.19.0-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=8080
WORKDIR /workspace

COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/control-api/package.json ./apps/control-api/package.json
COPY --from=build --chown=node:node /workspace/apps/control-api/dist ./apps/control-api/dist
COPY --from=build --chown=node:node /workspace/contracts ./contracts

USER node
EXPOSE 8080
CMD ["node", "apps/control-api/dist/main.js"]

