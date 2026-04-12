// Backtesting Engine
import { OHLCV } from './indicators';
import { generateSignal, Signal } from './signals';
import { fetchKlines, DISPLAY_NAMES } from './binance';

export interface BacktestConfig {
  symbol: string;
  interval: string;
  startDate?: number;   // Unix timestamp
  endDate?: number;
  signalType: 'all' | 'LONG' | 'SHORT';
  initialCapital: number;
  riskPerTrade: number; // Percentage of capital to risk per trade (e.g. 2)
}

export interface BacktestTrade {
  signalIndex: number;
  type: 'LONG' | 'SHORT';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number;
  exitReason: 'tp' | 'sl' | 'timeout';
  pnl: number;
  pnlPercent: number;
  rr: number;
  timestamp: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: BacktestTrade[];
  stats: {
    totalSignals: number;
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    avgRR: number;
    totalPnl: number;
    totalPnlPercent: number;
    maxDrawdown: number;
    bestTrade: number;
    worstTrade: number;
    profitFactor: number;
  };
  equityCurve: { time: number; equity: number }[];
  completedAt: number;
}

// Simulate whether TP or SL gets hit first
function simulateTradeOutcome(
  candles: OHLCV[],
  entryIndex: number,
  entry: number,
  sl: number,
  tp: number,
  type: 'LONG' | 'SHORT',
  maxBars: number = 50
): { exitPrice: number; exitReason: 'tp' | 'sl' | 'timeout' } {
  for (let i = entryIndex + 1; i < Math.min(candles.length, entryIndex + maxBars); i++) {
    const candle = candles[i];

    if (type === 'LONG') {
      // Check SL first (worse scenario)
      if (candle.low <= sl) return { exitPrice: sl, exitReason: 'sl' };
      if (candle.high >= tp) return { exitPrice: tp, exitReason: 'tp' };
    } else {
      // SHORT
      if (candle.high >= sl) return { exitPrice: sl, exitReason: 'sl' };
      if (candle.low <= tp) return { exitPrice: tp, exitReason: 'tp' };
    }
  }

  // Timeout — exit at last candle close
  const exitIdx = Math.min(candles.length - 1, entryIndex + maxBars);
  return { exitPrice: candles[exitIdx].close, exitReason: 'timeout' };
}

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  // Fetch historical candles
  const candles = await fetchKlines(config.symbol, config.interval, 1000);

  if (candles.length < 200) {
    throw new Error('Not enough historical data for backtesting (need 200+ candles)');
  }

  const trades: BacktestTrade[] = [];
  const displayName = DISPLAY_NAMES[config.symbol] || config.symbol;
  let equity = config.initialCapital;
  const equityCurve: { time: number; equity: number }[] = [{ time: candles[200].time, equity }];

  // Slide window over candles generating signals
  for (let i = 200; i < candles.length - 50; i += 3) {
    // Use candles up to index i to generate signal
    const windowCandles = candles.slice(Math.max(0, i - 200), i + 1);
    const signal = generateSignal(displayName, 'crypto', windowCandles, '1H');

    if (signal.type === 'WATCH') continue;
    if (config.signalType !== 'all' && signal.type !== config.signalType) continue;

    const entry = candles[i].close;
    const sl = signal.stopLoss;
    const tp = signal.takeProfit;

    if (!sl || !tp || sl === 0 || tp === 0) continue;

    // Simulate trade
    const outcome = simulateTradeOutcome(candles, i, entry, sl, tp, signal.type);

    let pnl: number;
    if (signal.type === 'LONG') {
      pnl = outcome.exitPrice - entry;
    } else {
      pnl = entry - outcome.exitPrice;
    }

    const riskAmount = Math.abs(entry - sl);
    const rr = riskAmount > 0 ? pnl / riskAmount : 0;
    const positionSize = (equity * (config.riskPerTrade / 100)) / riskAmount;
    const dollarPnl = pnl * positionSize;
    const pnlPercent = equity > 0 ? (dollarPnl / equity) * 100 : 0;

    equity += dollarPnl;

    trades.push({
      signalIndex: i,
      type: signal.type as 'LONG' | 'SHORT',
      entry,
      stopLoss: sl,
      takeProfit: tp,
      exitPrice: outcome.exitPrice,
      exitReason: outcome.exitReason,
      pnl: dollarPnl,
      pnlPercent,
      rr,
      timestamp: candles[i].time,
    });

    equityCurve.push({ time: candles[i].time, equity });

    // Skip ahead past this trade
    i += 5;
  }

  // Calculate stats
  const wins = trades.filter(t => t.pnl > 0).length;
  const losses = trades.filter(t => t.pnl <= 0).length;
  const totalPnl = equity - config.initialCapital;
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));

  // Max drawdown
  let peak = config.initialCapital;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const dd = ((peak - point.equity) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    config,
    trades,
    stats: {
      totalSignals: trades.length,
      totalTrades: trades.length,
      wins,
      losses,
      winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
      avgRR: trades.length > 0 ? trades.reduce((s, t) => s + t.rr, 0) / trades.length : 0,
      totalPnl,
      totalPnlPercent: ((totalPnl) / config.initialCapital) * 100,
      maxDrawdown,
      bestTrade: trades.length > 0 ? Math.max(...trades.map(t => t.pnlPercent)) : 0,
      worstTrade: trades.length > 0 ? Math.min(...trades.map(t => t.pnlPercent)) : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    },
    equityCurve,
    completedAt: Date.now(),
  };
}
