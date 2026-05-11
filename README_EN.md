# Ctrip Hotel Review Monitor

**[中文版本](README_CN.md)** | **[Back to Home](README.md)**

## Project Overview

Ctrip Hotel Review Monitor is a hotel review data collection and management platform built with Next.js. The system automatically scrapes hotel review data from Ctrip and Fliggy platforms, providing data visualization, filtering, and export capabilities to help hotel managers monitor and analyze guest feedback in real-time.

## Features

### Core Features

- **Multi-Platform Support**: Supports both Ctrip and Fliggy OTA platforms
- **Auto Collection**: Scheduled automatic review fetching with incremental updates
- **Data Visualization**: Weekly trends, rating trends, sentiment timeline, distribution, heatmap, word cloud and more
- **Onboard Date Markers**: Set onboard date per hotel; displayed as reference lines on time-series charts for before/after comparison
- **AI Weekly Report**: Auto-generated review summaries via DeepSeek AI, saved for historical viewing
- **Data Filtering**: Multi-dimensional filtering by hotel, platform, rating, keyword
- **Data Export**: Excel export with complete review information

### Technical Highlights

- **Three-Layer Architecture**: Strict separation of presentation, service, and data layers
- **Anti-Detection**: Puppeteer + Stealth plugin to bypass detection
- **Incremental Fetching**: Smart detection of first/incremental fetch to avoid duplicates
- **CDP Interception**: Direct API response capture via Chrome DevTools Protocol
- **Responsive Design**: Modern UI based on shadcn/ui

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 15 + React 19 |
| UI Components | shadcn/ui + Tailwind CSS |
| Database | SQLite + Prisma ORM |
| Scraping Engine | Puppeteer + puppeteer-extra |
| Scheduling | node-cron |
| Data Export | xlsx |
| Visualization | Recharts |
| Deployment | Docker |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   │   ├── hotels/         # Hotel management endpoints
│   │   ├── reviews/        # Review data endpoints
│   │   ├── configs/        # Configuration endpoints
│   │   ├── fetch/          # Data fetch endpoints
│   │   ├── dashboard/      # Dashboard stats endpoints
│   │   └── settings/       # Global settings endpoints
│   ├── hotels/             # Hotel management page
│   ├── reviews/            # Review list page
│   ├── configs/            # Configuration page
│   ├── dashboard/          # Dashboard page
│   ├── stats/              # Statistics page
│   └── settings/           # Settings page
├── components/             # React components
│   ├── layout/             # Layout components
│   └── ui/                 # Base UI components
├── lib/                    # Utilities
│   ├── prisma.ts           # Prisma client
│   ├── utils.ts            # Common utilities
│   └── validators.ts       # Data validators
├── services/               # Service layer
│   ├── crawler/            # Crawler services
│   ├── scheduler/          # Scheduling service
│   └── logger/             # Logging service
└── types/                  # TypeScript type definitions
```

## Quick Start

### Method 1: Docker (Recommended - No Dependencies Required)

```bash
docker run -d \
  --name ctrip-review \
  -p 3000:3000 \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  zhaoboya/ctrip-review-monitor:latest
```

Visit http://localhost:3000

> The image includes Node.js, Google Chrome, and all compiled artifacts. No dependencies need to be installed on the host.

**Mount an existing database:**

```bash
# Linux/Mac
docker run -d ... -v /path/to/your/data:/app/prisma/data ...

# Windows
docker run -d ... -v "D:\my_data:/app/prisma/data" ...
```

### Method 2: Source Code Development

### Requirements

- Node.js >= 18.0
- npm or pnpm

### Installation

```bash
# Clone the project
git clone <repository-url>
cd comment

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env file, set DATABASE_URL

# Initialize database
npm run db:push
npm run db:generate

# Start development server
npm run dev
```

### Access

Open browser and visit http://localhost:3000

### Data Model

#### Hotel
- Name, Ctrip ID, Fliggy ID
- City, Onboard Date, Total Reviews, Average Score
- Active Status, Created At
- **Onboard Date**: Optional, YYYY-MM-DD. Displayed as reference line on time-series charts for before/after comparison.

## Main Pages

| Page | Path | Function |
|------|------|----------|
| Dashboard | `/dashboard` | Overview, rating distribution, trends |
| Hotels | `/hotels` | Add/edit/delete hotels |
| Reviews | `/reviews` | View/filter/export reviews |
| Configs | `/configs` | Fetch parameters, scheduling |
| Stats | `/stats` | Detailed analysis, weekly reports |
| Settings | `/settings` | Global configuration |

## Data Models

### Hotel
- Name, Ctrip ID, Fliggy ID
- City, total reviews, average rating

### Review
- Rating, content, room type, check-in date
- Reviewer, review date, image list
- Hotel reply, platform source

### Config
- Fetch interval, page size, fetch mode
- Last fetch time, total fetched count

### FetchLog
- Status, new count, pages fetched
- Error message, created time

## Related Documents

- [Detailed Usage Guide](USAGE.md)
- [License](LICENSE.md)

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.