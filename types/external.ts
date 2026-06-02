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

export const yahooOptionContractSchema = z
  .object({
    strike: z.number(),
    volume: z.number().int().nonnegative().optional(),
    openInterest: z.number().int().nonnegative().optional(),
    bid: z.number().nonnegative().optional(),
    ask: z.number().nonnegative().optional(),
    impliedVolatility: z.number().nonnegative().optional(),
    lastPrice: z.number().nonnegative().optional(),
  })
  .passthrough();

export const yahooOptionsExpirationSchema = z
  .object({
    expirationDate: z.number(),
    calls: z.array(yahooOptionContractSchema).default([]),
    puts: z.array(yahooOptionContractSchema).default([]),
  })
  .passthrough();

// Yahoo Finance v7 options API response shape:
// { optionChain: { result: [{ underlyingSymbol, expirationDates, options: [...] }], error } }
export const yahooOptionsResultSchema = z
  .object({
    underlyingSymbol: z.string().optional(),
    expirationDates: z.array(z.number()).default([]),
    options: z.array(yahooOptionsExpirationSchema).default([]),
  })
  .passthrough();

export const yahooOptionsApiResponseSchema = z
  .object({
    optionChain: z.object({
      result: z.array(yahooOptionsResultSchema).default([]),
      error: z.unknown().nullable().optional(),
    }),
  })
  .passthrough();

// Normalized shape used internally after extracting the first result
export const yahooOptionsResponseSchema = z
  .object({
    options: z.array(yahooOptionsExpirationSchema).default([]),
    expirationDates: z.array(z.number()).default([]),
    underlyingSymbol: z.string().optional(),
  })
  .passthrough();

// Yahoo Finance v7 quote API response: /v7/finance/quote?symbols={symbol}
export const yahooQuoteResultSchema = z
  .object({
    symbol: z.string(),
    regularMarketPrice: z.number().optional(),
    regularMarketChangePercent: z.number().optional(),
    regularMarketChange: z.number().optional(),
  })
  .passthrough();

export const yahooQuoteApiResponseSchema = z
  .object({
    quoteResponse: z.object({
      result: z.array(yahooQuoteResultSchema).default([]),
      error: z.unknown().nullable().optional(),
    }),
  })
  .passthrough();

export const yahooQuoteResponseSchema = yahooQuoteResultSchema;

export type YahooOptionContract = z.infer<typeof yahooOptionContractSchema>;
export type YahooOptionsExpiration = z.infer<typeof yahooOptionsExpirationSchema>;
export type YahooOptionsResponse = z.infer<typeof yahooOptionsResponseSchema>;
export type YahooQuoteResponse = z.infer<typeof yahooQuoteResponseSchema>;
