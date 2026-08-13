# TeamVault Codex 开发提示词与接口规范

## 一、Codex 开发总提示词

你正在开发一个轻量级小组资源管理平台 **TeamVault**。

### 1. 项目目标

TeamVault 用于小组内部统一管理：

- 网站和系统入口
- URL / IP / Port / 描述
- 一个资源对应多个账号凭据
- Password / API Key / Token 等敏感信息
- PDF / PPT / DOC / XLS / 图片 / Markdown / 普通文件
- 在线预览
- 用户和小组权限
- 内部资源共享
- 外部临时分享链接
- 操作审计
- 数据备份与迁移

项目规模较小，主要供几人到几十人的内部小组使用。

核心原则：

> 简单、轻量、美观、安全、可维护、可迁移。

禁止为了“架构完整”增加无实际价值的层级和抽象。

---

## 2. 技术栈

严格使用：

```text
Next.js App Router
React
TypeScript

shadcn/ui
Tailwind CSS
Lucide React

SQLite
Drizzle ORM

Server Session
HttpOnly Cookie

Argon2id
AES-256-GCM

本地文件系统
Sharp
PDF.js
LibreOffice Headless

Docker
```

禁止引入：

```text
Redis
MinIO
MySQL
PostgreSQL
RabbitMQ
Kafka
Elasticsearch

NestJS
Express
Fastify
Hono

独立 Backend
独立 REST Server

Redux
MobX

Prisma
TypeORM
Sequelize

微服务
DDD 复杂分层
Repository Pattern
Generic Repository
DTO 大量映射
Event Bus
CQRS
GraphQL
```

除非后续明确要求，否则不得增加这些依赖。

---

## 3. 项目架构原则

项目必须保持：

```text
一个仓库
一个 Next.js 应用
一个 Node.js 进程
一个 SQLite
一个 data 目录
```

主要数据流：

```text
React Server Component
        ↓
     Drizzle
        ↓
     SQLite
```

修改操作：

```text
React Form
    ↓
Server Action
    ↓
权限检查
    ↓
Zod 校验
    ↓
Drizzle
```

只有以下场景允许使用 Route Handler：

```text
文件上传
文件流读取
文件下载
图片/缩略图
PDF预览
外部分享资源访问
必须提供独立HTTP响应的功能
```

普通 CRUD 不允许为了形式增加 REST API。

---

## 4. 目录规范

保持目录清晰：

```text
app/
├── (auth)/
│   └── login/
│
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── resources/
│   ├── files/
│   ├── credentials/
│   ├── favorites/
│   ├── groups/
│   ├── users/
│   ├── audit/
│   └── settings/
│
├── s/
│   └── [token]/
│
└── api/
    └── files/

components/
├── ui/
├── layout/
├── resource/
├── credential/
├── file/
└── permission/

lib/
├── auth/
├── db/
├── crypto/
├── permission/
├── storage/
├── preview/
├── share/
└── audit/

drizzle/

data/
├── files/
├── previews/
├── thumbnails/
└── temp/
```

不要继续无意义增加：

```text
controllers/
services/
repositories/
managers/
providers/
facades/
adapters/
usecases/
domain/
infrastructure/
```

只有当代码确实复杂到必须拆分时才拆。

---

## 5. 代码风格

代码必须：

```text
简洁
直接
可读
类型明确
低耦合
低重复
```

禁止：

- 无意义封装
- 单行函数再套一层函数
- 一个函数只调用另一个函数却没有额外逻辑
- 为未来可能不存在的需求提前抽象
- 大量 interface + implementation
- 同一个字段在多个 DTO 中重复声明
- 重复格式化函数
- 重复权限判断
- 重复数据库查询
- 无意义的 try/catch
- catch 后仅重新 throw
- 大量注释解释显而易见的代码
- 自动生成风格的冗长注释
- Java 风格层层 Service / Repository
- 超长 JSX 文件

优先：

```ts
const resource = await db.query.resources.findFirst(...)
```

而不是：

```text
ResourceController
  -> ResourceService
    -> ResourceManager
      -> ResourceRepository
        -> BaseRepository
          -> DatabaseProvider
```

---

## 6. TypeScript 规范

禁止使用：

```ts
any
```

除非第三方库确实无法提供类型且有明确说明。

优先：

