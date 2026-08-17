# TeamVault 小组资源管理平台架构方案与开发方案

## 一、项目定位

TeamVault 用于小组内部统一管理：

- 网站/系统入口
- IP、端口、用途说明
- 一个资源对应多个账号密码
- API Key / Token / SSH 等凭据
- PDF / PPT / Word / Excel
- 图片
- Markdown / TXT / JSON / YAML
- 压缩包及普通文件
- 在线预览
- 文件下载
- 内部成员分享
- 小组权限
- 外部临时分享链接
- 操作审计
- 数据备份/迁移

整体目标：

> **单体、轻量、美观、安全、数据容易迁移、后期可以扩展。**

第一版明确控制边界，不引入 Redis、MinIO、MySQL、消息队列、独立后端等组件。

---

## 二、最终技术架构

| 层 | 技术 |
|---|---|
| Web | **Next.js App Router** |
| UI | React + TypeScript |
| UI 组件 | **shadcn/ui** |
| CSS | Tailwind CSS |
| Icon | Lucide |
| 数据库 | **SQLite** |
| ORM | **Drizzle ORM** |
| 登录 | Server Session + HttpOnly Cookie |
| 密码 Hash | Argon2id |
| 敏感数据加密 | AES-256-GCM |
| 文件 | **服务器本地文件系统** |
| 图片 | Sharp |
| PDF | PDF.js（浏览器端只读渲染） |
| PPTX | @office-kit/pptx（浏览器端只读渲染） |
| XLS/XLSX/CSV | SheetJS（浏览器端只读表格） |
| DOCX / DOC | docx-preview 排版 / 旧版 DOC 文本提取 |
| 部署 | Docker |
| 反向代理 | Nginx |
| 备份 | SQLite + `/data` 打包 |

核心目标：

```text
一个仓库
一个 Next.js 应用
一个 Node 进程
一个 SQLite 数据库
一个 data 数据目录
```

---

## 三、系统架构

```text
                        Browser
                           │
                        HTTPS
                           │
                           ▼
                     ┌─────────┐
                     │  Nginx  │
                     └────┬────┘
                          │
                          ▼
               ┌─────────────────────┐
               │      TeamVault      │
               │                     │
               │ Next.js + React     │
               │ Server Components   │
               │ Server Actions      │
               │ Route Handlers      │
               └──────────┬──────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
           ▼              ▼              ▼
        SQLite       Local Files      Crypto
           │              │              │
       资源/用户等      原始文件流       AES-GCM
                           │
                           ▼
                  浏览器只读预览组件
              PDF.js / Office Kit / SheetJS
```

---

## 四、部署结构

推荐服务器目录：

```text
/opt/teamvault/
├── docker-compose.yml
├── .env
│
└── data/
    ├── teamvault.db
    │
    ├── files/
    │   ├── 2026/
    │   │   ├── 08/
    │   │   └── 09/
    │
    ├── previews/
    │
    ├── thumbnails/
    │
    └── temp/
```

Docker 第一版保持：

```text
docker-compose
├── teamvault
└── nginx
```

可以进一步简化为仅 TeamVault 单容器，正式环境建议保留 Nginx。

---

## 五、核心设计原则

最重要的一点：

> **Resource 是系统中心，不要让网站、文件、密码分别成为三个孤立系统。**

统一定义：

```text
Resource
│
├── 基本信息
├── 网站/IP
├── 凭据
├── 文件
├── 标签
├── 权限
├── 分享
└── 操作历史
```

例如：

```text
Label Studio
│
├── URL
│   https://label.xxx.com
│
├── IP
│   192.168.20.31:8080
│
├── 凭据
│   ├── 管理员
│   ├── 算法人员
│   └── API Token
│
├── 文件
│   ├── 部署文档.pdf
│   ├── 培训材料.pptx
│   └── 架构图.png
│
└── 权限
    ├── AI组
    └── 管理员
```

---

## 六、Resource 类型

第一版支持：

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

不建议不同类型建不同表，统一使用：

```text
resource
```

通过 `type` 区分。

---

## 七、数据库设计

第一版控制在 12～15 张表。

### 1. 用户

表：

```text
user
```

核心字段：

```text
id
username
display_name
password_hash
avatar
status
is_admin
created_at
updated_at
```

