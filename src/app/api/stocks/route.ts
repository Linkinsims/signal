import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Prevent warning logs from yahoo-finance2

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || '^IXIC,^DJI,^GSPC,AAPL,TSLA,MSFT,NVDA';
  
  try {
    const symbols = symbolsParam.split(',').map(s => s.trim());
    
    // Fetch quotes in parallel
    const quotes = await yahooFinance.quote(symbols);
    
    // Normalize data into our preferred format
    const results = quotes.map(q => ({
      symbol: q.symbol,
      shortName: q.shortName || q.longName,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      volume: q.regularMarketVolume,
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
    }));

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
