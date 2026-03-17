# MarketStats Next.js — CLAUDE.md

## Project Overview
Production-grade real estate market analytics dashboard. Next.js 15 frontend + FastAPI backend + MongoDB.
- **Production URL:** https://marketstats.certihomes.com
- **Legacy Streamlit:** https://streamlit.tlcengine.com

## Tech Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui (Radix primitives)
- **Charts:** Recharts (primary) + D3.js (custom visualizations)
- **Maps:** Mapbox GL JS + @mapbox/mapbox-gl-draw
- **Auth:** NextAuth.js with Google OAuth provider
- **API:** FastAPI, Python 3.12, Pydantic v2
- **Database:** MongoDB via Motor (async) — same DB as Streamlit version
- **Deployment:** Docker Compose, Nginx reverse proxy, PM2

## Key Commands
```bash
# Frontend dev
cd frontend && npm run dev

# Backend dev
cd backend && uvicorn main:app --reload --port 8000

# Build frontend
cd frontend && npm run build

# Type check
cd frontend && npx tsc --noEmit

# Lint
cd frontend && npm run lint

# Production
docker-compose up -d --build

# API docs
open http://localhost:8000/docs
```

## Architecture
- `frontend/app/` — Next.js App Router pages (SSR + client components)
- `frontend/components/` — Reusable React components
- `frontend/lib/` — Utilities, API client, auth config, constants
- `backend/routers/` — FastAPI route handlers
- `backend/services/` — Business logic (metric calculations, forecasting)
- `backend/models/` — Pydantic schemas
- `backend/db.py` — Async MongoDB connection (Motor)

## Database
- MongoDB at `172.26.1.151:27017`, database `housing-prices`
- Collections: `bridge-cjmls` (~298K NJ), `bridge-fmls` (~1.2M GA), `trestle` (410K NY stale)
- Tax: `tax-assessment-data` (12.7M), `tax-data-parcelmod` (3.6M)

## Design System (BHS-Inspired)
- **Fonts:** Playfair Display (headings), Inter (body)
- **Colors:** Gold `#DAAA00`, Black `#000000`, Cream `#FAF9F7`, Gray `#53555A`, Border `#D9D8D6`
- **Geometry:** Sharp corners (0px radius on data elements), 6px on cards
- **Buttons:** Black with white text, uppercase for nav

## OAuth Credentials
Same as Streamlit version — stored in `.env`:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

## Migration from Streamlit
The Streamlit prototype lives at `/DataDrive/krish/krish/housingPrices/housingpricesdashboard/`.
Key files to port:
- `dashboard/data_generators.py` → `backend/services/data_generator.py`
- `dashboard/constants.py` → `frontend/lib/constants.ts` + `backend/models/schemas.py`
- `MLS.py` → `backend/models/mls.py`
- `breakout.py` → `backend/services/breakout.py`
- `config.py` → `backend/config.py` + `backend/db.py`
- Chart rendering → Recharts components in `frontend/components/charts/`

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