### 2. 小组

表：

```text
group
```

字段：

```text
id
name
description
created_at
```

关系表：

```text
group_member

group_id
user_id
role
```

---

## 八、模块模型

`resource` 在代码和数据库中保留原名以兼容已有接口，但产品语义是“模块容器”，不是单个网站或文件。

例如：

```text
入炉项目
├── 项目说明
├── 业务网站
├── 外部方案文档
├── 多个账号与密钥
└── 上传的 PDF / Office / 图片

Label Studio
├── 使用说明
├── 访问网站
└── 按人员授权的账号
```

核心表：

```text
resource
```

建议字段：

```text
id

name
module_kind

description

visibility
sensitivity

owner_id
is_favorite
status

created_by
created_at
updated_at
deleted_at
```

### module_kind

```text
PROJECT
TOOL
KNOWLEDGE
PERSONAL
OTHER
```

### visibility

四种：

```text
TEAM
GROUP
PRIVATE
PUBLIC
```

### sensitivity

四种：

```text
NORMAL
INTERNAL
CONFIDENTIAL
SECRET
```

注意：

> `visibility` 和 `sensitivity` 是两个不同概念，不要混为一体。

### 模块内容

网站和外部文档是模块内的可选内容，不是模块类型，也不是创建模块时的必填项。

```text
resource_link

id
resource_id
kind          WEBSITE / EXTERNAL_DOCUMENT / OTHER
title
url
description
created_by
created_at
updated_at
```

本地文件继续使用 `file.resource_id` 挂在模块下；账号使用 `credential.resource_id` 挂在模块下。

> 模块是业务聚合边界；人员小组只负责成员组织和授权。不要再用“资源分组”包一层网站、文档或服务器。

### 创建与所有权

所有已登录用户都可以创建模块。创建者自动成为 `owner_id`，可以编辑模块、添加内容、配置账号可见范围和删除自己的模块；管理员拥有全部模块的管理权限。

新模块默认仅创建者和管理员可见，创建者可以改为团队可见或通过成员、小组授权共享。

删除采用软删除，同时立即撤销模块及模块文件的有效外部分享。

---

## 九、凭据模型

表：

```text
credential
```

建议不要只设计 username/password，因为后续可能出现：

```text
账号密码
API Key
Token
SSH
数据库连接
AccessKey
SecretKey
TOTP
License
```

建议字段：

```text
credential

id
resource_id

name
type

username
secret_cipher

extra_cipher

description

access_mode

created_by
created_at
updated_at
```

类型：

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

### 凭据可见范围

```text
RESOURCE    沿用资源的 VIEW_SECRET 权限
RESTRICTED  仅指定成员或人员小组可见
```

指定可见对象保存到：

```text
credential_permission

credential_id
subject_type   USER / GROUP
subject_id
```

凭据级授权只控制具体账号或密钥，不替代资源本身的 `VIEW` 权限。

---

## 十、敏感字段加密

### 用户登录密码

使用：

```text
Argon2id
```

不可逆 Hash。

### 资源密码 / API Key / Token 等

使用：

```text
AES-256-GCM
```

可逆加密。

不要混淆登录密码 Hash 与资源 Secret 加密。

### 加密结构

```text
Master Key
    │
    ▼
每个 Credential
    │
    ├── random IV
    │
    ▼
AES-256-GCM
    │
    ├── ciphertext
    ├── authTag
    └── version
```

数据库可保存：

```text
v1:iv:authTag:ciphertext
```

Master Key：

```text
TEAMVAULT_MASTER_KEY
```

只存在：

```text
.env
```

或者 Docker Secret。

**绝不能存在 SQLite。**

---

## 十一、凭据显示逻辑

默认：

```text
密码
••••••••••••
```

用户点击“显示”：

```text
检查 Session
      ↓
检查资源 VIEW
      ↓
检查 VIEW_SECRET
      ↓
记录 audit_log
      ↓
AES 解密
      ↓
返回 Secret
```

复制密码同样记录日志。

例如：

```text
2026-08-13 10:31
张三
VIEW_SECRET
Label Studio
管理员账号
```

---

## 十二、文件系统设计

不使用 MinIO。

数据库只管理 Metadata，真实文件放：

```text
/data/files
```

推荐目录：

