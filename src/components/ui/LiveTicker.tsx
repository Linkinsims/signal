// Live Price Ticker Component
'use client';

import React, { useEffect, useState } from 'react';
import { fetch24hTickers, DEFAULT_CRYPTO_SYMBOLS, DISPLAY_NAMES } from '@/lib/binance';
import { useStore } from '@/lib/store';

interface TickerItem {
  symbol: string;
  displayName: string;
  price: number;
  changePercent: number;
}

export default function LiveTicker() {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const { currency, usdZarRate } = useStore();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetch24hTickers(DEFAULT_CRYPTO_SYMBOLS);
        const items: TickerItem[] = Object.entries(data).map(([symbol, info]) => ({
          symbol,
          displayName: DISPLAY_NAMES[symbol] || symbol,
          price: info.price,
          changePercent: info.changePercent,
        }));
        setTickers(items);
      } catch {
        // Fallback empty
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (tickers.length === 0) {
    return (
      <div className="h-9 bg-primary flex items-center">
        <div className="flex gap-8 px-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="skeleton w-16 h-3 !bg-white/10 !rounded" />
              <div className="skeleton w-10 h-3 !bg-white/10 !rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    const p = currency === 'ZAR' ? price * usdZarRate : price;
    const prefix = currency === 'ZAR' ? 'R' : '$';
    if (p >= 1000) return `${prefix}${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (p >= 1) return `${prefix}${p.toFixed(2)}`;
    return `${prefix}${p.toFixed(4)}`;
  };

  const doubled = [...tickers, ...tickers];

  return (
    <div className="h-9 bg-primary overflow-hidden">
      <div className="ticker-wrapper h-full flex items-center">
        <div className="ticker-content flex gap-8 px-6">
          {doubled.map((t, i) => (
            <div key={`${t.symbol}-${i}`} className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-white/60 text-xs font-medium">{t.displayName}</span>
              <span className="text-white text-xs font-mono font-medium">{formatPrice(t.price)}</span>
              <span className={`text-xs font-mono font-medium ${t.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
