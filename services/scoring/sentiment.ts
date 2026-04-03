import { SCORING_CONFIG } from "@/lib/config/scoring";
import type { SentimentAnalysis, SentimentInput } from "@/types/domain";

const POSITIVE_KEYWORDS = [
  "beat",
  "surge",
  "growth",
  "upgrade",
  "bullish",
  "record",
  "strong",
  "profit",
  "expands",
  "outperform",
];

const NEGATIVE_KEYWORDS = [
  "miss",
  "drop",
  "downgrade",
  "lawsuit",
  "bearish",
  "weak",
  "decline",
  "cut",
  "risk",
  "loss",
];

export function scoreSentiment(input: SentimentInput): SentimentAnalysis {
  const scoredArticles = input.articles.map((article) => {
    const articleScore = article.sentimentScore ?? scoreHeadline(article.headline);
    const recencyWeight = getRecencyWeight(article.publishedAt);

    return {
      ...article,
      articleScore,
      recencyWeight,
    };
  });

  const weightedHeadlineScore =
    scoredArticles.length > 0
      ? scoredArticles.reduce(
          (sum, article) => sum + article.articleScore * article.recencyWeight,
          0
        ) / scoredArticles.reduce((sum, article) => sum + article.recencyWeight, 0)
      : 0;

  const providerSentimentWeight = input.providerSentimentScore !== null ? 0.7 : 0;
  const articleWeight = providerSentimentWeight > 0 ? 0.3 : 1;

  const sentimentScore = clamp(
    round(
      providerSentimentWeight * (input.providerSentimentScore ?? 0) +
        articleWeight * weightedHeadlineScore,
      4
    ),
    -1,
    1
  );

  const confidenceScore = computeConfidenceScore({
    articleCount: input.articles.length,
    averageRecencyWeight:
      scoredArticles.length > 0
        ? scoredArticles.reduce((sum, article) => sum + article.recencyWeight, 0) /
          scoredArticles.length
        : 0,
    providerQuality: input.providerQuality,
    hasProviderSentiment: input.providerSentimentScore !== null,
  });

  return {
    sentimentScore,
    confidenceScore,
    articleCount: input.articles.length,
    providerUsed:
      input.provider === "finnhub"
        ? "finnhub"
        : input.provider === "alphavantage"
          ? "alphavantage"
          : "keyword-only",
    usedFallback: input.usedFallback,
    trend: buildTrend(scoredArticles),
  };
}

function computeConfidenceScore(args: {
  articleCount: number;
  averageRecencyWeight: number;
  providerQuality: number;
  hasProviderSentiment: boolean;
}) {
  const articleCountScore = Math.min(args.articleCount, 20) * 2;
  const recencyScore = Math.round(args.averageRecencyWeight * 25);
  const providerScore = Math.round(args.providerQuality * 20);
  const providerSentimentBonus = args.hasProviderSentiment ? 15 : 8;

  return clamp(
    articleCountScore + recencyScore + providerScore + providerSentimentBonus,
    0,
    100
  );
}

function buildTrend(
  articles: Array<{
    publishedAt: string;
    articleScore: number;
  }>
) {
  const trendMap = new Map<string, { total: number; count: number }>();

  for (const article of articles) {
    const date = article.publishedAt.slice(0, 10);
    const existing = trendMap.get(date) ?? { total: 0, count: 0 };
    existing.total += article.articleScore;
    existing.count += 1;
    trendMap.set(date, existing);
  }

  return Array.from(trendMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-7)
    .map(([date, value]) => ({
      date,
      score: clamp(round(value.total / value.count, 4), -1, 1),
    }));
}

function getRecencyWeight(publishedAt: string) {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1_000);

  if (ageDays <= SCORING_CONFIG.recencyDays.strongest) {
    return 1;
  }

  if (ageDays <= SCORING_CONFIG.recencyDays.strong) {
    return 0.85;
  }

  if (ageDays <= SCORING_CONFIG.recencyDays.moderate) {
    return 0.7;
  }

  if (ageDays <= SCORING_CONFIG.recencyDays.weak) {
    return 0.5;
  }

  return 0.35;
}

function scoreHeadline(headline: string) {
  const normalized = headline.toLowerCase();

  let score = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      score += 0.18;
    }
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      score -= 0.18;
    }
  }

  return clamp(round(score, 4), -1, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, precision: number) {
  return Number(value.toFixed(precision));
}