```ts
type
```

简单对象不要无意义创建 interface。

例如：

```ts
type ResourceType =
  | "WEBSITE"
  | "SERVER"
  | "DATABASE"
  | "DEVICE"
  | "DOCUMENT"
  | "SOFTWARE"
  | "API"
  | "OTHER"
```

数据库类型优先从 Drizzle 推导：

```ts
type Resource = typeof resources.$inferSelect
type NewResource = typeof resources.$inferInsert
```

禁止重复手写一份完全相同的数据库实体类型。

---

## 7. 数据校验

统一使用：

```text
Zod
```

Schema 与 Server Action / Route Handler 尽量复用。

例如：

```ts
export const resourceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: resourceTypeSchema,
  url: z.string().trim().optional(),
  ip: z.string().trim().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  description: z.string().trim().max(2000).optional(),
})
```

禁止在多个地方重复：

```ts
if (!name)
if (name.length > 100)
```

---

## 8. Server Action 返回规范

所有业务 Server Action 使用统一结果：

```ts
export type ActionResult<T = void> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
    }
```

不要设计：

```text
ResponseDTO
BaseResponse
ResultWrapper
ApiResult
ApiResponse
ResponseResult
```

多个意义重复的包装类型。

只保留一个：

```ts
ActionResult<T>
```

---

## 9. Route Handler 响应规范

JSON 接口统一：

成功：

```json
{
  "success": true,
  "data": {}
}
```

失败：

```json
{
  "success": false,
  "error": "无权访问该资源"
}
```

HTTP 状态码正确使用：

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
413 Payload Too Large
500 Internal Server Error
```

文件流接口不需要套 JSON。

---

## 10. Resource 核心模型

Resource 是系统核心对象。

一个 Resource 可以包含：

```text
基本信息
URL
IP
Port
Description

多个 Credential
多个 File
多个 Tag

权限
分享
审计记录
```

Resource 类型：

```text
WEBSITE
SERVER
DATABASE
DEVICE
DOCUMENT
SOFTWARE
API
OTHER
```

Visibility：

```text
TEAM
GROUP
PRIVATE
PUBLIC
```

Sensitivity：

```text
NORMAL
INTERNAL
CONFIDENTIAL
SECRET
```

`visibility` 和 `sensitivity` 是两个独立概念。

---

## 11. Credential 设计

Credential 支持：

```text
PASSWORD
API_KEY
TOKEN
SSH
DATABASE
ACCESS_KEY
TOTP
OTHER
```

字段保持简单：

```text
id
resourceId
name
type
username
secretCipher
extraCipher
description
createdBy
createdAt
updatedAt
```

不要给不同 Credential 类型分别建表。

---

## 12. 密码安全规范

用户登录密码：

```text
Argon2id
```

只能 Hash，不能解密。

资源 Credential：

```text
AES-256-GCM
```

Master Key：

```text
TEAMVAULT_MASTER_KEY
```

来源：

```text
环境变量
```

禁止：

- 将 Master Key 保存 SQLite
- 将明文密码写日志
- 将明文 Secret 写 audit
- 将 Secret 放 URL Query
- 将 Secret 返回给没有 VIEW_SECRET 权限的用户

AES 数据必须包含：

```text
version
iv
authTag
ciphertext
```

加密和解密逻辑只允许存在于：

```text
lib/crypto/
```

禁止业务代码重复实现 crypto。

---

## 13. 权限规范

全局角色只有：

```text
ADMIN
MEMBER
```

资源权限只有：

```text
VIEW
VIEW_SECRET
VIEW_FILE
DOWNLOAD
EDIT
SHARE
```

统一由：

```text
lib/permission/
```

负责。

提供少量明确函数：

```ts
canViewResource()
canViewSecret()
canViewFile()
canDownloadFile()
canEditResource()
canShareResource()
```

需要强制权限时：

```ts
requireResourcePermission()
```

禁止在页面、Server Action、Route Handler 中各写一套：

```ts
if (user.admin || owner || group...)
```

权限判断必须集中。

---

## 14. 权限优先级

统一：

```text
ADMIN
 ↓
OWNER
 ↓
USER Permission
 ↓
GROUP Permission
 ↓
