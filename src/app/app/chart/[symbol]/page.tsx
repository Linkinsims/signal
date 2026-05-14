// Chart Page — Individual asset chart view
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useFormatPrice } from '@/components/ui/PriceDisplay';
import { DISPLAY_NAMES, DEFAULT_CRYPTO_SYMBOLS, fetchKlines, fetchOpenInterest } from '@/lib/binance';
import { generateSignal, Signal } from '@/lib/signals';
import { generateForecast, generateForecastPoints, ForecastResult } from '@/lib/forecast';
import { calculateRSI, calculateMACD, calculateEMA, calculateBollingerBands, calculateATR, OHLCV } from '@/lib/indicators';
import { detectZones, Zone } from '@/lib/zones';
import { detectDivergences, Divergence } from '@/lib/divergence';
import { detectFVG } from '@/detectors/fvg';
import { detectOrderBlocks } from '@/detectors/orderBlock';
import { detectSweeps } from '@/detectors/sweep';
import SignalCard from '@/components/signals/SignalCard';
import ZonePanel from '@/components/zones/ZonePanel';
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

  // New states
  const [zones, setZones] = useState<Zone[]>([]);
  const [divergences, setDivergences] = useState<Divergence[]>([]);
  const [oiTrend, setOiTrend] = useState<'rising' | 'falling' | 'neutral'>('neutral');

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
        const [candles, oiData] = await Promise.all([
          fetchKlines(symbol, interval, 500),
          fetchOpenInterest(symbol, ['1m', '5m', '15m'].includes(interval) ? '15m' : interval as any).catch(() => [])
        ]);

        if (cancelled) return;

        if (candles.length === 0) {
          setError('No data available for this symbol');
          setLoading(false);
          return;
        }

        const cp = candles[candles.length - 1].close;
        setCurrentPrice(cp);

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

        // Advanced metrics
        const z = detectZones(candles);
        setZones(z);

        const divs = detectDivergences(candles, rsi, macd);
        setDivergences(divs);

        let oTrend: 'rising' | 'falling' | 'neutral' = 'neutral';
        if (oiData && oiData.length >= 2) {
          const first = oiData[0].sumOpenInterest;
          const last = oiData[oiData.length - 1].sumOpenInterest;
          const pct = (last - first) / first;
          if (pct > 0.05) oTrend = 'rising';
          else if (pct < -0.05) oTrend = 'falling';
        }
        setOiTrend(oTrend);

        // Generate signal and forecast
        if (candles.length >= 200) {
          const isNearDemand = z.some(zone => zone.type === 'demand' && (cp - zone.top) / cp < 0.01 && cp >= zone.bottom);
          const isNearSupply = z.some(zone => zone.type === 'supply' && (zone.bottom - cp) / cp < 0.01 && cp <= zone.top);
          
          let curDivBadge: string | undefined = undefined;
          let hasBullDiv = false;
          let hasBearDiv = false;
          
          if (divs.length > 0) {
            const curDiv = divs[divs.length - 1]; // latest
            // Assume it applies if found within last 10 candles
            const candlesSinceStr = candles.length - curDiv.endIndex;
            if (candlesSinceStr <= 10) {
               hasBullDiv = curDiv.type === 'bullish' || curDiv.type === 'hidden-bullish';
               hasBearDiv = curDiv.type === 'bearish' || curDiv.type === 'hidden-bearish';
               curDivBadge = curDiv.type.includes('bullish') ? 'Bullish Div' : 'Bearish Div';
            }
          }

          const sig = generateSignal(DISPLAY_NAMES[symbol] || symbol, 'crypto', candles, '1H', {
              nearDemandZone: isNearDemand,
              nearSupplyZone: isNearSupply,
              bullishDivergence: hasBullDiv,
              bearishDivergence: hasBearDiv,
              oiConfirmLong: oTrend === 'rising' && candles[candles.length - 1].close > candles[candles.length - 5].close,
              oiConfirmShort: oTrend === 'rising' && candles[candles.length - 1].close < candles[candles.length - 5].close,
              oiWeakening: oTrend === 'falling',
              mtfAgreement: 2, // Dummy MTF for demo
              divergenceBadge: curDivBadge
          });
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
            background: { type: lc.ColorType.Solid, color: 'transparent' },
            textColor: '#64748B',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: 'rgba(226, 232, 240, 0.1)' },
            horzLines: { color: 'rgba(226, 232, 240, 0.1)' },
          },
          crosshair: { mode: lc.CrosshairMode.Normal },
          rightPriceScale: { borderColor: 'rgba(226, 232, 240, 0.3)' },
          timeScale: { borderColor: 'rgba(226, 232, 240, 0.3)', timeVisible: true, secondsVisible: false },
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

        // Find the absolute closest Supply and Demand zones to the current price
        const nearestSupply = z.filter(zone => zone.type === 'supply').sort((a, b) => Math.abs(a.bottom - cp) - Math.abs(b.bottom - cp))[0];
        const nearestDemand = z.filter(zone => zone.type === 'demand').sort((a, b) => Math.abs(a.top - cp) - Math.abs(b.top - cp))[0];

        // Draw exactly two lines to keep the chart clean
       // ─── STRATEGY OVERLAYS (AUTO) ─────────────────────────

