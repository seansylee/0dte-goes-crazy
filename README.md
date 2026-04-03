# Stock Sentiment Analysis MVP, Phase 1

This project now includes the backend and data foundation for a stock sentiment analysis platform inside a Next.js App Router app. The current homepage is unchanged for now. Phase 1 focuses on provider integrations, normalization, scoring, Prisma persistence, caching, and API routes.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zod
- Prisma ORM
- SQLite

React Query and Recharts are intentionally deferred to the later UI/dashboard phase so this phase does not add unused frontend code.

## Providers

- Finnhub: primary source for company news and news sentiment
- Financial Modeling Prep: primary source for fundamentals
- Alpha Vantage: fallback source for news sentiment

## Required Environment Variables

Copy `.env.example` to `.env.local` or `.env` and set:

```bash
DATABASE_URL="file:./dev.db"
FINNHUB_API_KEY="your_finnhub_key"
FMP_API_KEY="your_fmp_key"
ALPHA_VANTAGE_API_KEY="your_alpha_vantage_key"
HTTP_TIMEOUT_MS="10000"
HTTP_RETRY_COUNT="2"
CACHE_TTL_MINUTES="15"
```

## Install

```bash
npm install
```

## Prisma Setup

Generate the Prisma client:

```bash
DATABASE_URL="file:./dev.db" npm run prisma:generate
```

Run a Prisma migration locally:

```bash
DATABASE_URL="file:./dev.db" npm run prisma:migrate -- --name init
```

If your local Prisma migration engine behaves differently than this environment, the repo also includes an initial SQL migration under [prisma/migrations/20260403000000_init/migration.sql](/Users/seanlee/code/0dte-goes-crazy/prisma/migrations/20260403000000_init/migration.sql).

## Run The App

```bash
npm run dev
```

## API Routes

Analyze one ticker:

```bash
curl "http://localhost:3000/api/analyze/AAPL"
```

Compare multiple tickers:

```bash
curl "http://localhost:3000/api/compare?symbols=AAPL,MSFT,NVDA"
```

## Response Shape

`/api/analyze/[symbol]` returns normalized analysis JSON with:

- recent normalized news articles
- sentiment score in `-1..1`
- confidence score in `0..100`
- fundamentals quality score in `0..100`
- combined score in `0..100`
- bullish, neutral, or bearish label
- deterministic summary
- trend points for sentiment over time

`/api/compare` returns compact comparison rows derived from the same analysis service.

## Caching

- Raw provider cache TTL: 15 minutes
- Analysis snapshot TTL: 15 minutes
- Raw provider payloads are stored in SQLite as serialized JSON strings because Prisma’s SQLite connector in this environment does not support schema-level `Json` columns cleanly for migration.
- Finnhub is attempted first for sentiment/news.
- Alpha Vantage is used as fallback for news/sentiment when needed.
- Fundamentals degrade gracefully to a neutral baseline when FMP data is unavailable.

## Backend Layout

- [lib/env.ts](/Users/seanlee/code/0dte-goes-crazy/lib/env.ts): environment parsing
- [lib/http.ts](/Users/seanlee/code/0dte-goes-crazy/lib/http.ts): fetch helper with timeout and retry
- [lib/config/scoring.ts](/Users/seanlee/code/0dte-goes-crazy/lib/config/scoring.ts): weights and cache config
- [lib/prisma.ts](/Users/seanlee/code/0dte-goes-crazy/lib/prisma.ts): Prisma client singleton
- [types/domain.ts](/Users/seanlee/code/0dte-goes-crazy/types/domain.ts): internal domain models
- [types/external.ts](/Users/seanlee/code/0dte-goes-crazy/types/external.ts): provider schemas
- [services/providers](/Users/seanlee/code/0dte-goes-crazy/services/providers): raw provider integrations
- [services/normalizers](/Users/seanlee/code/0dte-goes-crazy/services/normalizers): internal normalization boundaries
- [services/scoring](/Users/seanlee/code/0dte-goes-crazy/services/scoring): sentiment, fundamentals, and combined scoring
- [services/analysis/analyzeTicker.ts](/Users/seanlee/code/0dte-goes-crazy/services/analysis/analyzeTicker.ts): orchestration and persistence
- [app/api/analyze/[symbol]/route.ts](/Users/seanlee/code/0dte-goes-crazy/app/api/analyze/[symbol]/route.ts): single-ticker API
- [app/api/compare/route.ts](/Users/seanlee/code/0dte-goes-crazy/app/api/compare/route.ts): comparison API

## Verification Commands

```bash
DATABASE_URL="file:./dev.db" npm run prisma:generate
DATABASE_URL="file:./dev.db" npm run lint
DATABASE_URL="file:./dev.db" npm run build
```
