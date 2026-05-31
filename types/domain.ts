import { z } from "zod";

export const sentimentLabelSchema = z.enum(["bullish", "neutral", "bearish"]);
export const providerSchema = z.enum(["finnhub", "alphavantage", "fmp", "yahoo"]);

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

export const strikeDataSchema = z.object({
  strike: z.number(),
  callOI: z.number().int().nonnegative(),
  putOI: z.number().int().nonnegative(),
  callVolume: z.number().int().nonnegative(),
  putVolume: z.number().int().nonnegative(),
});

export const gammaExposureSchema = z.object({
  netGamma: z.number(),
  flipPoint: z.number().nullable(),
  maxCallWall: z.number().nullable(),
  maxPutWall: z.number().nullable(),
});

export const optionsChainSchema = z.object({
  symbol: z.string(),
  expiry: z.string(),
  putCallRatio: z.number().nonnegative(),
  callVolume: z.number().int().nonnegative(),
  putVolume: z.number().int().nonnegative(),
  callOI: z.number().int().nonnegative(),
  putOI: z.number().int().nonnegative(),
  strikeData: z.array(strikeDataSchema),
});

export const priceQuoteSchema = z.object({
  symbol: z.string(),
  price: z.number().positive(),
  changePercent: z.number(),
  changeAbsolute: z.number(),
});

export const optionsAnalysisSchema = z.object({
  putCallRatio: z.number().nonnegative(),
  gammaExposure: gammaExposureSchema,
  optionsScore: z.number().min(0).max(100),
  available: z.boolean(),
  notes: z.array(z.string()),
});

const unavailableOptionsDefault = {
  putCallRatio: 1,
  gammaExposure: { netGamma: 0, flipPoint: null, maxCallWall: null, maxPutWall: null },
  optionsScore: 50,
  available: false,
  notes: ["Options data was not available."],
};

export const analysisResultSchema = z.object({
  symbol: z.string(),
  generatedAt: z.string(),
  cached: z.boolean(),
  summary: z.string(),
  articles: z.array(normalizedNewsArticleSchema),
  sentiment: sentimentAnalysisSchema,
  fundamentals: fundamentalsAnalysisSchema,
  combined: combinedAnalysisSchema,
  options: optionsAnalysisSchema.optional().default(unavailableOptionsDefault),
  quote: priceQuoteSchema.nullable().optional().default(null),
});

export type SentimentLabel = z.infer<typeof sentimentLabelSchema>;
export type ProviderName = z.infer<typeof providerSchema>;
export type NormalizedNewsArticle = z.infer<typeof normalizedNewsArticleSchema>;
export type SentimentInput = z.infer<typeof sentimentInputSchema>;
export type NormalizedFundamentals = z.infer<typeof normalizedFundamentalsSchema>;
export type SentimentAnalysis = z.infer<typeof sentimentAnalysisSchema>;
export type FundamentalsAnalysis = z.infer<typeof fundamentalsAnalysisSchema>;
export type CombinedAnalysis = z.infer<typeof combinedAnalysisSchema>;
export type StrikeData = z.infer<typeof strikeDataSchema>;
export type GammaExposure = z.infer<typeof gammaExposureSchema>;
export type OptionsChain = z.infer<typeof optionsChainSchema>;
export type PriceQuote = z.infer<typeof priceQuoteSchema>;
export type OptionsAnalysis = z.infer<typeof optionsAnalysisSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
