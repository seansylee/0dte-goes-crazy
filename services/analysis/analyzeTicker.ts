import { analysisResultSchema, type AnalysisResult, type OptionsAnalysis, type PriceQuote } from "@/types/domain";
import { normalizeTickerSymbol } from "@/lib/symbol";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import {
  getCachedProviderPayload,
  getFreshAnalysisSnapshot,
  storeProviderPayload,
} from "@/services/analysis/cache";
import { fetchAlphaVantageNewsSentiment } from "@/services/providers/alphavantage";
import { fetchFinnhubCompanyNews, fetchFinnhubNewsSentiment } from "@/services/providers/finnhub";
import { fetchFmpFinancialScores, fetchFmpIncomeStatements, fetchFmpRatiosTtm } from "@/services/providers/fmp";
import { fetchOptionsChain, fetchPriceQuote } from "@/services/providers/options/index";
import {
  normalizeAlphaVantageNewsArticles,
  normalizeFinnhubNewsArticles,
} from "@/services/normalizers/news";
import {
  normalizeAlphaVantageSentimentInput,
  normalizeFinnhubSentimentInput,
} from "@/services/normalizers/sentiment";
import { normalizeFmpFundamentals } from "@/services/normalizers/fundamentals";
import { normalizeOptionsChain } from "@/services/normalizers/options";
import { scoreSentiment } from "@/services/scoring/sentiment";
import { scoreFundamentals } from "@/services/scoring/fundamentals";
import { scoreOptions } from "@/services/scoring/options";
import { combineScores } from "@/services/scoring/combine";
import { generateSummary } from "@/services/summary/generateSummary";
import type {
  AlphaVantageNewsResponse,
  FinnhubCompanyNewsResponse,
  FinnhubNewsSentimentResponse,
  FmpFinancialScoresResponse,
  FmpIncomeStatementResponse,
  FmpRatiosTtmResponse,
  YahooOptionsResponse,
  YahooQuoteResponse,
} from "@/types/external";

const PROVIDER_KEYS = {
  finnhubNews: "finnhub:company-news",
  finnhubSentiment: "finnhub:news-sentiment",
  alphaNews: "alphavantage:news-sentiment",
  fmpIncome: "fmp:income-statement",
  fmpRatios: "fmp:ratios-ttm",
  fmpScores: "fmp:financial-scores",
  yahooOptions: "yahoo:options",
  yahooQuote: "yahoo:quote",
} as const;

const UNAVAILABLE_OPTIONS: OptionsAnalysis = {
  putCallRatio: 1,
  gammaExposure: { netGamma: 0, flipPoint: null, maxCallWall: null, maxPutWall: null },
  optionsScore: 50,
  available: false,
  notes: ["Options data is unavailable."],
};

export async function analyzeTicker(inputSymbol: string): Promise<AnalysisResult> {
  const symbol = normalizeTickerSymbol(inputSymbol);
  const cached = await getFreshAnalysisSnapshot<AnalysisResult>(symbol);

  if (cached) {
    return analysisResultSchema.parse({
      ...cached,
      cached: true,
    });
  }

  const { articles, sentiment } = await resolveSentiment(symbol);
  const [fundamentals, { optionsAnalysis, quote }] = await Promise.all([
    resolveFundamentals(symbol),
    resolveOptions(symbol),
  ]);

  const sentimentAnalysis = scoreSentiment(sentiment);
  const fundamentalsAnalysis = scoreFundamentals(fundamentals);
  const combined = combineScores({
    sentimentScore: sentimentAnalysis.sentimentScore,
    fundamentalsQualityScore: fundamentalsAnalysis.fundamentalsQualityScore,
    optionsScore: optionsAnalysis.available ? optionsAnalysis.optionsScore : undefined,
  });
  const summary = generateSummary({
    symbol,
    sentiment: sentimentAnalysis,
    fundamentals: fundamentalsAnalysis,
    combined,
  });

  const result = analysisResultSchema.parse({
    symbol,
    generatedAt: new Date().toISOString(),
    cached: false,
    summary,
    articles,
    sentiment: sentimentAnalysis,
    fundamentals: fundamentalsAnalysis,
    combined,
    options: optionsAnalysis,
    quote,
  });

  await prisma.$transaction([
    prisma.analysisSnapshot.create({
      data: {
        symbol,
        sentimentScore: result.sentiment.sentimentScore,
        confidenceScore: Math.round(result.sentiment.confidenceScore),
        fundamentalsQualityScore: Math.round(result.fundamentals.fundamentalsQualityScore),
        combinedScore: result.combined.combinedScore,
        label: result.combined.label,
        summary: result.summary,
        payload: JSON.stringify(result),
      },
    }),
    ...articles.map((article) =>
      prisma.newsArticle.upsert({
        where: { symbol_url: { symbol, url: article.url } },
        update: {
          provider: article.provider,
          headline: article.headline,
          summary: article.summary,
          source: article.source,
          publishedAt: new Date(article.publishedAt),
          sentimentScore: article.sentimentScore,
        },
        create: {
          symbol,
          provider: article.provider,
          headline: article.headline,
          summary: article.summary,
          source: article.source,
          url: article.url,
          publishedAt: new Date(article.publishedAt),
          sentimentScore: article.sentimentScore,
        },
      })
    ),
  ]);

  return result;
}

