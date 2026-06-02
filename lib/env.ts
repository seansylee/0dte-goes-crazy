import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  FINNHUB_API_KEY: z.string().trim().optional(),
  FMP_API_KEY: z.string().trim().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().trim().optional(),
  POLYGON_API_KEY: z.string().trim().optional(),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  HTTP_RETRY_COUNT: z.coerce.number().int().min(0).max(5).default(2),
  CACHE_TTL_MINUTES: z.coerce.number().int().min(1).max(1_440).default(15),
});

const parsedEnv = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  FMP_API_KEY: process.env.FMP_API_KEY,
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
  POLYGON_API_KEY: process.env.POLYGON_API_KEY,
  HTTP_TIMEOUT_MS: process.env.HTTP_TIMEOUT_MS,
  HTTP_RETRY_COUNT: process.env.HTTP_RETRY_COUNT,
  CACHE_TTL_MINUTES: process.env.CACHE_TTL_MINUTES,
});

if (!parsedEnv.success) {
  const message = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = {
  ...parsedEnv.data,
  FINNHUB_API_KEY: emptyToUndefined(parsedEnv.data.FINNHUB_API_KEY),
  FMP_API_KEY: emptyToUndefined(parsedEnv.data.FMP_API_KEY),
  ALPHA_VANTAGE_API_KEY: emptyToUndefined(parsedEnv.data.ALPHA_VANTAGE_API_KEY),
  POLYGON_API_KEY: emptyToUndefined(parsedEnv.data.POLYGON_API_KEY),
} as const;

function emptyToUndefined(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.length > 0 ? value : undefined;
}
