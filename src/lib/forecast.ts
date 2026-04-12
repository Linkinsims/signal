// Trend Prediction / Forecast Engine — Pure TypeScript
// No external AI API — uses weighted technical indicator scoring

import {
  OHLCV,
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateBollingerBands,
  isBollingerSqueeze,
  detectPriceStructure,
  calculateSMA,
} from './indicators';

export type TrendDirection = 'Bullish' | 'Bearish' | 'Neutral';

export interface ForecastResult {
  direction: TrendDirection;
  confidence: number; // 0-82, never above 82
  horizon: string;
  priceTarget: number;
  components: ForecastComponent[];
  timestamp: number;
}

export interface ForecastComponent {
  name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  score: number; // -1 to 1
  detail: string;
}

const WEIGHTS = {
  rsiMomentum: 0.18,
  macdSlope: 0.20,
  emaCrossover: 0.15,
  volumeTrend: 0.12,
  bollingerSqueeze: 0.15,
  priceStructure: 0.20,
};

// ─── RSI Momentum Score ────────────────────────────────────────────
function scoreRSIMomentum(closes: number[]): ForecastComponent {
  const rsi = calculateRSI(closes, 14);
  if (rsi.length < 3) return { name: 'RSI Momentum', signal: 'neutral', weight: WEIGHTS.rsiMomentum, score: 0, detail: 'Insufficient data' };

  const current = rsi[rsi.length - 1];
  const prev = rsi[rsi.length - 3];
  const momentum = current - prev;

  let score = 0;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let detail = '';

  if (current < 30) {
    score = 0.6 + Math.min(momentum * 0.02, 0.4); // Oversold, potential bounce
    signal = 'bullish';
    detail = `RSI oversold at ${current.toFixed(1)}, momentum ${momentum > 0 ? 'recovering' : 'declining'}`;
  } else if (current > 70) {
    score = -(0.6 + Math.min(-momentum * 0.02, 0.4));
    signal = 'bearish';
    detail = `RSI overbought at ${current.toFixed(1)}, momentum ${momentum < 0 ? 'weakening' : 'still strong'}`;
  } else if (current > 50) {
    score = Math.min((current - 50) / 40, 0.5);
    signal = momentum > 0 ? 'bullish' : 'neutral';
    detail = `RSI at ${current.toFixed(1)}, ${momentum > 0 ? 'bullish' : 'flat'} momentum`;
  } else {
    score = -Math.min((50 - current) / 40, 0.5);
    signal = momentum < 0 ? 'bearish' : 'neutral';
    detail = `RSI at ${current.toFixed(1)}, ${momentum < 0 ? 'bearish' : 'flat'} momentum`;
  }

  return { name: 'RSI Momentum', signal, weight: WEIGHTS.rsiMomentum, score: Math.max(-1, Math.min(1, score)), detail };
}

// ─── MACD Histogram Slope ──────────────────────────────────────────
function scoreMACDSlope(closes: number[]): ForecastComponent {
  const macd = calculateMACD(closes);
  if (macd.length < 5) return { name: 'MACD Trend', signal: 'neutral', weight: WEIGHTS.macdSlope, score: 0, detail: 'Insufficient data' };

  const recent = macd.slice(-5);
  const slope = (recent[4].histogram - recent[0].histogram) / 5;
  const current = recent[4];

  let score = 0;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  if (current.histogram > 0 && slope > 0) {
    score = Math.min(0.3 + slope * 50, 1);
    signal = 'bullish';
  } else if (current.histogram < 0 && slope < 0) {
    score = Math.max(-0.3 + slope * 50, -1);
    signal = 'bearish';
  } else if (slope > 0) {
    score = Math.min(slope * 30, 0.5);
    signal = 'bullish';
  } else {
    score = Math.max(slope * 30, -0.5);
    signal = 'bearish';
  }

  const detail = `MACD histogram ${slope > 0 ? 'rising' : 'falling'}, line ${current.macd > current.signal ? 'above' : 'below'} signal`;

  return { name: 'MACD Trend', signal, weight: WEIGHTS.macdSlope, score, detail };
}

