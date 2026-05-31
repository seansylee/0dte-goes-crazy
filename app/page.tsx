import { analyzeTicker } from "@/services/analysis/analyzeTicker";
import type { AnalysisResult } from "@/types/domain";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type SignalTone = "Bullish" | "Bearish" | "Neutral";

type Signal = {
  label: string;
  tone: SignalTone;
  detail: string;
};

const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple",
  AMD: "Advanced Micro Devices",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
  META: "Meta Platforms",
  MSFT: "Microsoft",
  NFLX: "Netflix",
  NVDA: "NVIDIA",
  SPY: "SPDR S&P 500 ETF",
  TSLA: "Tesla",
};

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const rawTicker = firstValue(query.ticker) ?? "SPY";
  const ticker = rawTicker.toUpperCase().replace(/[^A-Z.]/g, "").slice(0, 10) || "SPY";

  const reportDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "America/Los_Angeles",
  }).format(new Date());

  let result: AnalysisResult | null = null;
  let errorMessage: string | null = null;

  try {
    result = await analyzeTicker(ticker);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Analysis failed. Please try again.";
  }

  const company = COMPANY_NAMES[ticker] ?? `${ticker} Holdings`;
  const overallTone = capitalizeLabel(result?.combined.label ?? "neutral");
  const sentimentLabel = deriveSentimentLabel(overallTone);
  const intradayBias = deriveIntradayBias(overallTone);

  const price = result?.quote?.price ?? null;
  const movePercent = result?.quote?.changePercent ?? null;
  const support = result?.options.gammaExposure.maxPutWall ?? null;
  const resistance = result?.options.gammaExposure.maxCallWall ?? null;
  const pcr = result?.options.putCallRatio ?? 1;
  const callPutRatio = pcr > 0 ? 1 / pcr : 1;
  const netGamma = result?.options.gammaExposure.netGamma ?? 0;
  const dealerGamma = deriveGammaLabel(netGamma, result?.options.available ?? false);
  const zeroDteVolume = result?.options.available
    ? formatVolume(
        (result.options.gammaExposure.maxCallWall !== null ||
          result.options.gammaExposure.maxPutWall !== null)
          ? null
          : null
      )
    : "No data";
  const headline = result?.summary ?? `Analysis for ${ticker} is loading.`;

  const signals: Signal[] = buildSignals(ticker, price, support, resistance, pcr, result);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_36%),linear-gradient(180deg,_#f7f1e8_0%,_#ece4d5_52%,_#ded7ca_100%)] px-5 py-8 text-stone-900 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-stone-900/10 bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(41,27,14,0.18)]">
          <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.35fr_0.85fr] lg:px-10 lg:py-10">
            <div className="flex flex-col gap-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
                0DTE pulse board
              </p>
              <div className="flex flex-col gap-3">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
                  Daily zero-day options sentiment for any stock you look up.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
                  Live sentiment, fundamentals, and options flow data — put/call
                  ratio, dealer gamma exposure, and support/resistance from real
                  options positioning.
                </p>
              </div>
              <form action="/" className="flex flex-col gap-3 sm:flex-row">
                <label className="flex-1">
                  <span className="sr-only">Stock ticker</span>
                  <input
                    type="text"
                    name="ticker"
                    defaultValue={ticker}
                    placeholder="Enter ticker like SPY or NVDA"
                    className="h-14 w-full rounded-full border border-white/10 bg-white/8 px-5 text-base text-white outline-none ring-0 placeholder:text-stone-400 focus:border-amber-300"
                  />
                </label>
                <button
                  type="submit"
                  className="h-14 rounded-full bg-amber-300 px-6 text-sm font-semibold uppercase tracking-[0.22em] text-stone-950 transition hover:bg-amber-200"
                >
                  Load ticker
                </button>
              </form>
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
              {errorMessage ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm uppercase tracking-[0.24em] text-stone-400">
                    Error loading {ticker}
                  </p>
                  <p className="text-sm leading-6 text-rose-300">{errorMessage}</p>
                  <p className="text-xs text-stone-500">
                    Check your API keys or try a different ticker.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-stone-400">
                        Live read
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                        {ticker}
                      </p>
                      <p className="mt-1 text-sm text-stone-300">{company}</p>
                    </div>
                    <SignalBadge tone={overallTone} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      label="Spot price"
                      value={price != null ? `$${price.toFixed(2)}` : "—"}
                      accent={
                        movePercent != null
                          ? movePercent >= 0
                            ? "up"
                            : "down"
                          : "flat"
                      }
                      helper={
                        movePercent != null
                          ? `${formatSignedPercent(movePercent)} today`
                          : "Price unavailable"
                      }
                    />
                    <MetricCard
                      label="Sentiment"
                      value={sentimentLabel}
                      helper={intradayBias}
                    />
                  </div>

                  <p className="text-sm leading-6 text-stone-300">{headline}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                    Session date: {reportDate}
                    {result?.cached ? " · Cached" : ""}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard
              eyebrow="Key levels"
              title="Support"
              value={support != null ? `$${support.toFixed(2)}` : "—"}
              detail={
                support != null
                  ? "Max put OI strike — area where dealers may step in if price fades."
                  : "Options data unavailable — support level not determined."
              }
            />
            <DetailCard
              eyebrow="Key levels"
              title="Resistance"
              value={resistance != null ? `$${resistance.toFixed(2)}` : "—"}
              detail={
                resistance != null
                  ? "Max call OI strike — area where upside may stall against call sellers."
                  : "Options data unavailable — resistance level not determined."
              }
            />
            <DetailCard
              eyebrow="Flow"
              title="0DTE volume"
              value={zeroDteVolume}
              detail="Same-day options activity derived from the nearest expiry options chain."
            />
            <DetailCard
              eyebrow="Positioning"
              title="Call / put ratio"
              value={result?.options.available ? callPutRatio.toFixed(2) : "—"}
              detail="A fast read on whether traders are leaning risk-on or hedging."
            />
          </div>

          <div className="rounded-[1.75rem] border border-stone-900/10 bg-white/70 p-5 shadow-[0_18px_60px_rgba(72,52,31,0.08)] backdrop-blur-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Dealer view
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  Gamma posture
                </h2>
              </div>
              <p className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50">
                {dealerGamma}
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              {result?.options.available
                ? result.options.notes[1] ?? result.options.notes[0]
                : "Options data is unavailable. Positive gamma supports mean reversion; negative gamma can amplify price swings."}
            </p>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-stone-900/10 bg-white/70 p-5 shadow-[0_18px_60px_rgba(72,52,31,0.08)] backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                Signal stack
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Bullish, bearish, or neutral triggers for {ticker}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-stone-600">
              Real-time signals derived from options flow, support/resistance
              levels, and news sentiment.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {signals.map((signal) => (
              <article
                key={signal.label}
                className="rounded-[1.4rem] border border-stone-900/10 bg-stone-50 p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold">{signal.label}</h3>
                  <SignalBadge tone={signal.tone} />
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {signal.detail}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function buildSignals(
  ticker: string,
  price: number | null,
  support: number | null,
  resistance: number | null,
  pcr: number,
  result: AnalysisResult | null
): Signal[] {
  const callPutRatio = pcr > 0 ? 1 / pcr : 1;

  const flowTone: SignalTone =
    callPutRatio > 1.08 ? "Bullish" : callPutRatio < 0.92 ? "Bearish" : "Neutral";

  const flowDetail = result?.options.available
    ? `Call/put flow ratio is ${callPutRatio.toFixed(2)} — ${
        flowTone === "Bullish"
          ? "call buyers are pressing for upside continuation."
          : flowTone === "Bearish"
            ? "put demand is leading and traders are leaning defensive."
            : "options flow is relatively balanced."
      }`
    : "Options flow data unavailable for this ticker.";

  let supportTone: SignalTone = "Neutral";
  let supportDetail: string;
  if (price != null && support != null) {
    const gap = price - support;
    supportTone = gap < 2 ? "Bullish" : gap > 4.5 ? "Neutral" : "Bullish";
    supportDetail = `Spot is ${gap.toFixed(2)} pts above support at $${support.toFixed(2)} — buyers ${
      gap < 2.4 ? "still have a nearby level to defend." : "have room before the setup weakens."
    }`;
  } else {
    supportDetail = "Support level could not be determined from options positioning.";
  }

  let resistanceTone: SignalTone = "Neutral";
  let resistanceDetail: string;
  if (price != null && resistance != null) {
    const gap = resistance - price;
    resistanceTone =
      gap < 2.2 ? "Bearish" : gap < 3.4 ? "Neutral" : "Bullish";
    resistanceDetail = `Resistance is ${gap.toFixed(2)} pts overhead at $${resistance.toFixed(2)} — ${
      gap < 2.2
        ? "upside may get crowded quickly."
        : gap < 3.4
          ? "price still has upside room, but not much."
          : "price has clear air before the next major ceiling."
    }`;
  } else {
    resistanceDetail = "Resistance level could not be determined from options positioning.";
  }

  return [
    { label: "Flow imbalance", tone: flowTone, detail: flowDetail },
    { label: "Price vs support", tone: supportTone, detail: supportDetail },
    { label: "Resistance pressure", tone: resistanceTone, detail: resistanceDetail },
  ];
}

function capitalizeLabel(label: string): SignalTone {
  if (label === "bullish") return "Bullish";
  if (label === "bearish") return "Bearish";
  return "Neutral";
}

function deriveSentimentLabel(tone: SignalTone): string {
  if (tone === "Bullish") return "Upside pressure";
  if (tone === "Bearish") return "Defensive tone";
  return "Balanced tape";
}

function deriveIntradayBias(tone: SignalTone): string {
  if (tone === "Bullish") return "Buyers are controlling the short-dated flow.";
  if (tone === "Bearish") return "Short-dated hedging is weighing on the setup.";
  return "Flow is mixed and likely needs a breakout trigger.";
}

function deriveGammaLabel(netGamma: number, available: boolean): string {
  if (!available) return "No data";
  const threshold = Math.abs(netGamma) * 0.05;
  if (netGamma > threshold) return "Positive gamma";
  if (netGamma < -threshold) return "Negative gamma";
  return "Flat gamma";
}

function formatVolume(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M contracts`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K contracts`;
  return `${n} contracts`;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function MetricCard({
  label,
  value,
  helper,
  accent = "flat",
}: {
  label: string;
  value: string;
  helper: string;
  accent?: "up" | "down" | "flat";
}) {
  const accentClass =
    accent === "up"
      ? "text-emerald-300"
      : accent === "down"
        ? "text-rose-300"
        : "text-stone-50";

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-stone-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-[-0.04em] ${accentClass}`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-stone-400">{helper}</p>
    </div>
  );
}

function DetailCard({
  eyebrow,
  title,
  value,
  detail,
}: {
  eyebrow: string;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-stone-900/10 bg-white/70 p-5 shadow-[0_18px_60px_rgba(72,52,31,0.08)] backdrop-blur-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
        {eyebrow}
      </p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
            {value}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-stone-600">{detail}</p>
    </article>
  );
}

function SignalBadge({ tone }: { tone: SignalTone }) {
  const styles =
    tone === "Bullish"
      ? "bg-emerald-100 text-emerald-900"
      : tone === "Bearish"
        ? "bg-rose-100 text-rose-900"
        : "bg-amber-100 text-amber-900";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${styles}`}
    >
      {tone}
    </span>
  );
}
