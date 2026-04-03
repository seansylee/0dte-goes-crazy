import type {
  AlphaVantageNewsResponse,
  FinnhubCompanyNewsResponse,
} from "@/types/external";
import type { NormalizedNewsArticle } from "@/types/domain";

export function normalizeFinnhubNewsArticles(
  symbol: string,
  payload: FinnhubCompanyNewsResponse
): NormalizedNewsArticle[] {
  return payload.map((article) => ({
    symbol,
    provider: "finnhub",
    headline: article.headline,
    summary: article.summary ?? null,
    source: article.source ?? null,
    url: article.url,
    publishedAt: new Date(article.datetime * 1_000).toISOString(),
    sentimentScore: null,
  }));
}

export function normalizeAlphaVantageNewsArticles(
  symbol: string,
  payload: AlphaVantageNewsResponse
): NormalizedNewsArticle[] {
  return payload.feed.map((article) => {
    const tickerMatch = article.ticker_sentiment?.find(
      (entry) => entry.ticker.toUpperCase() === symbol
    );

    return {
      symbol,
      provider: "alphavantage",
      headline: article.title,
      summary: article.summary ?? null,
      source: article.source ?? null,
      url: article.url,
      publishedAt: parseAlphaTimestamp(article.time_published),
      sentimentScore: normalizeAlphaArticleSentiment(
        tickerMatch?.ticker_sentiment_score ?? article.overall_sentiment_score
      ),
    };
  });
}

function parseAlphaTimestamp(value: string) {
  const normalized = value.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
    "$1-$2-$3T$4:$5:$6Z"
  );

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeAlphaArticleSentiment(value: number | undefined) {
  if (value === undefined) {
    return null;
  }

  return clamp(value, -1, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