Resource Visibility
```

不要在不同功能中改变顺序。

---

## 15. 文件存储规范

不使用 MinIO。

所有文件存储：

```text
/data/files
```

数据库只保存 Metadata。

上传文件不得使用用户原始文件名作为实际磁盘路径。

实际文件名使用：

```text
UUID
```

例如：

```text
/data/files/2026/08/13/
  550e8400-e29b-41d4-a716-446655440000.pdf
```

数据库保存：

```text
originalName
storageName
storagePath
mimeType
extension
size
sha256
```

禁止通过用户提交的 path 直接访问文件系统。

---

## 16. 文件接口规范

统一使用资源 ID，不向前端暴露真实磁盘路径。

允许：

```text
GET /api/files/:id/content
GET /api/files/:id/download
GET /api/files/:id/thumbnail
GET /api/files/:id/preview
```

禁止：

```text
GET /files/2026/08/xxx.pdf
```

每个接口必须：

```text
获取 Session
↓
查询 File
↓
查询 Resource
↓
检查权限
↓
返回文件
```

外部分享访问走独立 Share 权限逻辑。

---

## 17. 文件上传安全

上传必须：

1. 检查登录状态
2. 检查权限
3. 检查文件大小
4. 检查扩展名
5. 检查 MIME
6. 生成 UUID
7. 写入 temp
8. 计算 SHA256
9. 原子 rename
10. 创建数据库记录

禁止：

```text
直接使用 originalName 保存
允许 ../
根据前端 MIME 完全信任文件类型
```

---

## 18. 在线预览

图片：

```text
PNG
JPEG
WebP
GIF
```

直接预览。

缩略图：

```text
Sharp
```

PDF：

```text
PDF.js
```

文本：

```text
TXT
MD
JSON
XML
YAML
SQL
LOG
CSV
```

使用轻量只读查看器，必要时 Monaco。

Office：

```text
DOC
DOCX
PPT
PPTX
XLS
XLSX
```

使用：

```text
LibreOffice Headless
```

转换为 PDF：

```text
Office
  ↓
LibreOffice
  ↓
Preview PDF
  ↓
PDF.js
```

禁止引入 OnlyOffice。

---

## 19. Preview Job

不要 Redis。

SQLite：

```text
preview_job
```

状态：

```text
PENDING
PROCESSING
SUCCESS
FAILED
```

应用内部 Worker 处理。

必须防止：

```text
同一个任务重复处理
应用重启后 PROCESSING 永久卡死
```

启动时可以恢复异常任务。

实现保持简单。

---

## 20. 分享规范

支持：

```text
RESOURCE
FILE
```

URL：

```text
/s/:token
```

Token：

```text
至少 256 bit 随机值
```

数据库不得保存明文 Token，只保存：

```text
SHA-256(token)
```

支持：

```text
过期时间
访问密码
允许预览
允许下载
最大访问次数
撤销
```

访问密码使用 Password Hash，不可逆。

---

## 21. 分享安全

以下规则强制：

```text
SECRET
```

资源禁止匿名分享。

Credential：

```text
永远禁止进入匿名分享
```

外部页面不能显示：

```text
Username
Password
API Key
Token
Secret
```

即使创建分享的用户有 VIEW_SECRET，也禁止。

---

## 22. Session 规范

使用传统 Session Cookie。

不要 JWT。

Cookie：

```text
HttpOnly
Secure（生产）
SameSite=Lax
Path=/
```

Session 应支持：

```text
登录
退出
过期
管理员强制失效
```

禁止：

```text
Access Token
Refresh Token
JWT Blacklist
```

---

## 23. Audit 规范

统一：

```text
lib/audit/
```

记录：

```text
LOGIN
LOGOUT

RESOURCE_CREATE
RESOURCE_EDIT
RESOURCE_DELETE

SECRET_VIEW
SECRET_COPY

FILE_UPLOAD
FILE_PREVIEW
FILE_DOWNLOAD
FILE_DELETE

SHARE_CREATE
SHARE_REVOKE

