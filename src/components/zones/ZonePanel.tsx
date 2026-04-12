// Zone Panel — Displays active supply & demand zones for current asset
'use client';

import React from 'react';
import { Zone } from '@/lib/zones';
import { useFormatPrice } from '@/components/ui/PriceDisplay';

interface ZonePanelProps {
  zones: Zone[];
  currentPrice: number;
}

export default function ZonePanel({ zones, currentPrice }: ZonePanelProps) {
  const formatPrice = useFormatPrice();

  if (zones.length === 0) {
    return (
      <div className="card-compact">
        <p className="text-xs text-muted">No active S&D zones detected</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-primary mb-3">Supply & Demand Zones</h3>
      <div className="space-y-2">
        {zones.slice(0, 8).map((zone) => {
          const dist = zone.type === 'demand'
            ? currentPrice - zone.top
            : zone.bottom - currentPrice;
          const distPct = currentPrice > 0 ? (dist / currentPrice) * 100 : 0;
          const isNear = Math.abs(distPct) < 1;

          return (
            <div
              key={zone.id}
              className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-all ${
                isNear ? 'bg-accent/5 border border-accent/20' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  zone.type === 'demand' ? 'bg-success' : 'bg-danger'
                }`} />
                <span className="font-medium text-primary capitalize">{zone.type}</span>
                <span className="text-muted">
                  {formatPrice(zone.bottom)} — {formatPrice(zone.top)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${
                  zone.status === 'fresh' ? 'text-accent' :
                  zone.status === 'tested' ? 'text-warning' : 'text-muted'
                }`}>
                  {zone.status}
                </span>
                <span className="text-muted">×{zone.strength}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