```text
/data/files/

2026/
└── 08/
    ├── 23/
    │   ├── 81f438a8....pdf
    │   ├── b782322a....pptx
    │   └── 173122ca....png
```

不要使用原始文件名作为磁盘文件名。

数据库表：

```text
file
```

建议字段：

```text
id
resource_id

original_name
storage_name
storage_path

mime_type
extension
size
sha256

preview_status
preview_path
thumbnail_path

visibility

created_by
created_at
```

---

## 十三、上传处理流程

```text
用户选择文件
      ↓
检查上传权限
      ↓
检查大小
      ↓
检查扩展名
      ↓
识别 MIME
      ↓
生成 UUID
      ↓
保存文件
      ↓
计算 SHA256
      ↓
写 SQLite
      ↓
生成预览任务
```

建议默认：

```text
单文件最大：500 MB
```

系统设置中允许修改。

---

## 十四、在线预览方案

### 图片

支持：

```text
PNG
JPEG
WebP
GIF
SVG
```

直接浏览器预览。

Sharp 用于：

```text
生成缩略图
```

例如：

```text
original.png
   ↓
thumbnail.webp
```

### PDF

使用：

```text
PDF.js
```

支持：

```text
翻页
缩放
搜索
全屏
```

### 文本

支持：

```text
txt
md
json
xml
yaml
yml
sql
log
csv
```

使用：

```text
Monaco Editor
```

只读模式。

---

## 十五、浏览器端只读预览

V1 只做预览，不提供在线编辑。服务端通过鉴权后的文件接口直接流式返回原始文件，浏览器按文件类型选择查看器：

```text
PPTX
DOCX
DOC（兼容文本预览）
XLS
XLSX
CSV
PDF
图片
视频 / 音频
文本 / ZIP 目录
```

流程：

```text
鉴权后的原始文件流（支持 HTTP Range）
     │
     ├── PDF → PDF.js
     ├── PPTX → @office-kit/pptx
     ├── DOCX → docx-preview
     ├── DOC → Node 内直接提取可读文本
     ├── XLS/XLSX/CSV → SheetJS
     ├── 图片/视频/音频 → 浏览器原生能力
     └── 文本/ZIP → 轻量只读查看器
```

不部署 LibreOffice、OnlyOffice 或 Office 转换服务。旧版 PPT 和浏览器不支持的视频编码提供原文件下载。DOCX 受 HTML 排版能力限制；旧版 DOC 仅保证正文等文本可阅读，不承诺像素级还原。

---

## 十六、预览资源边界

上传完成后文件立即可预览，不创建转换任务，也不阻塞上传请求。

浏览器端解析必须设置资源上限：

```text
PPTX：最大 50 MB
DOCX：最大 30 MB
DOC：最大 25 MB，仅提取可读文本
XLS/XLSX/CSV：最大 25 MB，界面最多展示 500 行 × 50 列
ZIP：最大 30 MB，目录最多展示 2000 项
文本：只读取前 1 MB
```

超过限制、格式损坏或浏览器无法解码时，明确提示用户下载原文件。数据库中已有的历史预览字段和任务表仅用于兼容旧数据，不再由运行时读写。

---

## 十七、权限体系

第一版不要过度设计。

### 全局角色

```text
ADMIN
MEMBER
```

管理员：

```text
用户
小组
系统设置
全部资源
```

普通成员：

根据资源授权。

---

## 十八、资源权限

核心权限：

```text
VIEW
VIEW_SECRET
VIEW_FILE
DOWNLOAD
EDIT
SHARE
```

ADMIN 自动拥有全部权限。

例如：

| 权限 | AI组 | 开发组 |
|---|---:|---:|
| VIEW | √ | √ |
| VIEW_SECRET | √ | × |
| VIEW_FILE | √ | √ |
| DOWNLOAD | √ | √ |
| EDIT | √ | × |
| SHARE | × | × |

---

## 十九、权限继承

判断顺序：

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

表：

```text
resource_permission
```

字段：

```text
resource_id
subject_type
subject_id

can_view
can_view_secret
can_view_file
can_download
can_edit
can_share
```

其中：

```text
subject_type

USER
GROUP
```

一个表即可。

---

## 二十、内部分享

内部分享不一定产生 URL，而是通过权限控制。

例如：

