import { SCORING_CONFIG } from "@/lib/config/scoring";
import { computeGammaExposure } from "@/services/normalizers/options";
import type { OptionsChain, OptionsAnalysis } from "@/types/domain";

export function scoreOptions(chain: OptionsChain, spotPrice: number): OptionsAnalysis {
  const gex = computeGammaExposure(chain.strikeData, spotPrice);

  const pcrContribution = computePcrContribution(chain.putCallRatio);
  const gammaContribution = computeGammaContribution(gex.flipPoint, spotPrice);
  const optionsScore = clamp(50 + pcrContribution + gammaContribution, 0, 100);

  const notes: string[] = [];
  notes.push(
    `Put/call ratio is ${chain.putCallRatio.toFixed(2)} — ${
      chain.putCallRatio < 0.8
        ? "call-heavy flow suggests bullish positioning."
        : chain.putCallRatio > 1.2
          ? "put-heavy flow suggests defensive positioning."
          : "flow is relatively balanced."
    }`
  );

  if (gex.flipPoint !== null) {
    notes.push(
      spotPrice > gex.flipPoint
        ? `Price ($${spotPrice.toFixed(2)}) is above gamma flip at $${gex.flipPoint.toFixed(2)} — dealers in long gamma, stabilizing.`
        : `Price ($${spotPrice.toFixed(2)}) is below gamma flip at $${gex.flipPoint.toFixed(2)} — dealers in short gamma, moves may amplify.`
    );
  } else {
    notes.push("Gamma flip point could not be determined from current options positioning.");
  }

  return {
    putCallRatio: chain.putCallRatio,
    gammaExposure: gex,
    optionsScore,
    available: true,
    notes,
  };
}

function computePcrContribution(pcr: number): number {
  const threshold = SCORING_CONFIG.pcrThresholds.find((t) => pcr < t.max);
  return threshold?.contribution ?? -25;
}

function computeGammaContribution(flipPoint: number | null, spotPrice: number): number {
  if (flipPoint === null) return 0;
  return spotPrice > flipPoint
    ? SCORING_CONFIG.gammaFlipContribution
    : -SCORING_CONFIG.gammaFlipContribution;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
