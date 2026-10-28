import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const sql = `
      SELECT b.book_id, b.title, b.isbn,
             b.total_copies - COALESCE(al.cnt, 0) as available_copies,
             b.total_copies
      FROM Books b
      LEFT JOIN (
        SELECT book_id, COUNT(*) as cnt FROM Loans WHERE return_date IS NULL GROUP BY book_id
      ) al ON b.book_id = al.book_id
      HAVING available_copies > 0
      ORDER BY b.title ASC
    `;

    const rows = await query<any[]>(sql).catch(() => []);
    return NextResponse.json({ books: rows });
  } catch (error: any) {
    console.error('Error fetching available books:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch available books' }, { status: 500 });
  }
}
