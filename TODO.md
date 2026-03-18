# MarketStats Next.js — TODO

## Phase 1: Project Scaffold [DONE]
- [x] Create GitHub repo (tlcengine/marketstats)
- [x] README.md, CLAUDE.md, TODO.md
- [x] Next.js 16 app scaffold (App Router, TypeScript, Tailwind, Turbopack)
- [x] FastAPI backend scaffold
- [x] shadcn/ui initialization
- [x] Environment config (.env.local)
- [x] PM2 deployment (ecosystem.config.js + start-api.sh + start-frontend.sh)

## Phase 2: Backend API [DONE]
- [x] MongoDB async connection (Motor via db.py)
- [x] Port MLS.py data abstraction → backend/models/mls.py
- [x] Port data_generators.py → backend/services/data_generator.py
- [x] `/api/metrics` endpoint — time-series metric data
- [x] `/api/listings` endpoint — browse/filter listings with pagination + sorting
- [x] `/api/geographies` endpoint — states, counties, cities, zips
- [x] `/api/report` endpoint — full market report (narrative, charts, podcast, share URLs)
- [x] `/api/forecast` endpoint — historical + linear regression forecast
- [x] `/api/tax` endpoint — summary, distribution, search, predict
- [x] `/api/faststats` endpoint — all 13 metrics for a geography/month
- [x] `/api/feeds` endpoint — MLS feed status, doc counts, sync trigger
- [x] `/api/branding` endpoint — agent profile CRUD with image upload
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

## Phase 5: Map Mode [DONE]
- [x] Leaflet map component (AreaMap)
- [x] Map toggle in chart controls
- [x] Draw tools (polygon, circle, rectangle) via leaflet-draw
- [x] Save/Load custom drawn areas (Zustand store)
- [x] Drawn areas rendered as colored overlays on map
- [ ] Point-in-polygon filtering (server-side)

## Phase 6: Chart Export [DONE]
- [x] CSV download
- [x] PNG export (html2canvas-pro at 2x scale)
- [x] PDF export (jsPDF + html2canvas-pro, branded with gold accents)
- [x] Embed code generator (iframe snippet modal)
- [x] Copy link to clipboard
- [ ] Share URL with encoded state

## Phase 7: Additional Pages [DONE]
- [x] Browse Listings page (sortable table, server-side pagination, detail slide-out)
- [x] Price Forecast page (linear regression, confidence band, KPI cards)
- [x] Tax Analysis page (distributions, effective rates, property search)
- [x] Tax Predictor page (comparable-based prediction, range indicator)
- [x] FastStats Report page (13 KPI cards, summary paragraph, print)
- [x] Market Report page (full Streamlit parity — narrative, podcast, charts, tables)
- [x] Branding & Profile page (form, image upload, live preview)
- [x] Feed Manager page (9 feeds, status badges, sync trigger)
- [x] My Account page

## Phase 8: Production Polish [DONE]
- [x] Production build (`npm run build` + `next start`)
- [x] PM2 process management (start-frontend.sh + start-api.sh)
- [x] Nginx config with SSL (Let's Encrypt)
- [x] Google OAuth redirect URI configured
- [x] AUTH_TRUST_HOST=true for Nginx proxy
- [x] allowedDevOrigins configured
- [ ] Error monitoring (Sentry)
- [ ] Performance optimization (ISR, caching)
- [ ] SEO meta tags
- [ ] Print styles for reports

## Remaining
- [ ] API tests (pytest)
- [ ] Point-in-polygon server-side filtering for drawn areas
- [ ] Share URL with encoded chart state
- [ ] Sentry error monitoring
- [ ] ISR/caching optimization
- [ ] SEO meta tags
- [ ] Print styles for reports/faststats
