import { analysisResultSchema, type AnalysisResult } from "@/types/domain";
import { normalizeTickerSymbol } from "@/lib/symbol";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import {
  getCachedProviderPayload,
  getFreshAnalysisSnapshot,
  storeProviderPayload,
} from "@/services/analysis/cache";
import {
  fetchAlphaVantageNewsSentiment,
} from "@/services/providers/alphavantage";
import {
  fetchFinnhubCompanyNews,
  fetchFinnhubNewsSentiment,
} from "@/services/providers/finnhub";
import {
  fetchFmpFinancialScores,
  fetchFmpIncomeStatements,
  fetchFmpRatiosTtm,
} from "@/services/providers/fmp";
import {
  normalizeAlphaVantageNewsArticles,
  normalizeFinnhubNewsArticles,
} from "@/services/normalizers/news";
import {
  normalizeAlphaVantageSentimentInput,
  normalizeFinnhubSentimentInput,
} from "@/services/normalizers/sentiment";
import { normalizeFmpFundamentals } from "@/services/normalizers/fundamentals";
import { scoreSentiment } from "@/services/scoring/sentiment";
import { scoreFundamentals } from "@/services/scoring/fundamentals";
import { combineScores } from "@/services/scoring/combine";
import { generateSummary } from "@/services/summary/generateSummary";
import type {
  AlphaVantageNewsResponse,
  FinnhubCompanyNewsResponse,
  FinnhubNewsSentimentResponse,
  FmpFinancialScoresResponse,
  FmpIncomeStatementResponse,
  FmpRatiosTtmResponse,
} from "@/types/external";

const PROVIDER_KEYS = {
  finnhubNews: "finnhub:company-news",
  finnhubSentiment: "finnhub:news-sentiment",
  alphaNews: "alphavantage:news-sentiment",
  fmpIncome: "fmp:income-statement",
  fmpRatios: "fmp:ratios-ttm",
  fmpScores: "fmp:financial-scores",
} as const;

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
  const fundamentals = await resolveFundamentals(symbol);

  const sentimentAnalysis = scoreSentiment(sentiment);
  const fundamentalsAnalysis = scoreFundamentals(fundamentals);
  const combined = combineScores({
    sentimentScore: sentimentAnalysis.sentimentScore,
    fundamentalsQualityScore: fundamentalsAnalysis.fundamentalsQualityScore,
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
  });

  await prisma.$transaction([
    prisma.analysisSnapshot.create({
      data: {
        symbol,
        sentimentScore: result.sentiment.sentimentScore,
        confidenceScore: Math.round(result.sentiment.confidenceScore),
        fundamentalsQualityScore: Math.round(
          result.fundamentals.fundamentalsQualityScore
        ),
        combinedScore: result.combined.combinedScore,
        label: result.combined.label,
        summary: result.summary,
        payload: JSON.stringify(result),
      },
    }),
    ...articles.map((article) =>
      prisma.newsArticle.upsert({
        where: {
          symbol_url: {
            symbol,
            url: article.url,
          },
        },
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
    const sentiment = normalizeFinnhubSentimentInput({
      symbol,
      articles,
      payload: finnhubSentiment,
    });

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
    const sentiment = normalizeAlphaVantageSentimentInput({
      symbol,
      articles,
      payload: alphaNews,
    });

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

  return normalizeFmpFundamentals({
    symbol,
    incomeStatements,
    ratiosTtm,
    financialScores,
  });
}

async function getOrFetchCached<T>(
  symbol: string,
  providerKey: string,
  fetcher: () => Promise<T>
) {
  const cached = await getCachedProviderPayload<T>(symbol, providerKey);
  if (cached) {
    return cached;
  }

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
