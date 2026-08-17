FROM node:22-bookworm-slim AS dependencies
WORKDIR /app

# better-sqlite3 等原生 Node 模块在没有可用预编译包时会通过 node-gyp 编译。
# 编译工具只保留在 dependencies 阶段，不会进入最终 runner 镜像。
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

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

# FFmpeg：视频自动转码（浏览器不兼容的封装/编码 → H.264/AAC）
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=teamvault:teamvault /app/.next/standalone ./
COPY --from=builder --chown=teamvault:teamvault /app/.next/static ./.next/static
COPY --from=builder --chown=teamvault:teamvault /app/public ./public
COPY --from=builder --chown=teamvault:teamvault /app/drizzle ./drizzle
# docker-migrate.mjs / docker-bootstrap.mjs 以
# /app/migration-node_modules/package.json 为 createRequire 基准；Node 会从其下方的
# node_modules 目录解析迁移依赖，因此保留标准的 node_modules 层级。
COPY --from=dependencies --chown=teamvault:teamvault /app/node_modules ./migration-node_modules/node_modules
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
