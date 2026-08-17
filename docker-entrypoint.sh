#!/bin/sh
set -e

echo "==> Starting TeamVault initialization..."

# 1. Run database migrations if migration modules exist.
#    迁移失败时立即退出，避免服务器在残缺 schema 上运行（set -e 会终止脚本）。
if [ -d "/app/drizzle" ]; then
  echo "==> Running database migrations..."
  node scripts/docker-migrate.mjs
fi

# 2. Bootstrap default admin if configured.
#    脚本内部会处理“已存在用户则跳过”的情况；失败时同样终止启动。
if [ -n "$TEAMVAULT_ADMIN_PASSWORD" ]; then
  echo "==> Initializing admin account..."
  node scripts/docker-bootstrap.mjs
fi

echo "==> Starting TeamVault server..."
exec node server.js
