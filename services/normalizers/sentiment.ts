import { SCORING_CONFIG } from "@/lib/config/scoring";
import type {
  AlphaVantageNewsResponse,
  FinnhubNewsSentimentResponse,
} from "@/types/external";
import type { NormalizedNewsArticle, SentimentInput } from "@/types/domain";

export function normalizeFinnhubSentimentInput(args: {
  symbol: string;
  articles: NormalizedNewsArticle[];
  payload: FinnhubNewsSentimentResponse | null;
  usedFallback?: boolean;
}): SentimentInput {
  const providerSentimentScore = deriveFinnhubProviderSentiment(args.payload);

  return {
    symbol: args.symbol,
    provider: "finnhub",
    providerSentimentScore,
    providerQuality: SCORING_CONFIG.providerQuality.finnhub,
    usedFallback: args.usedFallback ?? false,
    articles: args.articles,
  };
}

export function normalizeAlphaVantageSentimentInput(args: {
  symbol: string;
  articles: NormalizedNewsArticle[];
  payload: AlphaVantageNewsResponse;
}): SentimentInput {
  const scores = args.payload.feed
    .map((article) => {
      const perTicker = article.ticker_sentiment?.find(
        (entry) => entry.ticker.toUpperCase() === args.symbol
      );

      return perTicker?.ticker_sentiment_score ?? article.overall_sentiment_score;
    })
    .filter((value): value is number => value !== undefined)
    .map((value) => clamp(value, -1, 1));

  const providerSentimentScore =
    scores.length > 0
      ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 4)
      : null;

  return {
    symbol: args.symbol,
    provider: "alphavantage",
    providerSentimentScore,
    providerQuality: SCORING_CONFIG.providerQuality.alphavantage,
    usedFallback: true,
    articles: args.articles,
  };
}

function deriveFinnhubProviderSentiment(
  payload: FinnhubNewsSentimentResponse | null
) {
  if (!payload) {
    return null;
  }

  const bullish = normalizePercent(payload.sentiment?.bullishPercent);
  const bearish = normalizePercent(payload.sentiment?.bearishPercent);

  if (bullish !== null && bearish !== null) {
    return clamp(round(bullish - bearish, 4), -1, 1);
  }

  if (payload.companyNewsScore !== undefined) {
    const raw = payload.companyNewsScore;
    const normalized = raw >= 0 && raw <= 1 ? raw * 2 - 1 : raw;
    return clamp(round(normalized, 4), -1, 1);
  }

  return null;
}

function normalizePercent(value: number | undefined) {
  if (value === undefined) {
    return null;
  }

  if (value > 1) {
    return value / 100;
  }

  return value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, precision: number) {
  return Number(value.toFixed(precision));
}
