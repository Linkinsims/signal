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

  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccessMsg('');
    setAuthLoading(true);

    // Simulate network delay for realistic feel
    await new Promise(r => setTimeout(r, 600));

    if (authView === 'forgot') {
      if (!email.includes('@')) {
        setAuthError('Please enter a valid email address.');
      } else {
        setSuccessMsg('If an account exists, a reset link has been sent to your email.');
        setTimeout(() => setAuthView('login'), 3000);
      }
      setAuthLoading(false);
      return;
    }

    if (!email.includes('@') || password.length < 6) {
      setAuthError('Invalid email or password (must be at least 6 characters).');
      setAuthLoading(false);
      return;
    }

    // Mock successful login/signup and bind the session
    setLicensed(true, `session_${Math.random().toString(36).substring(7)}`);
    setAuthLoading(false);
  };

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

  // Auth gate
  if (!isLicensed) {
    return (
      <div className="min-h-screen bg-background flexItems-center justify-center p-4" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="card max-w-md w-full animate-fade-in shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <path d="M2 14L5 6L8 10L11 3L14 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-center text-primary mb-1">
            {authView === 'login' ? 'Welcome Back' : authView === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>
          <p className="text-sm text-center text-muted mb-6">
            {authView === 'login' && 'Sign in to access your dashboard'}
            {authView === 'signup' && 'Join the world of automated signal intelligence'}
            {authView === 'forgot' && 'Enter your email to receive a reset link'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-primary mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                required
              />
            </div>
            
            {authView !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-primary">Password</label>
                  {authView === 'login' && (
                    <button type="button" onClick={() => { setAuthView('forgot'); setAuthError(''); setSuccessMsg(''); }} className="text-xs text-accent hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  required
                />
              </div>
            )}

            {authError && <p className="text-xs text-danger font-medium">{authError}</p>}
            {successMsg && <p className="text-xs text-success font-medium">{successMsg}</p>}

            <button type="submit" disabled={authLoading} className="btn-primary w-full flex items-center justify-center h-10 mt-2">
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                authView === 'login' ? 'Sign In' : authView === 'signup' ? 'Sign Up' : 'Send Reset Link'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            {authView === 'login' ? (
              <p className="text-sm text-muted">
                Don't have an account?{' '}
                <button onClick={() => { setAuthView('signup'); setAuthError(''); }} className="text-accent font-medium hover:underline">
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted">
                Already have an account?{' '}
                <button onClick={() => { setAuthView('login'); setAuthError(''); setSuccessMsg(''); }} className="text-accent font-medium hover:underline">
                  Sign in
                </button>
              </p>
            )}
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
