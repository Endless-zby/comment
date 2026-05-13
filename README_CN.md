<div align="center">

<img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License">
<img src="https://img.shields.io/badge/Next.js-15-black.svg?style=flat-square&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/Prisma-ORM-2D3748.svg?style=flat-square&logo=prisma" alt="Prisma">
<img src="https://img.shields.io/badge/Docker-available-2496ED.svg?style=flat-square&logo=docker" alt="Docker">

<br>
<br>

<h1>Hotel Review Monitor</h1>
<h3>酒店评价监控系统</h3>

从携程、飞猪等 OTA 平台自动采集酒店评价数据，提供**多维数据可视化**与 **AI 智能分析**，帮助酒店管理者实时监控住客反馈、洞察趋势变化。

</div>

---

## 目录

- [功能特性](#功能特性)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
  - [Docker 部署（推荐）](#docker-部署推荐)
  - [源码开发](#源码开发)
- [部署指南](#部署指南)
  - [使用内置数据库](#场景一使用内置默认数据库)
  - [挂载已有数据库](#场景二挂载已有数据库文件)
  - [容器管理](#常用管理命令)
- [项目结构](#项目结构)
- [页面导航](#页面导航)
- [数据模型](#数据模型)
- [环境变量](#环境变量)
- [私有化部署](#私有化部署)
- [许可证](#许可证)

---

## 功能特性

### 核心能力

| 功能 | 说明 |
|------|------|
| 🌐 **多平台采集** | 支持携程（Ctrip）和飞猪（Fliggy）两大 OTA 平台 |
| ⏰ **定时自动拉取** | 基于 node-cron 的定时任务，支持增量更新，避免重复采集 |
| 📊 **数据可视化** | 周评论趋势、评分走势、情感时间线、评分分布、平台对比、热力图、词云等 |
| 🗓️ **入驻日期标记** | 为每家酒店设置入驻日期，时间轴图表中标注垂直参考线，清晰对比入驻前后变化 |
| 🤖 **AI 评价周报** | 接入 DeepSeek 大模型，自动生成酒店周评价摘要报告，报告自动保存、支持历史查看 |
| 🛡️ **评价溯源** | 匹配 H5 埋点「复制评价内容」事件与平台评价，基于 LCS 相似度算法识别从 AI 工具复制的评价内容 |
| 🔗 **后台酒店绑定** | 通过 platformId 关联后台酒店系统，添加酒店时可搜索远程酒店列表并自动填充 |
| 🔍 **多维筛选** | 按酒店、平台、评分、关键词灵活筛选评价数据 |
| 📥 **Excel 导出** | 一键导出当前筛选结果为 Excel 文件，包含完整评价信息及图片 |

### 技术特点

| 特点 | 说明 |
|------|------|
| 🏗️ **三层架构** | 严格分离表现层、服务层、数据层，职责清晰、易于维护 |
| 🛡️ **反爬虫引擎** | Puppeteer + Stealth 插件模拟真实浏览器环境，绕过反爬检测 |
| 📡 **CDP 拦截** | 通过 Chrome DevTools Protocol 直接捕获 API 响应，高效获取飞猪评价数据 |
| 🧩 **增量拉取** | 智能判断首拉 / 增量拉取，基于进度记录精准断点续拉 |
| 🎨 **响应式 UI** | 基于 shadcn/ui + Tailwind CSS 的现代化界面，支持深色/浅色模式 |
| 📡 **ES 埋点查询** | 对接 Elasticsearch，实时查询 H5 页面「复制评价内容」埋点事件 |

---

## 技术架构

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | Next.js 15 + React 19 |
| UI 组件库 | shadcn/ui + Tailwind CSS 4 |
| 数据库 | SQLite + Prisma ORM |
| 爬虫引擎 | Puppeteer + puppeteer-extra + Stealth Plugin |
| 定时调度 | node-cron |
| 图表可视化 | Recharts |
| 数据导出 | xlsx |
| 表单校验 | Zod |
| AI 模型 | DeepSeek (OpenAI 兼容 API) |
| 容器化 | Docker (多阶段构建) |

---

## 快速开始

### Docker 部署（推荐）

镜像已推送至 Docker Hub 公开仓库，**拉取即用，无需安装任何依赖**。镜像内已包含 Node.js、Google Chrome、编译后的 Web 产物。

| 属性 | 值 |
|------|-----|
| 镜像地址 | `zhaoboya/ctrip-review-monitor:latest` |
| 基础系统 | Debian 12 (Bookworm) |
| 运行环境 | Node.js 20 + Google Chrome 148 |
| 端口 | 3000 |
| 共享内存 | ≥ 2GB (`--shm-size=2gb`) |

```bash
# Linux / macOS
docker run -d \
  --name ctrip-review \
  --network host \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

```powershell
# Windows PowerShell
docker run -d `
  --name ctrip-review `
  --network host `
  -v review_data:/app/prisma/data `
  --shm-size=2gb `
  --restart unless-stopped `
  -e NODE_ENV=production `
  -e DATABASE_URL=file:/app/prisma/data/reviews.db `
  zhaoboya/ctrip-review-monitor:latest
```

打开 **http://localhost:3000**，数据库为空，进入「酒店管理」页面添加酒店后即可开始使用。

### 源码开发

**环境要求**

- Node.js >= 18.0
- pnpm（推荐）或 npm

```bash
# 克隆仓库
git clone https://github.com/yourusername/comment.git
cd comment

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件：
#   DATABASE_URL="file:./data/reviews.db"

# 初始化数据库
pnpm db:push && pnpm db:generate

# 启动开发服务器
pnpm dev
```

打开 **http://localhost:3000**

---

## 部署指南

### 场景一：使用内置默认数据库

适用于首次部署、无已有数据的用户。数据存储在 Docker 管理的 Volume 中，删除容器不会丢失数据（除非手动删除 Volume）。

```yaml
# docker-compose.yml
version: '3.8'

services:
  comment-monitor:
    image: zhaoboya/ctrip-review-monitor:latest
    container_name: ctrip-review-monitor
    restart: unless-stopped
    network_mode: "host"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/prisma/data/reviews.db
    volumes:
      - review_data:/app/prisma/data
    shm_size: '2gb'
```

启动：

```bash
docker compose up -d
```

> 使用 `network_mode: "host"` 使容器共享宿主机网络，无需端口映射。服务直接监听宿主机 3000 端口，同时容器内可直接访问宿主机 VPN 网络（如 ES、hotelList 等内部接口）。

### 场景二：挂载已有数据库文件

适用于从源码开发迁移到 Docker 部署、或需保留已有酒店/评价数据的用户。

> ⚠️ SQLite 运行时会产生 `reviews.db`、`reviews.db-wal`、`reviews.db-shm` 三个文件，**必须挂载整个目录**，不能只挂载单个 `.db` 文件。

```bash
# Linux / macOS
# 假设数据目录在 ~/comment/prisma/data/
docker run -d \
  --name ctrip-review \
  --network host \
  -v ~/comment/prisma/data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

```powershell
# Windows PowerShell
# 假设数据目录在 D:\comment\prisma\data\
docker run -d `
  --name ctrip-review `
  --network host `
  -v "D:\comment\prisma\data:/app/prisma/data" `
  --shm-size=2gb `
  --restart unless-stopped `
  -e NODE_ENV=production `
  -e DATABASE_URL=file:/app/prisma/data/reviews.db `
  zhaoboya/ctrip-review-monitor:latest
```

使用 docker compose 挂载：

```yaml
# docker-compose.yml
services:
  comment-monitor:
    # ... 其他配置同上 ...
    volumes:
      - ~/comment/prisma/data:/app/prisma/data         # Linux/Mac
      # - D:\comment\prisma\data:/app/prisma/data      # Windows
```

### 常用管理命令

```bash
# 查看状态
docker ps -a --filter name=ctrip-review

# 查看日志
docker logs -f ctrip-review

# 重启
docker restart ctrip-review

# 停止
docker stop ctrip-review

# 删除容器（Volume 数据保留）
docker rm -f ctrip-review

# 查看数据卷位置
docker volume inspect review_data
```

---

## 项目结构

```
comment/
├── prisma/
│   ├── schema.prisma         # 数据模型定义
│   └── data/                 # SQLite 数据库文件
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API 路由层
│   │   │   ├── hotels/       # 酒店 CRUD
│   │   │   ├── reviews/      # 评价查询与统计
│   │   │   ├── configs/      # 拉取配置管理
│   │   │   ├── fetch/        # 触发数据拉取
│   │   │   ├── dashboard/    # 仪表盘统计
│   │   │   ├── settings/     # 全局设置（API Key 等）
│   │   │   ├── ai/           # AI 周报生成
│   │   │   ├── remote/       # 远程酒店列表代理
│   │   │   └── track/        # 评价溯源（埋点查询 & 匹配）
│   │   ├── dashboard/        # 仪表盘页面
│   │   ├── hotels/           # 酒店管理页面
│   │   ├── reviews/          # 评价列表页面
│   │   ├── configs/          # 配置管理页面
│   │   ├── stats/            # 统计分析页面
│   │   ├── settings/         # 系统设置页面
│   │   ├── wordcloud/        # 词云页面
│   │   ├── ai-report/        # AI 周报页面
│   │   └── track-match/      # 评价溯源页面
│   ├── components/           # 通用组件
│   │   ├── layout/           # 布局组件（侧边栏、顶部栏）
│   │   └── ui/               # shadcn/ui 基础组件
│   ├── lib/                  # 工具库
│   │   ├── prisma.ts         # Prisma 客户端单例
│   │   ├── utils.ts          # 通用工具函数
│   │   └── validators.ts     # Zod 数据校验
│   └── services/             # 服务层
│       ├── crawler/          # 爬虫引擎（Puppeteer / CDP）
│       ├── scheduler/        # 定时任务调度
│       ├── track-match/      # 评价溯源服务（ES 查询 & LCS 匹配）
│       └── logger/           # 日志服务
├── Dockerfile                # 多阶段 Docker 构建
├── docker-compose.yml        # 开发/生产 Compose 配置
├── docker-compose.prod.yml   # 生产 Compose（免源码）
├── docker-entrypoint.sh      # 容器启动脚本
├── next.config.ts            # Next.js 配置
├── package.json              # 项目依赖
└── .env.example              # 环境变量模板
```

---

## 页面导航

| 页面 | 路径 | 功能 |
|------|------|------|
| 仪表盘 | `/dashboard` | 数据概览、评分分布饼图、近期评价 |
| 酒店管理 | `/hotels` | 添加 / 编辑 / 删除酒店，设置入驻日期 |
| 评价列表 | `/reviews` | 多维度筛选评价，图片查看，Excel 导出 |
| 配置管理 | `/configs` | 设置拉取参数、手动触发拉取、查看日志 |
| 统计分析 | `/stats` | 周趋势柱状图、评分折线图、情感时间线、热力图等 |
| 词云分析 | `/wordcloud` | 评价关键词词云、Top N 标签统计 |
| AI 周报 | `/ai-report` | 选择酒店生成 AI 评价周报，查看历史报告 |
| 评价溯源 | `/track-match` | 查询 H5 埋点复制事件，匹配平台评价，识别 AI 生成评价 |
| 系统设置 | `/settings` | 配置 DeepSeek API Key、携程/飞猪 Cookie、评价溯源参数 |

---

## 数据模型

### Hotel 酒店
| 字段 | 类型 | 说明 |
|------|------|------|
| `hotelName` | String | 酒店名称 |
| `ctripHotelId` | String? | 携程酒店 ID（唯一） |
| `fliggyHotelId` | String? | 飞猪酒店 ID（唯一） |
| `platformId` | String? | 后台酒店 ID（唯一），用于关联后台系统与评价溯源 |
| `city` | String? | 所在城市 |
| `onboardDate` | String? | 入驻日期（YYYY-MM-DD），图表中作为时间节点标记 |
| `isActive` | Boolean | 启用状态，停用后不再拉取 |

### Review 评价
| 字段 | 类型 | 说明 |
|------|------|------|
| `rating` | Float | 评分（0-5） |
| `content` | String? | 评价正文 |
| `roomName` | String? | 入住房型 |
| `checkInDate` | String? | 入住日期 |
| `reviewDate` | String? | 评价日期 |
| `reviewer` | String? | 评价者昵称 |
| `hotelReply` | String? | 酒店回复 |
| `imageList` | String[] | 晒图列表 |
| `platform` | String | 来源平台（ctrip / fliggy） |

### AiReport AI 报告
| 字段 | 类型 | 说明 |
|------|------|------|
| `hotelId` | Int | 关联酒店（唯一，一个酒店仅保留最新报告） |
| `summary` | String | Markdown 格式的摘要报告 |
| `weekRange` | String | 统计周期范围 |

---

## 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|:----:|--------|------|
| `DATABASE_URL` | 是 | `file:./data/reviews.db` | SQLite 数据库路径 |
| `NODE_ENV` | - | `development` | 运行环境，Docker 中设为 `production` |
| `PORT` | - | `3000` | HTTP 服务端口 |

API Key、Cookie 及评价溯源配置（ES 地址、索引名、后台酒店接口 URL、相似度阈值）等敏感信息通过 Web 管理页面（系统设置）配置，存储在数据库中，无需写入环境变量。

---

## 私有化部署

如需构建自己的镜像并推送至私有仓库：

```bash
# 构建镜像
docker build -t your-registry/ctrip-review-monitor:latest .

# 推送
docker push your-registry/ctrip-review-monitor:latest
```

镜像构建包含三个核心层：

| 层 | 基础镜像 | 产物 |
|----|----------|------|
| deps | `node:20-slim` | pnpm 冻结依赖 |
| builder | `node:20-slim` | Next.js standalone 编译输出 |
| runner | `node:20-slim` | Chrome + 运行库 + 应用代码 |

---

## 许可证

本项目基于 [MIT License](./LICENSE.md) 开源。

<div align="center">
<br>
<sub>Built with ❤️ by Hotel Review Monitor Team</sub>
</div>
