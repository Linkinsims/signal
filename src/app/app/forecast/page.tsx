// Forecast Page — AI Trend Prediction
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchKlines, DEFAULT_CRYPTO_SYMBOLS, DISPLAY_NAMES } from '@/lib/binance';
import { generateForecast, ForecastResult } from '@/lib/forecast';
import { useStore } from '@/lib/store';
import { useFormatPrice } from '@/components/ui/PriceDisplay';

const HORIZONS = ['1H', '4H', '24H', '7D'];

interface ForecastEntry {
  symbol: string;
  displayName: string;
  currentPrice: number;
  forecasts: Record<string, ForecastResult>;
}

export default function ForecastPage() {
  const [entries, setEntries] = useState<ForecastEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHorizon, setSelectedHorizon] = useState('4H');
  const { userMode } = useStore();
  const formatPrice = useFormatPrice();

  const loadForecasts = useCallback(async () => {
    try {
      const results: ForecastEntry[] = [];

      for (const symbol of DEFAULT_CRYPTO_SYMBOLS.slice(0, 6)) {
        try {
          const candles = await fetchKlines(symbol, '1h', 500);
          const currentPrice = candles[candles.length - 1]?.close || 0;

          const forecasts: Record<string, ForecastResult> = {};
          for (const horizon of HORIZONS) {
            forecasts[horizon] = generateForecast(candles, horizon);
          }

          results.push({
            symbol,
            displayName: DISPLAY_NAMES[symbol] || symbol,
            currentPrice,
            forecasts,
          });
        } catch {
          // Skip failed symbols
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      setEntries(results);
    } catch {
      // Keep state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecasts();
    const interval = setInterval(loadForecasts, 60000);
    return () => clearInterval(interval);
  }, [loadForecasts]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">AI Trend Forecast</h1>
        <p className="text-sm text-muted mt-1">
          Weighted technical scoring across 6 indicators · Updated every minute
        </p>
      </div>

      {/* Horizon Selector */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {HORIZONS.map((h) => (
          <button
            key={h}
            onClick={() => setSelectedHorizon(h)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              selectedHorizon === h
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted hover:text-primary'
            }`}
          >
            {h}
          </button>
        ))}
      </div>

      {/* Forecast Cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => {
            const fc = entry.forecasts[selectedHorizon];
            if (!fc) return null;

            const dirColor =
              fc.direction === 'Bullish' ? 'text-success' :
              fc.direction === 'Bearish' ? 'text-danger' : 'text-muted';
            const dirBg =
              fc.direction === 'Bullish' ? 'bg-green-50 border-green-200' :
              fc.direction === 'Bearish' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200';

            return (
              <div key={entry.symbol} className="card">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-primary">{entry.displayName}</h3>
                    <p className="text-sm font-mono text-muted">{formatPrice(entry.currentPrice)}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${dirBg} ${dirColor}`}>
                    {fc.direction}
                  </span>
                </div>

                {/* Confidence */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted">Confidence</span>
                    <span className="text-xs font-mono font-medium">{fc.confidence}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        fc.direction === 'Bullish' ? 'bg-success' :
                        fc.direction === 'Bearish' ? 'bg-danger' : 'bg-muted'
                      }`}
                      style={{ width: `${fc.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Price Target */}
                <div className="flex items-center justify-between py-2 border-t border-border/50">
                  <span className="text-xs text-muted">Target ({selectedHorizon})</span>
                  <span className={`text-sm font-mono font-semibold ${dirColor}`}>
                    {formatPrice(fc.priceTarget)}
                  </span>
                </div>

                {/* Component Breakdown — Advanced Mode */}
                {userMode === 'advanced' && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                    {fc.components.map((comp) => (
                      <div key={comp.name} className="flex items-center justify-between">
                        <span className="text-xs text-muted">{comp.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            comp.signal === 'bullish' ? 'bg-success' :
                            comp.signal === 'bearish' ? 'bg-danger' : 'bg-muted'
                          }`} />
                          <span className="text-xs font-mono">{(comp.score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Methodology + Disclaimer */}
      <div className="card bg-gray-50 border-gray-200">
        <h3 className="text-sm font-semibold text-primary mb-2">How It Works</h3>
        <p className="text-xs text-muted leading-relaxed mb-3">
          Our forecast engine uses a weighted scoring model across 6 technical components: RSI momentum (18%), MACD trend (20%),
          EMA crossover status (15%), volume analysis (12%), Bollinger Band positioning (15%), and price structure detection (20%).
          Each component scores the asset on a -1 to +1 scale, producing a directional bias with a confidence percentage.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            ⚠️ Signals are based on technical analysis patterns. Trading involves risk. Past performance does not guarantee future results.
            Confidence scores are capped at 82% to reflect inherent market uncertainty. Always do your own research.
          </p>
        </div>
      </div>
    </div>
  );
}
