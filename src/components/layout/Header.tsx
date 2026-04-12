// Header — Mode toggle, currency toggle, dark mode toggle, ZAR rate
'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { UserButton } from '@clerk/nextjs';

export default function Header() {
  const {
    userMode, setUserMode,
    currency, setCurrency,
    usdZarRate, setUsdZarRate,
    theme, toggleTheme,
  } = useStore();

  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch('/api/forex?base=USD&symbols=ZAR');
        const data = await res.json();
        if (data.rates?.ZAR) setUsdZarRate(data.rates.ZAR);
      } catch { /* keep fallback */ }
    }
    fetchRate();
    const interval = setInterval(fetchRate, 60000);
    return () => clearInterval(interval);
  }, [setUsdZarRate]);

  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-end h-14 px-4 lg:px-6 gap-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface-2 transition-all"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 1V3M8 13V15M1 8H3M13 8H15M3.05 3.05L4.46 4.46M11.54 11.54L12.95 12.95M3.05 12.95L4.46 11.54M11.54 4.46L12.95 3.05" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 9.34A6 6 0 116.66 2 5 5 0 0014 9.34z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* User Mode */}
        <div className="flex items-center bg-surface-2 rounded-full p-0.5">
          <button
            onClick={() => setUserMode('beginner')}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
              userMode === 'beginner' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            }`}
          >
            ● Beginner
          </button>
          <button
            onClick={() => setUserMode('advanced')}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
              userMode === 'advanced' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            }`}
          >
            Advanced
          </button>
        </div>

        {/* Currency Toggle */}
        <div className="flex items-center bg-surface-2 rounded-full p-0.5">
          <button
            onClick={() => setCurrency('USD')}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
              currency === 'USD' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            }`}
          >
            USD
          </button>
          <button
            onClick={() => setCurrency('ZAR')}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
              currency === 'ZAR' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
            }`}
          >
            ZAR
          </button>
        </div>

        {/* Rate Display */}
        <span className="text-xs font-mono text-muted hidden sm:inline mr-2">
          1 USD = {usdZarRate.toFixed(2)} ZAR
        </span>

        {/* Clerk Profile / Logout */}
        <div className="flex items-center pl-2 border-l border-border">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
