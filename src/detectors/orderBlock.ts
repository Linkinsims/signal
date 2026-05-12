import CONFIG from '../config/config';
import type { Candle, Zone, TF } from '../types';

/** Detect order blocks before strong impulses. */
export function detectOrderBlocks(candles: Candle[], tf: TF = CONFIG.timeframes.MTF): Zone[] {
  const out: Zone[] = [];
  const threshold = CONFIG.detection.orderBlock.impulseThresholdPct;
  const impulseCandles = CONFIG.detection.orderBlock.minImpulseCandles;

  for (let i = 0; i < candles.length - impulseCandles; i++) {
    const base = candles[i];
    const next = candles.slice(i + 1, i + 1 + impulseCandles);
    const move = (next[next.length - 1].c - base.c) / base.c;

    if (Math.abs(move) >= threshold) {
      out.push({
        top: Math.max(base.o, base.c),
        bottom: Math.min(base.o, base.c),
        tf,
        strength: Math.abs(move),
        createdAt: base.t,
      });
    }
  }

  return out;
}
