import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { toISODateString } from '@/lib/dateUtils';

export async function GET() {
  try {
    const sql = `
      SELECT l.loan_id, l.book_id, b.title, b.isbn,
             l.member_id, m.full_name, m.email,
             l.issue_date, l.due_date,
             CASE WHEN l.due_date < CURDATE() THEN 1 ELSE 0 END as is_overdue,
             DATEDIFF(CURDATE(), l.due_date) as days_overdue
      FROM Loans l
      JOIN Books b ON l.book_id = b.book_id
      JOIN Members m ON l.member_id = m.member_id
      WHERE l.return_date IS NULL
      ORDER BY is_overdue DESC, l.due_date ASC
    `;
    const rows = await query<any[]>(sql).catch(() => []);

    const activeLoans = (rows || []).map((row: any) => ({
      loan_id: row.loan_id,
      book_id: row.book_id,
      title: row.title,
      isbn: row.isbn,
      member_id: row.member_id,
      full_name: row.full_name,
      email: row.email,
      issue_date: toISODateString(row.issue_date),
      due_date: toISODateString(row.due_date),
      is_overdue: Boolean(row.is_overdue),
      days_overdue: Math.max(0, Number(row.days_overdue || 0)),
    }));

    return NextResponse.json({ activeLoans });
  } catch (error: any) {
    console.error('Error fetching active loans:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch active loans' }, { status: 500 });
  }
}
