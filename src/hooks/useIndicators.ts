// Indicator Calculation Hook
'use client';

import { useMemo } from 'react';
import { OHLCV, calculateRSI, calculateMACD, calculateEMA, calculateBollingerBands, calculateATR, MACDResult, BollingerResult } from '@/lib/indicators';

export interface IndicatorData {
  rsi: number[];
  macd: MACDResult[];
  ema50: number[];
  ema200: number[];
  bollinger: BollingerResult[];
  atr: number[];
}

export function useIndicators(candles: OHLCV[]): IndicatorData {
  return useMemo(() => {
    if (candles.length < 26) {
      return { rsi: [], macd: [], ema50: [], ema200: [], bollinger: [], atr: [] };
    }

    const closes = candles.map((c) => c.close);

    return {
      rsi: calculateRSI(closes, 14),
      macd: calculateMACD(closes),
      ema50: calculateEMA(closes, 50),
      ema200: calculateEMA(closes, 200),
      bollinger: calculateBollingerBands(closes),
      atr: calculateATR(candles, 14),
    };
  }, [candles]);
}
