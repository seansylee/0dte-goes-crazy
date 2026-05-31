import { SCORING_CONFIG } from "@/lib/config/scoring";
import type { CombinedAnalysis, SentimentLabel } from "@/types/domain";

export function combineScores(args: {
  sentimentScore: number;
  fundamentalsQualityScore: number;
  optionsScore?: number;
}): CombinedAnalysis {
  const normalizedSentiment = ((args.sentimentScore + 1) / 2) * 100;

  let raw: number;

  if (args.optionsScore !== undefined) {
    const w = SCORING_CONFIG.weights.withOptions;
    raw =
      normalizedSentiment * w.sentiment +
      args.fundamentalsQualityScore * w.fundamentals +
      args.optionsScore * w.options;
  } else {
    const w = SCORING_CONFIG.weights.withoutOptions;
    raw =
      normalizedSentiment * w.sentiment +
      args.fundamentalsQualityScore * w.fundamentals;
  }

  const combinedScore = clamp(Math.round(raw), 0, 100);

  return {
    combinedScore,
    label: labelFromScore(combinedScore),
  };
}

function labelFromScore(score: number): SentimentLabel {
  if (score >= SCORING_CONFIG.bullishThreshold) return "bullish";
  if (score >= SCORING_CONFIG.neutralThreshold) return "neutral";
  return "bearish";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
