// Signal Generation Engine — Confluence-based signal scoring
import {
  OHLCV,
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateBollingerBands,
  calculateATR,
  isVolumeSpike,
} from './indicators';

export type SignalType = 'LONG' | 'SHORT' | 'WATCH';
export type AssetClass = 'crypto' | 'stocks' | 'forex';
export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export interface Signal {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  type: SignalType;
  confluenceScore: number; // 0-100%
  confluenceCount: number;
  reasons: string[];
  timeframe: Timeframe;
  price: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  timestamp: number;
}

interface ConditionResult {
  met: boolean;
  reason: string;
}

function generateId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── LONG Condition Checks ─────────────────────────────────────────
function checkLongConditions(candles: OHLCV[]): ConditionResult[] {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const conditions: ConditionResult[] = [];

  // 1. RSI < 35 (oversold)
  const rsi = calculateRSI(closes, 14);
  if (rsi.length > 0) {
    const lastRSI = rsi[rsi.length - 1];
    conditions.push({
      met: lastRSI < 35,
      reason: `RSI oversold (${lastRSI.toFixed(1)})`,
    });
  }

  // 2. MACD histogram turning positive (crossover)
  const macd = calculateMACD(closes);
  if (macd.length >= 2) {
    const curr = macd[macd.length - 1];
    const prev = macd[macd.length - 2];
    conditions.push({
      met: curr.histogram > 0 && prev.histogram <= 0,
      reason: 'MACD bullish crossover',
    });
  }

  // 3. Price above EMA 50
  const ema50 = calculateEMA(closes, 50);
  if (ema50.length > 0) {
    const lastPrice = closes[closes.length - 1];
    const lastEMA = ema50[ema50.length - 1];
    conditions.push({
      met: lastPrice > lastEMA,
      reason: 'Price above EMA 50 support',
    });
  }

  // 4. Price bouncing off lower Bollinger Band
  const bb = calculateBollingerBands(closes);
  if (bb.length >= 2) {
    const currBB = bb[bb.length - 1];
    const prevCandle = candles[candles.length - 2];
    const currCandle = candles[candles.length - 1];
    conditions.push({
      met: prevCandle.low <= currBB.lower * 1.005 && currCandle.close > currBB.lower,
      reason: 'Bounce off lower Bollinger Band',
    });
  }

  // 5. Volume spike > 1.5x average
  if (volumes.length > 20) {
    const spike = isVolumeSpike(volumes[volumes.length - 1], volumes.slice(0, -1));
    conditions.push({
      met: spike,
      reason: 'Volume spike detected (>1.5x avg)',
    });
  }

  // 6. EMA 50 above EMA 200 (golden cross zone)
  const ema200 = calculateEMA(closes, 200);
  if (ema50.length > 0 && ema200.length > 0) {
    conditions.push({
      met: ema50[ema50.length - 1] > ema200[ema200.length - 1],
      reason: 'Golden cross zone (EMA 50 > 200)',
    });
  }

  return conditions;
}

// ─── SHORT Condition Checks ────────────────────────────────────────
function checkShortConditions(candles: OHLCV[]): ConditionResult[] {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const conditions: ConditionResult[] = [];

  // 1. RSI > 70 (overbought)
  const rsi = calculateRSI(closes, 14);
  if (rsi.length > 0) {
    const lastRSI = rsi[rsi.length - 1];
    conditions.push({
      met: lastRSI > 70,
      reason: `RSI overbought (${lastRSI.toFixed(1)})`,
    });
  }

  // 2. MACD histogram turning negative
  const macd = calculateMACD(closes);
  if (macd.length >= 2) {
    const curr = macd[macd.length - 1];
    const prev = macd[macd.length - 2];
    conditions.push({
      met: curr.histogram < 0 && prev.histogram >= 0,
      reason: 'MACD bearish crossover',
    });
  }

  // 3. Price below EMA 50
  const ema50 = calculateEMA(closes, 50);
  if (ema50.length > 0) {
    const lastPrice = closes[closes.length - 1];
    conditions.push({
      met: lastPrice < ema50[ema50.length - 1],
      reason: 'Price below EMA 50 resistance',
    });
  }

  // 4. Price rejected at upper Bollinger Band
  const bb = calculateBollingerBands(closes);
  if (bb.length >= 2) {
    const currBB = bb[bb.length - 1];
    const prevCandle = candles[candles.length - 2];
    const currCandle = candles[candles.length - 1];
    conditions.push({
      met: prevCandle.high >= currBB.upper * 0.995 && currCandle.close < currBB.upper,
      reason: 'Rejection at upper Bollinger Band',
    });
  }

  // 5. Volume spike on down candle
  if (volumes.length > 20) {
    const lastCandle = candles[candles.length - 1];
    const spike = isVolumeSpike(volumes[volumes.length - 1], volumes.slice(0, -1));
    conditions.push({
      met: spike && lastCandle.close < lastCandle.open,
      reason: 'Bearish volume spike',
    });
  }

  // 6. EMA 50 below EMA 200 (death cross zone)
  const ema200 = calculateEMA(closes, 200);
  if (ema50.length > 0 && ema200.length > 0) {
    conditions.push({
      met: ema50[ema50.length - 1] < ema200[ema200.length - 1],
      reason: 'Death cross zone (EMA 50 < 200)',
    });
  }

  return conditions;
}

