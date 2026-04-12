// Chart Page — Individual asset chart view
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useFormatPrice } from '@/components/ui/PriceDisplay';
import { DISPLAY_NAMES, DEFAULT_CRYPTO_SYMBOLS, fetchKlines } from '@/lib/binance';
import { generateSignal, Signal } from '@/lib/signals';
import { generateForecast, generateForecastPoints, ForecastResult } from '@/lib/forecast';
import { calculateRSI, calculateMACD, calculateEMA, calculateBollingerBands, calculateATR, OHLCV } from '@/lib/indicators';
import SignalCard from '@/components/signals/SignalCard';
import Link from 'next/link';

type IntervalKey = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const INTERVALS: { key: IntervalKey; label: string }[] = [
  { key: '1m', label: '1m' },
  { key: '5m', label: '5m' },
  { key: '15m', label: '15m' },
  { key: '1h', label: '1H' },
  { key: '4h', label: '4H' },
  { key: '1d', label: '1D' },
];

export default function ChartPage() {
  const params = useParams();
  const symbol = (params.symbol as string) || 'BTCUSDT';
  const [interval, setChartInterval] = useState<IntervalKey>('1h');
  const [signal, setSignal] = useState<Signal | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<unknown>(null);
  const { userMode } = useStore();
  const formatPrice = useFormatPrice();
  const displayName = DISPLAY_NAMES[symbol] || symbol;

  // Indicator values for display
  const [lastRSI, setLastRSI] = useState<number | null>(null);
  const [lastMACD, setLastMACD] = useState<{ macd: number; signal: number; histogram: number } | null>(null);
  const [emaCross, setEmaCross] = useState<string>('—');
  const [lastATR, setLastATR] = useState<number>(0);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        try {
          (chartInstanceRef.current as { remove: () => void }).remove();
        } catch { /* ignore */ }
        chartInstanceRef.current = null;
      }
    };
  }, []);

  // Fetch candles and build chart
  useEffect(() => {
    let cancelled = false;

    async function loadAndRender() {
      try {
        setLoading(true);
        setError(null);

        // Cleanup previous chart
        if (chartInstanceRef.current) {
          try {
            (chartInstanceRef.current as { remove: () => void }).remove();
          } catch { /* ignore */ }
          chartInstanceRef.current = null;
        }

        // Fetch data
        const candles = await fetchKlines(symbol, interval, 500);
        if (cancelled) return;

        if (candles.length === 0) {
          setError('No data available for this symbol');
          setLoading(false);
          return;
        }

        setCurrentPrice(candles[candles.length - 1].close);

        // Compute indicators
        const closes = candles.map((c: OHLCV) => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi.length > 0) setLastRSI(rsi[rsi.length - 1]);
        else setLastRSI(null);

        const macd = calculateMACD(closes);
        if (macd.length > 0) setLastMACD(macd[macd.length - 1]);
        else setLastMACD(null);

        const ema50 = calculateEMA(closes, 50);
        const ema200 = calculateEMA(closes, 200);
        if (ema50.length > 0 && ema200.length > 0) {
          setEmaCross(ema50[ema50.length - 1] > ema200[ema200.length - 1] ? 'Golden' : 'Death');
        } else {
          setEmaCross('—');
        }

        const atr = calculateATR(candles, 14);
        if (atr.length > 0) setLastATR(atr[atr.length - 1]);

        // Generate signal and forecast
        if (candles.length >= 200) {
          const sig = generateSignal(DISPLAY_NAMES[symbol] || symbol, 'crypto', candles, '1H');
          setSignal(sig);
          const fc = generateForecast(candles, '4H');
          setForecast(fc);
        }

        setLoading(false);

        // Wait for DOM to render, then create chart
        await new Promise((r) => setTimeout(r, 300));
        if (cancelled || !chartContainerRef.current) return;

        // Import lightweight-charts dynamically
        const lc = await import('lightweight-charts');
        if (cancelled || !chartContainerRef.current) return;

        // Clear container content
        if (chartContainerRef.current) {
          chartContainerRef.current.innerHTML = '';
        }

        const containerWidth = chartContainerRef.current.clientWidth || 800;

        const chart = lc.createChart(chartContainerRef.current, {
          width: containerWidth,
          height: 420,
          layout: {
            background: { type: lc.ColorType.Solid, color: '#FFFFFF' },
            textColor: '#64748B',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: '#F1F5F9' },
            horzLines: { color: '#F1F5F9' },
          },
          crosshair: { mode: lc.CrosshairMode.Normal },
          rightPriceScale: { borderColor: '#E2E8F0' },
          timeScale: { borderColor: '#E2E8F0', timeVisible: true, secondsVisible: false },
        });

        chartInstanceRef.current = chart;

        // ─── CANDLESTICKS ──────────────────────
        const candleSeries = chart.addCandlestickSeries({
          upColor: '#16A34A',
          downColor: '#DC2626',
          borderDownColor: '#DC2626',
          borderUpColor: '#16A34A',
          wickDownColor: '#DC2626',
          wickUpColor: '#16A34A',
        });
        candleSeries.setData(
          candles.map((c: OHLCV) => ({
            time: c.time as lc.Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );

        // ─── EMA 50 ───────────────────────────
        if (ema50.length > 0) {
          const s = chart.addLineSeries({ color: '#2563EB', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          const off = candles.length - ema50.length;
          s.setData(ema50.map((v: number, i: number) => ({ time: candles[i + off].time as lc.Time, value: v })));
        }

        // ─── EMA 200 ──────────────────────────
        if (ema200.length > 0) {
          const s = chart.addLineSeries({ color: '#F97316', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          const off = candles.length - ema200.length;
          s.setData(ema200.map((v: number, i: number) => ({ time: candles[i + off].time as lc.Time, value: v })));
        }

        // ─── BOLLINGER BANDS ──────────────────
        const bb = calculateBollingerBands(closes);
        if (bb.length > 0) {
          const off = candles.length - bb.length;
          const su = chart.addLineSeries({ color: 'rgba(148,163,184,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, lineStyle: lc.LineStyle.Dotted });
          su.setData(bb.map((b, i) => ({ time: candles[i + off].time as lc.Time, value: b.upper })));
          const sl = chart.addLineSeries({ color: 'rgba(148,163,184,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, lineStyle: lc.LineStyle.Dotted });
          sl.setData(bb.map((b, i) => ({ time: candles[i + off].time as lc.Time, value: b.lower })));
        }

        // ─── FORECAST ─────────────────────────
        if (candles.length >= 50) {
          const fp = generateForecastPoints(candles, 8);
          if (fp.length > 0) {
            const s = chart.addLineSeries({ color: '#8B5CF6', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, lineStyle: lc.LineStyle.LargeDashed });
            s.setData(fp.map((p) => ({ time: p.time as lc.Time, value: p.value })));
          }
        }

        // ─── VOLUME ───────────────────────────
        const volSeries = chart.addHistogramSeries({ color: '#E2E8F0', priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
        chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
        volSeries.setData(candles.map((c: OHLCV) => ({
          time: c.time as lc.Time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)',
        })));

        chart.timeScale().fitContent();

        // Resize
        const ro = new ResizeObserver((entries) => {
          if (entries[0] && chartInstanceRef.current) {
            (chartInstanceRef.current as { applyOptions: (opts: { width: number }) => void })
              .applyOptions({ width: entries[0].contentRect.width });
          }
        });
        ro.observe(chartContainerRef.current);

      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load chart data');
          setLoading(false);
        }
      }
    }

    loadAndRender();

    return () => {
      cancelled = true;
    };
  }, [symbol, interval]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-primary">{displayName}</h1>
            {signal && (
              <span className={signal.type === 'LONG' ? 'badge-long' : signal.type === 'SHORT' ? 'badge-short' : 'badge-watch'}>
                {signal.type}
              </span>
            )}
          </div>
          <p className="text-xl font-mono font-semibold text-primary">
            {currentPrice > 0 ? formatPrice(currentPrice) : '—'}
          </p>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {DEFAULT_CRYPTO_SYMBOLS.slice(0, 6).map((sym) => (
            <Link
              key={sym}
              href={`/app/chart/${sym}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                sym === symbol
                  ? 'bg-accent text-white'
                  : 'bg-white border border-border text-muted hover:text-primary'
              }`}
            >
              {DISPLAY_NAMES[sym]?.split('/')[0] || sym}
            </Link>
          ))}
        </div>
      </div>

      {/* Interval Selector */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {INTERVALS.map((int) => (
          <button
            key={int.key}
            onClick={() => setChartInterval(int.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              interval === int.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted hover:text-primary'
            }`}
          >
            {int.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card !p-0 overflow-hidden">
        {loading && (
          <div className="skeleton h-[420px] !rounded-none" />
        )}
        {error && !loading && (
          <div className="h-[420px] flex items-center justify-center text-muted text-sm">
            {error}
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="chart-container"
          style={{ minHeight: loading ? '0px' : '420px', display: loading ? 'none' : 'block' }}
        />
      </div>

      {/* Indicator Panels — Advanced Mode */}
      {userMode === 'advanced' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-compact">
            <p className="text-xs text-muted mb-1">RSI (14)</p>
            <p className={`text-lg font-mono font-bold ${
              lastRSI && lastRSI > 70 ? 'text-danger' :
              lastRSI && lastRSI < 30 ? 'text-success' : 'text-primary'
            }`}>
              {lastRSI ? lastRSI.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {lastRSI && lastRSI > 70 ? 'Overbought' : lastRSI && lastRSI < 30 ? 'Oversold' : 'Neutral'}
            </p>
          </div>

          <div className="card-compact">
            <p className="text-xs text-muted mb-1">MACD</p>
            <p className={`text-lg font-mono font-bold ${
              lastMACD && lastMACD.histogram > 0 ? 'text-success' : 'text-danger'
            }`}>
              {lastMACD ? lastMACD.histogram.toFixed(4) : '—'}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {lastMACD ? (lastMACD.histogram > 0 ? 'Bullish momentum' : 'Bearish momentum') : '—'}
            </p>
          </div>

          <div className="card-compact">
            <p className="text-xs text-muted mb-1">EMA Cross</p>
            <p className={`text-lg font-mono font-bold ${emaCross === 'Golden' ? 'text-success' : 'text-danger'}`}>
              {emaCross}
            </p>
            <p className="text-xs text-muted mt-0.5">EMA 50/200 status</p>
          </div>

          <div className="card-compact">
            <p className="text-xs text-muted mb-1">ATR (14)</p>
            <p className="text-lg font-mono font-bold text-primary">
              {lastATR > 0 ? formatPrice(lastATR) : '—'}
            </p>
            <p className="text-xs text-muted mt-0.5">Volatility measure</p>
          </div>
        </div>
      )}

      {/* Forecast Card */}
      {forecast && (
        <div className="card">
          <h2 className="text-sm font-semibold text-primary mb-3">AI Trend Forecast</h2>
          <div className="flex items-center gap-4 mb-3">
            <span className={`text-lg font-bold ${
              forecast.direction === 'Bullish' ? 'text-success' :
              forecast.direction === 'Bearish' ? 'text-danger' : 'text-muted'
            }`}>
              {forecast.direction}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    forecast.direction === 'Bullish' ? 'bg-success' :
                    forecast.direction === 'Bearish' ? 'bg-danger' : 'bg-muted'
                  }`}
                  style={{ width: `${forecast.confidence}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted">{forecast.confidence}%</span>
            </div>
          </div>
          <p className="text-sm text-muted">
            Price target ({forecast.horizon}): <span className="font-mono font-medium text-primary">{formatPrice(forecast.priceTarget)}</span>
          </p>
          <p className="text-xs text-amber-600 mt-3 pt-3 border-t border-border/50">
            ⚠️ Signals are based on technical analysis patterns. Trading involves risk. Past performance does not guarantee future results.
          </p>
        </div>
      )}

      {/* Current Signal */}
      {signal && signal.type !== 'WATCH' && (
        <SignalCard signal={signal} />
      )}
    </div>
  );
}
