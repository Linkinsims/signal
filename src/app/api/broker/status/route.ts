import { NextResponse } from 'next/server';
import { getBrokerSnapshot } from '@/lib/broker';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'demo';
  const snapshot = await getBrokerSnapshot(userId);
  return NextResponse.json(snapshot || { connected: false });
}
