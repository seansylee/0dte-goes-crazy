import type {
  FundamentalsAnalysis,
  NormalizedFundamentals,
} from "@/types/domain";

export function scoreFundamentals(
  fundamentals: NormalizedFundamentals
): FundamentalsAnalysis {
  if (!fundamentals.available) {
    return {
      fundamentalsQualityScore: 50,
      available: false,
      notes: ["Fundamentals data is unavailable, so a neutral baseline was used."],
    };
  }

  let total = 0;
  const notes: string[] = [];

  total += scoreRevenueGrowth(fundamentals.revenueGrowth, notes);
  total += scoreNetIncome(fundamentals.positiveNetIncome, notes);
  total += scoreMargins(
    fundamentals.netMargin ?? fundamentals.operatingMargin,
    notes
  );
  total += scoreDebt(
    fundamentals.debtToEquity,
    fundamentals.currentRatio,
    notes
  );
  total += scoreFinancialHealth(
    fundamentals.altmanZScore,
    fundamentals.piotroskiScore,
    notes
  );

  return {
    fundamentalsQualityScore: clamp(Math.round(total), 0, 100),
    available: true,
    notes,
  };
}

function scoreRevenueGrowth(value: number | null, notes: string[]) {
  if (value === null) {
    notes.push("Revenue growth is unavailable.");
    return 8;
  }

  if (value >= 0.15) {
    notes.push("Revenue growth is strong.");
    return 25;
  }

  if (value >= 0.05) {
    notes.push("Revenue growth is positive.");
    return 20;
  }

  if (value >= 0) {
    notes.push("Revenue is stable.");
    return 14;
  }

  if (value >= -0.05) {
    notes.push("Revenue is soft but not collapsing.");
    return 8;
  }

  notes.push("Revenue is contracting.");
  return 2;
}

function scoreNetIncome(value: boolean | null, notes: string[]) {
  if (value === null) {
    notes.push("Net income data is unavailable.");
    return 8;
  }

  if (value) {
    notes.push("Net income is positive.");
    return 20;
  }

  notes.push("Net income is negative.");
  return 2;
}

function scoreMargins(value: number | null, notes: string[]) {
  if (value === null) {
    notes.push("Margin quality is unavailable.");
    return 8;
  }

  if (value >= 0.2) {
    notes.push("Profit margins are strong.");
    return 20;
  }

  if (value >= 0.1) {
    notes.push("Profit margins are healthy.");
    return 16;
  }

  if (value >= 0.05) {
    notes.push("Margins are acceptable.");
    return 12;
  }

  if (value > 0) {
    notes.push("Margins are thin.");
    return 8;
  }

  notes.push("Margins are negative.");
  return 2;
}

function scoreDebt(
  debtToEquity: number | null,
  currentRatio: number | null,
  notes: string[]
) {
  if (debtToEquity !== null) {
    if (debtToEquity <= 0.8) {
      notes.push("Debt levels look reasonable.");
      return 15;
    }

    if (debtToEquity <= 1.5) {
      notes.push("Debt levels are manageable.");
      return 10;
    }

    notes.push("Debt leverage is elevated.");
    return 4;
  }

  if (currentRatio !== null) {
    if (currentRatio >= 1.5) {
      notes.push("Liquidity looks healthy.");
      return 12;
    }

    if (currentRatio >= 1) {
      notes.push("Liquidity is acceptable.");
      return 8;
    }

    notes.push("Liquidity is tight.");
    return 4;
  }

  notes.push("Debt and liquidity metrics are unavailable.");
  return 8;
}

function scoreFinancialHealth(
  altmanZScore: number | null,
  piotroskiScore: number | null,
  notes: string[]
) {
  let score = 0;

  if (altmanZScore !== null) {
    if (altmanZScore >= 3) {
      notes.push("Altman Z-Score indicates strong financial health.");
      score += 10;
    } else if (altmanZScore >= 1.8) {
      notes.push("Altman Z-Score is acceptable.");
      score += 7;
    } else {
      notes.push("Altman Z-Score suggests elevated stress.");
      score += 2;
    }
  }

  if (piotroskiScore !== null) {
    if (piotroskiScore >= 7) {
      notes.push("Piotroski Score is strong.");
      score += 10;
    } else if (piotroskiScore >= 5) {
      notes.push("Piotroski Score is mixed.");
      score += 7;
    } else {
      notes.push("Piotroski Score is weak.");
      score += 2;
    }
  }

  if (altmanZScore === null && piotroskiScore === null) {
    notes.push("Financial health scores are unavailable.");
    score = 8;
  }

  return score;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
