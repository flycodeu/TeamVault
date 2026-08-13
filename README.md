# TeamVault

轻量级小组资源管理平台。当前完成 M0 + M1：Next.js 单体工程、SQLite/Drizzle、Argon2id 登录、服务端 Session、Dashboard 布局和主题切换。

## 本地运行

要求 Node.js 22。

```powershell
npm install
npm run db:migrate
npm run db:bootstrap

npm run dev
```

打开 `http://localhost:3000`。管理员初始化命令只允许在用户表为空时执行。

## 环境变量

复制 `.env.example` 为 `.env`，按部署环境配置。`TEAMVAULT_ADMIN_*` 只用于首次初始化管理员；已有用户时不会覆盖，若明确要重置密码，再临时设置 `TEAMVAULT_ADMIN_RESET_PASSWORD=1` 执行一次 `npm run db:bootstrap`。`TEAMVAULT_MASTER_KEY` 必须是 32 字节随机值的 Base64 编码，不能写入数据库或提交到仓库。

## 数据库变更

Schema 变更后生成并执行迁移：

```powershell
npm run db:generate
npm run db:migrate
```

生产环境只执行已提交的迁移，不使用 `db push`。

Docker 部署时显式执行迁移，不在应用启动时自动修改 Schema：

```powershell
docker compose run --rm teamvault node scripts/docker-migrate.mjs
docker compose up -d
```

## 验证

```powershell
npm run typecheck
npm run lint
npm run build
```

`npm run build` 会同时把 `.next/static` 和 `public` 复制到 standalone 目录；直接运行 standalone 时请从 `.next/standalone` 启动 `node server.js`。
