import { env } from "@/lib/env";
import { fetchJson, HttpError } from "@/lib/http";
import {
  fmpFinancialScoresResponseSchema,
  fmpIncomeStatementResponseSchema,
  fmpRatiosTtmResponseSchema,
  type FmpFinancialScoresResponse,
  type FmpIncomeStatementResponse,
  type FmpRatiosTtmResponse,
} from "@/types/external";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

export async function fetchFmpIncomeStatements(
  symbol: string
): Promise<FmpIncomeStatementResponse> {
  const url = buildFmpUrl("income-statement", symbol);
  return fetchJson(url, {
    schema: fmpIncomeStatementResponseSchema,
  });
}

export async function fetchFmpRatiosTtm(
  symbol: string
): Promise<FmpRatiosTtmResponse> {
  const url = buildFmpUrl("ratios-ttm", symbol);
  return fetchJson(url, {
    schema: fmpRatiosTtmResponseSchema,
  });
}

export async function fetchFmpFinancialScores(
  symbol: string
): Promise<FmpFinancialScoresResponse> {
  const url = buildFmpUrl("financial-scores", symbol);
  return fetchJson(url, {
    schema: fmpFinancialScoresResponseSchema,
  });
}

function buildFmpUrl(path: string, symbol: string) {
  const apiKey = requireApiKey(env.FMP_API_KEY, "Financial Modeling Prep");
  const url = new URL(`${FMP_BASE_URL}/${path}`);

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  return url.toString();
}

function requireApiKey(value: string | undefined, provider: string) {
  if (!value) {
    throw new HttpError(`${provider} API key is not configured`);
  }

  return value;
}
