import { env } from "@/lib/env";

export const CACHE_TTL_MS = env.CACHE_TTL_MINUTES * 60 * 1_000;

export const SCORING_CONFIG = {
  cacheTtlMinutes: env.CACHE_TTL_MINUTES,
  sentimentWeight: 0.6,
  fundamentalsWeight: 0.4,
  bullishThreshold: 67,
  neutralThreshold: 40,
  providerQuality: {
    finnhub: 1,
    alphavantage: 0.8,
    keywordOnly: 0.65,
  },
  recencyDays: {
    strongest: 1,
    strong: 3,
    moderate: 7,
    weak: 14,
  },
} as const;
