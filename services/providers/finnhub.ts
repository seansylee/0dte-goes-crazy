import { z } from "zod";

import { env } from "@/lib/env";
import { fetchJson, HttpError } from "@/lib/http";
import {
  finnhubCompanyNewsResponseSchema,
  finnhubNewsSentimentResponseSchema,
  type FinnhubCompanyNewsResponse,
  type FinnhubNewsSentimentResponse,
} from "@/types/external";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export async function fetchFinnhubCompanyNews(
  symbol: string
): Promise<FinnhubCompanyNewsResponse> {
  const apiKey = requireApiKey(env.FINNHUB_API_KEY, "Finnhub");
  const url = new URL(`${FINNHUB_BASE_URL}/company-news`);
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 14);

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("from", formatDate(from));
  url.searchParams.set("to", formatDate(today));
  url.searchParams.set("token", apiKey);

  return fetchJson(url.toString(), {
    schema: finnhubCompanyNewsResponseSchema,
  });
}

export async function fetchFinnhubNewsSentiment(
  symbol: string
): Promise<FinnhubNewsSentimentResponse> {
  const apiKey = requireApiKey(env.FINNHUB_API_KEY, "Finnhub");
  const url = new URL(`${FINNHUB_BASE_URL}/news-sentiment`);

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", apiKey);

  return fetchJson(url.toString(), {
    schema: finnhubNewsSentimentResponseSchema,
  });
}

function requireApiKey(value: string | undefined, provider: string) {
  if (!value) {
    throw new HttpError(`${provider} API key is not configured`);
  }

  return value;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export const finnhubProviderSchemas = {
  companyNews: finnhubCompanyNewsResponseSchema,
  newsSentiment: finnhubNewsSentimentResponseSchema,
} satisfies Record<string, z.ZodTypeAny>;