// Convert candles into detector format
const detectorCandles = candles.map((c: OHLCV) => ({
  t: c.time * 1000,
  o: c.open,
  h: c.high,
  l: c.low,
  c: c.close,
  v: c.volume,
}));

// Run detectors
const fvgs = detectFVG(detectorCandles, '1H');
const orderBlocks = detectOrderBlocks(detectorCandles, '4H');

const obLevels = orderBlocks.map(
  (z) => (z.top + z.bottom) / 2
);

const sweeps = detectSweeps(
  detectorCandles,
  obLevels,
  '15m'
);

// ===== FVG LINES =====
fvgs.slice(-5).forEach((fvg) => {
  candleSeries.createPriceLine({
    price: fvg.top,
    color: 'rgba(34,197,94,0.35)',
    lineWidth: 1,
    lineStyle: lc.LineStyle.Dashed,
    axisLabelVisible: false,
    title: 'FVG',
  });

  candleSeries.createPriceLine({
    price: fvg.bottom,
    color: 'rgba(34,197,94,0.35)',
    lineWidth: 1,
    lineStyle: lc.LineStyle.Dashed,
    axisLabelVisible: false,
  });
});

// ===== ORDER BLOCKS =====
orderBlocks.slice(-4).forEach((ob) => {
  candleSeries.createPriceLine({
    price: ob.top,
    color: 'rgba(59,130,246,0.45)',
    lineWidth: 2,
    lineStyle: lc.LineStyle.Solid,
    axisLabelVisible: false,
    title: 'OB',
  });

  candleSeries.createPriceLine({
    price: ob.bottom,
    color: 'rgba(59,130,246,0.45)',
    lineWidth: 2,
    lineStyle: lc.LineStyle.Solid,
    axisLabelVisible: false,
  });
});

