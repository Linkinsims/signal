// Economic Calendar Page
'use client';

import React, { useEffect, useState } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  country: string;
  date: string;
  time: string;
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  actual?: string;
  category: 'crypto' | 'stocks' | 'forex' | 'all';
}

// Static economic calendar data (since free APIs are unreliable)
// In production, replace with TradingEconomics or Forex Factory RSS proxy
function generateCalendarEvents(): CalendarEvent[] {
  const now = new Date();
  const events: CalendarEvent[] = [];

  const templates = [
    { title: 'FOMC Interest Rate Decision', country: 'US', impact: 'high' as const, category: 'all' as const },
    { title: 'Non-Farm Payrolls (NFP)', country: 'US', impact: 'high' as const, category: 'forex' as const },
    { title: 'Consumer Price Index (CPI)', country: 'US', impact: 'high' as const, category: 'all' as const },
    { title: 'GDP Growth Rate Q/Q', country: 'US', impact: 'high' as const, category: 'stocks' as const },
    { title: 'ECB Interest Rate Decision', country: 'EU', impact: 'high' as const, category: 'forex' as const },
    { title: 'PPI Month-over-Month', country: 'US', impact: 'medium' as const, category: 'stocks' as const },
    { title: 'Retail Sales M/M', country: 'US', impact: 'medium' as const, category: 'stocks' as const },
    { title: 'Initial Jobless Claims', country: 'US', impact: 'medium' as const, category: 'forex' as const },
    { title: 'PMI Manufacturing', country: 'US', impact: 'medium' as const, category: 'stocks' as const },
    { title: 'BTC ETF Inflow/Outflow Report', country: 'US', impact: 'high' as const, category: 'crypto' as const },
    { title: 'SARB Interest Rate Decision', country: 'ZA', impact: 'high' as const, category: 'forex' as const },
    { title: 'China GDP Quarterly', country: 'CN', impact: 'medium' as const, category: 'all' as const },
    { title: 'BOE Rate Decision', country: 'UK', impact: 'high' as const, category: 'forex' as const },
    { title: 'Consumer Confidence Index', country: 'US', impact: 'low' as const, category: 'stocks' as const },
    { title: 'Housing Starts', country: 'US', impact: 'low' as const, category: 'stocks' as const },
    { title: 'Durable Goods Orders', country: 'US', impact: 'medium' as const, category: 'stocks' as const },
  ];

  templates.forEach((t, i) => {
    const eventDate = new Date(now);
    eventDate.setDate(eventDate.getDate() + Math.floor(i / 2));
    eventDate.setHours(8 + (i % 12), (i * 15) % 60, 0, 0);

    events.push({
      id: `event_${i}`,
      title: t.title,
      country: t.country,
      date: eventDate.toISOString().split('T')[0],
      time: eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      impact: t.impact,
      forecast: i % 3 !== 0 ? `${(Math.random() * 5 - 2).toFixed(1)}%` : undefined,
      previous: `${(Math.random() * 5 - 2).toFixed(1)}%`,
      category: t.category,
    });
  });

  return events.sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime());
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'crypto' | 'stocks' | 'forex'>('all');
  const [impactFilter, setImpactFilter] = useState<'all' | 'high'>('all');

  useEffect(() => {
    setEvents(generateCalendarEvents());
  }, []);

  const filtered = events.filter(e => {
    if (filter !== 'all' && e.category !== 'all' && e.category !== filter) return false;
    if (impactFilter === 'high' && e.impact !== 'high') return false;
    return true;
  });

  // Check for upcoming high-impact events within 4 hours
  const now = new Date();
  const upcoming = events.filter(e => {
    if (e.impact !== 'high') return false;
    const eventTime = new Date(`${e.date} ${e.time}`);
    const diff = eventTime.getTime() - now.getTime();
    return diff > 0 && diff < 4 * 60 * 60 * 1000;
  });

  const impactColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  const countryFlags: Record<string, string> = { US: '🇺🇸', EU: '🇪🇺', UK: '🇬🇧', ZA: '🇿🇦', CN: '🇨🇳' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Economic Calendar</h1>
        <p className="text-sm text-muted mt-1">Upcoming market-moving events</p>
      </div>

      {/* High-impact warning banner */}
      {upcoming.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">High-impact event approaching</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              <strong>{upcoming[0].title}</strong> — Signals may be less reliable around major news events. Trade with caution.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
          {(['all', 'crypto', 'stocks', 'forex'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                filter === f ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setImpactFilter(impactFilter === 'all' ? 'high' : 'all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            impactFilter === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-surface-2 text-muted'
          }`}
        >
          🔴 High Impact Only
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {filtered.map((event) => (
          <div key={event.id} className="card flex items-center gap-4 !py-3">
            <div className="text-lg">{countryFlags[event.country] || '🌍'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{event.title}</p>
              <p className="text-xs text-muted">{event.date} · {event.time}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {event.forecast && (
                <div className="text-right hidden sm:block">
                  <p className="text-muted">Forecast</p>
                  <p className="font-mono font-medium text-primary">{event.forecast}</p>
                </div>
              )}
              {event.previous && (
                <div className="text-right hidden sm:block">
                  <p className="text-muted">Previous</p>
                  <p className="font-mono font-medium text-primary">{event.previous}</p>
                </div>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${impactColors[event.impact]}`}>
                {event.impact}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-sm text-muted">No events match your filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