```text
资源权限

所有团队成员
○ 可见
● 指定成员

小组
☑ 算法组
☑ 运维组

用户
☑ 张三
☐ 李四
```

保存到：

```text
resource_permission
```

---

## 二十一、外部分享机制

第一版支持分享：

```text
RESOURCE
FILE
```

例如：

```text
资源整体分享
```

或者：

```text
单独分享一个 PDF
```

数据库表：

```text
share
```

字段：

```text
id

type
target_id

token_hash

password_hash

expires_at

allow_preview
allow_download

max_views
view_count

created_by
created_at

revoked_at
```

分享链接：

```text
https://vault.xxx.com/s/Mh29smA8KlP2...
```

Token 至少：

```text
256 bit random
```

数据库只保存：

```text
SHA-256(token)
```

---

## 二十二、分享安全规则

### NORMAL

```text
允许分享
```

### INTERNAL

```text
管理员可配置是否允许
```

### CONFIDENTIAL

```text
默认禁止外链
```

### SECRET

```text
强制禁止外链
```

并且：

> **Credential 永远不能进入匿名外部分享。**

---

## 二十三、外部分享页面

分享页不要显示后台管理 UI。

示例：

```text
TeamVault

Label Studio 培训资料
────────────────────────

4 个文件

部署手册.pdf
8 MB
[在线预览] [下载]

培训材料.pptx
25 MB
[在线预览]

部署架构.png
2 MB
[查看]

────────────────────────
分享有效期：
2026-08-30
```

分享配置支持：

```text
有效期
访问密码
允许在线预览
允许下载
最大访问次数
撤销分享
```

---

## 二十四、操作审计

V1 就必须实现。

表：

```text
audit_log
```

建议记录：

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

字段：

```text
user_id
action
resource_id
target_type
target_id
ip
user_agent
created_at
```

日志中禁止保存：

```text
密码
Token
Secret
```

---

## 二十五、首页设计

首页重点：

```text
最近访问
收藏
常用资源
最近更新
```

顶部增加：

```text
Command 搜索
```

支持：

```text
名称
IP
URL
标签
描述
```

例如：

```text
Ctrl + K
```

打开：

```text
搜索 TeamVault

> label

Label Studio
192.168.20.31
AI 数据标注平台
```

---

## 二十六、UI 风格

不建议使用传统后台管理风格：

```text
Ant Design Pro
若依
传统表格管理后台
```

建议整体风格参考：

```text
Vercel
Linear
Notion
GitHub
```

设计方向：

```text
浅色 / 深色
大留白
轻边框
圆角 8~12px
少量阴影
统一 Icon
```

资源卡片重点展示：

```text
Icon
名称
描述
URL / IP
标签
凭据数
文件数
```

---

## 二十七、项目目录

推荐：

```text
teamvault/

├── app/
│
│   ├── (auth)/
│   │   └── login/
│
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   │
│   │   ├── page.tsx
│   │   │
│   │   ├── resources/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   │
│   │   ├── files/
│   │   ├── credentials/
│   │   ├── favorites/
│   │   ├── groups/
│   │   ├── users/
│   │   ├── audit/
│   │   └── settings/
│
│   ├── s/
│   │   └── [token]/
│
│   └── api/
│       ├── file/
│       ├── preview/
│       └── download/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── resource/
│   ├── credential/
│   ├── file/
│   └── permission/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── crypto/
│   ├── permission/
│   ├── storage/
│   ├── preview/
│   ├── share/
│   └── audit/
│
├── drizzle/
│
├── public/
│
├── data/
│
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 二十八、Server Component / Client Component 设计

默认使用：

```text
Server Component
```

只有真正需要浏览器交互的组件使用：

```text
'use client'
```

适合 Server Component：

```text
ResourceCard
ResourceDetail
FileList
```

适合 Client Component：

```text
Dialog
Dropdown
FileUploader
CredentialReveal
CopyButton
PermissionEditor
```

目标：

> 尽量减少客户端 JS Bundle。

---

## 二十九、数据访问方式

页面查询：

```text
Server Component
      ↓
Drizzle
      ↓
SQLite
```

数据修改：

```text
Form
 ↓
Server Action
 ↓
Permission Check
 ↓
