import { fetchYahooOptions, fetchYahooQuote } from "@/services/providers/yahoo";
import type { YahooOptionsResponse, YahooQuoteResponse } from "@/types/external";

export async function fetchOptionsChain(symbol: string): Promise<YahooOptionsResponse | null> {
  try {
    return await fetchYahooOptions(symbol);
  } catch {
    return null;
  }
}

export async function fetchPriceQuote(symbol: string): Promise<YahooQuoteResponse | null> {
  try {
    return await fetchYahooQuote(symbol);
  } catch {
    return null;
  }
}
