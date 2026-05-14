export type BrokerProvider = 'mt5' | 'oanda' | 'binance';

export interface BrokerConnection {
  provider: BrokerProvider;
  accountId: string;
  apiKey: string;
  apiSecret: string;
}

/** Temporary placeholder store adapter. Replace with DB persistence. */
const connections = new Map<string, BrokerConnection>();

export function saveBrokerConnection(userId: string, connection: BrokerConnection) {
  connections.set(userId, connection);
  return { ok: true };
}

export function getBrokerConnection(userId: string) {
  return connections.get(userId) ?? null;
}

export async function getBrokerSnapshot(userId: string) {
  const conn = getBrokerConnection(userId);
  if (!conn) return null;
  return {
    provider: conn.provider,
    accountId: conn.accountId,
    balance: 10000,
    equity: 10245.32,
    openTrades: 2,
    positions: [
      { symbol: 'EURUSD', side: 'LONG', pnl: 125.5 },
      { symbol: 'GBPUSD', side: 'SHORT', pnl: -42.1 }
    ]
  };
}
