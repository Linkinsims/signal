// Watchlist Page — Custom sortable watchlist
'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useFormatPrice } from '@/components/ui/PriceDisplay';
import { fetch24hTickers, DEFAULT_CRYPTO_SYMBOLS, DISPLAY_NAMES } from '@/lib/binance';
import Link from 'next/link';

export default function WatchlistPage() {
  const { watchlist, addToWatchlist, removeFromWatchlist, reorderWatchlist, prices, setBatchPrices } = useStore();
  const formatPrice = useFormatPrice();
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState<'order' | 'change' | 'price'>('order');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetch24hTickers(DEFAULT_CRYPTO_SYMBOLS);
        const batch: Record<string, { price: number; change24h: number }> = {};
        for (const [sym, info] of Object.entries(data)) {
          batch[sym] = { price: info.price, change24h: info.changePercent };
        }
        setBatchPrices(batch);
      } catch { /* keep state */ }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [setBatchPrices]);

  const available = DEFAULT_CRYPTO_SYMBOLS.filter(s => !watchlist.some(w => w.symbol === s));

  const sorted = [...watchlist].sort((a, b) => {
    if (sortBy === 'change') {
      const ca = prices[a.symbol]?.change24h || 0;
      const cb = prices[b.symbol]?.change24h || 0;
      return cb - ca;
    }
    if (sortBy === 'price') {
      const pa = prices[a.symbol]?.price || 0;
      const pb = prices[b.symbol]?.price || 0;
      return pb - pa;
    }
    return a.order - b.order;
  });

  function handleDragStart(idx: number) { setDragIdx(idx); }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const items = [...watchlist];
    const dragged = items.splice(dragIdx, 1)[0];
    items.splice(idx, 0, dragged);
    reorderWatchlist(items.map((item, i) => ({ ...item, order: i })));
    setDragIdx(idx);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(watchlist, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'signal_watchlist.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) reorderWatchlist(data);
      } catch { /* invalid json */ }
    };
    input.click();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Watchlist</h1>
          <p className="text-sm text-muted mt-1">Your custom asset watchlist — drag to reorder</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportJSON} className="btn-outline text-xs">Export JSON</button>
          <button onClick={importJSON} className="btn-outline text-xs">Import</button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">+ Add</button>
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 w-fit">
        {([['order', 'Custom'], ['price', 'Price'], ['change', '24h %']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              sortBy === key ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Add Panel */}
      {showAdd && (
        <div className="card animate-slide-down">
          <p className="text-sm font-semibold text-primary mb-3">Add Asset</p>
          <div className="flex flex-wrap gap-2">
            {available.map(sym => (
              <button
                key={sym}
                onClick={() => { addToWatchlist({ symbol: sym, assetClass: 'crypto', order: watchlist.length }); setShowAdd(false); }}
                className="px-3 py-1.5 text-xs font-medium bg-surface-2 rounded-lg hover:bg-accent hover:text-white transition-all"
              >
                {DISPLAY_NAMES[sym] || sym}
              </button>
            ))}
            {available.length === 0 && <p className="text-xs text-muted">All assets already in watchlist</p>}
          </div>
        </div>
      )}

      {/* Watchlist Table */}
      {sorted.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-muted">No assets in your watchlist yet</p>
          <p className="text-xs text-muted mt-1">Click &quot;+ Add&quot; to start building your list</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted w-8"></th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted">Asset</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted">Price</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted">24h</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => {
                const p = prices[item.symbol];
                const change = p?.change24h || 0;
                return (
                  <tr
                    key={item.symbol}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    className="border-b border-border/50 hover:bg-surface-2 transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <td className="py-3 px-4 text-muted">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="3" cy="3" r="1.2"/><circle cx="9" cy="3" r="1.2"/><circle cx="3" cy="9" r="1.2"/><circle cx="9" cy="9" r="1.2"/></svg>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/app/chart/${item.symbol}`} className="font-semibold text-primary hover:text-accent transition-colors">
                        {DISPLAY_NAMES[item.symbol] || item.symbol}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{p ? formatPrice(p.price) : '—'}</td>
                    <td className={`py-3 px-4 text-right font-mono font-medium ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => removeFromWatchlist(item.symbol)} className="text-muted hover:text-danger transition-colors p-1">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