async function resolveSentiment(symbol: string) {
  const finnhubNews = await safeProviderCall(async () =>
    getOrFetchCached<FinnhubCompanyNewsResponse>(
      symbol,
      PROVIDER_KEYS.finnhubNews,
      () => fetchFinnhubCompanyNews(symbol)
    )
  );

  const finnhubSentiment = await safeProviderCall(async () =>
    getOrFetchCached<FinnhubNewsSentimentResponse>(
      symbol,
      PROVIDER_KEYS.finnhubSentiment,
      () => fetchFinnhubNewsSentiment(symbol)
    )
  );

  if (finnhubNews && finnhubNews.length > 0) {
    const articles = normalizeFinnhubNewsArticles(symbol, finnhubNews);
    const sentiment = normalizeFinnhubSentimentInput({ symbol, articles, payload: finnhubSentiment });
    return { articles, sentiment };
  }

  const alphaNews = await safeProviderCall(async () =>
    getOrFetchCached<AlphaVantageNewsResponse>(
      symbol,
      PROVIDER_KEYS.alphaNews,
      () => fetchAlphaVantageNewsSentiment(symbol)
    )
  );

  if (alphaNews && alphaNews.feed.length > 0) {
    const articles = normalizeAlphaVantageNewsArticles(symbol, alphaNews);
    const sentiment = normalizeAlphaVantageSentimentInput({ symbol, articles, payload: alphaNews });
    return { articles, sentiment };
  }

  if (finnhubSentiment) {
    const sentiment = normalizeFinnhubSentimentInput({
      symbol,
      articles: [],
      payload: finnhubSentiment,
      usedFallback: false,
    });
    return { articles: [], sentiment };
  }

  throw new HttpError(
    `Unable to retrieve sentiment data for ${symbol} from Finnhub or Alpha Vantage`
  );
}

async function resolveFundamentals(symbol: string) {
  const [incomeStatements, ratiosTtm, financialScores] = await Promise.all([
    safeProviderCall(async () =>
      getOrFetchCached<FmpIncomeStatementResponse>(
        symbol,
        PROVIDER_KEYS.fmpIncome,
        () => fetchFmpIncomeStatements(symbol)
      )
    ),
    safeProviderCall(async () =>
      getOrFetchCached<FmpRatiosTtmResponse>(
        symbol,
        PROVIDER_KEYS.fmpRatios,
        () => fetchFmpRatiosTtm(symbol)
      )
    ),
    safeProviderCall(async () =>
      getOrFetchCached<FmpFinancialScoresResponse>(
        symbol,
        PROVIDER_KEYS.fmpScores,
        () => fetchFmpFinancialScores(symbol)
      )
    ),
  ]);

  return normalizeFmpFundamentals({ symbol, incomeStatements, ratiosTtm, financialScores });
}

async function resolveOptions(symbol: string): Promise<{
  optionsAnalysis: OptionsAnalysis;
  quote: PriceQuote | null;
}> {
  const [rawOptions, rawQuote] = await Promise.all([
    safeProviderCall(async () => {
      const cached = await getCachedProviderPayload<YahooOptionsResponse>(
        symbol,
        PROVIDER_KEYS.yahooOptions
      );
      if (cached) return cached;
      const payload = await fetchOptionsChain(symbol);
      if (payload) await storeProviderPayload(symbol, PROVIDER_KEYS.yahooOptions, payload);
      return payload;
    }),
    safeProviderCall(async () => {
      const cached = await getCachedProviderPayload<YahooQuoteResponse>(
        symbol,
        PROVIDER_KEYS.yahooQuote
      );
      if (cached) return cached;
      const payload = await fetchPriceQuote(symbol);
      if (payload) await storeProviderPayload(symbol, PROVIDER_KEYS.yahooQuote, payload);
      return payload;
    }),
  ]);

  const quote: PriceQuote | null =
    rawQuote?.regularMarketPrice != null
      ? {
          symbol,
          price: rawQuote.regularMarketPrice,
          changePercent: rawQuote.regularMarketChangePercent ?? 0,
          changeAbsolute: rawQuote.regularMarketChange ?? 0,
        }
      : null;

  if (!rawOptions || !quote) {
    return { optionsAnalysis: UNAVAILABLE_OPTIONS, quote };
  }

  const chain = normalizeOptionsChain(symbol, rawOptions, quote.price);
  if (!chain) {
    return { optionsAnalysis: UNAVAILABLE_OPTIONS, quote };
  }

  const optionsAnalysis = scoreOptions(chain, quote.price);
  return { optionsAnalysis, quote };
}

async function getOrFetchCached<T>(
  symbol: string,
  providerKey: string,
  fetcher: () => Promise<T>
) {
  const cached = await getCachedProviderPayload<T>(symbol, providerKey);
  if (cached) return cached;

  const payload = await fetcher();
  await storeProviderPayload(symbol, providerKey, payload);
  return payload;
}

async function safeProviderCall<T>(fetcher: () => Promise<T>) {
  try {
    return await fetcher();
  } catch {
    return null;
  }
}
