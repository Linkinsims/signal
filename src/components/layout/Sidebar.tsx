// Sidebar Navigation Component
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/app', label: 'Dashboard', icon: DashboardIcon },
  { href: '/app/signals', label: 'Signals', icon: SignalIcon },
  { href: '/app/chart/BTCUSDT', label: 'Charts', icon: ChartIcon },
  { href: '/app/forecast', label: 'Forecast', icon: ForecastIcon },
  { href: '/app/portfolio', label: 'Portfolio', icon: PortfolioIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-[220px] min-h-screen bg-white border-r border-border px-3 py-6 fixed left-0 top-0 z-30">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 14L5 6L8 10L11 3L14 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-lg font-bold text-primary tracking-tight">SIGNAL</span>
      </Link>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-primary hover:bg-gray-50'
              }`}
            >
              <Icon active={isActive} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade callout */}
      <div className="mt-auto px-3 py-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-border">
          <p className="text-xs text-muted leading-relaxed">
            Signals based on technical analysis. Trading involves risk.
          </p>
        </div>
      </div>
    </aside>
  );
}

// ─── Mobile Bottom Nav ─────────────────────────────────────────
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 px-2 py-1.5 flex justify-around">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              isActive ? 'text-accent' : 'text-muted'
            }`}
          >
            <Icon active={isActive} />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Icons ─────────────────────────────────────────────────────
function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={active ? 'text-accent' : 'text-muted'}>
      <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function SignalIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={active ? 'text-accent' : 'text-muted'}>
      <path d="M9 14V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 14V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 14V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={active ? 'text-accent' : 'text-muted'}>
      <path d="M2 14L6 8L9 11L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 4H14V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ForecastIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={active ? 'text-accent' : 'text-muted'}>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 6V9L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function PortfolioIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={active ? 'text-accent' : 'text-muted'}>
      <rect x="3" y="5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 5V4C6 3.44772 6.44772 3 7 3H11C11.5523 3 12 3.44772 12 4V5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 8V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7.5 9.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
