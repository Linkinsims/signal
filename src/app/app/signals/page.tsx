// Signals Feed Page
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import SignalCard from '@/components/signals/SignalCard';
import { Signal, getSignalHistory, generateSignal, saveSignal, AssetClass, Timeframe } from '@/lib/signals';
import { fetchKlines, DEFAULT_CRYPTO_SYMBOLS, DISPLAY_NAMES } from '@/lib/binance';
import { useStore } from '@/lib/store';

const TIMEFRAMES: Timeframe[] = ['15m', '1H', '4H', '1D'];

export default function SignalsPage() {
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { signalFilter, setSignalFilter, addSignal, userMode } = useStore();

  const loadHistory = useCallback(() => {
    const history = getSignalHistory();
    setAllSignals(history);
    setLoading(false);
  }, []);

  const generateAllSignals = useCallback(async () => {
    setGenerating(true);
    try {
      for (const symbol of DEFAULT_CRYPTO_SYMBOLS.slice(0, 4)) {
        try {
          const candles = await fetchKlines(symbol, '1h', 500);
          const signal = generateSignal(
            DISPLAY_NAMES[symbol] || symbol,
            'crypto',
            candles,
            '1H'
          );
          if (signal) {
            saveSignal(signal);
            addSignal(signal);
          }
        } catch {
          // Skip failed symbols
        }
        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 200));
      }
    } finally {
      setGenerating(false);
      loadHistory();
    }
  }, [addSignal, loadHistory]);

  useEffect(() => {
    loadHistory();
    // Auto-generate signals on first load if empty
    const history = getSignalHistory();
    if (history.length === 0) {
      generateAllSignals();
    }
    // Re-generate every 30 seconds
    const interval = setInterval(generateAllSignals, 30000);
    return () => clearInterval(interval);
  }, [loadHistory, generateAllSignals]);

  const filtered = signalFilter === 'all'
    ? allSignals
    : allSignals.filter((s) => s.assetClass === signalFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Live Signals</h1>
          <p className="text-sm text-muted mt-1">
            Confluence-based signals generated every 30 seconds
            {generating && <span className="ml-2 text-accent animate-pulse-soft">● Scanning...</span>}
          </p>
        </div>
        <button
          onClick={generateAllSignals}
          disabled={generating}
          className="btn-outline text-sm"
        >
          {generating ? 'Scanning...' : 'Refresh Signals'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'crypto', 'stocks', 'forex'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSignalFilter(filter)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              signalFilter === filter
                ? 'bg-accent text-white'
                : 'bg-white border border-border text-muted hover:text-primary'
            }`}
          >
            {filter === 'all' ? 'All Markets' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Signals */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm text-muted">No signals yet for this filter</p>
          <p className="text-xs text-muted mt-1">Signals are generated when 3+ indicators agree</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((signal) => (
            <SignalCard key={signal.id} signal={signal} compact={userMode === 'beginner'} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-800 leading-relaxed">
          ⚠️ Signals are based on technical analysis patterns. Trading involves risk. Past performance does not guarantee future results.
          Always do your own research and never trade with money you can&apos;t afford to lose.
        </p>
      </div>
    </div>
  );
}
