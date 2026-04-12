// Header Component with Currency Toggle and User Mode Switch
'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Toaster } from 'react-hot-toast';

export default function Header() {
  const { currency, setCurrency, userMode, setUserMode, usdZarRate, setUsdZarRate } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fetch USD/ZAR rate
    fetchRate();
    const interval = setInterval(fetchRate, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  async function fetchRate() {
    try {
      const res = await fetch('/api/forex?base=USD&symbols=ZAR');
      const data = await res.json();
      if (data.rates?.ZAR) {
        setUsdZarRate(data.rates.ZAR);
      }
    } catch {
      // Keep fallback rate
    }
  }

  if (!mounted) return <HeaderSkeleton />;

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#0A0A0A',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
        }}
      />
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6">
          {/* Left — Logo on mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 14L5 6L8 10L11 3L14 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-base font-bold text-primary">SIGNAL</span>
          </div>

          {/* Spacer for desktop */}
          <div className="hidden lg:block" />

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* User Mode Toggle */}
            <button
              onClick={() => setUserMode(userMode === 'beginner' ? 'advanced' : 'beginner')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-border hover:bg-gray-50 transition-colors"
              title={`Switch to ${userMode === 'beginner' ? 'Advanced' : 'Beginner'} mode`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${userMode === 'advanced' ? 'bg-accent' : 'bg-muted-light'}`} />
              {userMode === 'beginner' ? 'Beginner' : 'Advanced'}
            </button>

            {/* Currency Toggle */}
            <div className="flex items-center bg-gray-100 rounded-full p-0.5">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  currency === 'USD' ? 'bg-white text-primary shadow-sm' : 'text-muted'
                }`}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency('ZAR')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  currency === 'ZAR' ? 'bg-white text-primary shadow-sm' : 'text-muted'
                }`}
              >
                ZAR
              </button>
            </div>

            {/* Rate display */}
            <span className="hidden md:block text-xs text-muted font-mono">
              1 USD = {usdZarRate.toFixed(2)} ZAR
            </span>
          </div>
        </div>
      </header>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="skeleton w-24 h-7 rounded" />
        <div className="flex items-center gap-3">
          <div className="skeleton w-20 h-7 rounded-full" />
          <div className="skeleton w-16 h-7 rounded-full" />
        </div>
      </div>
    </header>
  );
}
