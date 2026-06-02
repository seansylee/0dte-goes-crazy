import type { YahooOptionContract, YahooOptionsResponse } from "@/types/external";
import type { GammaExposure, OptionsChain, StrikeData } from "@/types/domain";

export function normalizeOptionsChain(
  symbol: string,
  payload: YahooOptionsResponse,
  spotPrice: number
): OptionsChain | null {
  if (!spotPrice || spotPrice <= 0 || !payload.options.length) return null;

  const sorted = [...payload.options].sort((a, b) => a.expirationDate - b.expirationDate);
  const nearest = sorted[0];

  const strikes = buildStrikeData(nearest.calls, nearest.puts);
  if (!strikes.length) return null;

  const callVolume = strikes.reduce((s, r) => s + r.callVolume, 0);
  const putVolume = strikes.reduce((s, r) => s + r.putVolume, 0);
  const callOI = strikes.reduce((s, r) => s + r.callOI, 0);
  const putOI = strikes.reduce((s, r) => s + r.putOI, 0);
  const putCallRatio = callVolume > 0 ? putVolume / callVolume : 1.0;
  const expiry = new Date(nearest.expirationDate * 1000).toISOString().slice(0, 10);

  return {
    symbol,
    expiry,
    putCallRatio,
    callVolume,
    putVolume,
    callOI,
    putOI,
    strikeData: strikes,
  };
}

export function computeGammaExposure(strikeData: StrikeData[], spotPrice: number): GammaExposure {
  const withGex = strikeData.map((s) => ({
    strike: s.strike,
    gex: (s.callOI - s.putOI) * 100 * spotPrice,
  }));

  const netGamma = withGex.reduce((sum, s) => sum + s.gex, 0);

  const maxCallOI = strikeData.reduce(
    (best, s) => (s.callOI > best.callOI ? s : best),
    strikeData[0]
  );
  const maxPutOI = strikeData.reduce(
    (best, s) => (s.putOI > best.putOI ? s : best),
    strikeData[0]
  );

  const maxCallWall = maxCallOI?.callOI > 0 ? maxCallOI.strike : null;
  const maxPutWall = maxPutOI?.putOI > 0 ? maxPutOI.strike : null;
  const flipPoint = computeFlipPoint(withGex);

  return { netGamma, flipPoint, maxCallWall, maxPutWall };
}

function buildStrikeData(
  calls: YahooOptionContract[],
  puts: YahooOptionContract[]
): StrikeData[] {
  const map = new Map<number, StrikeData>();

  for (const c of calls) {
    map.set(c.strike, {
      strike: c.strike,
      callOI: c.openInterest ?? 0,
      putOI: 0,
      callVolume: c.volume ?? 0,
      putVolume: 0,
    });
  }

  for (const p of puts) {
    const existing = map.get(p.strike);
    if (existing) {
      existing.putOI = p.openInterest ?? 0;
      existing.putVolume = p.volume ?? 0;
    } else {
      map.set(p.strike, {
        strike: p.strike,
        callOI: 0,
        putOI: p.openInterest ?? 0,
        callVolume: 0,
        putVolume: p.volume ?? 0,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.strike - b.strike);
}

function computeFlipPoint(
  strikesWithGex: Array<{ strike: number; gex: number }>
): number | null {
  const sorted = [...strikesWithGex].sort((a, b) => a.strike - b.strike);

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    if (curr.gex <= 0 && next.gex >= 0) {
      const range = next.gex - curr.gex;
      if (range === 0) return curr.strike;
      return curr.strike + (next.strike - curr.strike) * (-curr.gex / range);
    }
  }

  return null;
}
