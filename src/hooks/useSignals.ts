// Signal Watcher Hook — generates signals from candle data
'use client';

import { useState, useEffect, useRef } from 'react';
import { OHLCV } from '@/lib/indicators';
import { Signal, generateSignal, saveSignal, AssetClass, Timeframe } from '@/lib/signals';
import { useStore } from '@/lib/store';

export function useSignals(
  symbol: string,
  assetClass: AssetClass,
  candles: OHLCV[],
  timeframe: Timeframe = '1H',
  intervalMs: number = 30000 // Check every 30 seconds
) {
  const [latestSignal, setLatestSignal] = useState<Signal | null>(null);
  const addSignal = useStore((s) => s.addSignal);
  const lastSignalRef = useRef<string>('');

  useEffect(() => {
    if (candles.length < 200) return;

    function checkSignal() {
      const signal = generateSignal(symbol, assetClass, candles, timeframe);
      if (!signal) return;

      // Only emit if signal type changed or enough time passed
      const signalKey = `${signal.symbol}_${signal.type}_${signal.timeframe}`;
      if (signalKey === lastSignalRef.current) return;

      lastSignalRef.current = signalKey;
      setLatestSignal(signal);
      saveSignal(signal);
      addSignal(signal);
    }

    checkSignal(); // Initial check
    const timer = setInterval(checkSignal, intervalMs);
    return () => clearInterval(timer);
  }, [candles, symbol, assetClass, timeframe, intervalMs, addSignal]);

  return { latestSignal };
}
