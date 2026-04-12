// Supply & Demand Zone Detection Engine
import { OHLCV } from './indicators';

export type ZoneType = 'supply' | 'demand';
export type ZoneStatus = 'fresh' | 'tested' | 'broken';

export interface Zone {
  id: string;
  type: ZoneType;
  status: ZoneStatus;
  top: number;
  bottom: number;
  strength: number;       // Times price respected (1x, 2x, 3x+)
  age: number;            // Candles since formation
  formedAt: number;       // Timestamp
  brokenCountdown?: number; // Candles since broken (auto-remove after 3)
}

// Detect sharp move from consolidation
function isConsolidation(candles: OHLCV[], start: number, length: number): { top: number; bottom: number } | null {
  if (start + length >= candles.length || start < 0) return null;

  const slice = candles.slice(start, start + length);
  const highs = slice.map(c => c.high);
  const lows = slice.map(c => c.low);
  const top = Math.max(...highs);
  const bottom = Math.min(...lows);
  const range = top - bottom;
  const avgBody = slice.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / slice.length;

  // Consolidation = tight range, small bodies relative to range
  if (range > 0 && avgBody / range < 0.4) {
    return { top, bottom };
  }
  return null;
}

function isSharpMove(candles: OHLCV[], start: number, length: number, direction: 'up' | 'down'): boolean {
  if (start < 0 || start + length > candles.length) return false;

  const slice = candles.slice(start, start + length);
  const totalMove = Math.abs(slice[slice.length - 1].close - slice[0].open);
  const avgRange = slice.reduce((sum, c) => sum + (c.high - c.low), 0) / slice.length;

  // Sharp = total move > 2x average candle range
  if (totalMove < avgRange * 1.5) return false;

  if (direction === 'up') {
    return slice[slice.length - 1].close > slice[0].open;
  } else {
    return slice[slice.length - 1].close < slice[0].open;
  }
}

export function detectZones(candles: OHLCV[], lookback: number = 200): Zone[] {
  const zones: Zone[] = [];
  const len = Math.min(candles.length, lookback);
  const startIdx = candles.length - len;
  const consolidationLength = 4;
  const moveLength = 3;

  for (let i = startIdx; i < candles.length - moveLength - consolidationLength; i++) {
    // Check for consolidation followed by sharp bearish move (= supply zone)
    const consol = isConsolidation(candles, i, consolidationLength);
    if (consol) {
      const moveStart = i + consolidationLength;
      if (isSharpMove(candles, moveStart, moveLength, 'down')) {
        zones.push({
          id: `supply_${i}_${consol.top.toFixed(2)}`,
          type: 'supply',
          status: 'fresh',
          top: consol.top,
          bottom: consol.bottom,
          strength: 1,
          age: candles.length - 1 - i,
          formedAt: candles[i].time,
        });
      }

      // Check for consolidation followed by sharp bullish move (= demand zone)
      if (isSharpMove(candles, moveStart, moveLength, 'up')) {
        zones.push({
          id: `demand_${i}_${consol.bottom.toFixed(2)}`,
          type: 'demand',
          status: 'fresh',
          top: consol.top,
          bottom: consol.bottom,
          strength: 1,
          age: candles.length - 1 - i,
          formedAt: candles[i].time,
        });
      }
    }
  }

  // De-duplicate overlapping zones of same type (merge if >70% overlap)
  const merged = mergeOverlappingZones(zones);

  // Update zone status based on current price action
  return updateZoneStatus(merged, candles);
}

function mergeOverlappingZones(zones: Zone[]): Zone[] {
  const result: Zone[] = [];

  for (const zone of zones) {
    let merged = false;
    for (const existing of result) {
      if (existing.type !== zone.type) continue;

      const overlapTop = Math.min(existing.top, zone.top);
      const overlapBottom = Math.max(existing.bottom, zone.bottom);
      if (overlapTop <= overlapBottom) continue; // no overlap

      const overlap = overlapTop - overlapBottom;
      const smallerRange = Math.min(existing.top - existing.bottom, zone.top - zone.bottom);
      if (smallerRange > 0 && overlap / smallerRange > 0.7) {
        // Merge: expand existing zone
        existing.top = Math.max(existing.top, zone.top);
        existing.bottom = Math.min(existing.bottom, zone.bottom);
        existing.strength += 1;
        existing.age = Math.min(existing.age, zone.age);
        merged = true;
        break;
      }
    }
    if (!merged) result.push({ ...zone });
  }

  return result;
}

function updateZoneStatus(zones: Zone[], candles: OHLCV[]): Zone[] {
  if (candles.length === 0) return zones;

  const recentCandles = candles.slice(-20); // Check last 20 candles
  const currentPrice = candles[candles.length - 1].close;

  return zones
    .map((zone) => {
      let status = zone.status;
      let strength = zone.strength;
      let brokenCountdown = zone.brokenCountdown;

      for (const candle of recentCandles) {
        const inZone = candle.low <= zone.top && candle.high >= zone.bottom;

        if (inZone) {
          if (zone.type === 'supply') {
            // Price closed above supply zone = broken
            if (candle.close > zone.top) {
              status = 'broken';
              brokenCountdown = 3;
            } else if (status === 'fresh') {
              status = 'tested';
              strength = Math.min(strength + 1, 5);
            }
          } else {
            // Price closed below demand zone = broken
            if (candle.close < zone.bottom) {
              status = 'broken';
              brokenCountdown = 3;
            } else if (status === 'fresh') {
              status = 'tested';
              strength = Math.min(strength + 1, 5);
            }
          }
        }
      }

      // Decrement broken countdown
      if (status === 'broken' && brokenCountdown !== undefined) {
        brokenCountdown -= 1;
      }

      return { ...zone, status, strength, brokenCountdown };
    })
    .filter((zone) => !(zone.status === 'broken' && zone.brokenCountdown !== undefined && zone.brokenCountdown <= 0));
}

// Check if price is near a zone (for signal confluence)
export function isPriceNearZone(price: number, zones: Zone[], type: ZoneType, threshold: number = 0.005): boolean {
  return zones.some((z) => {
    if (z.type !== type || z.status === 'broken') return false;
    const zoneRange = z.top - z.bottom;
    const buffer = Math.max(zoneRange * 0.5, price * threshold);
    if (type === 'demand') {
      return price >= z.bottom - buffer && price <= z.top + buffer;
    } else {
      return price >= z.bottom - buffer && price <= z.top + buffer;
    }
  });
}

// Sort zones by proximity to current price
export function sortZonesByProximity(zones: Zone[], currentPrice: number): Zone[] {
  return [...zones]
    .filter((z) => z.status !== 'broken')
    .sort((a, b) => {
      const distA = Math.min(Math.abs(currentPrice - a.top), Math.abs(currentPrice - a.bottom));
      const distB = Math.min(Math.abs(currentPrice - b.top), Math.abs(currentPrice - b.bottom));
      return distA - distB;
    });
}
