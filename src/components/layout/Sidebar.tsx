// Sidebar Navigation (Desktop) + BottomNav (Mobile)
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: '⊞' },
  { href: '/app/signals', label: 'Signals', icon: '𝍖' },
  { href: '/app/chart/BTCUSDT', label: 'Charts', icon: '📈' },
  { href: '/app/stocks', label: 'Stocks', icon: '🏛️' },
  { href: '/app/forecast', label: 'Forecast', icon: '◎' },
  { href: '/app/watchlist', label: 'Watchlist', icon: '★' },
  { href: '/app/backtester', label: 'Backtester', icon: '⏮' },
  { href: '/app/calendar', label: 'Calendar', icon: '📅' },
  { href: '/app/portfolio', label: 'Portfolio', icon: '◧' },
  { href: '/app/settings', label: 'Settings', icon: '⚙' },
];

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5); // Show first 5 on mobile

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/app') return pathname === '/app';
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[220px] bg-surface border-r border-border z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 gap-2.5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 14L5 6L8 10L11 3L14 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-base font-bold text-primary tracking-tight">SIGNAL</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              isActive(item.href)
                ? 'bg-accent/10 text-accent font-semibold'
                : 'text-muted hover:text-primary hover:bg-surface-2'
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted leading-relaxed">
          Signals based on technical analysis. Trading involves risk.
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/app') return pathname === '/app';
    return pathname.startsWith(href);
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40 safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {MOBILE_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 text-xs transition-colors ${
              isActive(item.href) ? 'text-accent font-medium' : 'text-muted'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
