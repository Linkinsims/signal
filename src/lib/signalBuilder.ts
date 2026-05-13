import CONFIG from '../config/config';
import type { Candle } from '../types';
import { detectFVG } from '../detectors/fvg';
import { detectSweeps } from '../detectors/sweep';
import { detectOrderBlocks } from '../detectors/orderBlock';

export interface StrategySignal {
  signal_id: string;
  timestamp: number;
  instrument: string;
  bias: 'LONG' | 'SHORT' | 'WATCH';
  entry_price: number;
  stop_loss: number;
  targets: number[];
  confidence: number;
  confirmations: string[];
  tf_context: Record<string, number>;
  metadata: Record<string, unknown>;
  recommended_position_size: number;
  recommended_risk_pct: number;
}

export function buildConfluenceSignal(
  instrument: string,
  htfCandles: Candle[],
  ltfCandles: Candle[],
  accountSize = 10000,
): StrategySignal {
  const orderBlocks = detectOrderBlocks(htfCandles, CONFIG.timeframes.MTF);
  const fvgs = detectFVG(ltfCandles, CONFIG.timeframes.LTF);
  const levels = orderBlocks.map(z => (z.top + z.bottom) / 2);
  const sweeps = detectSweeps(ltfCandles, levels, CONFIG.timeframes.ETF);

  const confirmations: string[] = [];
  if (orderBlocks.length) confirmations.push('HTF_OB');
  if (fvgs.length) confirmations.push('MTF_FVG');
  if (sweeps.length) confirmations.push('SWEEP');

  const last = ltfCandles[ltfCandles.length - 1];
  const bias = confirmations.length >= CONFIG.confluence.requireMin
    ? (last.c >= last.o ? 'LONG' : 'SHORT')
    : 'WATCH';

  const stop = bias === 'LONG' ? last.l * 0.999 : last.h * 1.001;
  const riskPerUnit = Math.abs(last.c - stop);
  const riskAmount = accountSize * (CONFIG.risk.riskPerTradePct / 100);
  const positionSize = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;

  return {
    signal_id: `sig_${Date.now()}`,
    timestamp: Date.now(),
    instrument,
    bias,
    entry_price: last.c,
    stop_loss: stop,
    targets: bias === 'LONG' ? [last.c + riskPerUnit * 2] : [last.c - riskPerUnit * 2],
    confidence: Math.min(confirmations.length / 3, 1),
    confirmations,
    tf_context: { htf: htfCandles.length, ltf: ltfCandles.length },
    metadata: { orderBlocks: orderBlocks.length, fvgs: fvgs.length, sweeps: sweeps.length },
    recommended_position_size: positionSize,
    recommended_risk_pct: CONFIG.risk.riskPerTradePct,
  };
}
