# 携程酒店评价监控系统

**[English Version](README_EN.md)** | **[返回首页](README.md)**

## 项目简介

携程酒店评价监控系统是一个基于 Next.js 开发的酒店评价数据采集与管理平台。系统支持从携程和飞猪平台自动抓取酒店评价数据，提供数据可视化分析、评价筛选、数据导出等功能，帮助酒店管理者实时监控和分析住客反馈。

## 功能特性

### 核心功能

- **多平台支持**：支持携程（Ctrip）和飞猪（Fliggy）两大主流OTA平台
- **自动采集**：定时自动拉取酒店评价数据，支持增量更新
- **数据管理**：酒店信息管理、评价配置管理、拉取日志追踪
- **数据分析**：评分分布统计、评价趋势分析、周报汇总
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
- 城市、总评价数、平均评分

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

## 相关文档

- [详细操作说明](USAGE.md)
- [开源协议](LICENSE.md)

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE.md](LICENSE.md)