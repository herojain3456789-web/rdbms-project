import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { toISODateString } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('status')?.toLowerCase() || 'all';
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    const sql = `
      SELECT l.loan_id, l.book_id, b.title, b.isbn,
             l.member_id, m.full_name, m.email,
             l.issue_date, l.due_date, l.return_date,
             CASE 
               WHEN l.return_date IS NOT NULL THEN 'returned'
               WHEN l.due_date < CURDATE() THEN 'overdue'
               ELSE 'active'
             END as status,
             CASE
               WHEN l.return_date IS NULL AND l.due_date < CURDATE() THEN DATEDIFF(CURDATE(), l.due_date)
               WHEN l.return_date IS NOT NULL AND l.return_date > l.due_date THEN DATEDIFF(l.return_date, l.due_date)
               ELSE 0
             END as days_overdue
      FROM Loans l
      JOIN Books b ON l.book_id = b.book_id
      JOIN Members m ON l.member_id = m.member_id
      ORDER BY l.issue_date DESC, l.loan_id DESC
    `;

    let allLoans = await query<any[]>(sql);

    // Filter by status
    if (filter === 'active') {
      allLoans = allLoans.filter(l => l.status === 'active');
    } else if (filter === 'returned') {
      allLoans = allLoans.filter(l => l.status === 'returned');
    } else if (filter === 'overdue') {
      allLoans = allLoans.filter(l => l.status === 'overdue');
    }

    // Filter by search
    if (search) {
      allLoans = allLoans.filter(l => 
        (l.title && l.title.toLowerCase().includes(search)) ||
        (l.full_name && l.full_name.toLowerCase().includes(search)) ||
        (l.isbn && l.isbn.toLowerCase().includes(search)) ||
        (l.email && l.email.toLowerCase().includes(search))
      );
    }

    const total = allLoans.length;
    const paginated = allLoans.slice(offset, offset + limit);

    // Summary counts for filter badges
    const allCount = allLoans.length;

    return NextResponse.json({
      loans: paginated.map(l => ({
        loan_id: l.loan_id,
        book_id: l.book_id,
        title: l.title,
        isbn: l.isbn,
        member_id: l.member_id,
        full_name: l.full_name,
        email: l.email,
        issue_date: toISODateString(l.issue_date),
        due_date: toISODateString(l.due_date),
        return_date: l.return_date ? toISODateString(l.return_date) : null,
        status: l.status,
        days_overdue: Math.max(0, Number(l.days_overdue || 0)),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      }
    });
  } catch (error: any) {
    console.error('History API GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch borrowing history' }, { status: 500 });
  }
}
