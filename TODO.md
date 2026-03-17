# MarketStats Next.js — TODO

## Phase 1: Project Scaffold ✅
- [x] Create GitHub repo (tlcengine/marketstats)
- [x] README.md, CLAUDE.md, TODO.md
- [ ] Next.js 15 app scaffold (App Router, TypeScript, Tailwind)
- [ ] FastAPI backend scaffold
- [ ] Docker Compose setup
- [ ] shadcn/ui initialization
- [ ] Environment config (.env.example)

## Phase 2: Backend API
- [ ] MongoDB async connection (Motor)
- [ ] Port MLS.py data abstraction → backend/models/mls.py
- [ ] Port data_generators.py → backend/services/data_generator.py
- [ ] `/api/metrics` endpoint — time-series metric data
- [ ] `/api/listings` endpoint — browse/filter listings
- [ ] `/api/geographies` endpoint — states, counties, cities, zips
- [ ] `/api/forecast` endpoint — price predictions
- [ ] `/api/tax` endpoint — tax analysis
- [ ] `/api/export` endpoint — CSV/PDF generation
- [ ] `/api/report` endpoint — market report data
- [ ] Pydantic schemas for all request/response models
- [ ] API tests (pytest)

## Phase 3: Auth & Layout
- [ ] NextAuth.js Google OAuth setup
- [ ] GitHub-style login page (port from Streamlit)
- [ ] Root layout with sidebar navigation
- [ ] Fixed bottom metric bar
- [ ] Mobile-responsive sidebar (drawer)
- [ ] User profile/avatar in sidebar
- [ ] Sign out functionality

## Phase 4: Dashboard (Core Page)
- [ ] Area selector component (State → County/City/Zip)
- [ ] Filter sidebar (Property Type, Price Range, Bedrooms, etc.)
- [ ] Recharts line/bar chart component
- [ ] Quick Facts panel (right column)
- [ ] 4-area comparison support
- [ ] Metric bar click → chart updates (client-side state)
- [ ] Breakout analysis integration
- [ ] Median/Average toggle
- [ ] Legend toggle
- [ ] Time range selector (1yr, 3yr, 5yr, 10yr, All)
- [ ] Rolling average toggle

## Phase 5: Map Mode
- [ ] Mapbox GL map component
- [ ] Draw tools (polygon, circle, rectangle)
- [ ] Point-in-polygon filtering (server-side)
- [ ] Save/Load custom areas
- [ ] Area dialog/modal

## Phase 6: Chart Export
- [ ] CSV download
- [ ] PNG export (html2canvas)
- [ ] PDF export (ReportLab on backend)
- [ ] Embed code generator
- [ ] Share URL with encoded state

## Phase 7: Additional Pages
- [ ] Browse Listings page (data table + map)
- [ ] Price Forecast page
- [ ] Tax Analysis page
- [ ] Tax Predictor page
- [ ] FastStats Report page
- [ ] Market Report page (narrative + podcast player)
- [ ] Branding & Profile page (admin)
- [ ] Feed Manager page (admin)
- [ ] My Account page

## Phase 8: Market Report
- [ ] Narrative generation (Claude proxy integration)
- [ ] KPI cards
- [ ] Embedded charts (Recharts)
- [ ] Data tables
- [ ] Podcast player (audio element)
- [ ] Social sharing buttons
- [ ] PDF download

## Phase 9: Production
- [ ] Docker production builds
- [ ] Nginx config (app.certihomes.com)
- [ ] SSL certificate (Let's Encrypt)
- [ ] PM2 process management
- [ ] Error monitoring (Sentry?)
- [ ] Analytics (PostHog?)
- [ ] Performance optimization (ISR, caching)
- [ ] SEO meta tags

## Phase 10: Polish
- [ ] BHS design system tokens in Tailwind config
- [ ] Animations/transitions
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Empty states
- [ ] Keyboard shortcuts
- [ ] Accessibility (a11y)
- [ ] Print styles for reports
