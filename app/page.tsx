type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type SignalTone = "Bullish" | "Bearish" | "Neutral";

type Signal = {
  label: string;
  tone: SignalTone;
  detail: string;
};

type StockSnapshot = {
  ticker: string;
  company: string;
  price: number;
  movePercent: number;
  overallTone: SignalTone;
  sentimentLabel: string;
  support: number;
  resistance: number;
  intradayBias: string;
  callPutRatio: number;
  zeroDteVolume: string;
  dealerGamma: string;
  headline: string;
  signals: Signal[];
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
  const ticker = normalizeTicker(rawTicker);
  const snapshot = createMockSnapshot(ticker);
  const reportDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "America/Los_Angeles",
  }).format(new Date());

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
                  This version uses mock data, but it shows the structure you
                  want: overall sentiment, bullish or bearish signals, support,
                  resistance, and a quick 0DTE read for the day.
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-stone-400">
                    Today&apos;s mock read
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                    {snapshot.ticker}
                  </p>
                  <p className="mt-1 text-sm text-stone-300">
                    {snapshot.company}
                  </p>
                </div>
                <SignalBadge tone={snapshot.overallTone} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="Spot price"
                  value={`$${snapshot.price.toFixed(2)}`}
                  accent={snapshot.movePercent >= 0 ? "up" : "down"}
                  helper={`${formatSignedPercent(snapshot.movePercent)} today`}
                />
                <MetricCard
                  label="Sentiment"
                  value={snapshot.sentimentLabel}
                  helper={snapshot.intradayBias}
                />
              </div>

              <p className="text-sm leading-6 text-stone-300">
                {snapshot.headline}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                Session date: {reportDate}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard
              eyebrow="Key levels"
              title="Support"
              value={`$${snapshot.support.toFixed(2)}`}
              detail="Area where buyers may step in if price fades into intraday weakness."
            />
            <DetailCard
              eyebrow="Key levels"
              title="Resistance"
              value={`$${snapshot.resistance.toFixed(2)}`}
              detail="Area where upside may stall if call activity fails to push through."
            />
            <DetailCard
              eyebrow="Flow"
              title="0DTE volume"
              value={snapshot.zeroDteVolume}
              detail="Estimated same-day options activity from the mock tape."
            />
            <DetailCard
              eyebrow="Positioning"
              title="Call / put ratio"
              value={snapshot.callPutRatio.toFixed(2)}
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
                {snapshot.dealerGamma}
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              Use this as a simple guide only. Positive gamma usually supports
              mean reversion around major strikes, while negative gamma can
              amplify price swings around support and resistance.
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
                Bullish, bearish, or neutral triggers for {snapshot.ticker}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-stone-600">
              The dashboard classifies today&apos;s mock inputs into directional
              signals so you can scan the setup quickly.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {snapshot.signals.map((signal) => (
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
      <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
        {label}
      </p>
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

function createMockSnapshot(ticker: string): StockSnapshot {
  const seed = hashTicker(ticker);
  const basePrice = 80 + (seed % 420) + fractional(seed, 100);
  const movePercent = round((fractional(seed * 3, 1200) - 6) / 2, 2);
  const supportGap = 1.4 + fractional(seed * 5, 320) / 10;
  const resistanceGap = 1.8 + fractional(seed * 7, 360) / 10;
  const support = round(basePrice - supportGap, 2);
  const resistance = round(basePrice + resistanceGap, 2);
  const callPutRatio = round(0.72 + fractional(seed * 11, 110), 2);

  const tones: SignalTone[] = [];
  const signals: Signal[] = [
    classifySignal(
      "Flow imbalance",
      callPutRatio > 1.08 ? "Bullish" : callPutRatio < 0.92 ? "Bearish" : "Neutral",
      `Call/put flow ratio sits at ${callPutRatio.toFixed(2)}, which suggests ${
        callPutRatio > 1.08
          ? "call buyers are pressing for upside continuation."
          : callPutRatio < 0.92
            ? "put demand is leading and traders are leaning defensive."
            : "options flow is relatively balanced."
      }`
    ),
    classifySignal(
      "Price vs support",
      basePrice - support < 2 ? "Bullish" : basePrice - support > 4.5 ? "Neutral" : "Bullish",
      `Spot is ${round(basePrice - support, 2).toFixed(2)} points above support, so buyers ${
        basePrice - support < 2.4
          ? "still have a nearby level to defend."
          : "have room before the setup weakens."
      }`
    ),
    classifySignal(
      "Resistance pressure",
      resistance - basePrice < 2.2 ? "Bearish" : resistance - basePrice < 3.4 ? "Neutral" : "Bullish",
      `Resistance is ${round(resistance - basePrice, 2).toFixed(2)} points overhead, meaning ${
        resistance - basePrice < 2.2
          ? "upside may get crowded quickly."
          : resistance - basePrice < 3.4
            ? "price still has upside room, but not much."
            : "price has clear air before the next major ceiling."
      }`
    ),
  ];

  for (const signal of signals) {
    tones.push(signal.tone);
  }

  const bullishCount = tones.filter((tone) => tone === "Bullish").length;
  const bearishCount = tones.filter((tone) => tone === "Bearish").length;

  const overallTone =
    bullishCount > bearishCount
      ? "Bullish"
      : bearishCount > bullishCount
        ? "Bearish"
        : "Neutral";

  const sentimentLabel =
    overallTone === "Bullish"
      ? "Upside pressure"
      : overallTone === "Bearish"
        ? "Defensive tone"
        : "Balanced tape";

  const intradayBias =
    overallTone === "Bullish"
      ? "Buyers are controlling the short-dated flow."
      : overallTone === "Bearish"
        ? "Short-dated hedging is weighing on the setup."
        : "Flow is mixed and likely needs a breakout trigger.";

  const dealerGamma =
    seed % 3 === 0
      ? "Positive gamma"
      : seed % 3 === 1
        ? "Negative gamma"
        : "Flat gamma";

  const zeroDteVolume = `${70 + (seed % 150)}K contracts`;
  const company = COMPANY_NAMES[ticker] ?? `${ticker} Holdings`;

  return {
    ticker,
    company,
    price: round(basePrice, 2),
    movePercent,
    overallTone,
    sentimentLabel,
    support,
    resistance,
    intradayBias,
    callPutRatio,
    zeroDteVolume,
    dealerGamma,
    headline: `${ticker} is showing a ${overallTone.toLowerCase()} 0DTE posture today, with support near $${support.toFixed(2)} and resistance near $${resistance.toFixed(2)}.`,
    signals,
  };
}

function classifySignal(
  label: string,
  tone: SignalTone,
  detail: string
): Signal {
  return { label, tone, detail };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTicker(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z.]/g, "").slice(0, 5);
  return cleaned || "SPY";
}

function hashTicker(value: string) {
  return value.split("").reduce((total, char, index) => {
    return total + char.charCodeAt(0) * (index + 17);
  }, 0);
}

function fractional(seed: number, divisor: number) {
  return (seed % divisor) / divisor;
}

function round(value: number, precision: number) {
  return Number(value.toFixed(precision));
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
