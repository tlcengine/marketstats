# MarketStats Next.js — CLAUDE.md

## Project Overview
Production-grade real estate market analytics dashboard. Next.js 16 frontend + FastAPI backend + MongoDB.
- **Production URL:** https://marketstats.certihomes.com
- **Legacy Streamlit:** https://streamlit.tlcengine.com

## Tech Stack
- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui (Radix primitives)
- **Charts:** Recharts
- **Maps:** Leaflet + react-leaflet
- **State:** Zustand (client state), SWR (server data)
- **Auth:** NextAuth.js v5 with Google OAuth provider
- **API:** FastAPI, Python 3.12, Pydantic v2
- **Database:** MongoDB via Motor (async) — same DB as Streamlit version
- **Deployment:** PM2, Nginx reverse proxy, Let's Encrypt SSL

## Key Commands
```bash
# Frontend dev
cd frontend && npm run dev -- -p 3002

# Backend dev
cd backend && uvicorn main:app --reload --port 8000

# Build frontend
cd frontend && npm run build

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
- `frontend/src/app/(authenticated)/` — Protected routes (dashboard, forecast, browse, etc.)
- `frontend/src/components/` — Reusable React components (charts, filters, layout, maps, ui)
- `frontend/src/lib/` — Utilities, API client, auth config, constants, Zustand store, SWR hooks
- `backend/routers/` — FastAPI route handlers (metrics, listings, geographies, report)
- `backend/services/` — Business logic (data_generator, breakout)
- `backend/models/` — Pydantic schemas + MLS data abstraction (async Motor)
- `backend/db.py` — Async MongoDB connection

## PM2 Process Names
- `marketstats-frontend` — Next.js on port 3002
- `marketstats-api` — FastAPI on port 8000

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
