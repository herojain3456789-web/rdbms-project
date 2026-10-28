import { NextResponse } from 'next/server';
import { getDbStatus, query } from '@/lib/db';

export async function GET() {
  try {
    const status = await getDbStatus();
    
    let tableCounts: Record<string, number> = { Books: 0, Members: 0, Loans: 0, Categories: 0 };
    if (status.connected) {
      try {
        const [b, m, l, c]: any = await Promise.all([
          query('SELECT COUNT(*) as cnt FROM Books').catch(() => [{ cnt: 0 }]),
          query('SELECT COUNT(*) as cnt FROM Members').catch(() => [{ cnt: 0 }]),
          query('SELECT COUNT(*) as cnt FROM Loans').catch(() => [{ cnt: 0 }]),
          query('SELECT COUNT(*) as cnt FROM Categories').catch(() => [{ cnt: 0 }]),
        ]);
        tableCounts = {
          Books: Number(b[0]?.cnt || 0),
          Members: Number(m[0]?.cnt || 0),
          Loans: Number(l[0]?.cnt || 0),
          Categories: Number(c[0]?.cnt || 0),
        };
      } catch {}
    }

    return NextResponse.json({
      status: status.connected ? 'ok' : 'disconnected',
      version: '1.0.0',
      system: 'BOOKSTACK — Library Management & Book Tracking System',
      dbStatus: status,
      tableCounts,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Health check error' }, { status: 500 });
  }
}
