# MarketStats

**Real Estate Market Intelligence by CertiHomes**

Production-grade market analytics dashboard built with Next.js, FastAPI, and MongoDB. Successor to the Streamlit prototype at [marketstats.certihomes.com](https://marketstats.certihomes.com).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  React 19 + TypeScript + Tailwind CSS + Recharts/D3     │
│  Google OAuth (NextAuth.js) | Server Components         │
├─────────────────────────────────────────────────────────┤
│                    API (FastAPI)                          │
│  Python 3.12 | Pydantic v2 | Motor (async MongoDB)      │
│  Endpoints: /metrics, /listings, /forecast, /export      │
├─────────────────────────────────────────────────────────┤
│                    DATABASE (MongoDB)                     │
│  172.26.1.151:27017 | housing-prices (~18.6M docs)       │
│  Collections: bridge-cjmls, bridge-fmls, trestle, tax   │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 15 (App Router) | SSR, file-based routing, React Server Components |
| **UI** | Tailwind CSS + shadcn/ui | BHS-inspired luxury design system |
| **Charts** | Recharts + D3.js | Interactive, performant, client-side rendering |
| **Maps** | Mapbox GL JS | Vector tiles, draw tools, fast rendering |
| **Auth** | NextAuth.js (Google OAuth) | Same Google OAuth credentials as Streamlit version |
| **API** | FastAPI | Async Python, auto-docs, Pydantic validation |
| **Database** | MongoDB (Motor) | Async driver, same DB as Streamlit version |
| **Export** | PDF (ReportLab), CSV, PNG (html2canvas) | Chart/report export |
| **Podcast** | Podcastfy API (existing) | Pre-generated market podcasts |

## Project Structure

```
marketstats/
├── frontend/                 # Next.js 15 app
│   ├── app/                  # App Router pages
│   │   ├── layout.tsx        # Root layout + auth provider
│   │   ├── page.tsx          # Landing / login
│   │   ├── dashboard/        # Market Analytics (main)
│   │   ├── forecast/         # Price Forecast
│   │   ├── browse/           # Browse Listings
│   │   ├── tax/              # Tax Analysis + Predictor
│   │   ├── report/           # Market Report (narrative)
│   │   └── admin/            # Branding, Feed Manager
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── charts/           # Recharts wrappers
│   │   ├── maps/             # Mapbox components
│   │   ├── filters/          # Sidebar filter controls
│   │   └── layout/           # Sidebar, MetricBar, TopBar
│   ├── lib/
│   │   ├── api.ts            # FastAPI client
│   │   ├── auth.ts           # NextAuth config
│   │   └── constants.ts      # Metrics, colors, formats
│   └── styles/
│       └── globals.css       # Tailwind + BHS design tokens
│
├── backend/                  # FastAPI app
│   ├── main.py               # FastAPI entry point
│   ├── routers/
│   │   ├── metrics.py        # /api/metrics — time-series data
│   │   ├── listings.py       # /api/listings — browse/filter
│   │   ├── forecast.py       # /api/forecast — price predictions
│   │   ├── tax.py            # /api/tax — tax analysis
│   │   ├── export.py         # /api/export — CSV/PDF/PNG
│   │   └── report.py         # /api/report — market report data
│   ├── models/
│   │   ├── schemas.py        # Pydantic request/response models
│   │   └── mls.py            # MLS data abstraction (from MLS.py)
│   ├── services/
│   │   ├── data_generator.py # Metric calculations (from data_generators.py)
│   │   ├── breakout.py       # Breakout analysis
│   │   └── forecast.py       # Forecasting models
│   ├── db.py                 # Motor async MongoDB connection
│   └── config.py             # Settings (env vars)
│
├── docker-compose.yml        # Frontend + Backend + Nginx
├── .env.example              # Template for env vars
└── README.md
```

## Key Features (Ported from Streamlit)

- **13 Market Metrics**: Sales Price, New Listings, Inventory, Pending Sales, Closed Sales, DOM, Months Supply, % List Price, $/SqFt, $ Volume, Absorption Rate, Price per Unit, List-to-Sale Ratio
- **4-Area Comparison**: Compare up to 4 geographies side-by-side
- **Map Mode**: Draw polygons/circles to define custom areas (Mapbox GL Draw)
- **Breakout Analysis**: Split metrics by Property Type, Price Range, Bedrooms, etc.
- **Chart Export**: CSV, PNG, PDF, Embed Code
- **Market Report**: Narrative report with KPIs, charts, tables, podcast
- **FastStats**: Quick statistical summary
- **Tax Analysis**: Property tax data and predictions
- **Google OAuth**: Same credentials, gated access
- **BHS Design System**: Playfair Display + Inter, gold accents, luxury aesthetic

## Performance Targets

| Metric | Streamlit (current) | Next.js (target) |
|--------|-------------------|-----------------|
| Initial page load | ~3-5s | <1s |
| Filter change | ~2-4s (full rerun) | <200ms (client-side) |
| Chart render | ~1-2s | <100ms |
| Mobile support | None | Full responsive |

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
npm run dev          # http://localhost:3000
```

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### Production
```bash
docker-compose up -d    # Builds and runs everything
```

## URLs
- **Production**: https://app.certihomes.com (planned)
- **Legacy Streamlit**: https://marketstats.certihomes.com
- **API Docs**: https://api.certihomes.com/docs

## Related Services
- **Podcastfy API**: https://podcastfy.certihomes.com (podcast generation)
- **Voicebox**: https://voicebox.certihomes.com (voice cloning TTS)
- **Claude Proxy**: localhost:8080 (LLM proxy for report generation)
