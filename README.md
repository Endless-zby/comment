<div align="center">

<img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License">
<img src="https://img.shields.io/badge/Next.js-15-black.svg?style=flat-square&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/Prisma-ORM-2D3748.svg?style=flat-square&logo=prisma" alt="Prisma">
<img src="https://img.shields.io/badge/Docker-available-2496ED.svg?style=flat-square&logo=docker" alt="Docker">

</div>

<br>

# Hotel Review Monitor

**酒店评价监控系统** — 从携程、飞猪等 OTA 平台自动采集酒店评价，提供多维数据可视化与 AI 驱动的智能分析。

*Automated hotel review collection from Ctrip & Fliggy, with multi-dimensional analytics and AI-powered insights.*

---

## 📖 Documentation

| Language | Document |
|:--------:|:---------|
| 🇨🇳 **简体中文** | [README_CN.md](./README_CN.md) |
| 🇺🇸 **English** | [README_EN.md](./README_EN.md) |

## 🚀 Quick Start

```bash
docker run -d \
  --name ctrip-review \
  -p 3000:3000 \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

Then open **http://localhost:3000**

> The image includes Node.js, Google Chrome, and all compiled artifacts — **no host dependencies needed**. For detailed installation, database mounting, and source-code development, see [简体中文](./README_CN.md) or [English](./README_EN.md).

## ✨ Highlights

- 🔍 **Multi-Platform** — Ctrip & Fliggy, with CDP-based anti-detection
- 📊 **Rich Charts** — Trends, sentiment timelines, heatmaps, word clouds
- 🗓️ **Onboard Date Markers** — Before/after comparison on time-series charts
- 🤖 **AI Weekly Reports** — Auto-generated summaries via DeepSeek
- 🐳 **One-Click Docker** — Pull and run, Chrome included
- 📦 **SQLite + Prisma** — Zero external database dependencies

## 📜 License

This project is licensed under the [MIT License](./LICENSE.md).