// ─── EMA Crossover Status ──────────────────────────────────────────
function scoreEMACrossover(closes: number[]): ForecastComponent {
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);

  if (ema50.length === 0 || ema200.length === 0) {
    return { name: 'EMA Crossover', signal: 'neutral', weight: WEIGHTS.emaCrossover, score: 0, detail: 'Insufficient data' };
  }

  const last50 = ema50[ema50.length - 1];
  const last200 = ema200[ema200.length - 1];
  const lastPrice = closes[closes.length - 1];

  const gap = (last50 - last200) / last200;
  let score = Math.max(-1, Math.min(1, gap * 20));
  const signal: 'bullish' | 'bearish' | 'neutral' = last50 > last200 ? 'bullish' : last50 < last200 ? 'bearish' : 'neutral';

  // Bonus if price is above both EMAs
  if (lastPrice > last50 && lastPrice > last200) score = Math.min(score + 0.2, 1);
  if (lastPrice < last50 && lastPrice < last200) score = Math.max(score - 0.2, -1);

  const detail = `EMA 50 ${last50 > last200 ? 'above' : 'below'} EMA 200, price ${lastPrice > last50 ? 'above' : 'below'} both`;

  return { name: 'EMA Crossover', signal, weight: WEIGHTS.emaCrossover, score, detail };
}

// ─── Volume Trend ──────────────────────────────────────────────────
function scoreVolumeTrend(candles: OHLCV[]): ForecastComponent {
  const volumes = candles.map((c) => c.volume);
  const volSMA = calculateSMA(volumes, 20);
  if (volSMA.length < 5) return { name: 'Volume Trend', signal: 'neutral', weight: WEIGHTS.volumeTrend, score: 0, detail: 'Insufficient data' };

  const recentVol = volumes.slice(-5);
  const avgRecent = recentVol.reduce((a, b) => a + b, 0) / 5;
  const smaLast = volSMA[volSMA.length - 1];
  const ratio = avgRecent / smaLast;

  // Check if volume is rising with price
  const priceUp = candles[candles.length - 1].close > candles[candles.length - 5].close;
  let score = 0;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  if (ratio > 1.3 && priceUp) {
    score = Math.min((ratio - 1) * 0.8, 1);
    signal = 'bullish';
  } else if (ratio > 1.3 && !priceUp) {
    score = -Math.min((ratio - 1) * 0.8, 1);
    signal = 'bearish';
  } else {
    score = 0;
  }

  const detail = `Volume ${ratio > 1.2 ? 'elevated' : 'normal'} at ${ratio.toFixed(1)}x avg, ${priceUp ? 'bullish' : 'bearish'} context`;

  return { name: 'Volume Trend', signal, weight: WEIGHTS.volumeTrend, score, detail };
}

// ─── Bollinger Squeeze ─────────────────────────────────────────────
function scoreBollingerSqueeze(closes: number[]): ForecastComponent {
  const bb = calculateBollingerBands(closes);
  if (bb.length < 10) return { name: 'Bollinger Bands', signal: 'neutral', weight: WEIGHTS.bollingerSqueeze, score: 0, detail: 'Insufficient data' };

  const squeeze = isBollingerSqueeze(bb);
  const lastPrice = closes[closes.length - 1];
  const lastBB = bb[bb.length - 1];
  const position = (lastPrice - lastBB.lower) / (lastBB.upper - lastBB.lower);

  let score = 0;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let detail = '';

  if (squeeze) {
    // Squeeze implies upcoming breakout, direction depends on position
    score = position > 0.5 ? 0.4 : -0.4;
    signal = position > 0.5 ? 'bullish' : 'bearish';
    detail = `Bollinger squeeze detected — breakout imminent, price in ${position > 0.5 ? 'upper' : 'lower'} band`;
  } else {
    score = (position - 0.5) * 0.6;
    signal = position > 0.65 ? 'bullish' : position < 0.35 ? 'bearish' : 'neutral';
    detail = `Price at ${(position * 100).toFixed(0)}% of Bollinger range`;
  }

  return { name: 'Bollinger Bands', signal, weight: WEIGHTS.bollingerSqueeze, score: Math.max(-1, Math.min(1, score)), detail };
}