Drizzle
```

不要为了形式统一全部写 REST API。

只有真正需要 HTTP 流式响应等能力时使用 Route Handler，例如：

```text
/api/files/:id/content
/api/files/:id/download
/api/files/:id/thumbnail
```

---

# 三十、开发阶段规划

## Phase 0：项目骨架

目标：

```text
Next.js 运行
SQLite 运行
shadcn 初始化
Docker 运行
```

完成：

```text
登录页
Dashboard Layout
Sidebar
Header
Dark Mode
数据库连接
```

---

## Phase 1：资源管理

实现：

```text
资源列表
资源卡片
新建资源
编辑资源
删除资源
分类
标签
搜索
详情页
收藏
```

暂时不做：

```text
密码
文件
权限
```

阶段目标：

> TeamVault 已经可以作为漂亮的网站 / 服务器导航使用。

---

## Phase 2：凭据

加入：

```text
Credential
```

实现：

```text
新增账号
多个账号
密码加密
显示密码
复制密码
Token
API Key
编辑
删除
```

同时开始：

```text
Audit
```

记录：

```text
SECRET_VIEW
SECRET_COPY
```

阶段目标：

> 可以替代简单团队密码表。

---

## Phase 3：文件

实现：

```text
上传
下载
删除
重命名
文件列表
图片缩略图
图片预览
PDF 预览
Markdown 预览
TXT / JSON 预览
```

文件存储：

```text
/data
```

---

## Phase 4：浏览器端只读预览

加入统一预览入口：

```text
PDF.js
@office-kit/pptx
SheetJS
浏览器原生图片 / 视频 / 音频能力
```

实现：

```text
PDF → 分页画布
PPTX → 只读幻灯片
DOCX → 只读分页排版
DOC → 只读文本兼容预览
XLS/XLSX/CSV → 只读工作表
图片 / 视频 / 音频 / 文本 / ZIP → 对应只读查看器
```

要求：

```text
登录态与分享链接复用同一套预览组件
文件接口支持 HTTP Range
分享链接继续执行 allowPreview / allowDownload 权限
不安装 LibreOffice，不启动转换 Worker
```

---

## Phase 5：用户和小组

实现：

```text
用户管理
禁用用户
修改密码

创建小组
成员加入
成员移除
```

之后：

```text
resource_permission
```

开始生效。

---

## Phase 6：权限

实现：

```text
TEAM
GROUP
PRIVATE
```

以及：

```text
VIEW
VIEW_SECRET
VIEW_FILE
DOWNLOAD
EDIT
SHARE
```

所有 Server Action / Route Handler 统一调用权限方法：

```text
requirePermission(...)
```

统一封装：

```text
canViewResource()
canViewSecret()
canEditResource()
canDownloadFile()
canShareResource()
```

禁止每个页面各自写一套权限逻辑。

---

## Phase 7：外部分享

实现：

```text
创建分享
随机 Token
密码保护
过期时间
下载权限
最大访问次数
撤销分享
分享列表
```

公开入口：

```text
/s/[token]
```

---

## Phase 8：备份与管理

系统设置：

```text
设置
  ├── 系统名称
  ├── Logo
  ├── 文件大小
  ├── 允许文件类型
  └── 分享策略
```

完整备份生成：

```text
teamvault-20260813.tar.gz
```

包含：

```text
teamvault.db
files/
previews/
manifest.json
```

---

## 三十一、数据导出

不要只做系统备份。

建议支持三类：

### 1. 系统完整备份

```text
SQLite + Files
```

用于恢复 TeamVault。

### 2. 资源 JSON 导出

例如：

```json
{
  "resources": [],
  "files": [],
  "groups": []
}
```

用于未来迁移其他系统。

### 3. 密码导出

后期可支持：

```text
KDBX
CSV
```

第一版至少支持：

```text
加密 JSON
```

避免数据被系统锁死。

---

## 三十二、异常恢复

文件保存必须：

```text
写入临时文件
 ↓
计算 SHA256
 ↓
rename()
 ↓
数据库 INSERT
```

不要：

```text
数据库 INSERT
 ↓
