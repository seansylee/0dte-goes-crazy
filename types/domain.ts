import { z } from "zod";

export const sentimentLabelSchema = z.enum(["bullish", "neutral", "bearish"]);
export const providerSchema = z.enum(["finnhub", "alphavantage", "fmp"]);

export const normalizedNewsArticleSchema = z.object({
  symbol: z.string(),
  provider: z.enum(["finnhub", "alphavantage"]),
  headline: z.string(),
  summary: z.string().nullable(),
  source: z.string().nullable(),
  url: z.string(),
  publishedAt: z.string(),
  sentimentScore: z.number().min(-1).max(1).nullable(),
});

export const sentimentInputSchema = z.object({
  symbol: z.string(),
  provider: z.enum(["finnhub", "alphavantage"]),
  providerSentimentScore: z.number().min(-1).max(1).nullable(),
  providerQuality: z.number().min(0).max(1),
  usedFallback: z.boolean(),
  articles: z.array(normalizedNewsArticleSchema),
});

export const normalizedFundamentalsSchema = z.object({
  symbol: z.string(),
  provider: z.literal("fmp"),
  revenueGrowth: z.number().nullable(),
  positiveNetIncome: z.boolean().nullable(),
  netMargin: z.number().nullable(),
  operatingMargin: z.number().nullable(),
  currentRatio: z.number().nullable(),
  debtToEquity: z.number().nullable(),
  altmanZScore: z.number().nullable(),
  piotroskiScore: z.number().nullable(),
  available: z.boolean(),
});

export const trendPointSchema = z.object({
  date: z.string(),
  score: z.number().min(-1).max(1),
});

export const sentimentAnalysisSchema = z.object({
  sentimentScore: z.number().min(-1).max(1),
  confidenceScore: z.number().min(0).max(100),
  articleCount: z.number().int().nonnegative(),
  providerUsed: z.enum(["finnhub", "alphavantage", "keyword-only"]),
  usedFallback: z.boolean(),
  trend: z.array(trendPointSchema),
});

export const fundamentalsAnalysisSchema = z.object({
  fundamentalsQualityScore: z.number().min(0).max(100),
  available: z.boolean(),
  notes: z.array(z.string()),
});

export const combinedAnalysisSchema = z.object({
  combinedScore: z.number().min(0).max(100),
  label: sentimentLabelSchema,
});

export const analysisResultSchema = z.object({
  symbol: z.string(),
  generatedAt: z.string(),
  cached: z.boolean(),
  summary: z.string(),
  articles: z.array(normalizedNewsArticleSchema),
  sentiment: sentimentAnalysisSchema,
  fundamentals: fundamentalsAnalysisSchema,
  combined: combinedAnalysisSchema,
});

export type SentimentLabel = z.infer<typeof sentimentLabelSchema>;
export type ProviderName = z.infer<typeof providerSchema>;
export type NormalizedNewsArticle = z.infer<typeof normalizedNewsArticleSchema>;
export type SentimentInput = z.infer<typeof sentimentInputSchema>;
export type NormalizedFundamentals = z.infer<typeof normalizedFundamentalsSchema>;
export type SentimentAnalysis = z.infer<typeof sentimentAnalysisSchema>;
export type FundamentalsAnalysis = z.infer<typeof fundamentalsAnalysisSchema>;
export type CombinedAnalysis = z.infer<typeof combinedAnalysisSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
