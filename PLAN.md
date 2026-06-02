# Rearchitect Plan: 0DTE Goes Crazy

## Context

The codebase has a solid backend pipeline (news sentiment + fundamentals scoring via Finnhub, Alpha Vantage, FMP) but the frontend (`app/page.tsx`) is 100% mock data — hash-based fake values with no connection to the real API. The app is branded as "0DTE Signals" but has no options-specific data at all. The goal is to wire everything together into a real hybrid signal: sentiment + fundamentals + options (gamma, put/call flow), with a frontend that uses actual data.

User requirements:
1. Add real options data (provider-agnostic, free sources first — no subscription yet)
2. Connect the frontend to real data (replace all mocks)
3. Improve code structure

---

## Implementation Phases

### Phase 1 — Package + Env

**`package.json`** — Add `"yahoo-finance2": "^2.13.0"` to dependencies. Run `npm install`.

**`lib/env.ts`** — Add optional `POLYGON_API_KEY` field (same pattern as existing optional keys, `emptyToUndefined`).

---

### Phase 2 — Types

**`types/domain.ts`** — Add new Zod schemas (in dependency order) and export their inferred types:

```typescript
strikeDataSchema        // { strike, callOI, putOI, callVolume, putVolume }
gammaExposureSchema     // { netGamma, flipPoint: null|number, maxCallWall: null|number, maxPutWall: null|number }
optionsChainSchema      // { symbol, expiry, putCallRatio, callVolume, putVolume, callOI, putOI, strikeData[] }
priceQuoteSchema        // { symbol, price, changePercent, changeAbsolute }
optionsAnalysisSchema   // { putCallRatio, gammaExposure, optionsScore: 0-100, available, notes[] }
```

Update `analysisResultSchema` to add:
```typescript
options: optionsAnalysisSchema.optional().default({ available: false, optionsScore: 50, putCallRatio: 1, gammaExposure: { netGamma: 0, flipPoint: null, maxCallWall: null, maxPutWall: null }, notes: ['Options data was not available.'] }),
quote: priceQuoteSchema.optional().nullable().default(null),
```
Using `.optional().default(...)` keeps existing cached `AnalysisSnapshot` payloads parseable without a DB migration.

Update `providerSchema` to add `"yahoo"`.

**`types/external.ts`** — Add Yahoo Finance response schemas:
```typescript
yahooOptionContractSchema    // { strike, volume?, openInterest?, bid?, ask?, impliedVolatility?, lastPrice? } .passthrough()
yahooOptionsExpirationSchema // { expirationDate (unix), calls[], puts[] } .passthrough()
yahooOptionsResponseSchema   // { options[], expirationDates[], underlyingSymbol? } .passthrough()
yahooQuoteResponseSchema     // { symbol, regularMarketPrice?, regularMarketChangePercent?, regularMarketChange? } .passthrough()
```
All fields except `strike` are optional — illiquid strikes often have missing values in Yahoo data. Use `.passthrough()` to match the pattern of all other external schemas in the codebase.

---

### Phase 3 — Scoring Config

**`lib/config/scoring.ts`** — Add options-related config while keeping existing flat keys (`sentimentWeight`, `fundamentalsWeight`) so `combine.ts` doesn't break until Phase 5:

```typescript
weights: {
  withOptions:    { sentiment: 0.4, fundamentals: 0.25, options: 0.35 },
  withoutOptions: { sentiment: 0.6, fundamentals: 0.4 },
},
pcrThresholds: [   // ordered array, scorer uses .find(t => pcr < t.max)
  { max: 0.5,  contribution: 25 },
  { max: 0.7,  contribution: 15 },
  { max: 0.9,  contribution: 8  },
  { max: 1.1,  contribution: 0  },
  { max: 1.3,  contribution: -8 },
  { max: 1.7,  contribution: -15 },
  { max: Infinity, contribution: -25 },  // use Number.POSITIVE_INFINITY if `as const` rejects literal
],
gammaFlipContribution: 12,
```

---

### Phase 4 — Options Provider, Normalizer, Scorer (new files)

**`services/providers/yahoo.ts`** — Wraps `yahoo-finance2` SDK:
```typescript
export async function fetchYahooOptions(symbol): Promise<YahooOptionsResponse>
export async function fetchYahooQuote(symbol): Promise<YahooQuoteResponse>
```
Pass `{ validateResult: false }` to suppress the library's own strict validation, then run our Zod schema parse. No API key check needed.

**`services/providers/options/index.ts`** — Provider selector (single import point for orchestrator):
```typescript
export async function fetchOptionsChain(symbol): Promise<YahooOptionsResponse | null>  // try yahoo, catch → null
export async function fetchPriceQuote(symbol): Promise<YahooQuoteResponse | null>       // try yahoo, catch → null
```
When Polygon is added later, only this file changes.

