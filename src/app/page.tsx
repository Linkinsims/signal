// Landing / Marketing Page
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetch24hTickers, DEFAULT_CRYPTO_SYMBOLS, DISPLAY_NAMES } from '@/lib/binance';

interface TickerItem {
  symbol: string;
  displayName: string;
  price: number;
  changePercent: number;
}

export default function LandingPage() {
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [currency, setCurrency] = useState<'USD' | 'ZAR'>('USD');
  const [zarRate, setZarRate] = useState(18.5);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetch24hTickers(DEFAULT_CRYPTO_SYMBOLS);
        setTickers(
          Object.entries(data).map(([symbol, info]) => ({
            symbol,
            displayName: DISPLAY_NAMES[symbol] || symbol,
            price: info.price,
            changePercent: info.changePercent,
          }))
        );
      } catch { /* keep empty */ }
    }

    async function loadRate() {
      try {
        const res = await fetch('/api/forex?base=USD&symbols=ZAR');
        const data = await res.json();
        if (data.rates?.ZAR) setZarRate(data.rates.ZAR);
      } catch { /* keep fallback */ }
    }

    load();
    loadRate();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    const p = currency === 'ZAR' ? price * zarRate : price;
    const prefix = currency === 'ZAR' ? 'R' : '$';
    if (p >= 1000) return `${prefix}${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return `${prefix}${p.toFixed(2)}`;
  };

  const purchasePrice = currency === 'ZAR' ? 'R549' : '$29';

  const doubled = [...tickers, ...tickers];

  return (
    <div className="min-h-screen bg-white">
      {/* ─────────── NAV ─────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 14L5 6L8 10L11 3L14 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-primary tracking-tight">SIGNAL</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted hover:text-primary transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-muted hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-full p-0.5">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${currency === 'USD' ? 'bg-white shadow-sm text-primary' : 'text-muted'}`}
              >USD</button>
              <button
                onClick={() => setCurrency('ZAR')}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${currency === 'ZAR' ? 'bg-white shadow-sm text-primary' : 'text-muted'}`}
              >ZAR</button>
            </div>
            <Link href="/app" className="btn-primary text-sm !py-2 !px-4">
              Get Access
            </Link>
          </div>
        </div>
      </nav>

      {/* ─────────── LIVE TICKER DEMO ─────────── */}
      {tickers.length > 0 && (
        <div className="bg-primary overflow-hidden">
          <div className="ticker-wrapper h-9 flex items-center">
            <div className="ticker-content flex gap-8 px-6">
              {doubled.map((t, i) => (
                <div key={`${t.symbol}-${i}`} className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-white/60 text-xs font-medium">{t.displayName}</span>
                  <span className="text-white text-xs font-mono font-medium">{formatPrice(t.price)}</span>
                  <span className={`text-xs font-mono font-medium ${t.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────── HERO ─────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
          Live Market Intelligence
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-primary leading-[1.1] mb-5 tracking-tight">
          Trade with confidence,<br />
          <span className="text-accent">not guesswork.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
          Professional-grade signals across Crypto, Stocks & Forex.
          Our confluence engine fires signals only when 3+ indicators agree — delivering{' '}
          <span className="font-semibold text-primary">70%+ accuracy</span> on high-confidence setups.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/app" className="btn-primary text-base !px-8 !py-3">
            Get Access — {purchasePrice}
          </Link>
          <Link href="/app" className="btn-outline text-base !px-8 !py-3">
            See Live Demo
          </Link>
        </div>
        <p className="text-xs text-muted mt-4">One-time payment · No subscription · No login required</p>

        {/* Hero Image Placeholder - Chart Preview */}
        <div className="mt-16 mx-auto max-w-4xl bg-white rounded-2xl border border-border shadow-xl overflow-hidden">
          <div className="h-8 bg-gray-50 border-b border-border flex items-center px-4 gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-xs text-muted ml-3 font-mono">SIGNAL — Dashboard</span>
          </div>
          <div className="p-6 bg-background">
            <div className="grid grid-cols-4 gap-3 mb-4">
              {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'].map((pair, i) => {
                const t = tickers[i];
                return (
                  <div key={pair} className="bg-white rounded-lg p-3 border border-border">
                    <p className="text-xs text-muted mb-1">{pair}</p>
                    <p className="text-sm font-mono font-semibold">{t ? formatPrice(t.price) : '—'}</p>
                    {t && (
                      <p className={`text-xs font-mono ${t.changePercent >= 0 ? 'text-success' : 'text-danger'}`}>
                        {t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(2)}%
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Fake chart visual */}
            <div className="bg-white rounded-lg border border-border p-4 h-48 flex items-end gap-0.5">
              {Array.from({ length: 60 }).map((_, i) => {
                const height = 20 + Math.sin(i * 0.3) * 30 + Math.random() * 40;
                const up = Math.random() > 0.45;
                return (
                  <div
                    key={i}
                    className={`flex-1 min-w-[2px] rounded-sm ${up ? 'bg-success/60' : 'bg-danger/60'}`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── FEATURES ─────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-primary mb-3">Everything you need to trade smarter</h2>
          <p className="text-muted max-w-xl mx-auto">Professional tools without the professional price tag. One-time purchase, no monthly fees.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: '📊',
              title: 'Live Signal Engine',
              desc: 'Real-time signals every 30 seconds with confluence-based scoring. Fires only when 3+ indicators agree.',
            },
            {
              icon: '📈',
              title: 'Professional Charts',
              desc: 'TradingView-powered charts with candlesticks, EMA overlays, Bollinger Bands, and AI forecast zones.',
            },
            {
              icon: '🤖',
              title: 'AI Trend Forecasts',
              desc: 'Weighted scoring across 6 technical components with honest confidence scores (never above 82%).',
            },
            {
              icon: '💼',
              title: 'Portfolio Tracker',
              desc: 'Track holdings with live P&L, allocation breakdowns, and signal overlay on your portfolio assets.',
            },
            {
              icon: '🔔',
              title: 'Smart Alerts',
              desc: 'Custom price and indicator alerts with browser notifications. Never miss a high-confidence signal.',
            },
            {
              icon: '🌍',
              title: 'Multi-Market Coverage',
              desc: 'Crypto (Binance), Stocks (US markets), and Forex — all in one dashboard with USD/ZAR toggle.',
            },
          ].map((f) => (
            <div key={f.title} className="card hover:border-accent/30 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-base font-semibold text-primary mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── HOW IT WORKS ─────────── */}
      <section className="bg-background py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-primary mb-3">How it works</h2>
            <p className="text-muted">Three steps. No signup. No subscription.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create an account', desc: 'Sign up securely. Your portfolio, settings, and watchlists are tied to your personal account.' },
              { step: '02', title: 'See live signals', desc: 'Confluence-based signals fire across Crypto, Stocks & Forex with entry, stop loss, and take profit levels.' },
              { step: '03', title: 'Trade smarter', desc: 'Use professional-grade analysis to make informed decisions. Track your portfolio, set alerts, and stay ahead.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── ACCURACY ─────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary mb-5">Honest about accuracy</h2>
          <p className="text-muted leading-relaxed mb-6">
            We don&apos;t make outrageous claims. Our confluence engine analyzes RSI, MACD, EMA crossovers,
            Bollinger Bands, volume patterns, and price structure to generate signals. When 3 or more indicators
            agree, the resulting signal has historically shown <span className="font-semibold text-primary">70%+ accuracy</span> on
            high-confluence setups.
          </p>
          <p className="text-muted leading-relaxed">
            We cap our confidence scores at 82% because markets are inherently unpredictable. Our tool helps you
            make <em>more informed</em> decisions — it does not guarantee profits. Always manage risk and never trade
            with money you can&apos;t afford to lose.
          </p>
        </div>
      </section>

      {/* ─────────── PRICING ─────────── */}
      <section id="pricing" className="bg-background py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-primary mb-3">Simple, one-time pricing</h2>
            <p className="text-muted">Pay once. Access forever. No hidden fees.</p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="card text-center border-accent/30 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
              <div className="pt-2">
                <p className="text-sm font-medium text-accent mb-4">Lifetime Access</p>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-4xl font-bold text-primary">{purchasePrice}</span>
                  <span className="text-muted text-sm"> one-time</span>
                </div>
                <p className="text-xs text-muted mb-6">
                  {currency === 'USD' ? '≈ R549 ZAR' : '≈ $29 USD'}
                </p>
                <ul className="text-sm text-left space-y-3 mb-8">
                  {[
                    'Real-time signals across Crypto, Stocks & Forex',
                    'TradingView-powered charts with indicator overlays',
                    'AI trend forecasts with confidence scoring',
                    'Portfolio tracker with live P&L',
                    'Custom alerts and notifications',
                    'Beginner & Advanced modes',
                    'USD / ZAR currency toggle',
                    'All future updates included',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-success mt-0.5 shrink-0">
                        <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="/app"
                  className="btn-primary w-full text-base !py-3 flex items-center justify-center"
                >
                  Create Account
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <section id="faq" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-primary mb-3">Frequently asked questions</h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-3">
          {[
            {
              q: 'How accurate are the signals?',
              a: 'Our confluence engine fires signals only when 3 or more technical indicators agree. High-confluence signals (4+ indicators) have historically shown 70%+ directional accuracy. We cap confidence scores at 82% to reflect inherent market uncertainty.',
            },
            {
              q: 'Is my data secure?',
              a: 'Yes, absolutely. We use industry-standard encryption for your credentials, and your portfolio limits and configurations are safely stored in your account profile.',
            },
            {
              q: 'Where does the data come from?',
              a: 'Crypto data comes from Binance via real-time WebSocket. Stocks use Alpha Vantage. Forex rates use exchangerate.host. All free-tier, no hidden costs.',
            },
            {
              q: 'Is there a subscription or recurring fee?',
              a: 'No. SIGNAL uses a one-time payment model. Pay once and access all features forever, including future updates.',
            },
            {
              q: 'Can I get a refund?',
              a: 'Due to the digital nature of this product, we generally don\'t offer refunds. However, you can try the demo mode before purchasing to evaluate the platform.',
            },
            {
              q: 'What markets and assets are covered?',
              a: 'We cover 8 major crypto pairs (BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX), 8 US stocks/indices (AAPL, TSLA, MSFT, NVDA, AMZN, GOOGL, SPY, QQQ), and 5 forex pairs (EUR/USD, GBP/USD, USD/JPY, USD/ZAR, AUD/USD).',
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              className="card w-full text-left cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary pr-4">{item.q}</h3>
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className={`text-muted shrink-0 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {faqOpen === i && (
                <p className="text-sm text-muted mt-3 leading-relaxed animate-slide-down">{item.a}</p>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 14L5 6L8 10L11 3L14 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-primary">SIGNAL</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted">
              <a href="#features" className="hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs text-muted text-center leading-relaxed max-w-2xl mx-auto">
              ⚠️ <strong>Disclaimer:</strong> SIGNAL provides market analysis tools based on technical indicators.
              Trading involves substantial risk of financial loss. Past performance does not guarantee future results.
              Signals are not financial advice. Always do your own research and consult a licensed financial advisor
              before making investment decisions. Never trade with money you cannot afford to lose.
            </p>
            <p className="text-xs text-muted/60 text-center mt-4">
              © {new Date().getFullYear()} SIGNAL. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
