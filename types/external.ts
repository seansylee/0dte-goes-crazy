import { z } from "zod";

const numeric = z.coerce.number();
const nullableNumeric = z.union([numeric, z.null()]);
const nullableString = z.union([z.string(), z.null()]).optional();

export const finnhubCompanyNewsArticleSchema = z
  .object({
    category: nullableString,
    datetime: numeric,
    headline: z.string(),
    id: numeric,
    image: nullableString,
    related: nullableString,
    source: nullableString,
    summary: nullableString,
    url: z.string(),
  })
  .passthrough();

export const finnhubCompanyNewsResponseSchema = z.array(
  finnhubCompanyNewsArticleSchema
);

export const finnhubNewsSentimentResponseSchema = z
  .object({
    buzz: z
      .object({
        articlesInLastWeek: numeric.optional(),
        buzz: numeric.optional(),
        weeklyAverage: numeric.optional(),
      })
      .optional(),
    companyNewsScore: numeric.optional(),
    sectorAverageBullishPercent: numeric.optional(),
    sectorAverageNewsScore: numeric.optional(),
    sentiment: z
      .object({
        bearishPercent: numeric.optional(),
        bullishPercent: numeric.optional(),
      })
      .optional(),
    symbol: z.string().optional(),
  })
  .passthrough();

export const alphaVantageNewsItemSchema = z
  .object({
    title: z.string(),
    url: z.string(),
    time_published: z.string(),
    authors: z.array(z.string()).optional(),
    summary: nullableString,
    source: nullableString,
    overall_sentiment_score: numeric.optional(),
    overall_sentiment_label: z.string().optional(),
    ticker_sentiment: z
      .array(
        z
          .object({
            ticker: z.string(),
            relevance_score: numeric.optional(),
            ticker_sentiment_score: numeric.optional(),
            ticker_sentiment_label: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const alphaVantageNewsResponseSchema = z
  .object({
    feed: z.array(alphaVantageNewsItemSchema).default([]),
    items: z.string().optional(),
  })
  .passthrough();

export const alphaVantageErrorSchema = z
  .object({
    Information: z.string().optional(),
    Note: z.string().optional(),
    "Error Message": z.string().optional(),
  })
  .passthrough();

export const fmpIncomeStatementItemSchema = z
  .object({
    date: z.string().optional(),
    calendarYear: z.string().optional(),
    revenue: nullableNumeric.optional(),
    netIncome: nullableNumeric.optional(),
    grossProfit: nullableNumeric.optional(),
    operatingIncome: nullableNumeric.optional(),
  })
  .passthrough();

export const fmpIncomeStatementResponseSchema = z.array(
  fmpIncomeStatementItemSchema
);

export const fmpRatiosTtmItemSchema = z
  .object({
    grossProfitMarginTTM: nullableNumeric.optional(),
    netProfitMarginTTM: nullableNumeric.optional(),
    operatingProfitMarginTTM: nullableNumeric.optional(),
    currentRatioTTM: nullableNumeric.optional(),
    quickRatioTTM: nullableNumeric.optional(),
    debtEquityRatioTTM: nullableNumeric.optional(),
    debtRatioTTM: nullableNumeric.optional(),
    returnOnEquityTTM: nullableNumeric.optional(),
  })
  .passthrough();

export const fmpRatiosTtmResponseSchema = z.array(fmpRatiosTtmItemSchema);

export const fmpFinancialScoresItemSchema = z
  .object({
    altmanZScore: nullableNumeric.optional(),
    piotroskiScore: nullableNumeric.optional(),
    workingCapital: nullableNumeric.optional(),
    totalAssets: nullableNumeric.optional(),
  })
  .passthrough();

export const fmpFinancialScoresResponseSchema = z.array(
  fmpFinancialScoresItemSchema
);

export type FinnhubCompanyNewsArticle = z.infer<
  typeof finnhubCompanyNewsArticleSchema
>;
export type FinnhubCompanyNewsResponse = z.infer<
  typeof finnhubCompanyNewsResponseSchema
>;
export type FinnhubNewsSentimentResponse = z.infer<
  typeof finnhubNewsSentimentResponseSchema
>;
export type AlphaVantageNewsResponse = z.infer<
  typeof alphaVantageNewsResponseSchema
>;
export type AlphaVantageNewsItem = z.infer<typeof alphaVantageNewsItemSchema>;
export type FmpIncomeStatementResponse = z.infer<
  typeof fmpIncomeStatementResponseSchema
>;
export type FmpRatiosTtmResponse = z.infer<typeof fmpRatiosTtmResponseSchema>;
export type FmpFinancialScoresResponse = z.infer<
  typeof fmpFinancialScoresResponseSchema
>;
