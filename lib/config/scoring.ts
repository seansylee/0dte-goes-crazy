import { env } from "@/lib/env";

export const CACHE_TTL_MS = env.CACHE_TTL_MINUTES * 60 * 1_000;

export const SCORING_CONFIG = {
  cacheTtlMinutes: env.CACHE_TTL_MINUTES,

  // Two-way weights: used when options data is unavailable (backward compatible)
  sentimentWeight: 0.6,
  fundamentalsWeight: 0.4,

  // Conditional weights selected by combineScores()
  weights: {
    withOptions: {
      sentiment: 0.4,
      fundamentals: 0.25,
      options: 0.35,
    },
    withoutOptions: {
      sentiment: 0.6,
      fundamentals: 0.4,
    },
  },

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

  // Ordered array — scorer uses .find(t => pcr < t.max)
  pcrThresholds: [
    { max: 0.5, contribution: 25 },
    { max: 0.7, contribution: 15 },
    { max: 0.9, contribution: 8 },
    { max: 1.1, contribution: 0 },
    { max: 1.3, contribution: -8 },
    { max: 1.7, contribution: -15 },
    { max: Number.POSITIVE_INFINITY, contribution: -25 },
  ],

  gammaFlipContribution: 12,
} as const;
