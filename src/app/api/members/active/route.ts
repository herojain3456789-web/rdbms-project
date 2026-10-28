import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const sql = `
      SELECT member_id, full_name, email, phone 
      FROM Members 
      WHERE membership_status = 'active' 
      ORDER BY full_name ASC
    `;
    const rows = await query<any[]>(sql).catch(() => []);
    return NextResponse.json({ members: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch active members' }, { status: 500 });
  }
}
