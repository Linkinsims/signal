// App Dashboard Layout — wraps all /app/* pages
'use client';

import React, { useEffect, useState } from 'react';
import Sidebar, { MobileNav } from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import LiveTicker from '@/components/ui/LiveTicker';
import { initializeStore, useStore } from '@/lib/store';
import { getBinanceWSManager, DEFAULT_CRYPTO_SYMBOLS } from '@/lib/binance';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { isLicensed, setLicensed } = useStore();
  const [licenseInput, setLicenseInput] = useState('');

  useEffect(() => {
    initializeStore();
    setMounted(true);

    // Connect Binance WebSocket
    const ws = getBinanceWSManager();
    ws.connect(DEFAULT_CRYPTO_SYMBOLS, '1h');

    return () => ws.cleanup();
  }, []);

  function handleActivate() {
    // Simple key validation — any non-empty key with at least 8 characters is accepted
    // In production, you'd validate against Shopify/Yoco webhook data
    if (licenseInput.trim().length >= 8) {
      setLicensed(true, licenseInput.trim());
    }
  }

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

  // License gate
  if (!isLicensed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <path d="M2 14L5 6L8 10L11 3L14 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">Enter License Key</h2>
          <p className="text-sm text-muted mb-6">
            Enter your license key to access the full SIGNAL platform. Don&apos;t have one?{' '}
            <a href="/#pricing" className="text-accent hover:underline">Get access →</a>
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={licenseInput}
              onChange={(e) => setLicenseInput(e.target.value)}
              placeholder="SIGNAL-XXXX-XXXX-XXXX"
              className="input text-center font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
            />
            <button onClick={handleActivate} className="btn-primary w-full">
              Activate
            </button>
            <button onClick={() => setLicensed(true, 'DEMO-MODE')} className="btn-ghost w-full text-xs">
              Try Demo (limited features)
            </button>
          </div>
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
