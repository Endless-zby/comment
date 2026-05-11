# 携程酒店评价监控系统 | Ctrip Hotel Review Monitor

<div align="center">

**酒店评价数据采集与管理平台**

**Hotel Review Data Collection and Management Platform**

---

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-green.svg)](https://prisma.io/)

</div>

---

## 选择语言 | Select Language

| 语言 | 文档 |
|------|------|
| 🇨🇳 **中文** | [README_CN.md](README_CN.md) |
| 🇺🇸 **English** | [README_EN.md](README_EN.md) |

---

## 项目简介 | Project Overview

### 中文

携程酒店评价监控系统是一个基于 Next.js 开发的酒店评价数据采集与管理平台。系统支持从携程和飞猪平台自动抓取酒店评价数据，提供数据可视化分析、评价筛选、数据导出等功能。

### English

Ctrip Hotel Review Monitor is a hotel review data collection and management platform built with Next.js. The system automatically scrapes hotel review data from Ctrip and Fliggy platforms, providing data visualization, filtering, and export capabilities.

---

## 核心功能 | Core Features

| 功能 | Feature |
|------|---------|
| 多平台支持（携程/飞猪） | Multi-platform support (Ctrip/Fliggy) |
| 自动采集与增量更新 | Auto collection with incremental updates |
| 数据可视化与入驻日期标记 | Data visualization with onboard date markers |
| AI 评价摘要报告（DeepSeek） | AI-powered weekly review summary (DeepSeek) |
| 多维度筛选 | Multi-dimensional filtering |
| Excel数据导出 | Excel data export |
| 定时任务管理 | Scheduled task management |
| Docker 一键部署 | One-click Docker deployment |

---

## 技术栈 | Tech Stack

`Next.js 15` · `React 19` · `shadcn/ui` · `Tailwind CSS` · `Prisma ORM` · `SQLite` · `Puppeteer` · `node-cron` · `Recharts` · `Docker`

---

## 快速开始 | Quick Start

### 方式一：Docker 部署（推荐，无需安装依赖）

```bash
docker run -d \
  --name ctrip-review \
  -p 3000:3000 \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  zhaoboya/ctrip-review-monitor:latest
```

访问 http://localhost:3000

> 容器内已包含 Node.js、Google Chrome、编译后的 Web 产物，无需在宿主机安装任何依赖。

**挂载外部数据库：**

```bash
# Linux/Mac
docker run -d ... -v /path/to/your/data:/app/prisma/data ...

# Windows
docker run -d ... -v "D:\my_data:/app/prisma/data" ...
```

### 方式二：源码开发

```bash
# 安装依赖 | Install dependencies
npm install

# 初始化数据库 | Initialize database
npm run db:push && npm run db:generate

# 启动服务 | Start server
npm run dev
```

访问 http://localhost:3000

---

## 相关文档 | Related Documents

| 文档 | 说明 |
|------|------|
| [USAGE.md](USAGE.md) | 详细操作说明 |
| [LICENSE.md](LICENSE.md) | MIT 开源协议 |

---

<div align="center">

**Made with ❤️ by Ctrip Review Monitor Team**

</div>