// Backtester Page
'use client';

import React, { useState } from 'react';
import { DEFAULT_CRYPTO_SYMBOLS, DISPLAY_NAMES } from '@/lib/binance';
import { runBacktest, BacktestResult } from '@/lib/backtester';
import { exportBacktestPDF } from '@/lib/pdf';
import { useFormatPrice } from '@/components/ui/PriceDisplay';

export default function BacktesterPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [signalType, setSignalType] = useState<'all' | 'LONG' | 'SHORT'>('all');
  const [capital, setCapital] = useState('10000');
  const [risk, setRisk] = useState('2');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formatPrice = useFormatPrice();

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await runBacktest({
        symbol,
        interval,
        signalType,
        initialCapital: parseFloat(capital) || 10000,
        riskPerTrade: parseFloat(risk) || 2,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Signal Backtester</h1>
        <p className="text-sm text-muted mt-1">Test signal performance on historical data</p>
      </div>

      {/* Config */}
      <div className="card">
        <h2 className="text-sm font-semibold text-primary mb-4">Configuration</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted mb-1 block">Asset</label>
            <select value={symbol} onChange={e => setSymbol(e.target.value)} className="input">
              {DEFAULT_CRYPTO_SYMBOLS.map(s => (
                <option key={s} value={s}>{DISPLAY_NAMES[s] || s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Timeframe</label>
            <select value={interval} onChange={e => setInterval(e.target.value)} className="input">
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Signal Filter</label>
            <select value={signalType} onChange={e => setSignalType(e.target.value as 'all' | 'LONG' | 'SHORT')} className="input">
              <option value="all">All Signals</option>
              <option value="LONG">LONG Only</option>
              <option value="SHORT">SHORT Only</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Initial Capital ($)</label>
            <input type="number" value={capital} onChange={e => setCapital(e.target.value)} className="input" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Risk Per Trade (%)</label>
            <input type="number" value={risk} onChange={e => setRisk(e.target.value)} className="input" step="0.5" min="0.5" max="10" />
          </div>
          <div className="flex items-end">
            <button onClick={handleRun} disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Running...' : 'Run Backtest'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-xs text-muted mb-1">Win Rate</p>
              <p className={`text-2xl font-bold font-mono ${result.stats.winRate >= 50 ? 'text-success' : 'text-danger'}`}>
                {result.stats.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-muted mb-1">Total P&L</p>
              <p className={`text-2xl font-bold font-mono ${result.stats.totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {result.stats.totalPnl >= 0 ? '+' : ''}{formatPrice(result.stats.totalPnl)}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-muted mb-1">Avg R:R</p>
              <p className="text-2xl font-bold font-mono text-primary">{result.stats.avgRR.toFixed(2)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-muted mb-1">Total Trades</p>
              <p className="text-2xl font-bold font-mono text-primary">{result.stats.totalTrades}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card-compact">
              <p className="text-xs text-muted">Profit Factor</p>
              <p className="text-lg font-mono font-bold text-primary">
                {result.stats.profitFactor === Infinity ? '∞' : result.stats.profitFactor.toFixed(2)}
              </p>
            </div>
            <div className="card-compact">
              <p className="text-xs text-muted">Max Drawdown</p>
              <p className="text-lg font-mono font-bold text-danger">{result.stats.maxDrawdown.toFixed(1)}%</p>
            </div>
            <div className="card-compact">
              <p className="text-xs text-muted">W / L</p>
              <p className="text-lg font-mono font-bold text-primary">{result.stats.wins} / {result.stats.losses}</p>
            </div>
          </div>

          {/* Equity Curve */}
          {result.equityCurve.length > 1 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-primary mb-3">Equity Curve</h3>
              <div className="h-32 flex items-end gap-px">
                {result.equityCurve.map((point, i) => {
                  const min = Math.min(...result.equityCurve.map(p => p.equity));
                  const max = Math.max(...result.equityCurve.map(p => p.equity));
                  const range = max - min || 1;
                  const height = ((point.equity - min) / range) * 100;
                  const isGain = point.equity >= result.config.initialCapital;
                  return (
                    <div
                      key={i}
                      className={`flex-1 min-w-[2px] rounded-t-sm transition-all ${isGain ? 'bg-success/60' : 'bg-danger/60'}`}
                      style={{ height: `${Math.max(2, height)}%` }}
                      title={`$${point.equity.toFixed(2)}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Trade Log */}
          <div className="card !p-0 overflow-x-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-primary">Trade Log ({result.trades.length})</h3>
              <button onClick={() => exportBacktestPDF(result)} className="btn-outline text-xs">Export PDF</button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted font-medium">#</th>
                  <th className="text-left py-2 px-3 text-muted font-medium">Type</th>
                  <th className="text-right py-2 px-3 text-muted font-medium">Entry</th>
                  <th className="text-right py-2 px-3 text-muted font-medium">Exit</th>
                  <th className="text-right py-2 px-3 text-muted font-medium">P&L</th>
                  <th className="text-right py-2 px-3 text-muted font-medium">R:R</th>
                  <th className="text-right py-2 px-3 text-muted font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.slice(0, 50).map((trade, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 text-muted">{i + 1}</td>
                    <td className="py-2 px-3">
                      <span className={trade.type === 'LONG' ? 'badge-long' : 'badge-short'}>{trade.type}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatPrice(trade.entry)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatPrice(trade.exitPrice)}</td>
                    <td className={`py-2 px-3 text-right font-mono font-medium ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{formatPrice(trade.pnl)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{trade.rr.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`text-xs font-medium ${trade.exitReason === 'tp' ? 'text-success' : trade.exitReason === 'sl' ? 'text-danger' : 'text-muted'}`}>
                        {trade.exitReason === 'tp' ? '✅ TP' : trade.exitReason === 'sl' ? '❌ SL' : '⏱ Timeout'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              ⚠️ <strong>Hypothetical historical performance.</strong> Past results do not guarantee future returns. This backtest does not account for slippage, fees, or market impact. Always manage risk and never trade with money you cannot afford to lose.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
