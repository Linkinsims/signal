// Signal Card Component
'use client';

import React from 'react';
import { Signal } from '@/lib/signals';
import { useStore } from '@/lib/store';

interface SignalCardProps {
  signal: Signal;
  compact?: boolean;
}

export default function SignalCard({ signal, compact = false }: SignalCardProps) {
  const { userMode, currency, usdZarRate } = useStore();

  const formatPrice = (price: number) => {
    if (price === 0) return '—';
    const converted = currency === 'ZAR' ? price * usdZarRate : price;
    const prefix = currency === 'ZAR' ? 'R' : '$';
    if (converted >= 1000) return `${prefix}${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (converted >= 1) return `${prefix}${converted.toFixed(2)}`;
    return `${prefix}${converted.toFixed(6)}`;
  };

  const timeSince = () => {
    const seconds = Math.floor((Date.now() - signal.timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const badgeClass = signal.type === 'LONG' ? 'badge-long' : signal.type === 'SHORT' ? 'badge-short' : 'badge-watch';

  if (compact) {
    return (
      <div className="card-compact flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <span className={badgeClass}>{signal.type}</span>
          <div>
            <p className="text-sm font-semibold text-primary">{signal.symbol}</p>
            <p className="text-xs text-muted">{signal.timeframe}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-medium">{formatPrice(signal.price)}</p>
          <p className="text-xs text-muted">{signal.confluenceScore}% conf.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={badgeClass}>{signal.type}</span>
          {signal.divergenceBadge && (
            <span className="badge-watch bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
              {signal.divergenceBadge}
            </span>
          )}
          {signal.mtfAgreement !== undefined && signal.mtfAgreement >= 2 && (
            <span className="badge-watch bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              MTF {signal.mtfAgreement}/3
            </span>
          )}
          <div>
            <h3 className="text-base font-semibold text-primary">{signal.symbol || signal.asset}</h3>
            <p className="text-xs text-muted">{(signal.assetClass || 'crypto').toUpperCase()} · {signal.timeframe}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">{timeSince()}</p>
          {/* Confluence bar */}
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  signal.confluenceScore >= 70 ? 'bg-success' :
                  signal.confluenceScore >= 50 ? 'bg-accent' : 'bg-warning'
                }`}
                style={{ width: `${signal.confluenceScore}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted">{signal.confluenceScore}%</span>
          </div>
        </div>
      </div>

      {/* Reason */}
      <p className="text-sm text-muted mb-3 leading-relaxed">
        {signal.reasons.join(' + ')}
      </p>

      {/* Price & Targets — shown in advanced mode */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
        <div>
          <p className="text-xs text-muted mb-0.5">Entry</p>
          <p className="text-sm font-mono font-medium">{formatPrice(signal.price)}</p>
        </div>
        {(userMode === 'advanced' || signal.type !== 'WATCH') && (
          <>
            <div>
              <p className="text-xs text-muted mb-0.5">Stop Loss</p>
              <p className="text-sm font-mono font-medium text-danger">{formatPrice(signal.stopLoss)}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Take Profit</p>
              <p className="text-sm font-mono font-medium text-success">{formatPrice(signal.takeProfit)}</p>
            </div>
          </>
        )}
      </div>

      {/* Risk/Reward in advanced mode */}
      {userMode === 'advanced' && signal.riskReward > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-xs text-muted">
            Risk/Reward: <span className="font-mono font-medium text-primary">1:{signal.riskReward}</span>
            {' · '}Confluence: <span className="font-mono font-medium text-primary">{signal.confluenceCount}/10</span>
          </p>
        </div>
      )}
    </div>
  );
}
