import type {
  FmpFinancialScoresResponse,
  FmpIncomeStatementResponse,
  FmpRatiosTtmResponse,
} from "@/types/external";
import type { NormalizedFundamentals } from "@/types/domain";

export function normalizeFmpFundamentals(args: {
  symbol: string;
  incomeStatements: FmpIncomeStatementResponse | null;
  ratiosTtm: FmpRatiosTtmResponse | null;
  financialScores: FmpFinancialScoresResponse | null;
}): NormalizedFundamentals {
  const latestIncome = args.incomeStatements?.[0];
  const previousIncome = args.incomeStatements?.[1];
  const latestRatios = args.ratiosTtm?.[0];
  const latestScores = args.financialScores?.[0];

  const revenueGrowth =
    latestIncome?.revenue != null && previousIncome?.revenue != null && previousIncome.revenue !== 0
      ? (latestIncome.revenue - previousIncome.revenue) / Math.abs(previousIncome.revenue)
      : null;

  const positiveNetIncome =
    latestIncome?.netIncome != null ? latestIncome.netIncome > 0 : null;

  const netMargin = latestRatios?.netProfitMarginTTM ?? null;
  const operatingMargin = latestRatios?.operatingProfitMarginTTM ?? null;
  const currentRatio = latestRatios?.currentRatioTTM ?? latestRatios?.quickRatioTTM ?? null;
  const debtToEquity =
    latestRatios?.debtEquityRatioTTM ?? latestRatios?.debtRatioTTM ?? null;
  const altmanZScore = latestScores?.altmanZScore ?? null;
  const piotroskiScore = latestScores?.piotroskiScore ?? null;

  const available = Boolean(
    latestIncome || latestRatios || latestScores
  );

  return {
    symbol: args.symbol,
    provider: "fmp",
    revenueGrowth,
    positiveNetIncome,
    netMargin,
    operatingMargin,
    currentRatio,
    debtToEquity,
    altmanZScore,
    piotroskiScore,
    available,
  };
}
