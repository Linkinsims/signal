import { buildConfluenceSignal } from './signalBuilder';
import type { Candle } from '../types';

export type SignalType = 'LONG' | 'SHORT' | 'WATCH';
export type AssetClass = 'crypto' | 'stocks' | 'forex';
export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export interface Signal {
  id: string;
  asset: string;
  symbol: string;
  assetClass: AssetClass;
  type: SignalType;
  confidence: number;
  confluenceScore: number;
  confluenceCount: number;
  entry: number;
  reason: string;
  reasons: string[];
  timeframe: Timeframe;
  price: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  timestamp: number;
}

export function generateSignal(
  symbol: string,
  assetClass: AssetClass,
  candles: any[],
  timeframe: Timeframe
): Signal {
  const mapped: Candle[] = candles.map((c: any) => ({
    t: c.timestamp || c.t || Date.now(),
    o: c.open || c.o,
    h: c.high || c.h,
    l: c.low || c.l,
    c: c.close || c.c,
    v: c.volume || c.v,
  }));

  const result = buildConfluenceSignal(symbol, mapped, mapped);

  const risk = Math.abs(result.entry_price - result.stop_loss);
  const reward = Math.abs(result.targets[0] - result.entry_price);
  const rr = reward / Math.max(risk, 0.000001);

  return {
    id: result.signal_id,
    asset: symbol,
    symbol,
    assetClass,
    type: result.bias,
    confidence: Math.round(result.confidence * 100),
    confluenceScore: Math.round(result.confidence * 100),
    confluenceCount: result.confirmations.length,
    entry: result.entry_price,
    reason: result.confirmations.join(' · '),
    reasons: result.confirmations,
    timeframe,
    price: result.entry_price,
    stopLoss: result.stop_loss,
    takeProfit: result.targets[0],
    riskReward: Math.round(rr * 100) / 100,
    timestamp: result.timestamp,
  };
}

const SIGNAL_STORAGE_KEY = 'signal_history';

export function saveSignal(signal: Signal): void {
  if (typeof window === 'undefined') return;
  const history = getSignalHistory();
  localStorage.setItem(
    SIGNAL_STORAGE_KEY,
    JSON.stringify([signal, ...history].slice(0, 100))
  );
}

export function getSignalHistory(): Signal[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SIGNAL_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearSignalHistory(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SIGNAL_STORAGE_KEY);
  }
}
