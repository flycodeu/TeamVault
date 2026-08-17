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

打开 `http://localhost:3030`。管理员初始化命令只允许在用户表为空时执行。

## 在线预览

预览采用浏览器端只读方案，不依赖 LibreOffice，也不提供在线编辑：

- PDF：PDF.js 分页与缩放；
- PPTX：浏览器端幻灯片渲染；
- XLS / XLSX / CSV：浏览器端只读工作表；
- DOCX：浏览器端分页排版预览；旧版 DOC 提取正文、页眉页脚等文本进行兼容预览；
- 图片、文本、MP4 / WebM、音频：浏览器原生预览；
- ZIP：只读目录列表。

旧版 `.ppt` 和浏览器不支持的视频编码会明确降级为下载。PPTX 超过 50MB、DOCX 超过 30MB、DOC/表格超过 25MB、ZIP 超过 30MB 时不会强制解析。复杂 PPTX 元素、DOCX 自动分页、旧版 DOC 排版、Excel 图表/宏/打印布局可能与桌面 Office 有差异。

## 环境变量

复制 `.env.example` 为 `.env`，按部署环境配置。`TEAMVAULT_ADMIN_*` 只用于首次初始化管理员；已有用户时不会覆盖，若明确要重置密码，再临时设置 `TEAMVAULT_ADMIN_RESET_PASSWORD=1` 执行一次 `npm run db:bootstrap`。`TEAMVAULT_MASTER_KEY` 必须是 32 字节随机值的 Base64 编码，不能写入数据库或提交到仓库。

## 数据库变更

Schema 变更后生成并执行迁移：

```powershell
npm run db:generate
npm run db:migrate
```

生产环境只执行已提交的迁移，不使用 `db push`。

Docker 容器入口（`docker-entrypoint.sh`）会在启动时自动执行迁移与管理员引导（幂等）：

```powershell
docker compose up -d --build
```

## 验证

```powershell
npm run typecheck
npm run lint
npm run build
```

`npm run build` 会同时把 `.next/static` 和 `public` 复制到 standalone 目录；直接运行 standalone 时请从 `.next/standalone` 启动 `node server.js`。
