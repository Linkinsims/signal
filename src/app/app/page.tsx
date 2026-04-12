// Dashboard Page — Market Overview
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetch24hTickers, DEFAULT_CRYPTO_SYMBOLS, DISPLAY_NAMES } from '@/lib/binance';
import { useStore } from '@/lib/store';
import SignalCard from '@/components/signals/SignalCard';
import { Signal, getSignalHistory } from '@/lib/signals';
import { useFormatPrice } from '@/components/ui/PriceDisplay';
import Link from 'next/link';

interface TickerData {
  symbol: string;
  displayName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export default function DashboardPage() {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const { signals, userMode } = useStore();
  const formatPrice = useFormatPrice();

  const loadData = useCallback(async () => {
    try {
      const data = await fetch24hTickers(DEFAULT_CRYPTO_SYMBOLS);
      const items: TickerData[] = Object.entries(data)
        .map(([symbol, info]) => ({
          symbol,
          displayName: DISPLAY_NAMES[symbol] || symbol,
          price: info.price,
          change: info.change,
          changePercent: info.changePercent,
          volume: info.volume,
        }))
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      setTickers(items);
    } catch {
      // Keep last state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const history = getSignalHistory();
    setRecentSignals(history.slice(0, 5));
  }, [signals]);

  // Calculate signal summary
  const bullishCount = signals.filter((s) => s.type === 'LONG').length;
  const bearishCount = signals.filter((s) => s.type === 'SHORT').length;
  const watchCount = signals.filter((s) => s.type === 'WATCH').length;

  // Fear & Greed calculation (simplified from volatility data)
  const avgChange = tickers.length > 0
    ? tickers.reduce((a, t) => a + t.changePercent, 0) / tickers.length
    : 0;
  const fearGreed = Math.min(100, Math.max(0, 50 + avgChange * 5));
  const fearGreedLabel =
    fearGreed >= 75 ? 'Extreme Greed' :
    fearGreed >= 55 ? 'Greed' :
    fearGreed >= 45 ? 'Neutral' :
    fearGreed >= 25 ? 'Fear' : 'Extreme Fear';
  const fearGreedColor =
    fearGreed >= 75 ? 'text-success' :
    fearGreed >= 55 ? 'text-green-500' :
    fearGreed >= 45 ? 'text-muted' :
    fearGreed >= 25 ? 'text-warning' : 'text-danger';

  const gainers = tickers.filter((t) => t.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 4);
  const losers = tickers.filter((t) => t.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Market Overview</h1>
        <p className="text-sm text-muted mt-1">Real-time market intelligence across Crypto, Stocks & Forex</p>
      </div>

      {/* Signal Summary + Fear & Greed */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-xs text-muted mb-1">Bullish Signals</p>
          <p className="text-2xl font-bold text-success">{bullishCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-muted mb-1">Bearish Signals</p>
          <p className="text-2xl font-bold text-danger">{bearishCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-muted mb-1">Watching</p>
          <p className="text-2xl font-bold text-warning">{watchCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-muted mb-1">Fear & Greed</p>
          <p className={`text-2xl font-bold ${fearGreedColor}`}>{Math.round(fearGreed)}</p>
          <p className={`text-xs ${fearGreedColor} font-medium`}>{fearGreedLabel}</p>
        </div>
      </div>

      {/* Top Movers */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Gainers */}
        <div className="card">
          <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            Top Gainers
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {gainers.map((t) => (
                <Link
                  key={t.symbol}
                  href={`/app/chart/${t.symbol}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                      <span className="text-xs font-bold text-success">{t.displayName.split('/')[0].slice(0, 3)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.displayName}</p>
                      <p className="text-xs text-muted font-mono">{formatPrice(t.price)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-semibold text-success">
                    +{t.changePercent.toFixed(2)}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Losers */}
        <div className="card">
          <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger" />
            Top Losers
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {losers.map((t) => (
                <Link
                  key={t.symbol}
                  href={`/app/chart/${t.symbol}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                      <span className="text-xs font-bold text-danger">{t.displayName.split('/')[0].slice(0, 3)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.displayName}</p>
                      <p className="text-xs text-muted font-mono">{formatPrice(t.price)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-semibold text-danger">
                    {t.changePercent.toFixed(2)}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trending Assets Heatmap */}
      <div className="card">
        <h2 className="text-sm font-semibold text-primary mb-4">Asset Heatmap</h2>
        {loading ? (
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {tickers.map((t) => {
              const intensity = Math.min(Math.abs(t.changePercent) * 10, 100);
              const bgColor = t.changePercent >= 0
                ? `rgba(22, 163, 74, ${intensity / 100 * 0.3})`
                : `rgba(220, 38, 38, ${intensity / 100 * 0.3})`;
              const textColor = t.changePercent >= 0 ? 'text-success' : 'text-danger';
              return (
                <Link
                  key={t.symbol}
                  href={`/app/chart/${t.symbol}`}
                  className="rounded-lg p-2 text-center hover:scale-105 transition-transform cursor-pointer"
                  style={{ backgroundColor: bgColor }}
                >
                  <p className="text-xs font-semibold text-primary truncate">{t.displayName.split('/')[0]}</p>
                  <p className={`text-xs font-mono font-bold ${textColor}`}>
                    {t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(1)}%
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Signals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-primary">Recent Signals</h2>
          <Link href="/app/signals" className="text-xs text-accent hover:underline">View All →</Link>
        </div>
        {recentSignals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted">Signals are being generated...</p>
            <p className="text-xs text-muted mt-1">New signals appear every 30 seconds when data is available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} compact={userMode === 'beginner'} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