PERMISSION_CHANGE
```

Audit 不允许因为记录失败而导致主要业务完全不可使用，但需要记录错误日志。

永远禁止记录：

```text
Password
Secret
Token
API Key
Encryption Key
```

---

## 24. 数据库规范

SQLite 配置：

```text
WAL
foreign_keys = ON
busy_timeout
```

使用 Drizzle Migration。

禁止：

```text
运行时自动修改数据库结构
生产环境 db push
启动时自动 drop/create
```

Schema 变更必须产生 Migration。

---

## 25. UI 设计要求

风格参考：

```text
Vercel
Linear
Notion
GitHub
```

不要做成：

```text
传统 ERP
若依
Ant Design Pro
密集表格后台
```

设计原则：

```text
简洁
大量留白
轻边框
少量阴影
8~12px 圆角
统一颜色
统一 Lucide Icon
浅色/深色
响应式
```

核心页面：

```text
Dashboard
Resource Cards
Resource Detail
Files
Credentials
Groups
Users
Audit
Settings
Share Page
```

资源列表默认优先卡片布局，而不是 DataTable。

---

## 26. React 规范

默认：

```text
Server Component
```

只有必须使用浏览器状态或事件时才：

```ts
"use client"
```

例如这些可以 Client：

```text
Dialog
Dropdown
CopyButton
CredentialReveal
FileUploader
PermissionEditor
ThemeToggle
```

禁止：

```text
整个 page.tsx 都 use client
整个 layout.tsx 都 use client
为了简单全部客户端请求
```

---

## 27. React 组件规范

组件只在以下条件拆分：

1. 会重复使用
2. 逻辑明显独立
3. 文件已经明显过长
4. Client / Server 边界需要拆分

禁止创建大量：

```text
ResourceHeaderWrapper
ResourceHeaderContainer
ResourceHeaderContent
ResourceHeaderActionsWrapper
```

应保持：

```text
ResourceHeader
ResourceCard
ResourceForm
CredentialCard
FileList
```

这种粒度。

---

## 28. 函数规范

函数：

- 尽量单一职责
- 命名直接
- 不做多余抽象
- 优先早返回
- 避免深层 if
- 避免超过 3 层嵌套

推荐：

```ts
if (!user) {
  redirect("/login")
}

if (!resource) {
  notFound()
}

await requireResourcePermission(...)
```

不要：

```ts
if (user) {
  if (resource) {
    if (permission) {
      ...
    }
  }
}
```

---

## 29. 错误处理

只有能实际处理异常时才 catch。

禁止：

```ts
try {
  return await createResource()
} catch (error) {
  throw error
}
```

Server Action 可以统一：

```ts
try {
  ...
  return {
    success: true,
    data,
  }
} catch (error) {
  return {
    success: false,
    error: getErrorMessage(error),
  }
}
```

但不要每一个内部函数继续重复 catch。

---

## 30. 日志规范

只记录必要日志：

```text
ERROR
WARN
关键 INFO
```

禁止产生大量：

```text
Entering function...
Calling database...
Database returned...
Leaving function...
```

这种无意义日志。

生产日志不得包含 Secret。

---

## 31. 注释规范

代码本身应具有可读性。

只对以下情况写注释：

- 安全原因
- 非直观业务规则
- 特殊兼容处理
- 算法逻辑
- 外部系统限制

禁止：

```ts
// 获取用户
const user = ...

// 判断用户是否存在
if (!user) ...
```

这种显而易见的注释。

---

## 32. 命名规范

文件：

```text
resource-card.tsx
resource-form.tsx
credential-card.tsx
permission.ts
crypto.ts
storage.ts
```

React Component：

```text
ResourceCard
ResourceForm
CredentialCard
```

函数：

```text
createResource
updateResource
deleteResource

getResource
listResources

