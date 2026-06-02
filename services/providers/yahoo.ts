import {
  yahooOptionsApiResponseSchema,
  yahooOptionsResponseSchema,
  yahooQuoteApiResponseSchema,
  yahooQuoteResponseSchema,
  type YahooOptionsResponse,
  type YahooQuoteResponse,
} from "@/types/external";

const YAHOO_OPTIONS_BASE = "https://query2.finance.yahoo.com/v7/finance/options";
const YAHOO_QUOTE_BASE = "https://query1.finance.yahoo.com/v7/finance/quote";

const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

export async function fetchYahooOptions(symbol: string): Promise<YahooOptionsResponse> {
  const url = `${YAHOO_OPTIONS_BASE}/${encodeURIComponent(symbol)}`;
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance options HTTP ${res.status} for ${symbol}`);
  }

  const raw = await res.json();
  const parsed = yahooOptionsApiResponseSchema.parse(raw);
  const result = parsed.optionChain.result[0];

  if (!result) {
    return yahooOptionsResponseSchema.parse({ options: [], expirationDates: [] });
  }

  return yahooOptionsResponseSchema.parse({
    options: result.options,
    expirationDates: result.expirationDates,
    underlyingSymbol: result.underlyingSymbol,
  });
}

export async function fetchYahooQuote(symbol: string): Promise<YahooQuoteResponse> {
  const url = `${YAHOO_QUOTE_BASE}?symbols=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance quote HTTP ${res.status} for ${symbol}`);
  }

  const raw = await res.json();
  const parsed = yahooQuoteApiResponseSchema.parse(raw);
  const result = parsed.quoteResponse.result[0];

  if (!result) {
    throw new Error(`Yahoo Finance returned no quote for ${symbol}`);
  }

  return yahooQuoteResponseSchema.parse(result);
}