**`services/normalizers/options.ts`** — Converts raw Yahoo response + spot price into `OptionsChain`:
- Selects nearest expiry (sort by `expirationDate` ascending, take first)
- Merges calls/puts arrays by strike into `StrikeData[]`
- Computes PCR = `putVolume / callVolume` (guard: default 1.0 when callVolume = 0)
- GEX per strike: `(callOI − putOI) × 100 × spotPrice`
- `netGamma` = sum of all strike GEX values
- `maxCallWall` = strike with highest callOI
- `maxPutWall` = strike with highest putOI
- `flipPoint` = linear interpolation between the two adjacent strikes where cumulative GEX crosses zero (null if no crossing)
- Returns null if no options data or spotPrice is invalid

```typescript
export function normalizeOptionsChain(symbol, payload, spotPrice): OptionsChain | null
export function computeGammaExposure(strikeData, spotPrice): GammaExposure  // exported for scorer
```

**`services/scoring/options.ts`** — Converts `OptionsChain` + spot price into `OptionsAnalysis`:
```
optionsScore = clamp(50 + pcrContribution + gammaContribution, 0, 100)
pcrContribution: from SCORING_CONFIG.pcrThresholds via .find(t => pcr < t.max)
gammaContribution: +12 if price > flipPoint, −12 if price < flipPoint, 0 if flipPoint is null
```
Generates human-readable `notes[]` describing PCR and gamma position.

```typescript
export function scoreOptions(chain: OptionsChain, spotPrice: number): OptionsAnalysis
```

---

### Phase 5 — Update Score Combiner

**`services/scoring/combine.ts`** — Change signature to accept optional `optionsScore`:

```typescript
export function combineScores(args: {
  sentimentScore: number;
  fundamentalsQualityScore: number;
  optionsScore?: number;
}): CombinedAnalysis
```

When `optionsScore` is present: use `weights.withOptions` (40/25/35).
When absent: use `weights.withoutOptions` (60/40) — backward compatible with existing behavior.

Remove use of top-level `sentimentWeight`/`fundamentalsWeight` flat keys; those become dead code after this phase.

---

### Phase 6 — Update Analysis Orchestrator

**`services/analysis/analyzeTicker.ts`** — Add parallel `resolveOptions()` step:

```typescript
const { articles, sentiment } = await resolveSentiment(symbol);
const [fundamentals, { optionsAnalysis, quote }] = await Promise.all([
  resolveFundamentals(symbol),
  resolveOptions(symbol),          // new — runs in parallel with fundamentals
]);
```

`resolveOptions(symbol)` internally:
1. Fetches raw options + quote in parallel via `Promise.all([fetchOptionsChain, fetchPriceQuote])`
2. Uses `TickerCache` for both (provider keys: `"yahoo:options"` and `"yahoo:quote"`) — only caches non-null results to avoid poisoning the cache
3. If either is null → returns `{ optionsAnalysis: unavailableResult, quote: null }`
4. Normalizes and scores → returns real `OptionsAnalysis`

Pass `optionsScore` to `combineScores` only when `optionsAnalysis.available === true`.

Include `options` and `quote` in the `analysisResultSchema.parse(...)` call. The full payload is stored in `AnalysisSnapshot.payload` JSON column — no new columns needed.

---

### Phase 7 — API Routes

**`app/api/analyze/[symbol]/route.ts`** — No changes needed. The route calls `analyzeTicker()` and returns the full result; new fields are automatically included.

**`app/api/compare/route.ts`** — Add `optionsScore`, `putCallRatio`, and `price` to the compact per-symbol row in the response (for future comparison table UI).

---

### Phase 8 — Prisma Migration

**`prisma/schema.prisma`** — Add new model:
```prisma
model OptionsSnapshot {
  id        String   @id @default(cuid())
  symbol    String
  provider  String
  payload   String
  fetchedAt DateTime @default(now())
  @@unique([symbol, provider])
  @@index([symbol, fetchedAt])
}
```

Create `prisma/migrations/YYYYMMDDHHMMSS_add_options_snapshot/migration.sql`:
```sql
CREATE TABLE "OptionsSnapshot" ("id" TEXT NOT NULL PRIMARY KEY, "symbol" TEXT NOT NULL, "provider" TEXT NOT NULL, "payload" TEXT NOT NULL, "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "OptionsSnapshot_symbol_provider_key" ON "OptionsSnapshot"("symbol", "provider");
CREATE INDEX "OptionsSnapshot_symbol_fetchedAt_idx" ON "OptionsSnapshot"("symbol", "fetchedAt");
```

