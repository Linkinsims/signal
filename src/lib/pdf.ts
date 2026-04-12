// PDF Export Engine using jsPDF
import { jsPDF } from 'jspdf';
import { Signal } from './signals';
import { BacktestResult } from './backtester';

// ──── SIGNAL REPORT PDF ────────────────────────────────
export function exportSignalPDF(signal: Signal, extras?: {
  mtf?: { '15m': string; '1H': string; '4H': string };
  zones?: string;
  divergence?: string;
}) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(37, 99, 235); // accent blue
  doc.rect(0, 0, w, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNAL', 15, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Market Intelligence Report', 15, 28);
  doc.text(new Date(signal.timestamp).toLocaleString(), w - 15, 28, { align: 'right' });

  y = 50;

  // Signal type badge
  doc.setTextColor(0, 0, 0);
  const badgeColor = signal.type === 'LONG' ? [22, 163, 74] : signal.type === 'SHORT' ? [220, 38, 38] : [100, 116, 139];
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(15, y - 5, 30, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(signal.type, 30, y + 2, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.text(signal.asset, 50, y + 2);

  y += 20;

  // Key metrics table
  const metrics = [
    ['Asset', signal.asset],
    ['Signal Type', signal.type],
    ['Confidence', `${signal.confidence}%`],
    ['Entry Price', `$${signal.entry.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
    ['Stop Loss', `$${signal.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
    ['Take Profit', `$${signal.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
    ['Risk/Reward', `1:${signal.riskReward.toFixed(1)}`],
    ['Timeframe', signal.timeframe],
  ];

  if (extras?.mtf) {
    metrics.push(['MTF 15m', extras.mtf['15m']]);
    metrics.push(['MTF 1H', extras.mtf['1H']]);
    metrics.push(['MTF 4H', extras.mtf['4H']]);
  }
  if (extras?.zones) metrics.push(['S&D Zone', extras.zones]);
  if (extras?.divergence) metrics.push(['Divergence', extras.divergence]);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Signal Details', 15, y);
  y += 8;

  doc.setFontSize(9);
  for (const [label, value] of metrics) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(String(value), 80, y);
    y += 7;
  }

  y += 5;

  // Reason
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Signal Reason', 15, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  const reasonLines = doc.splitTextToSize(signal.reason, w - 30);
  doc.text(reasonLines, 15, y);
  y += reasonLines.length * 5 + 10;

  // Indicator values
  if (signal.indicators) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Indicator Values', 15, y);
    y += 8;

    doc.setFontSize(9);
    const indMetrics = [
      ['RSI (14)', signal.indicators.rsi?.toFixed(1) || '—'],
      ['MACD Histogram', signal.indicators.macdHistogram?.toFixed(4) || '—'],
      ['EMA 50', signal.indicators.ema50?.toFixed(2) || '—'],
      ['EMA 200', signal.indicators.ema200?.toFixed(2) || '—'],
      ['Bollinger Upper', signal.indicators.bbUpper?.toFixed(2) || '—'],
      ['Bollinger Lower', signal.indicators.bbLower?.toFixed(2) || '—'],
    ];
    for (const [label, value] of indMetrics) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(label, 15, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(value, 80, y);
      y += 7;
    }
  }

  // Disclaimer
  y = Math.max(y + 10, 240);
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, w - 15, y);
  y += 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  const disclaimer = 'DISCLAIMER: This report is generated from technical analysis indicators and algorithms. It does not constitute financial advice. Trading involves substantial risk of financial loss. Past performance does not guarantee future results. Always do your own research and consult a licensed financial advisor before making investment decisions. Never trade with money you cannot afford to lose.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, w - 30);
  doc.text(disclaimerLines, 15, y);

  doc.save(`SIGNAL_${signal.asset.replace('/', '_')}_${signal.type}_${Date.now()}.pdf`);
}

// ──── BACKTEST REPORT PDF ──────────────────────────────
export function exportBacktestPDF(result: BacktestResult) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, w, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNAL', 15, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Backtest Report', 15, 28);
  doc.text(new Date(result.completedAt).toLocaleString(), w - 15, 28, { align: 'right' });

  y = 50;

  // Config
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Configuration', 15, y);
  y += 10;
  doc.setFontSize(9);
  const config = [
    ['Symbol', result.config.symbol],
    ['Interval', result.config.interval],
    ['Signal Filter', result.config.signalType],
    ['Initial Capital', `$${result.config.initialCapital.toLocaleString()}`],
    ['Risk Per Trade', `${result.config.riskPerTrade}%`],
  ];
  for (const [label, value] of config) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(value, 80, y);
    y += 7;
  }

  y += 10;

  // Stats
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Results', 15, y);
  y += 10;

  const stats = [
    ['Total Trades', String(result.stats.totalTrades)],
    ['Win Rate', `${result.stats.winRate.toFixed(1)}%`],
    ['Wins / Losses', `${result.stats.wins} / ${result.stats.losses}`],
    ['Avg R:R', result.stats.avgRR.toFixed(2)],
    ['Total P&L', `$${result.stats.totalPnl.toFixed(2)} (${result.stats.totalPnlPercent.toFixed(1)}%)`],
    ['Max Drawdown', `${result.stats.maxDrawdown.toFixed(1)}%`],
    ['Profit Factor', result.stats.profitFactor === Infinity ? '∞' : result.stats.profitFactor.toFixed(2)],
    ['Best Trade', `${result.stats.bestTrade.toFixed(2)}%`],
    ['Worst Trade', `${result.stats.worstTrade.toFixed(2)}%`],
  ];

  doc.setFontSize(9);
  for (const [label, value] of stats) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(value, 80, y);
    y += 7;
  }

  // Hypothetical disclaimer
  y += 10;
  doc.setFillColor(255, 243, 205);
  doc.roundedRect(15, y - 3, w - 30, 20, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 80, 0);
  doc.text('⚠️ HYPOTHETICAL PERFORMANCE', 20, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Past results do not guarantee future returns. This is a simulation only.', 20, y + 12);

  // Disclaimer
  y = 260;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  const disclaimer = 'DISCLAIMER: These are hypothetical backtest results based on historical data. Real trading involves slippage, fees, and market impact not accounted for here. This is not financial advice.';
  const lines = doc.splitTextToSize(disclaimer, w - 30);
  doc.text(lines, 15, y);

  doc.save(`SIGNAL_Backtest_${result.config.symbol}_${Date.now()}.pdf`);
}

// ──── PORTFOLIO SNAPSHOT PDF ───────────────────────────
export function exportPortfolioPDF(holdings: { symbol: string; qty: number; avgBuy: number; current: number; pnl: number; pnlPct: number }[]) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, w, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNAL', 15, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Portfolio Snapshot', 15, 28);
  doc.text(new Date().toLocaleString(), w - 15, 28, { align: 'right' });

  y = 50;

  // Summary
  const totalValue = holdings.reduce((s, h) => s + h.current * h.qty, 0);
  const totalPnl = holdings.reduce((s, h) => s + h.pnl, 0);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 15, y);
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Total Value', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 80, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Total P&L', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(totalPnl >= 0 ? 22 : 220, totalPnl >= 0 ? 163 : 38, totalPnl >= 0 ? 74 : 38);
  doc.text(`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, 80, y);
  y += 15;

  // Table header
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const cols = [15, 55, 80, 110, 140, 170];
  doc.text('Asset', cols[0], y);
  doc.text('Qty', cols[1], y);
  doc.text('Avg Buy', cols[2], y);
  doc.text('Current', cols[3], y);
  doc.text('P&L', cols[4], y);
  doc.text('P&L %', cols[5], y);
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, w - 15, y);
  y += 5;

  // Rows
  doc.setFontSize(8);
  for (const h of holdings) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(h.symbol, cols[0], y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(h.qty), cols[1], y);
    doc.text(`$${h.avgBuy.toFixed(2)}`, cols[2], y);
    doc.text(`$${h.current.toFixed(2)}`, cols[3], y);
    doc.setTextColor(h.pnl >= 0 ? 22 : 220, h.pnl >= 0 ? 163 : 38, h.pnl >= 0 ? 74 : 38);
    doc.text(`${h.pnl >= 0 ? '+' : ''}$${h.pnl.toFixed(2)}`, cols[4], y);
    doc.text(`${h.pnlPct >= 0 ? '+' : ''}${h.pnlPct.toFixed(1)}%`, cols[5], y);
    y += 7;
  }

  doc.save(`SIGNAL_Portfolio_${Date.now()}.pdf`);
}