文件写一半失败
```

删除资源不建议立即物理删除。

使用：

```text
Soft Delete
```

例如：

```text
deleted_at
```

提供：

```text
回收站
```

30 天后再物理删除。

---

## 三十三、SQLite 配置

建议：

```text
WAL mode
foreign_keys = ON
busy_timeout
```

对于当前目标：

```text
几人到几十人
资源几百到几千
文件几千到几万
```

SQLite 足够。

未来出现：

```text
100+ 用户
大量并发写入
多实例部署
```

再考虑 PostgreSQL。

---

## 三十四、V1 不要引入的东西

第一版明确不要：

```text
Redis
MinIO
Elasticsearch
Kafka
RabbitMQ
微服务
Kubernetes
独立 API Gateway
WebSocket
GraphQL
消息中心
审批流
在线 Office 编辑
复杂版本管理
```

否则很容易从：

```text
轻量小组工具
```

变成：

```text
半成品企业平台
```

---

## 三十五、安全底线

至少做到：

- HTTPS
- Argon2id 用户密码 Hash
- AES-256-GCM 凭据加密
- Master Key 不进入数据库
- HttpOnly Session Cookie
- CSRF 防护
- SameSite Cookie
- 文件 MIME + 扩展名双重验证
- 上传文件 UUID 化
- 禁止 `../` 路径
- SVG 谨慎处理
- 下载必须鉴权
- 分享 Token 不可预测
- 分享 Token 数据库只存 Hash
- Credential 禁止匿名分享
- Secret 查看记录审计
- 登录失败限速
- 管理员可强制用户退出

---

## 三十六、第一版 MVP

第一版做到：

```text
✓ 登录

✓ 用户
✓ 小组

✓ 资源卡片
✓ 网站
✓ IP
✓ 描述
✓ 分类
✓ 标签

✓ 多账号
✓ Password
✓ Token
✓ API Key
✓ AES 加密

✓ 文件上传
✓ 图片预览
✓ PDF 预览
✓ PPT / DOC 预览

✓ 用户权限
✓ 小组权限

✓ 分享链接
✓ 分享密码
✓ 分享有效期
✓ 禁止下载

✓ 操作日志

✓ 数据备份
```

这已经是完整可用产品。

---

## 三十七、建议开发顺序

```text
M0 项目初始化
    ↓
M1 Login + Layout
    ↓
M2 Resource
    ↓
M3 Credential
    ↓
M4 File
    ↓
M5 Preview
    ↓
M6 User / Group
    ↓
M7 Permission
    ↓
M8 Share
    ↓
M9 Audit
    ↓
M10 Backup
    ↓
M11 UI 细节、安全加固
```

一个重要原则：

> **不要先做复杂权限系统。**

优先把：

```text
Resource
   ↓
Credential
   ↓
File
```

核心使用链路做出来，再扩展权限。

---

## 三十八、最终 V1 架构

```text
                 ┌──────────────────┐
                 │     Browser      │
                 │ React / shadcn   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │     Next.js      │
                 │                  │
                 │ Server Component │
                 │ Server Action    │
                 │ Route Handler    │
                 └────────┬─────────┘
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
       SQLite        Local Files       Node Crypto
          │               │                │
          │          ┌────┴────┐           │
          │          │         │           │
          │        Sharp   原始文件流       │
          │                    │           │
          │       浏览器只读预览组件        │
          │                                │
          └────────────── TeamVault ───────┘
```

---

## 三十九、V1 最终交付标准

V1 至少完整跑通下面的业务链路：

```text
管理员创建用户
      ↓
创建小组
      ↓
新增 Label Studio
      ↓
添加 URL / IP / 描述
      ↓
添加两个账号
      ↓
上传部署 PDF
      ↓
上传培训 PPT
      ↓
PPT 在线预览
      ↓
授权算法组
      ↓
算法人员登录
      ↓
看到资源
      ↓
查看密码
      ↓
操作被记录
      ↓
创建一个 PDF 外部分享
      ↓
外部用户输入密码访问
      ↓
7 天后自动失效
      ↓
管理员完成完整数据备份
```

这条链路全部跑通以后：

> **TeamVault V1 即可视为正式完成。**

---

# 四十、最终技术决策

第一版固定三个原则：

```text
Next.js 单体
SQLite
本地文件系统
```

只有在未来出现明显规模增长时，再考虑引入：

```text
PostgreSQL
MinIO / S3
Redis
独立 Worker
多实例部署
```

当前阶段没有必要提前增加基础设施复杂度。
