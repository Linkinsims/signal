import { NextResponse } from 'next/server';

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

// Helper to fetch a single quote from Alpha Vantage
async function fetchQuote(symbol: string) {
  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  
  if (data['Global Quote']) {
    const q = data['Global Quote'];
    return {
      symbol: symbol,
      shortName: symbol === 'QQQ' ? 'NASDAQ 100' : symbol === 'DIA' ? 'Dow Jones (US30)' : symbol === 'SPY' ? 'S&P 500' : symbol,
      price: parseFloat(q['05. price']),
      change: parseFloat(q['09. change']),
      changePercent: parseFloat(q['10. change percent'].replace('%', '')),
      volume: parseFloat(q['06. volume']),
      high: parseFloat(q['03. high']),
      low: parseFloat(q['04. low']),
    };
  }
  return null;
}

export async function GET(request: Request) {
  try {
    // We use ETFs because direct Indices (^IXIC) are blocked on Alpha Vantage free tier
    const symbols = ['QQQ', 'DIA', 'SPY', 'AAPL', 'MSFT', 'TSLA'];
    
    // Fetch all quotes. On the demo key, only IBM works, so this will return rate limits if they haven't set their key.
    const quotes = await Promise.all(symbols.map(s => fetchQuote(s)));
    const validQuotes = quotes.filter(q => q !== null && !isNaN(q.price));

    if (validQuotes.length === 0) {
      return NextResponse.json(
        { error: 'Alpha Vantage API requires a free API key. Add ALPHA_VANTAGE_KEY to Vercel.' },
        { status: 429 }
      );
    }

    return NextResponse.json(validQuotes);
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
