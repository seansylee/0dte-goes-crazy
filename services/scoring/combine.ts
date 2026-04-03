import { SCORING_CONFIG } from "@/lib/config/scoring";
import type { CombinedAnalysis, SentimentLabel } from "@/types/domain";

export function combineScores(args: {
  sentimentScore: number;
  fundamentalsQualityScore: number;
}): CombinedAnalysis {
  const normalizedSentiment = ((args.sentimentScore + 1) / 2) * 100;
  const combinedScore = Math.round(
    normalizedSentiment * SCORING_CONFIG.sentimentWeight +
      args.fundamentalsQualityScore * SCORING_CONFIG.fundamentalsWeight
  );

  return {
    combinedScore,
    label: labelFromScore(combinedScore),
  };
}

function labelFromScore(score: number): SentimentLabel {
  if (score >= SCORING_CONFIG.bullishThreshold) {
    return "bullish";
  }

  if (score >= SCORING_CONFIG.neutralThreshold) {
    return "neutral";
  }

  return "bearish";
}