canViewSecret
requireResourcePermission
```

变量：

```text
resource
credential
file
user
group
```

禁止：

```text
resourceDataObj
resourceInfoEntity
resourceVO
resourceDTO
resourceBO
```

---

## 33. 禁止重复

开发任何新功能前：

1. 搜索项目是否已有类似实现
2. 优先复用现有 utility / component / schema
3. 不创建意义相同的新 helper
4. 不复制已有权限判断
5. 不复制 crypto
6. 不复制文件路径逻辑
7. 不复制日期格式化逻辑
8. 不复制 ActionResult

如果发现已有重复代码：

> 优先小范围重构后复用，不继续增加第三份实现。

---

## 34. 不要过度优化

当前用户量：

```text
几人到几十人
```

因此不要提前：

```text
复杂缓存
Redis
分布式锁
消息队列
分库分表
对象存储
CDN
多实例同步
```

只有存在实际性能问题后再处理。

---

## 35. 每次 Codex 任务执行规则

每次只完成指定任务。

在修改前：

1. 阅读已有项目结构
2. 检查相关 Schema
3. 检查已有组件
4. 检查已有 utility
5. 确认最小修改范围

然后实现。

禁止顺手：

- 重写无关模块
- 更新大量依赖
- 修改整个项目代码风格
- 增加未要求的功能
- 增加“未来可能需要”的抽象

完成后执行：

```text
typecheck
lint
build
```

只修复本次修改造成的问题。

---

## 36. 输出要求

完成任务后仅报告：

```text
完成内容
修改文件
数据库变更
验证结果
需要注意的问题
```

不要输出长篇教程。

不要重复描述需求。

不要生成大量无实际意义的总结。

---

## 37. 当前项目最终目标

必须最终完整支持以下链路：

```text
管理员创建用户
      ↓
创建小组
      ↓
创建 Resource
      ↓
填写 URL / IP / Description
      ↓
添加多个 Credential
      ↓
Credential AES 加密
      ↓
上传 PDF
      ↓
上传 PPT
      ↓
生成 PPT Preview
      ↓
配置 Group Permission
      ↓
组员登录
      ↓
查看 Resource
      ↓
按权限查看 Secret
      ↓
记录 Audit
      ↓
生成 File / Resource Share
      ↓
外部密码访问
      ↓
到期自动失效
      ↓
完成完整数据备份
```

整个实现始终遵守：

> **能直接解决问题，就不要增加一层抽象。**

> **能使用 Next.js 自身能力，就不要引入另一个框架。**

> **能使用 SQLite + 本地文件解决，就不要引入独立基础设施。**

> **代码优先清晰，其次才是“架构形式”。**

---

# 二、接口规范

由于 TeamVault 是 Next.js 单体项目，不设计大量 `/api/v1/...` REST 接口。

## 1. 普通 CRUD：Server Actions

### Resource

```ts
createResource(input)
updateResource(id, input)
deleteResource(id)
restoreResource(id)
toggleFavorite(id)
```

### Credential

```ts
createCredential(resourceId, input)
updateCredential(id, input)
deleteCredential(id)
revealCredential(id)
```

### 用户与小组

```ts
createUser(input)
updateUser(id, input)
disableUser(id)

createGroup(input)
updateGroup(id, input)
addGroupMember(groupId, userId)
removeGroupMember(groupId, userId)
```

### Permission

```ts
updateResourcePermissions(resourceId, input)
```

### Share

```ts
createShare(input)
revokeShare(id)
```

普通 CRUD 禁止再增加 REST Controller。

---

## 2. HTTP Route Handler

真正需要 HTTP 响应的接口控制在：

```text
POST /api/files/upload

GET  /api/files/:id/content
GET  /api/files/:id/download
GET  /api/files/:id/preview
GET  /api/files/:id/thumbnail
```

分享：

```text
GET  /s/:token
POST /s/:token/verify
```

分享文件：

```text
GET /s/:token/files/:fileId/content
GET /s/:token/files/:fileId/download
```

---

# 三、Codex 分阶段开发提示词

不要一次让 Codex 实现整个系统。

## M0 + M1：项目初始化、登录与基础布局

```text
请基于 TeamVault 项目总规范完成 M0 + M1。

本次只完成：

1. 初始化 Next.js App Router + TypeScript
2. 初始化 Tailwind + shadcn/ui
3. 建立推荐目录结构
4. SQLite + Drizzle
5. WAL / foreign_keys / busy_timeout
6. user / session 基础 Schema
7. Argon2id 登录
8. Session Cookie
9. 登录页
10. Dashboard Layout
11. Sidebar
12. Header
13. Dark Mode

要求：

- 不实现 Resource
- 不实现 Credential
- 不实现 File
- 不实现 Permission
- 不实现 Share
- 不添加 Redis/MinIO/MySQL
- 不创建独立 Backend
- 禁止过度封装
- 禁止无意义 Repository/Service
- UI 使用 shadcn/ui，风格偏 Vercel / Linear
- TypeScript 禁止 any
- 运行 typecheck、lint、build

完成后只输出：
1. 修改文件
2. 实现内容
3. 数据库变化
4. 验证结果
5. 尚未实现内容
```

---

## M2：Resource 模块

```text
继续开发 TeamVault。

