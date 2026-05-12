import CONFIG from '../config/config';
import type { Candle, Sweep, TF } from '../types';

/** Detect liquidity sweeps with confirmation. */
export function detectSweeps(candles: Candle[], levels: number[], tf: TF = CONFIG.timeframes.ETF): Sweep[] {
  const out: Sweep[] = [];
  const window = CONFIG.detection.sweep.confirmationWindowCandles;
  const buffer = CONFIG.detection.sweep.wickBufferPct;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    for (const level of levels) {
      const swept = candle.h > level * (1 + buffer) || candle.l < level * (1 - buffer);
      if (!swept) continue;

      const returned = candles.slice(i + 1, i + 1 + window).some(c =>
        c.c <= level * (1 + buffer) && c.c >= level * (1 - buffer)
      );

      if (returned) {
        out.push({ level, wickTop: candle.h, wickBottom: candle.l, time: candle.t, tf, valid: true });
      }
    }
  }

  return out;
}