// ─── Price Structure ───────────────────────────────────────────────
function scorePriceStructure(candles: OHLCV[]): ForecastComponent {
  const structure = detectPriceStructure(candles, 10);
  let score = 0;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  if (structure === 'higher-highs') {
    score = 0.7;
    signal = 'bullish';
  } else if (structure === 'lower-lows') {
    score = -0.7;
    signal = 'bearish';
  }

  const detail = structure === 'higher-highs' ? 'Making higher highs — uptrend structure' :
    structure === 'lower-lows' ? 'Making lower lows — downtrend structure' :
      'No clear trend structure';

  return { name: 'Price Structure', signal, weight: WEIGHTS.priceStructure, score, detail };
}

// ─── Main Forecast Generator ───────────────────────────────────────
export function generateForecast(
  candles: OHLCV[],
  horizon: string = '4H'
): ForecastResult {
  const closes = candles.map((c) => c.close);

  const components = [
    scoreRSIMomentum(closes),
    scoreMACDSlope(closes),
    scoreEMACrossover(closes),
    scoreVolumeTrend(candles),
    scoreBollingerSqueeze(closes),
    scorePriceStructure(candles),
  ];

  // Weighted average score
  const totalWeight = components.reduce((a, c) => a + c.weight, 0);
  const weightedScore = components.reduce((a, c) => a + c.score * c.weight, 0) / totalWeight;

  // Direction
  let direction: TrendDirection;
  if (weightedScore > 0.15) direction = 'Bullish';
  else if (weightedScore < -0.15) direction = 'Bearish';
  else direction = 'Neutral';

  // Confidence — never above 82%
  const rawConfidence = Math.abs(weightedScore) * 100;
  const confidence = Math.min(Math.round(rawConfidence), 82);

  // Price target based on recent ATR and direction
  const currentPrice = closes[closes.length - 1];
  const recentReturns = [];
  for (let i = Math.max(0, closes.length - 20); i < closes.length - 1; i++) {
    recentReturns.push((closes[i + 1] - closes[i]) / closes[i]);
  }
  const avgMove = recentReturns.reduce((a, b) => a + Math.abs(b), 0) / recentReturns.length;

  // Scale by horizon
  const horizonMultipliers: Record<string, number> = { '1H': 1, '4H': 2, '24H': 4, '7D': 8 };
  const multiplier = horizonMultipliers[horizon] || 2;
  const move = avgMove * multiplier * (direction === 'Bearish' ? -1 : 1);
  const priceTarget = Math.round(currentPrice * (1 + move) * 100) / 100;

  return {
    direction,
    confidence,
    horizon,
    priceTarget,
    components,
    timestamp: Date.now(),
  };
}

// ─── Generate Forecast Points for Chart Overlay ────────────────────
export function generateForecastPoints(
  candles: OHLCV[],
  numPoints: number = 8
): { time: number; value: number; upper: number; lower: number }[] {
  if (candles.length < 50) return [];

  const closes = candles.map((c) => c.close);
  const lastCandle = candles[candles.length - 1];
  const forecast = generateForecast(candles, '4H');

  const direction = forecast.direction === 'Bullish' ? 1 : forecast.direction === 'Bearish' ? -1 : 0;
  const confidence = forecast.confidence / 100;

  // Calculate average candle interval
  const intervals: number[] = [];
  for (let i = Math.max(0, candles.length - 10); i < candles.length - 1; i++) {
    intervals.push(candles[i + 1].time - candles[i].time);
  }
  const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 3600;

  // Calculate volatility for confidence bands
  const recentCloses = closes.slice(-20);
  const mean = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;
  const stdDev = Math.sqrt(recentCloses.reduce((a, b) => a + (b - mean) ** 2, 0) / recentCloses.length);
  const volPercent = stdDev / mean;

  const points: { time: number; value: number; upper: number; lower: number }[] = [];
  let currentPrice = lastCandle.close;

  for (let i = 1; i <= numPoints; i++) {
    const progress = i / numPoints;
    const movePerStep = (currentPrice * volPercent * 0.3 * direction * confidence);
    const price = currentPrice + movePerStep * i;
    const band = currentPrice * volPercent * Math.sqrt(i) * 1.2;

    points.push({
      time: lastCandle.time + avgInterval * i,
      value: Math.round(price * 100) / 100,
      upper: Math.round((price + band) * 100) / 100,
      lower: Math.round((price - band) * 100) / 100,
    });
  }

  return points;
}
