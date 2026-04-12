import { NextResponse } from 'next/server';

// Helper to fetch a single quote from Yahoo Finance v8 (crumb-free public API)
async function fetchYahooV8(symbol: string) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data.chart?.result?.[0]?.meta) {
      const meta = data.chart.result[0].meta;
      
      const price = meta.regularMarketPrice;
      const prevClose = meta.previousClose;
      const change = price - prevClose;
      const changePercent = (change / prevClose) * 100;

      // Clean up symbols for display
      let shortName = meta.shortName || symbol;
      if (symbol === '^IXIC') shortName = 'NASDAQ Composite';
      if (symbol === '^DJI') shortName = 'Dow Jones US30';
      if (symbol === '^GSPC') shortName = 'S&P 500';

      return {
        symbol: symbol.replace('^', ''), 
        shortName: shortName,
        price: price,
        change: change,
        changePercent: changePercent,
        volume: meta.regularMarketVolume || 0,
        high: meta.regularMarketDayHigh || price,
        low: meta.regularMarketDayLow || price,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    // We can use native exact Indices via Yahoo v8!
    const symbols = ['^IXIC', '^DJI', '^GSPC', 'AAPL', 'MSFT', 'TSLA', 'NVDA'];
    
    const quotes = await Promise.all(symbols.map(s => fetchYahooV8(s)));
    const validQuotes = quotes.filter(q => q !== null && !isNaN(q.price));

    if (validQuotes.length === 0) {
      return NextResponse.json(
        { error: 'Failed to negotiate with market data provider.' },
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
