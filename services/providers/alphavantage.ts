import { z } from "zod";

import { env } from "@/lib/env";
import { fetchJson, HttpError } from "@/lib/http";
import {
  alphaVantageErrorSchema,
  alphaVantageNewsResponseSchema,
  type AlphaVantageNewsResponse,
} from "@/types/external";

const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";

const alphaVantageResponseSchema = z.union([
  alphaVantageNewsResponseSchema,
  alphaVantageErrorSchema,
]);

export async function fetchAlphaVantageNewsSentiment(
  symbol: string
): Promise<AlphaVantageNewsResponse> {
  const apiKey = requireApiKey(env.ALPHA_VANTAGE_API_KEY, "Alpha Vantage");
  const url = new URL(ALPHA_VANTAGE_BASE_URL);

  url.searchParams.set("function", "NEWS_SENTIMENT");
  url.searchParams.set("tickers", symbol);
  url.searchParams.set("sort", "LATEST");
  url.searchParams.set("limit", "50");
  url.searchParams.set("apikey", apiKey);

  const response = await fetchJson(url.toString(), {
    schema: alphaVantageResponseSchema,
  });

  const parsedResponse = alphaVantageNewsResponseSchema.safeParse(response);
  if (parsedResponse.success) {
    return parsedResponse.data;
  }

  const message =
    response["Error Message"] ?? response.Note ?? response.Information ?? "Unknown API error";

  throw new HttpError(`Alpha Vantage returned an error: ${message}`);
}

function requireApiKey(value: string | undefined, provider: string) {
  if (!value) {
    throw new HttpError(`${provider} API key is not configured`);
  }

  return value;
}