严格遵守现有项目规范，不重构无关代码。

本次只实现 Resource 模块：

- Resource 数据表
- ResourceType
- Visibility
- Sensitivity
- Resource Card
- Resource List
- 新建
- 编辑
- Soft Delete
- Restore
- Detail
- Favorite
- 搜索
- 分类筛选
- 标签

要求：

- CRUD 使用 Server Action
- 查询优先 Server Component
- 不建立 REST CRUD API
- 不实现 Credential
- 不实现 File
- 不实现 Permission
- 不实现 Share
- 页面保持现代简洁
- 避免重复组件
- 不创建 Repository/Service 空壳层
- TypeScript 禁止 any
- 运行 typecheck、lint、build
```

---

## M3：Credential

目标：

```text
多 Credential
Password
API Key
Token
AES-256-GCM
显示 Secret
复制 Secret
审计
```

开发时必须保证：

```text
Secret 默认隐藏
VIEW_SECRET 权限集中检查
明文 Secret 不进入数据库日志
明文 Secret 不进入 Audit
Crypto 仅存在 lib/crypto
```

---

## M4：File

目标：

```text
文件上传
文件列表
本地存储
UUID 文件名
SHA256
下载
删除
图片预览
PDF 预览
文本预览
```

保持：

```text
SQLite 管 Metadata
/data/files 管二进制文件
```

---

## M5：Preview

目标：

```text
Sharp 缩略图
LibreOffice Headless
PPTX → PDF
DOCX → PDF
XLSX → PDF
preview_job
失败重试
异常任务恢复
```

禁止引入 Redis / Queue 服务。

---

## M6：User / Group

目标：

```text
用户管理
禁用用户
创建小组
修改小组
成员加入
成员移除
```

不提前增加复杂组织架构。

---

## M7：Permission

目标：

```text
VIEW
VIEW_SECRET
VIEW_FILE
DOWNLOAD
EDIT
SHARE
```

统一权限顺序：

```text
ADMIN
 ↓
OWNER
 ↓
USER Permission
 ↓
GROUP Permission
 ↓
Resource Visibility
```

所有判断集中在：

```text
lib/permission/
```

---

## M8：Share

目标：

```text
Resource Share
File Share
随机 Token
Token Hash
访问密码
有效期
最大访问次数
允许预览
允许下载
撤销
```

必须保证：

```text
Credential 永远禁止外部匿名分享
SECRET Resource 禁止匿名分享
```

---

## M9：Audit

实现：

```text
LOGIN
LOGOUT
RESOURCE_CREATE
RESOURCE_EDIT
RESOURCE_DELETE
SECRET_VIEW
SECRET_COPY
FILE_UPLOAD
FILE_PREVIEW
FILE_DOWNLOAD
FILE_DELETE
SHARE_CREATE
SHARE_REVOKE
PERMISSION_CHANGE
```

Audit 代码集中管理，禁止业务层散落重复逻辑。

---

## M10：Backup

实现：

```text
SQLite 数据备份
Files 备份
Previews 备份
manifest.json
完整恢复说明
资源 JSON 导出
Credential 加密 JSON 导出
```

数据必须保持可迁移，不允许平台锁死。

---

## M11：Security + UI Polish

最后进行：

```text
UI 统一
Dark Mode
Responsive
Loading
Empty State
Error State
权限边界检查
上传安全
Session 安全
CSRF
登录限流
分享安全
Secret 泄露检查
Audit 检查
TypeScript 检查
ESLint
Build
```

禁止此阶段大规模重构已有稳定模块。

---

# 四、最终开发原则

TeamVault 始终遵守：

```text
单体
React / Next.js
SQLite
本地文件
少依赖
少抽象
少层级
明确权限
安全存储
可完整备份
```

禁止将项目开发成：

```text
Controller
   ↓
Service
   ↓
Manager
   ↓
Repository
   ↓
DAO
   ↓
ORM
```

核心标准：

> **代码量不是质量。可以用 20 行清晰代码完成的逻辑，不写成 100 行。**

> **没有实际复用需求，不提前抽象。**

> **没有实际规模问题，不提前引入基础设施。**

> **实现当前明确需求，不实现猜测中的未来需求。**