// ─── Main Signal Generator ─────────────────────────────────────────
export function generateSignal(
  symbol: string,
  assetClass: AssetClass,
  candles: OHLCV[],
  timeframe: Timeframe
): Signal | null {
  if (candles.length < 200) return null; // Need enough data

  const currentPrice = candles[candles.length - 1].close;

  // Check both LONG and SHORT conditions
  const longConditions = checkLongConditions(candles);
  const shortConditions = checkShortConditions(candles);

  const longMet = longConditions.filter((c) => c.met);
  const shortMet = shortConditions.filter((c) => c.met);

  // Calculate ATR for stop loss / take profit
  const atr = calculateATR(candles, 14);
  const currentATR = atr.length > 0 ? atr[atr.length - 1] : currentPrice * 0.02;

  let type: SignalType;
  let confluenceCount: number;
  let reasons: string[];
  let stopLoss: number;
  let takeProfit: number;

  if (longMet.length >= 3 && longMet.length > shortMet.length) {
    type = 'LONG';
    confluenceCount = longMet.length;
    reasons = longMet.map((c) => c.reason);
    stopLoss = currentPrice - 1.5 * currentATR;
    takeProfit = currentPrice + 2.5 * currentATR;
  } else if (shortMet.length >= 3 && shortMet.length > longMet.length) {
    type = 'SHORT';
    confluenceCount = shortMet.length;
    reasons = shortMet.map((c) => c.reason);
    stopLoss = currentPrice + 1.5 * currentATR;
    takeProfit = currentPrice - 2.5 * currentATR;
  } else {
    type = 'WATCH';
    confluenceCount = Math.max(longMet.length, shortMet.length);
    reasons =
      longMet.length >= shortMet.length
        ? longMet.map((c) => c.reason)
        : shortMet.map((c) => c.reason);
    if (reasons.length === 0) reasons = ['No clear confluence — monitoring'];
    stopLoss = 0;
    takeProfit = 0;
  }

  const maxConditions = 6;
  const confluenceScore = Math.min(
    Math.round((confluenceCount / maxConditions) * 100),
    82 // Never display above 82%
  );

  const risk = Math.abs(currentPrice - stopLoss);
  const reward = Math.abs(takeProfit - currentPrice);
  const riskReward = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;

  return {
    id: generateId(),
    symbol,
    assetClass,
    type,
    confluenceScore,
    confluenceCount,
    reasons,
    timeframe,
    price: currentPrice,
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    riskReward,
    timestamp: Date.now(),
  };
}

// ─── Signal History (localStorage) ──────────────────────────────────
const SIGNAL_STORAGE_KEY = 'signal_history';
const MAX_SIGNALS = 100;

export function saveSignal(signal: Signal): void {
  if (typeof window === 'undefined') return;
  const history = getSignalHistory();
  history.unshift(signal);
  if (history.length > MAX_SIGNALS) history.length = MAX_SIGNALS;
  localStorage.setItem(SIGNAL_STORAGE_KEY, JSON.stringify(history));
}

export function getSignalHistory(): Signal[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(SIGNAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearSignalHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SIGNAL_STORAGE_KEY);
}
