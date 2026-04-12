// Portfolio Tracker Page — localStorage based
'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useFormatPrice } from '@/components/ui/PriceDisplay';
import { fetch24hTickers, DEFAULT_CRYPTO_SYMBOLS, DISPLAY_NAMES } from '@/lib/binance';

export default function PortfolioPage() {
  const { portfolio, addHolding, removeHolding, prices, setBatchPrices, currency, usdZarRate } = useStore();
  const formatPrice = useFormatPrice();
  const [showForm, setShowForm] = useState(false);
  const [formSymbol, setFormSymbol] = useState('BTCUSDT');
  const [formQty, setFormQty] = useState('');
  const [formPrice, setFormPrice] = useState('');

  // Fetch current prices
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

  function handleAdd() {
    if (!formQty || !formPrice) return;
    addHolding({
      id: `hold_${Date.now()}`,
      symbol: formSymbol,
      assetClass: 'crypto',
      quantity: parseFloat(formQty),
      avgBuyPrice: parseFloat(formPrice),
    });
    setFormQty('');
    setFormPrice('');
    setShowForm(false);
  }

  // Calculate totals
  const holdings = portfolio.map((h) => {
    const currentPrice = prices[h.symbol]?.price || h.avgBuyPrice;
    const currentValue = h.quantity * currentPrice;
    const costBasis = h.quantity * h.avgBuyPrice;
    const pnl = currentValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    return { ...h, currentPrice, currentValue, costBasis, pnl, pnlPercent };
  });

  const totalValue = holdings.reduce((a, h) => a + h.currentValue, 0);
  const totalPnl = holdings.reduce((a, h) => a + h.pnl, 0);
  const totalCost = holdings.reduce((a, h) => a + h.costBasis, 0);
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Portfolio Tracker</h1>
          <p className="text-sm text-muted mt-1">Track your holdings — stored locally on your device</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          + Add Holding
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-muted mb-1">Total Value</p>
          <p className="text-xl font-mono font-bold text-primary">{formatPrice(totalValue)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted mb-1">Total P&L</p>
          <p className={`text-xl font-mono font-bold ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatPrice(totalPnl)}
          </p>
          <p className={`text-xs font-mono ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
          </p>
        </div>
        <div className="card col-span-2 lg:col-span-1">
          <p className="text-xs text-muted mb-1">Holdings</p>
          <p className="text-xl font-bold text-primary">{portfolio.length}</p>
        </div>
      </div>

      {/* Allocation Pie */}
      {holdings.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-primary mb-4">Allocation</h2>
          <div className="flex items-center gap-6 flex-wrap">
            {/* Simple visual allocation bars */}
            <div className="flex-1 min-w-[200px]">
              <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
                {holdings.map((h, i) => {
                  const pct = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
                  const colors = ['bg-accent', 'bg-success', 'bg-warning', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500', 'bg-indigo-500'];
                  return (
                    <div
                      key={h.id}
                      className={`${colors[i % colors.length]} transition-all`}
                      style={{ width: `${pct}%`, minWidth: pct > 0 ? '4px' : '0' }}
                      title={`${DISPLAY_NAMES[h.symbol] || h.symbol}: ${pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {holdings.map((h, i) => {
                const pct = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
                const colors = ['bg-accent', 'bg-success', 'bg-warning', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500', 'bg-indigo-500'];
                return (
                  <div key={h.id} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                    <span className="text-xs text-muted">{DISPLAY_NAMES[h.symbol]?.split('/')[0] || h.symbol} {pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="card animate-slide-down">
          <h3 className="text-sm font-semibold text-primary mb-3">Add Holding</h3>
          <div className="grid sm:grid-cols-4 gap-3">
            <select
              value={formSymbol}
              onChange={(e) => setFormSymbol(e.target.value)}
              className="input"
            >
              {DEFAULT_CRYPTO_SYMBOLS.map((s) => (
                <option key={s} value={s}>{DISPLAY_NAMES[s] || s}</option>
              ))}
            </select>
            <input
              type="number"
              value={formQty}
              onChange={(e) => setFormQty(e.target.value)}
              placeholder="Quantity"
              className="input"
              step="any"
            />
            <input
              type="number"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              placeholder="Avg Buy Price (USD)"
              className="input"
              step="any"
            />
            <button onClick={handleAdd} className="btn-primary text-sm">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      {holdings.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 9V15M9 12H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm text-muted">No holdings yet</p>
          <p className="text-xs text-muted mt-1">Add your first holding to start tracking</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted">Asset</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted">Qty</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted">Avg Buy</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted">Current</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted">Value</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted">P&L</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id} className="border-b border-border/50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-semibold">{DISPLAY_NAMES[h.symbol] || h.symbol}</td>
                  <td className="py-3 px-4 text-right font-mono">{h.quantity}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatPrice(h.avgBuyPrice)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatPrice(h.currentPrice)}</td>
                  <td className="py-3 px-4 text-right font-mono font-medium">{formatPrice(h.currentValue)}</td>
                  <td className={`py-3 px-4 text-right font-mono font-medium ${h.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {h.pnl >= 0 ? '+' : ''}{formatPrice(h.pnl)}
                    <span className="block text-xs">
                      {h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => removeHolding(h.id)}
                      className="text-muted hover:text-danger transition-colors p-1"
                      title="Remove holding"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Privacy notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs text-blue-800 leading-relaxed">
          🔒 Your portfolio data is stored exclusively in your browser&apos;s localStorage. No data is sent to any server. Clear your browser data to remove all holdings.
        </p>
      </div>
    </div>
  );
}
