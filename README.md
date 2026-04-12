# SIGNAL — Market Intelligence Platform

Professional market signal and trend prediction platform covering Crypto, Stocks, and Forex.

## Features

- **Live Signal Engine** — Confluence-based signals every 30s across Crypto, Stocks & Forex
- **Professional Charts** — TradingView-powered candlestick charts with EMA, Bollinger, MACD overlays
- **AI Trend Forecasts** — Weighted 6-component scoring with honest confidence caps (max 82%)
- **Portfolio Tracker** — Local-only storage, live P&L, allocation breakdown
- **Smart Alerts** — Custom price/indicator alerts with browser notifications
- **Adaptive Modes** — Beginner (simplified) and Advanced (full technical suite)
- **Currency Toggle** — Live USD/ZAR conversion with 60s refresh

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Charts:** TradingView Lightweight Charts
- **State:** Zustand
- **Data Sources:**
  - Crypto: Binance WebSocket + REST API (free, no key required)
  - Stocks: Alpha Vantage (free tier)
  - Forex: exchangerate.host (free)

## Getting Started

1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-username/signal-platform.git
   cd signal-platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Alpha Vantage key
   ```

4. **Run locally:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

5. **Deploy to Vercel:**
   - Push to GitHub
   - Connect repository to Vercel
   - Add env vars in Vercel dashboard
   - Deploy

## Privacy

- No login, no database, no auth
- Portfolio & preferences stored in localStorage only
- No user tracking or analytics
- License key validated client-side

## Disclaimer

SIGNAL provides market analysis tools based on technical indicators. Trading involves substantial risk. Past performance does not guarantee future results. Signals are not financial advice.
