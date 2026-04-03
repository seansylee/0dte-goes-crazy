import type {
  CombinedAnalysis,
  FundamentalsAnalysis,
  SentimentAnalysis,
} from "@/types/domain";

export function generateSummary(args: {
  symbol: string;
  sentiment: SentimentAnalysis;
  fundamentals: FundamentalsAnalysis;
  combined: CombinedAnalysis;
}) {
  const sentimentStrength = describeSentimentStrength(args.sentiment.sentimentScore);
  const label = capitalize(args.combined.label);
  const articlePhrase =
    args.sentiment.articleCount === 1
      ? "1 recent article"
      : `${args.sentiment.articleCount} recent articles`;

  const fundamentalsClause = args.fundamentals.available
    ? summarizeFundamentals(args.fundamentals.notes)
    : "Fundamentals are unavailable, so a neutral baseline was applied.";

  return `${args.symbol} shows ${sentimentStrength} ${args.combined.label} sentiment based on ${articlePhrase}. ${fundamentalsClause} Overall signal: ${label}.`;
}

function describeSentimentStrength(score: number) {
  const magnitude = Math.abs(score);

  if (magnitude >= 0.6) {
    return "strongly";
  }

  if (magnitude >= 0.25) {
    return "moderately";
  }

  return "slightly";
}

function summarizeFundamentals(notes: string[]) {
  const prioritized = notes.slice(0, 2).map((note) => note.replace(/\.$/, ""));
  if (prioritized.length === 0) {
    return "Fundamentals are mixed.";
  }

  return `Fundamentals are ${prioritized.join(" and ").toLowerCase()}.`;
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
