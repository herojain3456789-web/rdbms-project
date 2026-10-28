import { NextResponse } from 'next/server';
import { initDatabase, getDbStatus } from '@/lib/db';

export async function POST() {
  try {
    const status = await getDbStatus();
    if (!status.connected) {
      return NextResponse.json(
        { error: `Database not connected: ${status.message}` },
        { status: 503 }
      );
    }

    const res = await initDatabase();
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Error initializing database:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initialize database tables' },
      { status: 500 }
    );
  }
}
