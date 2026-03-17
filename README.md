# MarketStats

**Real Estate Market Intelligence by CertiHomes**

Production-grade market analytics dashboard built with Next.js, FastAPI, and MongoDB. Replaces the Streamlit prototype (now at [streamlit.tlcengine.com](https://streamlit.tlcengine.com)).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                 │
│  React 19 + TypeScript + Tailwind CSS + Recharts        │
│  Google OAuth (NextAuth.js v5) | Turbopack              │
├─────────────────────────────────────────────────────────┤
│                    API (FastAPI)                          │
│  Python 3.12 | Pydantic v2 | Motor (async MongoDB)      │
│  Endpoints: /metrics, /listings, /geographies, /report   │
├─────────────────────────────────────────────────────────┤
│                    DATABASE (MongoDB)                     │
│  172.26.1.151:27017 | housing-prices (~18.6M docs)       │
│  Collections: bridge-cjmls, bridge-fmls, trestle, tax   │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 16 (App Router) | SSR, file-based routing, React Server Components |
| **UI** | Tailwind CSS + shadcn/ui | BHS-inspired luxury design system |
| **Charts** | Recharts | Interactive, performant, client-side rendering |
| **Maps** | Leaflet + react-leaflet | Open-source mapping with draw tools |
| **Auth** | NextAuth.js v5 (Google OAuth) | Same Google OAuth credentials as Streamlit version |
| **State** | Zustand | Lightweight client-side state management |
| **Data Fetching** | SWR | Stale-while-revalidate data fetching |
| **API** | FastAPI | Async Python, auto-docs, Pydantic validation |
| **Database** | MongoDB (Motor) | Async driver, same DB as Streamlit version |
| **Export** | CSV, PNG, PDF | Chart/report export |
| **Podcast** | Podcastfy API (existing) | Pre-generated market podcasts |

## Project Structure

```
marketstats/
├── frontend/                 # Next.js 16 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout + auth provider
│   │   │   ├── page.tsx          # Landing / login
│   │   │   └── (authenticated)/
│   │   │       ├── layout.tsx    # Sidebar + MetricProvider
│   │   │       ├── dashboard/    # Market Analytics (main)
│   │   │       ├── forecast/     # Price Forecast
│   │   │       ├── browse/       # Browse Listings
│   │   │       ├── tax/          # Tax Analysis + Predictor
│   │   │       ├── report/       # Market Report (narrative)
│   │   │       ├── faststats/    # FastStats
│   │   │       ├── account/      # My Account
│   │   │       └── admin/        # Branding, Feed Manager
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui primitives
│   │   │   ├── charts/           # MetricChart, ChartControls, ChartSkeleton
│   │   │   ├── maps/             # AreaMap (Leaflet)
│   │   │   ├── filters/          # AreaSelector, FilterSidebar
│   │   │   ├── layout/           # Sidebar, MobileNav, QuickFacts
│   │   │   └── providers/        # SessionProvider, MetricProvider
│   │   ├── lib/
│   │   │   ├── api.ts            # FastAPI client + types
│   │   │   ├── auth.ts           # NextAuth config (Google OAuth)
│   │   │   ├── constants.ts      # 13 metrics, colors, formats
│   │   │   ├── format.ts         # Number/date formatting
│   │   │   ├── hooks.ts          # SWR hooks (useStates, useMetrics, etc.)
│   │   │   ├── store.ts          # Zustand store (areas, filters, chart state)
│   │   │   ├── types.ts          # TypeScript types
│   │   │   └── utils.ts          # cn() utility
│   │   └── styles/
│   │       └── globals.css       # Tailwind + BHS design tokens
│   └── package.json
│
├── backend/                  # FastAPI app
│   ├── main.py               # FastAPI entry point + CORS
│   ├── routers/
│   │   ├── metrics.py        # /api/metrics — time-series data
│   │   ├── listings.py       # /api/listings — browse/filter
│   │   ├── geographies.py    # /api/geographies — states, counties, cities, zips
│   │   └── report.py         # /api/report — market report data
│   ├── models/
│   │   ├── schemas.py        # Pydantic request/response models
│   │   └── mls.py            # MLS data abstraction (async Motor)
│   ├── services/
│   │   ├── data_generator.py # 13 metric calculations
│   │   └── breakout.py       # Breakout analysis
│   ├── db.py                 # Motor async MongoDB connection
│   └── config.py             # Settings (env vars)
│
├── ecosystem.config.js       # PM2 config (frontend port 3002, backend port 8000)
├── start-api.sh              # Shell script to start FastAPI via PM2
└── README.md
```

## Key Features

- **13 Market Metrics**: Median/Average Sales Price, New Listings, Inventory, Pending Sales, Closed Sales, DOM, Months Supply, % List Price, $/SqFt, $ Volume, Absorption Rate, List-to-Sale Ratio
- **4-Area Comparison**: Compare up to 4 geographies side-by-side with colored tabs
- **Map Mode**: Leaflet map with listing markers and area boundaries
- **Breakout Analysis**: Split metrics by Property Type, Price Range, Bedrooms, etc.
- **Chart Export**: CSV, PNG, PDF, Embed Code
- **Market Report**: Narrative report with KPIs, charts, tables, podcast
- **FastStats**: Quick statistical summary
- **Google OAuth**: Gated access with Google sign-in
- **BHS Design System**: Playfair Display + Inter, gold accents (#DAAA00), luxury aesthetic

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- MongoDB access (172.26.1.151:27017)

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev -- -p 3002     # http://localhost:3002
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Production (PM2)
```bash
# Start both services
pm2 start "npm run dev -- -p 3002" --name marketstats-frontend --cwd /home/krish/marketstats/frontend
pm2 start /home/krish/marketstats/start-api.sh --name marketstats-api

# Or use ecosystem config
pm2 start ecosystem.config.js
```

## URLs
- **Production**: https://marketstats.certihomes.com (Nginx → Next.js :3002 + FastAPI :8000)
- **Legacy Streamlit**: https://streamlit.tlcengine.com (Nginx → Streamlit :8501)
- **API Docs**: http://localhost:8000/docs (FastAPI auto-generated)

## Nginx Routing
- `/` → Next.js frontend (port 3002)
- `/api/auth/` → Next.js NextAuth routes (port 3002)
- `/api/*` → FastAPI backend (port 8000)

## Related Services
- **Podcastfy API**: https://podcastfy.certihomes.com (podcast generation)
- **Voicebox**: https://voicebox.certihomes.com (voice cloning TTS)
- **Claude Proxy**: localhost:8080 (LLM proxy for report generation)
