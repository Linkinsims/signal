// Forex Data Proxy API Route
import { NextResponse } from 'next/server';

const EXCHANGE_RATE_BASE = 'https://api.exchangerate.host';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const base = searchParams.get('base') || 'USD';
  const symbols = searchParams.get('symbols') || 'ZAR,EUR,GBP,JPY,AUD';
  const endpoint = searchParams.get('endpoint') || 'latest';

  try {
    let url: string;

    if (endpoint === 'timeseries') {
      const startDate = searchParams.get('start_date') || getDateDaysAgo(30);
      const endDate = searchParams.get('end_date') || getToday();
      url = `${EXCHANGE_RATE_BASE}/timeseries?start_date=${startDate}&end_date=${endDate}&base=${base}&symbols=${symbols}`;
    } else if (endpoint === 'convert') {
      const from = searchParams.get('from') || 'USD';
      const to = searchParams.get('to') || 'ZAR';
      const amount = searchParams.get('amount') || '1';
      url = `${EXCHANGE_RATE_BASE}/convert?from=${from}&to=${to}&amount=${amount}`;
    } else {
      url = `${EXCHANGE_RATE_BASE}/latest?base=${base}&symbols=${symbols}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`);
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    // Fallback rates if API fails
    const fallbackRates: Record<string, number> = {
      ZAR: 18.5,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
      AUD: 1.53,
    };

    return NextResponse.json({
      success: true,
      base: 'USD',
      rates: fallbackRates,
      fallback: true,
      error: error instanceof Error ? error.message : 'API unavailable',
    });
  }
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
