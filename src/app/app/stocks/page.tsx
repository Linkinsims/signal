'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

interface StockData {
  symbol: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currency, usdZarRate } = useStore();

  useEffect(() => {
    async function loadStocks() {
      try {
        const res = await fetch('/api/stocks');
        if (!res.ok) throw new Error('Failed to load traditional markets data');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setStocks(data);
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    }

    loadStocks();
    const interval = setInterval(loadStocks, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number | undefined) => {
    if (!price) return '—';
    const p = currency === 'ZAR' ? price * usdZarRate : price;
    const prefix = currency === 'ZAR' ? 'R' : '$';
    return `${prefix}${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getMarketStatus = () => {
    const now = new Date();
    // Simple 9:30 AM - 4 PM EST check based on UTC
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const estOffsetHours = -4; // rough summer approx
    const estTime = (utcHours + estOffsetHours + 24) % 24 + utcMinutes / 60;
    
    const isWeekend = now.getUTCDay() === 0 || now.getUTCDay() === 6;
    if (isWeekend) return 'Closed (Weekend)';
    if (estTime >= 9.5 && estTime < 16) return 'Open';
    return 'Closed';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-r-transparent animate-spin mb-4" />
        <p className="text-muted text-sm font-medium">Fetching Wall Street Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-danger/30 text-center py-12">
        <p className="text-danger mb-2 font-semibold">Error Loading Markets</p>
        <p className="text-sm text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1 inline-flex items-center gap-2">
            🏛️ Traditional Markets
          </h1>
          <p className="text-sm text-muted">
            Live tracker for NASDAQ, US30, S&P 500, and major equities via Yahoo Finance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted">Market Status:</span>
          {getMarketStatus() === 'Open' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-success/10 text-success text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
              OPEN
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-danger/10 text-danger text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              {getMarketStatus()}
            </span>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stocks.map((stock) => {
          const isPositive = stock.changePercent >= 0;
          return (
            <div key={stock.symbol} className="card p-5 hover-card fade-in">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-primary leading-tight">{stock.symbol.replace('^', '')}</h3>
                  <p className="text-xs text-muted font-medium truncate max-w-[120px]" title={stock.shortName}>{stock.shortName}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {isPositive ? '↑' : '↓'} {Math.abs(stock.changePercent || 0).toFixed(2)}%
                </div>
              </div>
              
              <div className="mb-4">
                <span className="text-2xl font-mono font-bold text-primary tracking-tight">
                  {formatPrice(stock.price)}
                </span>
                <p className={`text-xs font-mono mt-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                  {isPositive ? '+' : ''}{(currency === 'ZAR' ? stock.change * usdZarRate : stock.change).toFixed(2)} Today
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">24h High</p>
                  <p className="text-xs font-mono text-primary">{formatPrice(stock.high)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">24h Low</p>
                  <p className="text-xs font-mono text-primary">{formatPrice(stock.low)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pt-8 border-t border-border">
         <p className="text-xs text-muted/60 text-center max-w-2xl mx-auto">
            Data provided by Yahoo Finance algorithms. Due to traditional exchange rules, certain indices may reflect delayed data during live market hours depending on geographic routing.
         </p>
      </div>
    </div>
  );
}
