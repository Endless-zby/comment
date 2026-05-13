<div align="center">

<img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License">
<img src="https://img.shields.io/badge/Next.js-15-black.svg?style=flat-square&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/Prisma-ORM-2D3748.svg?style=flat-square&logo=prisma" alt="Prisma">
<img src="https://img.shields.io/badge/Docker-available-2496ED.svg?style=flat-square&logo=docker" alt="Docker">

<br>
<br>

<h1>Hotel Review Monitor</h1>

Automated hotel review collection from Ctrip & Fliggy OTA platforms, with **multi-dimensional analytics** and **AI-powered insights** — helping hotel managers monitor guest feedback and track trends in real-time.

</div>

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Docker (Recommended)](#docker-recommended)
  - [Source Code Development](#source-code-development)
- [Deployment Guide](#deployment-guide)
  - [Built-in Database](#scenario-a-built-in-database)
  - [Mount Existing Database](#scenario-b-mount-existing-database)
  - [Container Management](#management-commands)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [Data Model](#data-model)
- [Environment Variables](#environment-variables)
- [Self-Hosting](#self-hosting)
- [License](#license)

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| 🌐 **Multi-Platform** | Supports Ctrip and Fliggy OTA platforms |
| ⏰ **Scheduled Collection** | node-cron based scheduled tasks with incremental updates |
| 📊 **Rich Visualizations** | Weekly trends, rating curves, sentiment timelines, distributions, comparisons, heatmaps, word clouds |
| 🗓️ **Onboard Date Markers** | Set onboard date per hotel, displayed as vertical reference lines on time-series charts for before/after comparison |
| 🤖 **AI Weekly Reports** | DeepSeek-powered auto-generated weekly review summaries, saved for historical browsing |
| 🛡️ **Review Source Tracing** | Match H5 "copy review content" events with platform reviews via LCS similarity to detect AI-generated review copying |
| 🔗 **Backend Hotel Binding** | Link hotels to backend system via platformId, with remote hotel search & auto-fill |
| 🔍 **Multi-Dim Filtering** | Filter reviews by hotel, platform, rating, and keyword |
| 📥 **Excel Export** | One-click export filtered results as Excel, including images |

### Technical Highlights

| Feature | Description |
|---------|-------------|
| 🏗️ **Three-Layer Architecture** | Clean separation of presentation, service, and data layers |
| 🛡️ **Anti-Detection Engine** | Puppeteer + Stealth plugin mimicking real browser environments |
| 📡 **CDP Interception** | Direct API response capture via Chrome DevTools Protocol for efficient Fliggy data collection |
| 🧩 **Incremental Fetching** | Smart first-run vs. incremental detection with progress-based resume |
| 🎨 **Responsive UI** | Modern shadcn/ui + Tailwind CSS interface with light/dark mode support |
| 📡 **ES Event Querying** | Integrates with Elasticsearch to query H5 "copy review content" tracking events in real-time |

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 19 |
| UI Library | shadcn/ui + Tailwind CSS 4 |
| Database | SQLite + Prisma ORM |
| Crawler Engine | Puppeteer + puppeteer-extra + Stealth Plugin |
| Scheduling | node-cron |
| Charts | Recharts |
| Export | xlsx |
| Validation | Zod |
| AI Model | DeepSeek (OpenAI-compatible API) |
| Containerization | Docker (multi-stage build) |

---

## Getting Started

### Docker (Recommended)

The image is publicly available on Docker Hub — **pull and run, no dependencies needed**. It includes Node.js, Google Chrome, and all compiled artifacts.

| Property | Value |
|----------|-------|
| Image | `zhaoboya/ctrip-review-monitor:latest` |
| Base OS | Debian 12 (Bookworm) |
| Runtime | Node.js 20 + Google Chrome 148 |
| Port | 3000 |
| Shared Memory | ≥ 2GB (`--shm-size=2gb`) |

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

Open **http://localhost:3000** — the database starts empty. Add hotels via the Hotels page to begin.

### Source Code Development

**Requirements**

- Node.js >= 18.0
- pnpm (recommended) or npm

```bash
# Clone the repository
git clone https://github.com/yourusername/comment.git
cd comment

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_URL="file:./data/reviews.db"

# Initialize database
pnpm db:push && pnpm db:generate

# Start dev server
pnpm dev
```

Open **http://localhost:3000**

---

## Deployment Guide

### Scenario A: Built-in Database

For first-time deployment with no existing data. Data lives in a Docker-managed volume — safe from container removal.

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

Start:

```bash
docker compose up -d
```

> Using `network_mode: "host"` shares the host network with the container — no port mapping needed. The service listens on host port 3000 directly, and the container can access host VPN networks (e.g., ES, hotelList APIs).

### Scenario B: Mount Existing Database

For migrating from source development to Docker, or preserving existing hotels and reviews.

> ⚠️ SQLite generates `reviews.db`, `reviews.db-wal`, `reviews.db-shm` — **mount the entire directory**, not just the `.db` file.

```bash
# Linux / macOS
# Assuming data at ~/comment/prisma/data/
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
# Assuming data at D:\comment\prisma\data\
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

With docker compose:

```yaml
# docker-compose.yml
services:
  comment-monitor:
    # ... same config as above ...
    volumes:
      - ~/comment/prisma/data:/app/prisma/data         # Linux/Mac
      # - D:\comment\prisma\data:/app/prisma/data      # Windows
```

### Management Commands

```bash
# Check status
docker ps -a --filter name=ctrip-review

# View logs
docker logs -f ctrip-review

# Restart
docker restart ctrip-review

# Stop
docker stop ctrip-review

# Remove container (volume data persists)
docker rm -f ctrip-review

# Locate data volume
docker volume inspect review_data
```

---

## Project Structure

```
comment/
├── prisma/
│   ├── schema.prisma         # Data model definitions
│   └── data/                 # SQLite database files
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API route layer
│   │   │   ├── hotels/       # Hotel CRUD
│   │   │   ├── reviews/      # Review queries & stats
│   │   │   ├── configs/      # Fetch configuration
│   │   │   ├── fetch/        # Trigger data fetch
│   │   │   ├── dashboard/    # Dashboard statistics
│   │   │   ├── settings/     # Global settings (API keys, etc.)
│   │   │   ├── ai/           # AI weekly report generation
│   │   │   ├── remote/       # Remote hotel list proxy
│   │   │   └── track/        # Review source tracing (event query & matching)
│   │   ├── dashboard/        # Dashboard page
│   │   ├── hotels/           # Hotel management page
│   │   ├── reviews/          # Review list page
│   │   ├── configs/          # Configuration page
│   │   ├── stats/            # Statistics page
│   │   ├── settings/         # Settings page
│   │   ├── wordcloud/        # Word cloud page
│   │   ├── ai-report/        # AI weekly report page
│   │   └── track-match/      # Review source tracing page
│   ├── components/           # Shared components
│   │   ├── layout/           # Layout (sidebar, navbar)
│   │   └── ui/               # shadcn/ui base components
│   ├── lib/                  # Utilities
│   │   ├── prisma.ts         # Prisma client singleton
│   │   ├── utils.ts          # Common helpers
│   │   └── validators.ts     # Zod schema validators
│   └── services/             # Service layer
│       ├── crawler/          # Crawler engine (Puppeteer / CDP)
│       ├── scheduler/        # Scheduled task management
│       ├── track-match/      # Review source tracing service (ES query & LCS matching)
│       └── logger/           # Logging service
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Dev/prod Compose config
├── docker-compose.prod.yml   # Production Compose (no source needed)
├── docker-entrypoint.sh      # Container startup script
├── next.config.ts            # Next.js configuration
├── package.json              # Project dependencies
└── .env.example              # Environment variable template
```

---

## Pages

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/dashboard` | Overview, rating distribution, recent reviews |
| Hotels | `/hotels` | Add / edit / delete hotels, set onboard date |
| Reviews | `/reviews` | Multi-dimensional filtering, image viewer, Excel export |
| Configs | `/configs` | Fetch parameters, manual trigger, logs |
| Stats | `/stats` | Weekly bar charts, rating line charts, sentiment area charts, heatmaps |
| Word Cloud | `/wordcloud` | Keyword word cloud, top-N tag statistics |
| AI Report | `/ai-report` | Generate AI weekly reports per hotel, view history |
| Source Tracing | `/track-match` | Query H5 copy events, match with platform reviews, detect AI-generated reviews |
| Settings | `/settings` | Configure DeepSeek API Key, Ctrip/Fliggy cookies, source tracing parameters |

---

## Data Model

### Hotel
| Field | Type | Description |
|-------|------|-------------|
| `hotelName` | String | Hotel name |
| `ctripHotelId` | String? | Ctrip hotel ID (unique) |
| `fliggyHotelId` | String? | Fliggy hotel ID (unique) |
| `platformId` | String? | Backend hotel ID (unique), used for backend system binding and review source tracing |
| `city` | String? | City |
| `onboardDate` | String? | Onboard date (YYYY-MM-DD), displayed as timeline marker |
| `isActive` | Boolean | Active status — disabled hotels will not be fetched |

### Review
| Field | Type | Description |
|-------|------|-------------|
| `rating` | Float | Rating (0–5) |
| `content` | String? | Review body |
| `roomName` | String? | Room type |
| `checkInDate` | String? | Check-in date |
| `reviewDate` | String? | Review date |
| `reviewer` | String? | Reviewer nickname |
| `hotelReply` | String? | Hotel reply text |
| `imageList` | String[] | Photo URLs |
| `platform` | String | Source platform (ctrip / fliggy) |

### AiReport
| Field | Type | Description |
|-------|------|-------------|
| `hotelId` | Int | Linked hotel (unique — one report per hotel) |
| `summary` | String | Markdown summary report |
| `weekRange` | String | Statistic date range |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DATABASE_URL` | Yes | `file:./data/reviews.db` | SQLite database path |
| `NODE_ENV` | — | `development` | Runtime environment; use `production` in Docker |
| `PORT` | — | `3000` | HTTP server port |

API keys, cookies, and source tracing configuration (ES URL, index name, remote hotel API URL, similarity threshold) are configured via the Settings web page and stored in the database — no environment variables needed for secrets.

---

## Self-Hosting

To build your own image and push to a private registry:

```bash
# Build image
docker build -t your-registry/ctrip-review-monitor:latest .

# Push
docker push your-registry/ctrip-review-monitor:latest
```

The multi-stage build consists of three core layers:

| Layer | Base Image | Artifact |
|-------|-----------|----------|
| deps | `node:20-slim` | Frozen pnpm dependencies |
| builder | `node:20-slim` | Next.js standalone output |
| runner | `node:20-slim` | Chrome + runtime libs + app code |

---

## License

This project is licensed under the [MIT License](./LICENSE.md).

<div align="center">
<br>
<sub>Built with ❤️ by Hotel Review Monitor Team</sub>
</div>
