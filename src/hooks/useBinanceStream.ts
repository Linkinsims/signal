// Real-time Binance price stream hook
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { OHLCV } from '@/lib/indicators';
import { fetchKlines, getBinanceWSManager, KlineUpdate } from '@/lib/binance';

type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export function useBinanceStream(symbol: string, interval: Interval = '1h') {
  const [candles, setCandles] = useState<OHLCV[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const candlesRef = useRef<OHLCV[]>([]);

  const handleUpdate = useCallback((update: KlineUpdate) => {
    setCurrentPrice(update.close);

    setCandles((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;

      if (lastIdx >= 0 && updated[lastIdx].time === update.time) {
        updated[lastIdx] = {
          time: update.time,
          open: update.open,
          high: update.high,
          low: update.low,
          close: update.close,
          volume: update.volume,
        };
      } else if (update.isClosed || lastIdx < 0 || update.time > updated[lastIdx].time) {
        updated.push({
          time: update.time,
          open: update.open,
          high: update.high,
          low: update.low,
          close: update.close,
          volume: update.volume,
        });
        if (updated.length > 500) updated.shift();
      }

      candlesRef.current = updated;
      return updated;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        setError(null);
        const historical = await fetchKlines(symbol, interval, 500);
        if (cancelled) return;
        setCandles(historical);
        candlesRef.current = historical;
        if (historical.length > 0) {
          setCurrentPrice(historical[historical.length - 1].close);
        }
        setLoading(false);

        // Subscribe to live updates
        const ws = getBinanceWSManager();
        ws.subscribe(symbol, handleUpdate);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      const ws = getBinanceWSManager();
      ws.unsubscribe(symbol, handleUpdate);
    };
  }, [symbol, interval, handleUpdate]);

  return { candles, currentPrice, loading, error };
}
