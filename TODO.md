# MarketStats Next.js — TODO

## Phase 1: Project Scaffold [DONE]
- [x] Create GitHub repo (tlcengine/marketstats)
- [x] README.md, CLAUDE.md, TODO.md
- [x] Next.js 16 app scaffold (App Router, TypeScript, Tailwind, Turbopack)
- [x] FastAPI backend scaffold
- [x] shadcn/ui initialization
- [x] Environment config (.env.local)
- [x] PM2 deployment (ecosystem.config.js + start-api.sh)

## Phase 2: Backend API [DONE]
- [x] MongoDB async connection (Motor via db.py)
- [x] Port MLS.py data abstraction → backend/models/mls.py
- [x] Port data_generators.py → backend/services/data_generator.py
- [x] `/api/metrics` endpoint — time-series metric data
- [x] `/api/listings` endpoint — browse/filter listings
- [x] `/api/geographies` endpoint — states, counties, cities, zips
- [x] `/api/report` endpoint — market report data
- [x] Pydantic schemas for all request/response models
- [x] Breakout analysis service (backend/services/breakout.py)
- [ ] API tests (pytest)

## Phase 3: Auth & Layout [DONE]
- [x] NextAuth.js v5 Google OAuth setup
- [x] Login page with Google sign-in button
- [x] Root layout with sidebar navigation
- [x] Fixed bottom metric bar (MetricProvider)
- [x] Mobile-responsive sidebar (Sheet drawer)
- [x] User profile/avatar in sidebar
- [x] Sign out functionality
- [x] Nginx routing: /api/auth/ → Next.js, /api/ → FastAPI
- [x] Fix hydration mismatches (deterministic IDs, mounted guards)

## Phase 4: Dashboard (Core Page) [DONE]
- [x] Area selector component (State → County/City/Zip, colored tabs)
- [x] Filter sidebar (Property Type, Price Range, Bedrooms, etc.)
- [x] Recharts line/bar chart component (MetricChart)
- [x] Quick Facts panel (right column)
- [x] 4-area comparison support
- [x] Metric bar click → chart updates (Zustand store)
- [x] Breakout analysis integration
- [x] Median/Average toggle
- [x] Legend toggle
- [x] Time range selector (1yr, 3yr, 5yr, 10yr, All)
- [x] Rolling average toggle (1, 3, 6, 12 months)
- [x] Chart controls (line/bar, timeframe, rolling, share/export)

## Phase 5: Map Mode [IN PROGRESS]
- [x] Leaflet map component (AreaMap)
- [x] Map toggle in chart controls
- [ ] Draw tools (polygon, circle, rectangle)
- [ ] Point-in-polygon filtering (server-side)
- [ ] Save/Load custom areas

## Phase 6: Chart Export [PARTIAL]
- [x] CSV download
- [ ] PNG export
- [ ] PDF export
- [ ] Embed code generator
- [ ] Share URL with encoded state

## Phase 7: Additional Pages [NOT STARTED]
- [ ] Browse Listings page (data table + map)
- [ ] Price Forecast page
- [ ] Tax Analysis page
- [ ] Tax Predictor page
- [ ] FastStats Report page
- [ ] Market Report page (narrative + podcast player)
- [ ] Branding & Profile page (admin)
- [ ] Feed Manager page (admin)
- [x] My Account page

## Phase 8: Production Polish
- [x] PM2 process management (frontend + backend)
- [x] Nginx config with SSL (Let's Encrypt)
- [x] Google OAuth redirect URI configured
- [ ] Production build (npm run build + static serving)
- [ ] Error monitoring (Sentry)
- [ ] Performance optimization (ISR, caching)
- [ ] SEO meta tags
- [ ] Print styles for reports
