import CONFIG from '../config/config';
import type { Candle, FVG, TF } from '../types';

/** Detect fair value gaps from candle arrays. */
export function detectFVG(candles: Candle[], tf: TF = CONFIG.timeframes.LTF): FVG[] {
  const out: FVG[] = [];
  const minGapPct = CONFIG.detection.fvg.minGapPct;

  for (let i = 2; i < candles.length; i++) {
    const a = candles[i - 2];
    const c = candles[i];

    const bullishGap = c.l > a.h;
    const bearishGap = a.l > c.h;

    if (bullishGap) {
      const gapSize = (c.l - a.h) / a.h;
      if (gapSize >= minGapPct) out.push({ top: c.l, bottom: a.h, tf, ageHours: 0 });
    }

    if (bearishGap) {
      const gapSize = (a.l - c.h) / c.h;
      if (gapSize >= minGapPct) out.push({ top: a.l, bottom: c.h, tf, ageHours: 0 });
    }
  }

  return out;
}
