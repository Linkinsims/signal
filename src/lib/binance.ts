// Binance WebSocket Connection Manager
import { OHLCV } from './indicators';

export const DEFAULT_CRYPTO_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT',
  'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT',
];

export const DISPLAY_NAMES: Record<string, string> = {
  BTCUSDT: 'BTC/USDT',
  ETHUSDT: 'ETH/USDT',
  SOLUSDT: 'SOL/USDT',
  BNBUSDT: 'BNB/USDT',
  XRPUSDT: 'XRP/USDT',
  DOGEUSDT: 'DOGE/USDT',
  ADAUSDT: 'ADA/USDT',
  AVAXUSDT: 'AVAX/USDT',
};

type IntervalType = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
const BINANCE_REST_BASE = 'https://api.binance.com/api/v3';

// ─── Fetch Historical Klines ──────────────────────────────────────
export async function fetchKlines(
  symbol: string,
  interval: IntervalType = '1h',
  limit: number = 500
): Promise<OHLCV[]> {
  // If it's a Traditional Market (not a Crypto pair ending in USDT), intercept and fetch from Yahoo Finance V8!
  if (!symbol.toUpperCase().endsWith('USDT')) {
    // Map Binance intervals to closest Yahoo intervals
    const yhInterval = interval === '1m' ? '1m' : interval === '5m' ? '5m' : interval === '15m' ? '15m' : interval === '1h' ? '60m' : '1d';
    // Provide appropriate range to make sure we get enough candles relative to the selected interval
    const range = ['1m', '5m', '15m'].includes(yhInterval) ? '7d' : yhInterval === '60m' ? '1mo' : '1y';
    
    // Add prefix caret back if it was stripped by UI tracking
    const lookupSymbol = ['IXIC', 'DJI', 'GSPC'].includes(symbol) ? `^${symbol}` : symbol;

    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${lookupSymbol}?interval=${yhInterval}&range=${range}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Yahoo data for ${symbol}`);
    const data = await res.json();

    const result = data.chart?.result?.[0];
    if (!result || !result.timestamp) throw new Error(`Empty data returned from Yahoo for ${symbol}`);

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    const ohlcv: OHLCV[] = [];
    for (let i = 0; i < timestamps.length; i++) {
        // Yahoo sometimes returns nulls in sparse datasets
        if (quotes.close[i] === null) continue;
        
        ohlcv.push({
            time: timestamps[i],
            open: quotes.open[i],
            high: quotes.high[i],
            low: quotes.low[i],
            close: quotes.close[i],
            volume: quotes.volume[i] || 0,
        });
    }

    // Limit to requested amount, just like Binance
    return ohlcv.slice(-limit);
  }

  // Fallback to strict Binance Crypto fetching
  const url = `${BINANCE_REST_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch klines for ${symbol}`);
  const data = await res.json();

  return data.map((k: (string | number)[]) => ({
    time: Math.floor(Number(k[0]) / 1000),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

// ─── Fetch 24h Ticker for Multiple Symbols ────────────────────────
export async function fetch24hTickers(symbols?: string[]): Promise<Record<string, {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
}>> {
  const url = `${BINANCE_REST_BASE}/ticker/24hr`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch 24h tickers');
  const data = await res.json();

  const result: Record<string, {
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    volume: number;
  }> = {};

  const filterSet = symbols ? new Set(symbols) : null;

  for (const t of data) {
    if (filterSet && !filterSet.has(t.symbol)) continue;
    result[t.symbol] = {
      price: parseFloat(t.lastPrice),
      change: parseFloat(t.priceChange),
      changePercent: parseFloat(t.priceChangePercent),
      high: parseFloat(t.highPrice),
      low: parseFloat(t.lowPrice),
      volume: parseFloat(t.volume),
    };
  }

  return result;
}

// ─── Fetch Open Interest (Futures) ────────────────────────────────
export async function fetchOpenInterest(symbol: string, period: '15m' | '1h' | '4h' | '1d' = '1h'): Promise<{ time: number; sumOpenInterest: number }[]> {
  try {
    // Note: Open interest is only available on futures API
    const url = `https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=${period}&limit=50`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d: any) => ({
      time: Math.floor(d.timestamp / 1000),
      sumOpenInterest: parseFloat(d.sumOpenInterestValue)
    }));
  } catch {
    return [];
  }
}

// ─── WebSocket Manager ────────────────────────────────────────────
export interface KlineUpdate {
  symbol: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

type KlineCallback = (update: KlineUpdate) => void;

export class BinanceWSManager {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, Set<KlineCallback>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private streams: string[] = [];

  connect(symbols: string[], interval: IntervalType = '1h') {
    this.streams = symbols.map((s) => `${s.toLowerCase()}@kline_${interval}`);
    const streamStr = this.streams.join('/');
    const wsUrl = `${BINANCE_WS_BASE}/${streamStr}`;

    this.cleanup();

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Binance WS] Connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.k) {
            const k = msg.k;
            const update: KlineUpdate = {
              symbol: k.s,
              time: Math.floor(k.t / 1000),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              isClosed: k.x,
            };

            const key = `${k.s}_${interval}`;
            this.callbacks.get(key)?.forEach((cb) => cb(update));
            // Also emit to generic symbol listeners
            this.callbacks.get(k.s)?.forEach((cb) => cb(update));
          }
        } catch {
          // Skip malformed messages
        }
      };

      this.ws.onerror = () => {
        console.warn('[Binance WS] Error, reconnecting...');
      };

      this.ws.onclose = () => {
        console.log('[Binance WS] Closed, reconnecting in 5s...');
        this.reconnectTimer = setTimeout(() => this.connect(symbols, interval), 5000);
      };
    } catch {
      this.reconnectTimer = setTimeout(() => this.connect(symbols, interval), 5000);
    }
  }

  subscribe(key: string, callback: KlineCallback) {
    if (!this.callbacks.has(key)) this.callbacks.set(key, new Set());
    this.callbacks.get(key)!.add(callback);
  }

  unsubscribe(key: string, callback: KlineCallback) {
    this.callbacks.get(key)?.delete(callback);
  }

  cleanup() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}

// Global singleton
let wsManagerInstance: BinanceWSManager | null = null;

export function getBinanceWSManager(): BinanceWSManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new BinanceWSManager();
  }
  return wsManagerInstance;
}
