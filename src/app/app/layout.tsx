// App Dashboard Layout — wraps all /app/* pages
'use client';

import React, { useEffect, useState } from 'react';
import Sidebar, { MobileNav } from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import LiveTicker from '@/components/ui/LiveTicker';
import { initializeStore } from '@/lib/store';
import { getBinanceWSManager, DEFAULT_CRYPTO_SYMBOLS } from '@/lib/binance';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initializeStore();
    setMounted(true);

    // Connect Binance WebSocket
    const ws = getBinanceWSManager();
    ws.connect(DEFAULT_CRYPTO_SYMBOLS, '1h');

    return () => ws.cleanup();
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center animate-pulse-soft">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M2 14L5 6L8 10L11 3L14 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm text-muted">Loading SIGNAL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LiveTicker />
      <Sidebar />
      <div className="lg:pl-[220px]">
        <Header />
        <main className="p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
