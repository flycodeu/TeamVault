#!/bin/bash
set -e

# ==============================================================================
# TeamVault Linux Server 一键部署与热更新脚本
# 支持 Docker Compose 模式与 PM2 原生 Node.js 模式
# ==============================================================================

echo "========================================================"
echo "🚀 开始执行 TeamVault 更新与部署流程"
echo "========================================================"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# 1. 安全数据备份 (自动备份 SQLite 数据库，防止更新异常)
if [ -f "$APP_DIR/data/teamvault.db" ]; then
  mkdir -p "$APP_DIR/data/backups"
  BACKUP_FILE="$APP_DIR/data/backups/teamvault-$(date +%Y%m%d_%H%M%S).db"
  echo "📦 正在创建数据库安全备份: $BACKUP_FILE ..."
  cp "$APP_DIR/data/teamvault.db" "$BACKUP_FILE"
  echo "✅ 备份成功！"
fi

# 2. 拉取 GitHub 最新版本代码
if [ -d ".git" ]; then
  echo "📥 正在从 GitHub 拉取最新分支代码..."
  git fetch --all
  git reset --hard origin/main || git pull origin main
fi

# 3. 判断部署模式
if command -v docker >/dev/null 2>&1 && [ -f "docker-compose.yml" ]; then
  echo "🐳 检测到 Docker 环境，使用 Docker Compose 进行容器化滚动更新..."
  
  # 确保外部持久化目录与权限就绪
  mkdir -p data/files data/previews data/thumbnails data/temp
  
  echo "🔨 正在构建最新版本镜像..."
  docker compose build --no-cache teamvault
  
  echo "🔄 正在重启并应用新版本容器..."
  docker compose up -d teamvault
  
  echo "🧹 清理废弃镜像缓存..."
  docker image prune -f || true
  
  echo "🎉 [Docker 模式] 部署完成！服务运行于: http://0.0.0.0:3030"

else
  echo "⚙️ 未检测到 Docker，使用 Node.js / PM2 原生模式更新..."
  
  # 安装依赖
  echo "📦 安装并同步项目依赖..."
  npm ci --prefer-offline || npm install
  
  # 执行数据表结构检查/迁移
  echo "🗄️ 执行数据库结构迁移..."
  npm run db:migrate || true
  
  # 编译 Next.js 生产版本
  echo "🏗️ 正在编译 Next.js 生产应用..."
  npm run build
  
  # 如果安装了 PM2，执行无缝热重载
  if command -v pm2 >/dev/null 2>&1; then
    echo "🔄 使用 PM2 执行零停机平滑重载..."
    if pm2 describe teamvault >/dev/null 2>&1; then
      pm2 reload teamvault --update-env
    else
      pm2 start ecosystem.config.cjs
      pm2 save
    fi
  else
    echo "⚠️ 未安装 PM2，请使用 'npm run start' 或安装 pm2 (npm install -g pm2) 管理进程"
  fi
  
  echo "🎉 [原生模式] 部署完成！"
fi

echo "========================================================"
echo "✨ TeamVault 服务已就绪！数据目录 ./data 已安全持久化。"
echo "========================================================"
