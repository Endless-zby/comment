# 携程酒店评价监控系统

**[English Version](README_EN.md)** | **[返回首页](README.md)**

## 项目简介

携程酒店评价监控系统是一个基于 Next.js 开发的酒店评价数据采集与管理平台。系统支持从携程和飞猪平台自动抓取酒店评价数据，提供数据可视化分析、评价筛选、数据导出等功能，帮助酒店管理者实时监控和分析住客反馈。

## 功能特性

### 核心功能

- **多平台支持**：支持携程（Ctrip）和飞猪（Fliggy）两大主流OTA平台
- **自动采集**：定时自动拉取酒店评价数据，支持增量更新
- **数据管理**：酒店信息管理、评价配置管理、拉取日志追踪
- **数据可视化**：周评论趋势、评分趋势、评价情感时间线、评分分布、平台对比、热力图、词云等多维图表
- **入驻日期标记**：为每家酒店设置入驻日期，在时间轴图表中标注入驻时间节点，便于对比入驻前后数据变化趋势
- **AI 评价周报**：接入 DeepSeek AI，根据酒店周评价数据自动生成评价摘要报告，报告自动保存、支持查看历史
- **数据筛选**：按酒店、平台、评分、关键词多维度筛选
- **数据导出**：支持导出Excel格式，包含完整评价信息

### 技术特点

- **三层架构**：表现层、服务层、数据层严格分离
- **反爬虫策略**：使用 Puppeteer + Stealth 插件绕过检测
- **增量拉取**：智能判断首次/增量拉取，避免重复数据
- **CDP拦截**：通过 Chrome DevTools Protocol 直接获取API响应
- **响应式设计**：基于 shadcn/ui 的现代化UI界面

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 15 + React 19 |
| UI组件 | shadcn/ui + Tailwind CSS |
| 数据库 | SQLite + Prisma ORM |
| 爬虫引擎 | Puppeteer + puppeteer-extra |
| 定时任务 | node-cron |
| 数据导出 | xlsx |
| 图表可视化 | Recharts |

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API 路由
│   │   ├── hotels/         # 酒店管理接口
│   │   ├── reviews/        # 评价数据接口
│   │   ├── configs/        # 配置管理接口
│   │   ├── fetch/          # 数据拉取接口
│   │   ├── dashboard/      # 仪表盘统计接口
│   │   └── settings/       # 全局设置接口
│   ├── hotels/             # 酒店管理页面
│   ├── reviews/            # 评价列表页面
│   ├── configs/            # 配置管理页面
│   ├── dashboard/          # 仪表盘页面
│   └── stats/              # 统计分析页面
│   └── settings/           # 系统设置页面
├── components/             # React 组件
│   ├── layout/             # 布局组件
│   └── ui/                 # UI基础组件
├── lib/                    # 工具库
│   ├── prisma.ts           # Prisma 客户端
│   ├── utils.ts            # 通用工具函数
│   └── validators.ts       # 数据验证器
├── services/               # 服务层
│   ├── crawler/            # 爬虫服务
│   ├── scheduler/          # 定时调度服务
│   └── logger/             # 日志服务
└── types/                  # TypeScript 类型定义
```

## 快速开始

### 环境要求

- Node.js >= 18.0
- npm 或 pnpm

### 安装步骤

```bash
# 克隆项目
git clone <repository-url>
cd comment

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 DATABASE_URL

# 初始化数据库
npm run db:push
npm run db:generate

# 启动开发服务器
npm run dev
```

### 访问系统

打开浏览器访问 http://localhost:3000

## 主要页面

| 页面 | 路径 | 功能 |
|------|------|------|
| 仪表盘 | `/dashboard` | 数据概览、评分分布、趋势图表 |
| 酒店管理 | `/hotels` | 添加/编辑/删除酒店 |
| 评价列表 | `/reviews` | 查看/筛选/导出评价数据 |
| 配置管理 | `/configs` | 设置拉取参数、定时任务 |
| 统计分析 | `/stats` | 详细数据分析、周报汇总 |
| 系统设置 | `/settings` | 全局参数配置 |

## 数据模型

### Hotel（酒店）
- 酒店名称、携程ID、飞猪ID
- 城市、入驻日期、总评价数、平均评分
- 启用状态、创建时间
- **入驻日期**：可选字段，精确到年月日。设置后在统计图表中标注该时间节点，便于对比入驻前后数据变化趋势。新添加酒店默认当天，存量酒店默认为 2026-04-28。

### Review（评价）
- 评分、内容、房型、入住日期
- 评价者、评价日期、图片列表
- 酒店回复、平台来源

### Config（配置）
- 拉取间隔、页面大小、拉取模式
- 最后拉取时间、累计拉取数量

### FetchLog（拉取日志）
- 拉取状态、新增数量、拉取页数
- 错误信息、创建时间

## Docker 部署

### 镜像信息

项目已构建为完整的 Docker 镜像并推送至 Docker Hub，镜像内包含所有运行时依赖（Node.js、Next.js 编译产物、Google Chrome），无需在宿主机安装任何依赖。

| 项目 | 说明 |
|------|------|
| 镜像地址 | `zhaoboya/ctrip-review-monitor:latest` |
| 基础系统 | Debian 12 (Bookworm) |
| 运行环境 | Node.js 20 + Google Chrome 148 |
| 端口 | 3000 |
| 共享内存 | 至少 2GB（Chrome 要求） |

### 方式一：docker run（最简单）

```bash
# 一行命令启动（数据存储在 Docker volume 中）
docker run -d \
  --name ctrip-review \
  -p 3000:3000 \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  zhaoboya/ctrip-review-monitor:latest
```

打开浏览器访问 `http://localhost:3000`

### 方式二：docker-compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  comment-monitor:
    image: zhaoboya/ctrip-review-monitor:latest
    container_name: ctrip-review-monitor
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/prisma/data/reviews.db
    volumes:
      - review_data:/app/prisma/data
    shm_size: '2gb'

volumes:
  review_data:
```

```bash
docker compose up -d
```

### 挂载外部数据库文件

SQLite 运行时会产生 `.db`、`.db-wal`、`.db-shm` 三个文件，**必须挂载整个目录**而非单个文件。

```bash
# 假设你的数据库文件位于 /path/to/your/data/ 目录下
docker run -d \
  --name ctrip-review \
  -p 3000:3000 \
  -v /path/to/your/data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

**docker-compose 方式：**

```yaml
volumes:
  - /path/to/your/data:/app/prisma/data    # 替换为你的实际路径
```

**Windows 示例：**

```powershell
docker run -d `
  --name ctrip-review `
  -p 3000:3000 `
  -v "D:\my_data:/app/prisma/data" `
  --shm-size=2gb `
  --restart unless-stopped `
  -e DATABASE_URL=file:/app/prisma/data/reviews.db `
  zhaoboya/ctrip-review-monitor:latest
```

> **注意**：容器首次启动时会自动执行 `prisma db push`，如果挂载目录下已有 `reviews.db` 文件则会直接使用；如果没有则会自动创建空数据库。

### 镜像内容

| 组件 | 用途 |
|------|------|
| Next.js 15 Standalone | Web 服务（已编译） |
| Prisma CLI v6 | 数据库迁移 |
| Google Chrome 148 | CDP 爬虫引擎 |
| SQLite | 本地数据存储 |
| node-cron | 定时任务调度 |

## 相关文档

- [详细操作说明](USAGE.md)
- [开源协议](LICENSE.md)

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE.md](LICENSE.md)