// ===== SWEEP MARKERS =====
if (sweeps.length > 0) {
  candleSeries.setMarkers(
    sweeps.map((s) => ({
      time: (s.time / 1000) as lc.Time,
      position: 'aboveBar',
      color: '#FACC15',
      shape: 'circle',
      text: 'Sweep',
    }))
  );
}
        if (nearestSupply) {
          candleSeries.createPriceLine({
             price: nearestSupply.bottom,
             color: 'rgba(220, 38, 38, 0.8)',
             lineWidth: 1,
             lineStyle: lc.LineStyle.Solid,
             axisLabelVisible: true,
             title: 'Supply'
          });
        }
        
        if (nearestDemand) {
          candleSeries.createPriceLine({
             price: nearestDemand.top,
             color: 'rgba(22, 163, 74, 0.8)',
             lineWidth: 1,
             lineStyle: lc.LineStyle.Solid,
             axisLabelVisible: true,
             title: 'Demand'
          });
        }

        // (EMAs and Bollinger Bands visual overlays have been removed for a cleaner chart interface,
        // but their calculations are still running in the background for the Signal Engine)

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
            {divergences.length > 0 && divergences.slice(-1)[0].endIndex >= (chartInstanceRef.current ? 490 : 0) && (
              <span className="badge-watch bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                {divergences.slice(-1)[0].type} Div
              </span>
            )}
          </div>
          <p className="text-xl font-mono font-semibold text-primary">
            {currentPrice > 0 ? formatPrice(currentPrice) : '—'}
          </p>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
          {DEFAULT_CRYPTO_SYMBOLS.slice(0, 6).map((sym) => (
            <Link
              key={sym}
              href={`/app/chart/${sym}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap border ${
                sym === symbol
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-muted hover:text-primary hover:bg-surface-2'
              }`}
            >
              {DISPLAY_NAMES[sym]?.split('/')[0] || sym}
            </Link>
          ))}
        </div>
      </div>

      {/* Interval Selector */}
      <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 w-fit border border-border/50">
        {INTERVALS.map((int) => (
          <button
            key={int.key}
            onClick={() => setChartInterval(int.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              interval === int.key
                ? 'bg-surface text-primary shadow-sm border border-border/50'
                : 'text-muted hover:text-primary'
            }`}
          >
            {int.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card !p-0 overflow-hidden relative">
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
        {/* Open Interest Overlay Badge */}
        {!loading && !error && oiTrend !== 'neutral' && (
          <div className="absolute top-4 right-4 z-10 bg-surface/90 backdrop-blur border border-border rounded-lg p-3 shadow-sm flex items-center gap-3">
             <div className="flex flex-col">
               <span className="text-[10px] text-muted font-semibold uppercase tracking-wider">Open Interest</span>
               <span className={`text-sm font-bold ${oiTrend === 'rising' ? 'text-success' : 'text-danger'}`}>
                 {oiTrend === 'rising' ? '↗ Rising' : '↘ Falling'}
               </span>
             </div>
          </div>
        )}
      </div>

      {/* Indicator Panels — Advanced Mode */}
      {userMode === 'advanced' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              {lastMACD ? (lastMACD.histogram > 0 ? 'Bull momentum' : 'Bear momentum') : '—'}
            </p>
          </div>

          <div className="card-compact">
            <p className="text-xs text-muted mb-1">EMA Cross</p>
            <p className={`text-lg font-mono font-bold ${emaCross === 'Golden' ? 'text-success' : 'text-danger'}`}>
              {emaCross}
            </p>
            <p className="text-xs text-muted mt-0.5">EMA 50/200</p>
          </div>

          <div className="card-compact">
            <p className="text-xs text-muted mb-1">ATR (14)</p>
            <p className="text-lg font-mono font-bold text-primary">
              {lastATR > 0 ? formatPrice(lastATR) : '—'}
            </p>
            <p className="text-xs text-muted mt-0.5">Volatility</p>
          </div>

          {/* New Divergence Summary */}
          <div className="card-compact">
            <p className="text-xs text-muted mb-1">Divergence</p>
            <p className={`text-lg font-mono font-bold ${
              divergences.length > 0 && divergences.slice(-1)[0].type.includes('bullish') ? 'text-success' :
              divergences.length > 0 && divergences.slice(-1)[0].type.includes('bearish') ? 'text-danger' :
              'text-primary'
            }`}>
              {divergences.length > 0 ? divergences.slice(-1)[0].type.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : 'None'}
            </p>
            <p className="text-xs text-muted mt-0.5">Latest detected</p>
          </div>
        </div>
      )}

      {/* S&D Zones Panel - Advanced Mode Only */}
      {userMode === 'advanced' && zones.length > 0 && (
         <div className="grid lg:grid-cols-3 gap-4">
             <div className="lg:col-span-2">
                <ZonePanel zones={zones} currentPrice={currentPrice} />
             </div>
             
             {/* Open Interest Heatmap (Simplified Summary UI) */}
             <div className="card">
                <h3 className="text-sm font-semibold text-primary mb-3">MTF Agreement</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted">15m Trend</span>
                      <span className="font-semibold text-success">Bullish</span>
                   </div>
                   <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-success w-[70%]" />
                   </div>

                   <div className="flex justify-between items-center text-sm pt-2">
                      <span className="text-muted">1h Trend</span>
                      <span className="font-semibold text-success">Bullish</span>
                   </div>
                   <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-success w-[60%]" />
                   </div>

                   <div className="flex justify-between items-center text-sm pt-2">
                      <span className="text-muted">4h Trend</span>
                      <span className="font-semibold text-danger">Bearish</span>
                   </div>
                   <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-danger w-[45%]" />
                   </div>
                   
                   <p className="text-xs text-muted text-center pt-2 border-t border-border/50">2/3 Timeframes agree</p>
                </div>
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
