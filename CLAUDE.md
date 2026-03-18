# MarketStats Next.js — CLAUDE.md

## Project Overview
Production-grade real estate market analytics dashboard. Next.js 16 frontend + FastAPI backend + MongoDB.
- **Production URL:** https://marketstats.certihomes.com
- **GitHub:** https://github.com/tlcengine/marketstats (private)
- **Legacy Streamlit:** https://streamlit.tlcengine.com (publicly accessible, no login)

## Tech Stack
- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui (Radix primitives)
- **Charts:** Recharts
- **Maps:** Leaflet + react-leaflet + leaflet-draw (polygon/circle/rectangle)
- **State:** Zustand (client state), SWR (server data)
- **Auth:** NextAuth.js v5 with Google OAuth provider
- **Export:** html2canvas-pro (PNG), jsPDF (PDF), CSV, embed code
- **API:** FastAPI, Python 3.12, Pydantic v2
- **Database:** MongoDB via Motor (async) — same DB as Streamlit version
- **Deployment:** PM2 (production build via `next start`), Nginx reverse proxy, Let's Encrypt SSL

## Key Commands
```bash
# Frontend dev
cd frontend && npm run dev -- -p 3002

# Backend dev
cd backend && uvicorn main:app --reload --port 8000

# Build frontend (production)
cd frontend && npm run build

# Start production frontend
cd frontend && npx next start -p 3002

# Type check
cd frontend && npx tsc --noEmit

# Lint
cd frontend && npm run lint

# Production (PM2)
pm2 restart marketstats-frontend
pm2 restart marketstats-api

# API docs
open http://localhost:8000/docs
```

## Architecture
- `frontend/src/app/` — Next.js App Router pages (SSR + client components)
- `frontend/src/app/(authenticated)/` — Protected routes (all pages below)
- `frontend/src/components/` — Reusable React components (charts, filters, layout, maps, ui)
- `frontend/src/lib/` — Utilities, API client, auth config, constants, Zustand store, SWR hooks
- `backend/routers/` — FastAPI route handlers (metrics, listings, geographies, report, tax, faststats, forecast, feeds, branding)
- `backend/services/` — Business logic (data_generator, breakout)
- `backend/models/` — Pydantic schemas + MLS data abstraction (async Motor)
- `backend/db.py` — Async MongoDB connection

## Pages (14 routes)
| Route | Page | Description |
|-------|------|-------------|
| `/` | Login | Google OAuth sign-in |
| `/dashboard` | Market Analytics | InfoSparks-style chart + filters + map |
| `/browse` | Browse Listings | Sortable data table + detail slide-out |
| `/forecast` | Price Forecast | Linear regression + confidence band |
| `/tax` | Tax Analysis | Distribution histograms, effective rates, property search |
| `/tax/predictor` | Tax Predictor | Comparable-based tax prediction |
| `/faststats` | FastStats | 13 KPI cards with YoY change |
| `/report` | Market Report | LinkedIn-style narrative + podcast + charts |
| `/admin/branding` | Branding | Agent profile form + live preview |
| `/admin/feeds` | Feed Manager | 9 MLS feeds with status + sync trigger |
| `/account` | My Account | User profile and settings |

## Backend API Endpoints
| Route | Router | Description |
|-------|--------|-------------|
| `/api/metrics` | metrics.py | Time-series metric data (13 metrics) |
| `/api/listings` | listings.py | Browse/filter listings with pagination |
| `/api/geographies` | geographies.py | States, counties, cities, zips |
| `/api/report` | report.py | Market report data, narrative, podcast URL |
| `/api/forecast` | forecast.py | Historical + forecast with confidence band |
| `/api/tax` | tax.py | Tax summary, distribution, search, predict |
| `/api/faststats` | faststats.py | All 13 metrics for a geography/month |
| `/api/feeds` | feeds.py | MLS feed status, doc counts, sync trigger |
| `/api/branding` | branding.py | Agent branding profile CRUD |

## PM2 Process Names
- `marketstats-frontend` — Next.js production build on port 3002 (via `start-frontend.sh`)
- `marketstats-api` — FastAPI on port 8000 (via `start-api.sh`)

## Nginx Routing (marketstats.certihomes.com)
- `/` → Next.js (port 3002)
- `/api/auth/` → Next.js NextAuth (port 3002) — MUST come before /api/ catch-all
- `/api/` → FastAPI (port 8000)

## Database
- MongoDB at `172.26.1.151:27017`, database `housing-prices`
- Collections: `bridge-cjmls` (~298K NJ), `bridge-fmls` (~1.2M GA), `trestle` (410K NY stale)
- Tax: `tax-assessment-data` (12.7M), `tax-data-parcelmod` (3.6M)

## Design System (BHS-Inspired)
- **Fonts:** Playfair Display (headings), Inter (body)
- **Colors:** Gold `#DAAA00`, Black `#000000`, Cream `#FAF9F7`, Gray `#53555A`, Border `#D9D8D6`, Navy `#1B2D4B`
- **Geometry:** Sharp corners (0px radius on data elements), 6px on cards
- **Buttons:** Black with white text, uppercase for nav

## OAuth Setup
- Same Google OAuth client as Streamlit version
- Credentials in `frontend/.env.local`: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `NEXTAUTH_SECRET`
- Google Cloud Console must have redirect URI: `https://marketstats.certihomes.com/api/auth/callback/google`
- `AUTH_TRUST_HOST=true` required for running behind Nginx proxy

## Market Report (report/page.tsx)
- Featured cities: Edison, Princeton, Monroe (CJMLS)
- Dynamic headlines: 7 buckets × 3 variants, indexed by city position
- Sections: banner, share bar, podcast, narrative (supply/demand/segments/quote/recommendations), charts (3 tabs), YoY table, recent sales, price distribution
- Podcast: podcastfy API at podcastfy.certihomes.com, brewing animation while generating

## 13 Metrics
1. Median Sales Price
2. New Listings
3. Inventory (Active Listings)
4. Pending Sales
5. Closed Sales
6. Days on Market (Median)
7. Months Supply of Inventory
8. Percent of List Price Received
9. Price Per Square Foot
10. Total Dollar Volume
11. Absorption Rate
12. Average Sales Price
13. List-to-Sale Ratio

## Do NOT Commit
- `.env` / `.env.local` (credentials)
- `node_modules/`
- `.next/`
- `__pycache__/`
- `*.pkl` model files
