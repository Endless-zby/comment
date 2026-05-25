<div align="center">

<img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License">
<img src="https://img.shields.io/badge/Next.js-15-black.svg?style=flat-square&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/Prisma-ORM-2D3748.svg?style=flat-square&logo=prisma" alt="Prisma">
<img src="https://img.shields.io/badge/Docker-available-2496ED.svg?style=flat-square&logo=docker" alt="Docker">

<br>
<br>

<h1>🏨 Hotel Review Monitor</h1>
<h3>酒店评价监控系统</h3>

从携程、飞猪等 OTA 平台自动采集酒店评价，提供**多维数据可视化**与 **AI 智能分析**

*Automated hotel review collection from Ctrip & Fliggy, with multi-dimensional analytics and AI-powered insights.*

</div>

---

## 🚀 Quick Start

**One command to run — no host dependencies needed.** The image includes Node.js, Google Chrome, and all compiled artifacts.

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

Then open **http://localhost:3000** — add hotels and start collecting reviews.

---

## 📋 Image Info

| Property | Value |
|----------|-------|
| Image | `zhaoboya/ctrip-review-monitor:latest` |
| Base OS | Debian 12 (Bookworm) |
| Runtime | Node.js 20 + Google Chrome |
| Port | `3000` |
| Shared Memory | ≥ 2GB (`--shm-size=2gb`) |
| Database | SQLite (built-in, zero config) |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🌐 **Multi-Platform** | Ctrip & Fliggy OTA platforms with CDP-based anti-detection |
| ⏰ **Scheduled Collection** | Auto-fetch with incremental updates via node-cron |
| 📊 **Rich Visualizations** | Trends, sentiment timelines, heatmaps, word clouds, rating distributions |
| 🗓️ **Onboard Date Markers** | Vertical reference lines on time-series charts for before/after comparison |
| 🤖 **AI Weekly Reports** | DeepSeek-powered auto-generated weekly review summaries |
| 🛡️ **Review Source Tracing** | Match H5 copy events with platform reviews via LCS similarity |
| 🔗 **Backend Hotel Binding** | Link hotels to backend system via platformId |
| 📥 **Excel Export** | One-click export with images and full review data |

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DATABASE_URL` | Yes | `file:/app/prisma/data/reviews.db` | SQLite database path |
| `NODE_ENV` | — | `production` | Runtime environment |
| `PORT` | — | `3000` | HTTP server port |

> API keys, cookies, and source tracing config are set via the **Settings page** in the web UI — no env vars needed for secrets.

---

## 📂 Data Persistence

### Option A: Docker Volume (Recommended)

```bash
-v review_data:/app/prisma/data
```

Data survives container removal. Only lost if you explicitly delete the volume.

### Option B: Host Directory Mount

```bash
# Linux / macOS
-v ~/comment/prisma/data:/app/prisma/data

# Windows
-v "D:\comment\prisma\data:/app/prisma/data"
```

> ⚠️ Mount the **entire directory**, not just the `.db` file. SQLite generates `.db-wal` and `.db-shm` files.

---

## 🐙 Docker Compose

```yaml
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
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/hotels"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  review_data:
    driver: local
```

```bash
docker compose up -d
```

---

## 🛠️ Management Commands

```bash
# Check status
docker ps -a --filter name=ctrip-review

# View logs
docker logs -f ctrip-review

# Restart
docker restart ctrip-review

# Stop
docker stop ctrip-review

# Remove container (data preserved in volume)
docker rm -f ctrip-review

# Backup database
docker run --rm -v review_data:/data -v $(pwd):/backup alpine tar czf /backup/reviews-backup.tar.gz -C /data .
```

---

## 🏗️ Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 19 |
| UI | shadcn/ui + Tailwind CSS 4 |
| Database | SQLite + Prisma ORM |
| Crawler | Puppeteer + Stealth Plugin |
| AI | DeepSeek (OpenAI-compatible API) |
| Build | Docker multi-stage (deps → builder → runner) |

---

## 📜 License

[MIT License](https://github.com/yourusername/comment/blob/main/LICENSE.md)

<div align="center">
<br>
<sub>Built with ❤️ by Hotel Review Monitor Team</sub>
</div>
