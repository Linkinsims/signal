// Divergence Detection Engine
import { OHLCV } from './indicators';
import { calculateRSI, calculateMACD } from './indicators';

export type DivergenceType = 'regular_bullish' | 'regular_bearish' | 'hidden_bullish' | 'hidden_bearish';

export interface Divergence {
  type: DivergenceType;
  indicator: 'RSI' | 'MACD';
  startIndex: number;
  endIndex: number;
  priceStart: number;
  priceEnd: number;
  indicatorStart: number;
  indicatorEnd: number;
  strength: number; // 0-1
}

// Find swing pivots (local highs and lows)
function findPivotHighs(data: number[], lookback: number = 5): { index: number; value: number }[] {
  const pivots: { index: number; value: number }[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i] <= data[i - j] || data[i] <= data[i + j]) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) pivots.push({ index: i, value: data[i] });
  }
  return pivots;
}

function findPivotLows(data: number[], lookback: number = 5): { index: number; value: number }[] {
  const pivots: { index: number; value: number }[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i] >= data[i - j] || data[i] >= data[i + j]) {
        isLow = false;
        break;
      }
    }
    if (isLow) pivots.push({ index: i, value: data[i] });
  }
  return pivots;
}

export function detectDivergences(candles: OHLCV[], maxLookback: number = 100): Divergence[] {
  if (candles.length < 50) return [];

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const macdHistogram = macd.map(m => m.histogram);

  const divergences: Divergence[] = [];

  // Align RSI with price (RSI is shorter than closes by ~14)
  const rsiOffset = closes.length - rsi.length;
  const macdOffset = closes.length - macdHistogram.length;

  // --- RSI Divergences ---
  const recentLows = candles.length - maxLookback;
  const startFrom = Math.max(0, recentLows);

  // Price lows vs RSI lows for bullish divergences
  const priceLows = findPivotLows(lows.slice(startFrom), 3);
  const rsiLows = findPivotLows(rsi.slice(Math.max(0, startFrom - rsiOffset)), 3);

  // Price highs vs RSI highs for bearish divergences
  const priceHighs = findPivotHighs(highs.slice(startFrom), 3);
  const rsiHighs = findPivotHighs(rsi.slice(Math.max(0, startFrom - rsiOffset)), 3);

  // Regular bullish: price lower low, RSI higher low
  if (priceLows.length >= 2 && rsiLows.length >= 2) {
    const p1 = priceLows[priceLows.length - 2];
    const p2 = priceLows[priceLows.length - 1];
    const r1 = rsiLows[rsiLows.length - 2];
    const r2 = rsiLows[rsiLows.length - 1];

    if (p2.value < p1.value && r2.value > r1.value) {
      divergences.push({
        type: 'regular_bullish',
        indicator: 'RSI',
        startIndex: p1.index + startFrom,
        endIndex: p2.index + startFrom,
        priceStart: p1.value,
        priceEnd: p2.value,
        indicatorStart: r1.value,
        indicatorEnd: r2.value,
        strength: Math.min(1, Math.abs(r2.value - r1.value) / 10),
      });
    }

    // Hidden bullish: price higher low, RSI lower low
    if (p2.value > p1.value && r2.value < r1.value) {
      divergences.push({
        type: 'hidden_bullish',
        indicator: 'RSI',
        startIndex: p1.index + startFrom,
        endIndex: p2.index + startFrom,
        priceStart: p1.value,
        priceEnd: p2.value,
        indicatorStart: r1.value,
        indicatorEnd: r2.value,
        strength: Math.min(1, Math.abs(r2.value - r1.value) / 15),
      });
    }
  }

  // Regular bearish: price higher high, RSI lower high
  if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
    const p1 = priceHighs[priceHighs.length - 2];
    const p2 = priceHighs[priceHighs.length - 1];
    const r1 = rsiHighs[rsiHighs.length - 2];
    const r2 = rsiHighs[rsiHighs.length - 1];

    if (p2.value > p1.value && r2.value < r1.value) {
      divergences.push({
        type: 'regular_bearish',
        indicator: 'RSI',
        startIndex: p1.index + startFrom,
        endIndex: p2.index + startFrom,
        priceStart: p1.value,
        priceEnd: p2.value,
        indicatorStart: r1.value,
        indicatorEnd: r2.value,
        strength: Math.min(1, Math.abs(r2.value - r1.value) / 10),
      });
    }

    // Hidden bearish: price lower high, RSI higher high
    if (p2.value < p1.value && r2.value > r1.value) {
      divergences.push({
        type: 'hidden_bearish',
        indicator: 'RSI',
        startIndex: p1.index + startFrom,
        endIndex: p2.index + startFrom,
        priceStart: p1.value,
        priceEnd: p2.value,
        indicatorStart: r1.value,
        indicatorEnd: r2.value,
        strength: Math.min(1, Math.abs(r2.value - r1.value) / 15),
      });
    }
  }

  // --- MACD Divergences (same pattern with histogram) ---
  if (macdHistogram.length > 20) {
    const macdLows = findPivotLows(macdHistogram.slice(-maxLookback), 3);
    const macdHighs = findPivotHighs(macdHistogram.slice(-maxLookback), 3);
    const macdStart = Math.max(0, macdHistogram.length - maxLookback);

    const priceLowsForMacd = findPivotLows(lows.slice(startFrom), 3);
    const priceHighsForMacd = findPivotHighs(highs.slice(startFrom), 3);

    // Regular bullish MACD divergence
    if (priceLowsForMacd.length >= 2 && macdLows.length >= 2) {
      const p1 = priceLowsForMacd[priceLowsForMacd.length - 2];
      const p2 = priceLowsForMacd[priceLowsForMacd.length - 1];
      const m1 = macdLows[macdLows.length - 2];
      const m2 = macdLows[macdLows.length - 1];

      if (p2.value < p1.value && m2.value > m1.value) {
        divergences.push({
          type: 'regular_bullish',
          indicator: 'MACD',
          startIndex: p1.index + startFrom,
          endIndex: p2.index + startFrom,
          priceStart: p1.value,
          priceEnd: p2.value,
          indicatorStart: m1.value,
          indicatorEnd: m2.value,
          strength: Math.min(1, Math.abs(m2.value - m1.value) * 100),
        });
      }
    }

    // Regular bearish MACD divergence
    if (priceHighsForMacd.length >= 2 && macdHighs.length >= 2) {
      const p1 = priceHighsForMacd[priceHighsForMacd.length - 2];
      const p2 = priceHighsForMacd[priceHighsForMacd.length - 1];
      const m1 = macdHighs[macdHighs.length - 2];
      const m2 = macdHighs[macdHighs.length - 1];

      if (p2.value > p1.value && m2.value < m1.value) {
        divergences.push({
          type: 'regular_bearish',
          indicator: 'MACD',
          startIndex: p1.index + startFrom,
          endIndex: p2.index + startFrom,
          priceStart: p1.value,
          priceEnd: p2.value,
          indicatorStart: m1.value,
          indicatorEnd: m2.value,
          strength: Math.min(1, Math.abs(m2.value - m1.value) * 100),
        });
      }
    }
  }

  return divergences;
}

// Check if any bullish divergence active
export function hasBullishDivergence(divergences: Divergence[]): boolean {
  return divergences.some(d => d.type === 'regular_bullish' || d.type === 'hidden_bullish');
}

// Check if any bearish divergence active
export function hasBearishDivergence(divergences: Divergence[]): boolean {
  return divergences.some(d => d.type === 'regular_bearish' || d.type === 'hidden_bearish');
}

// Get divergence badge text
export function getDivergenceBadge(divergences: Divergence[]): string | null {
  if (divergences.length === 0) return null;
  const latest = divergences[divergences.length - 1];
  return `${latest.indicator} Div`;
}
