// Technical Indicator Calculations — Pure TypeScript, no external libraries
// All standard financial indicator implementations

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerResult {
  upper: number;
  middle: number;
  lower: number;
}

// ─── EMA (Exponential Moving Average) ──────────────────────────────
export function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  ema.push(sum / period);

  for (let i = period; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[ema.length - 1] * (1 - k));
  }
  return ema;
}

// ─── SMA (Simple Moving Average) ───────────────────────────────────
export function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const sma: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  sma.push(sum / period);
  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    sma.push(sum / period);
  }
  return sma;
}

// ─── RSI (Relative Strength Index, Wilder Smoothing, period=14) ────
export function calculateRSI(closes: number[], period: number = 14): number[] {
  if (closes.length < period + 1) return [];
  const rsi: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) rsi.push(100);
  else {
    const rs = avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  // Wilder smoothing
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) rsi.push(100);
    else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  return rsi;
}

// ─── MACD (12, 26, 9) ─────────────────────────────────────────────
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult[] {
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  if (emaFast.length === 0 || emaSlow.length === 0) return [];

  // Align arrays — emaSlow starts later
  const offset = slowPeriod - fastPeriod;
  const macdLine: number[] = [];
  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  if (signalLine.length === 0) return [];

  const results: MACDResult[] = [];
  const signalOffset = macdLine.length - signalLine.length;
  for (let i = 0; i < signalLine.length; i++) {
    const m = macdLine[i + signalOffset];
    const s = signalLine[i];
    results.push({ macd: m, signal: s, histogram: m - s });
  }
  return results;
}

// ─── Bollinger Bands (20, 2) ──────────────────────────────────────
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerResult[] {
  if (closes.length < period) return [];
  const results: BollingerResult[] = [];

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    results.push({
      upper: mean + stdDev * sd,
      middle: mean,
      lower: mean - stdDev * sd,
    });
  }
  return results;
}

// ─── ATR (Average True Range, period=14) ──────────────────────────
export function calculateATR(candles: OHLCV[], period: number = 14): number[] {
  if (candles.length < period + 1) return [];
  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  // Initial ATR = SMA of first `period` true ranges
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result: number[] = [atr];

  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result.push(atr);
  }
  return result;
}

// ─── Volume SMA (period=20) ──────────────────────────────────────
export function calculateVolumeSMA(volumes: number[], period: number = 20): number[] {
  return calculateSMA(volumes, period);
}

// ─── Detect Volume Spike (> 1.5x average) ────────────────────────
export function isVolumeSpike(
  currentVolume: number,
  volumes: number[],
  period: number = 20,
  threshold: number = 1.5
): boolean {
  const sma = calculateVolumeSMA(volumes, period);
  if (sma.length === 0) return false;
  return currentVolume > sma[sma.length - 1] * threshold;
}

// ─── Detect Bollinger Squeeze ────────────────────────────────────
export function isBollingerSqueeze(bands: BollingerResult[], lookback: number = 10): boolean {
  if (bands.length < lookback) return false;
  const recent = bands.slice(-lookback);
  const bandwidths = recent.map((b) => (b.upper - b.lower) / b.middle);
  const avgBW = bandwidths.reduce((a, b) => a + b, 0) / bandwidths.length;
  const currentBW = bandwidths[bandwidths.length - 1];
  return currentBW < avgBW * 0.75;
}

// ─── Price Structure Detection ───────────────────────────────────
export function detectPriceStructure(
  candles: OHLCV[],
  lookback: number = 10
): 'higher-highs' | 'lower-lows' | 'neutral' {
  if (candles.length < lookback) return 'neutral';
  const recent = candles.slice(-lookback);
  let higherHighs = 0;
  let lowerLows = 0;

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].high > recent[i - 1].high) higherHighs++;
    if (recent[i].low < recent[i - 1].low) lowerLows++;
  }

  if (higherHighs >= Math.ceil((lookback - 1) * 0.6)) return 'higher-highs';
  if (lowerLows >= Math.ceil((lookback - 1) * 0.6)) return 'lower-lows';
  return 'neutral';
}
