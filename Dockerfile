FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TEAMVAULT_DATABASE_PATH=/app/data/teamvault.db
ENV TEAMVAULT_APP_ROOT=/app

RUN groupadd --system --gid 1001 teamvault \
  && useradd --system --uid 1001 --gid teamvault teamvault \
  && mkdir -p /app/data/files /app/data/previews /app/data/thumbnails /app/data/temp \
  && chown -R teamvault:teamvault /app/data

COPY --from=builder --chown=teamvault:teamvault /app/.next/standalone ./
COPY --from=builder --chown=teamvault:teamvault /app/.next/static ./.next/static
COPY --from=builder --chown=teamvault:teamvault /app/public ./public
COPY --from=builder --chown=teamvault:teamvault /app/drizzle ./drizzle
COPY --from=dependencies --chown=teamvault:teamvault /app/node_modules ./migration-node_modules
COPY --from=builder --chown=teamvault:teamvault /app/scripts ./scripts
COPY --from=builder --chown=teamvault:teamvault /app/lib ./lib
COPY --from=builder --chown=teamvault:teamvault /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=teamvault:teamvault /app/package.json ./package.json
COPY --from=builder --chown=teamvault:teamvault /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER teamvault
EXPOSE 3030
ENV PORT=3030
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["./docker-entrypoint.sh"]
