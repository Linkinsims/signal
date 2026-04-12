// Stock Data Proxy API Route
import { NextResponse } from 'next/server';

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

// Simple queue to respect 5 calls/min limit
let lastCallTime = 0;
const MIN_INTERVAL = 12500; // 12.5 seconds between calls

async function throttledFetch(url: string) {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL - elapsed));
  }
  lastCallTime = Date.now();
  return fetch(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'AAPL';
  const fn = searchParams.get('function') || 'TIME_SERIES_INTRADAY';
  const interval = searchParams.get('interval') || '60min';

  try {
    let url: string;

    if (fn === 'GLOBAL_QUOTE') {
      url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    } else if (fn === 'TIME_SERIES_DAILY') {
      url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${ALPHA_VANTAGE_KEY}`;
    } else {
      url = `${BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&outputsize=full&apikey=${ALPHA_VANTAGE_KEY}`;
    }

    const res = await throttledFetch(url);
    if (!res.ok) throw new Error(`Alpha Vantage returned ${res.status}`);
    const data = await res.json();

    // Check for API limit message
    if (data['Note'] || data['Information']) {
      return NextResponse.json(
        { error: 'API rate limit reached. Please try again in a minute.', raw: data },
        { status: 429 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