Run `npx prisma migrate dev --name add_options_snapshot`.

Note: `TickerCache` already serves raw provider caching by `(symbol, provider)`. `OptionsSnapshot` is added per requirements and can be rationalized with `TickerCache` in a future cleanup.

---

### Phase 9 — Frontend Rewrite

**`app/page.tsx`** — Keep all Tailwind classes, component names (`MetricCard`, `DetailCard`, `SignalBadge`), and JSX structure intact. Replace only the data source:

- Delete: `createMockSnapshot()`, `hashTicker()`, `fractional()`, inline `StockSnapshot` type, inline `normalizeTicker`
- Add: `import { analyzeTicker } from "@/services/analysis/analyzeTicker"` (server component, direct call — no HTTP hop)
- Add: `import { normalizeSymbol } from "@/lib/symbol"`

Data mapping (real → UI):

| UI field | Real source |
|---|---|
| `price` | `result.quote?.price ?? 0` |
| `move%` | `result.quote?.changePercent ?? 0` |
| `overallTone` | `capitalize(result.combined.label)` |
| `support` | `result.options.gammaExposure.maxPutWall ?? null` → display "—" if null |
| `resistance` | `result.options.gammaExposure.maxCallWall ?? null` → display "—" if null |
| `callPutRatio` | `1 / result.options.putCallRatio` (invert PCR to call/put ratio for display) |
| `dealerGamma` | Classify `result.options.gammaExposure.netGamma`: positive → "Positive", negative → "Negative", ~0 → "Flat" |
| Signal 1: Flow | Real PCR value + tone from `optionsScore` vs 50 |
| Signal 2: Price vs support | Real `quote.price` vs `maxPutWall` |
| Signal 3: Resistance | Real `maxCallWall` vs `quote.price` |

When `options.available === false`: support/resistance/gamma show "Unavailable", signals show neutral tone with explanatory text.

Wrap the `analyzeTicker()` call in try/catch; render an inline error card on failure (no separate error.tsx needed unless preferred).

**`app/loading.tsx`** (new) — Minimal `animate-pulse` skeleton matching the page's outer shell, for automatic Suspense fallback.

**`app/error.tsx`** (new, `"use client"`) — Error boundary with `{ error, reset }` props. "Try again" button calls `reset()`.

---

## Files Created or Modified

**New files:**
- `services/providers/yahoo.ts`
- `services/providers/options/index.ts`
- `services/normalizers/options.ts`
- `services/scoring/options.ts`
- `app/loading.tsx`
- `app/error.tsx`
- `prisma/migrations/..._add_options_snapshot/migration.sql`

**Modified files:**
- `package.json` + `package-lock.json`
- `lib/env.ts`
- `lib/config/scoring.ts`
- `types/domain.ts`
- `types/external.ts`
- `services/scoring/combine.ts`
- `services/analysis/analyzeTicker.ts`
- `app/api/compare/route.ts`
- `app/page.tsx`
- `prisma/schema.prisma`

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `yahoo-finance2` strict internal Zod rejects valid response | Pass `{ validateResult: false }`, apply own schema |
| Yahoo Finance rate limiting (unofficial API) | 15-min `TickerCache` absorbs repeated requests |
| Old `AnalysisSnapshot` payloads lack `options`/`quote` | Use `.optional().default(...)` on both fields in Zod schema |
| `Infinity` literal rejected inside `as const` object | Use `Number.POSITIVE_INFINITY` |
| PCR = 0 when no call volume | Guard in normalizer: `callVolume > 0 ? putVol/callVol : 1.0` |
| Null walls break UI number formatting | All formatters guard null and display "—" |
| `OptionsSnapshot` model redundant with `TickerCache` | Implement as specified; note for future cleanup |

---

## Verification

1. `npm install` — confirms `yahoo-finance2` installs cleanly
2. `npx prisma migrate dev` — confirms migration applies
3. `npm run build` — confirms TypeScript compiles with no errors
4. `curl localhost:3000/api/analyze/SPY` — response includes `options` (with real PCR, gammaExposure) and `quote` (real price)
5. `curl "localhost:3000/api/compare?symbols=SPY,AAPL"` — compact response includes `optionsScore` and `price`
6. Load `localhost:3000?ticker=SPY` in browser — page shows real price, real support/resistance from gamma walls, real signal tones (not hash-based)
7. Load `localhost:3000?ticker=INVALID` — error card renders, no crash
8. Load `localhost:3000` while Yahoo Finance is unreachable (mock by throwing in `fetchYahooOptions`) — page still renders with `options.available = false` and "Unavailable" placeholders
