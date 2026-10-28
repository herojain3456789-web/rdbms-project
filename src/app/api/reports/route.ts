import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { toISODateString } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'most-borrowed';

    if (type === 'most-borrowed') {
      const sql = `
        SELECT b.book_id, b.title, b.isbn, COUNT(l.loan_id) as borrow_count,
               c.category_name,
               GROUP_CONCAT(DISTINCT a.author_name SEPARATOR ', ') as authors
        FROM Books b
        JOIN Loans l ON b.book_id = l.book_id
        JOIN Categories c ON b.category_id = c.category_id
        LEFT JOIN Book_Authors ba ON b.book_id = ba.book_id
        LEFT JOIN Authors a ON ba.author_id = a.author_id
        GROUP BY b.book_id, b.title, b.isbn, c.category_name
        ORDER BY borrow_count DESC
        LIMIT 10
      `;
      const rows = await query<any[]>(sql).catch(() => []);
      return NextResponse.json({ reportType: type, data: rows || [] });
    }

    if (type === 'active-members') {
      const sql = `
        SELECT m.member_id, m.full_name, m.email, m.membership_status,
               COUNT(l.loan_id) as total_borrows,
               COUNT(CASE WHEN l.return_date IS NULL THEN 1 END) as active_loans
        FROM Members m
        JOIN Loans l ON m.member_id = l.member_id
        GROUP BY m.member_id, m.full_name, m.email, m.membership_status
        ORDER BY total_borrows DESC
        LIMIT 10
      `;
      const rows = await query<any[]>(sql).catch(() => []);
      return NextResponse.json({ reportType: type, data: rows || [] });
    }

    if (type === 'currently-issued') {
      const sql = `
        SELECT l.loan_id, b.title, b.isbn, m.full_name, m.email,
               l.issue_date, l.due_date,
               CASE 
                 WHEN l.due_date < CURDATE() THEN 'Overdue'
                 ELSE 'On Time'
               END as loan_status,
               DATEDIFF(CURDATE(), l.due_date) as days_overdue
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        JOIN Members m ON l.member_id = m.member_id
        WHERE l.return_date IS NULL
        ORDER BY l.due_date ASC
      `;
      const rows = await query<any[]>(sql).catch(() => []);
      const data = (rows || []).map(r => ({
        loan_id: r.loan_id,
        title: r.title,
        isbn: r.isbn,
        full_name: r.full_name,
        email: r.email,
        issue_date: toISODateString(r.issue_date),
        due_date: toISODateString(r.due_date),
        loan_status: r.loan_status || 'On Time',
        days_overdue: Math.max(0, Number(r.days_overdue || 0)),
      }));
      return NextResponse.json({ reportType: type, data });
    }

    if (type === 'overdue') {
      const sql = `
        SELECT l.loan_id, b.title, b.isbn, m.full_name, m.email, m.phone,
               l.issue_date, l.due_date,
               DATEDIFF(CURDATE(), l.due_date) as days_overdue
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        JOIN Members m ON l.member_id = m.member_id
        WHERE l.return_date IS NULL AND l.due_date < CURDATE()
        ORDER BY days_overdue DESC
      `;
      const rows = await query<any[]>(sql).catch(() => []);
      const data = (rows || []).map(r => ({
        loan_id: r.loan_id,
        title: r.title,
        isbn: r.isbn,
        full_name: r.full_name,
        email: r.email,
        phone: r.phone || 'N/A',
        issue_date: toISODateString(r.issue_date),
        due_date: toISODateString(r.due_date),
        days_overdue: Math.max(1, Number(r.days_overdue || 1)),
      }));
      return NextResponse.json({ reportType: type, data });
    }

    if (type === 'monthly-stats') {
      const sql = `
        SELECT DATE_FORMAT(issue_date, '%Y-%m') as month,
               COUNT(*) as total_issued,
               COUNT(CASE WHEN return_date IS NOT NULL THEN 1 END) as total_returned
        FROM Loans
        WHERE issue_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month ASC
      `;
      const rows = await query<any[]>(sql).catch(() => []);
      return NextResponse.json({ reportType: type, data: rows || [] });
    }

    if (type === 'category-distribution') {
      const sql = `
        SELECT c.category_name, COUNT(b.book_id) as book_count,
               COALESCE(SUM(b.total_copies), 0) as total_copies
        FROM Categories c
        LEFT JOIN Books b ON c.category_id = b.category_id
        GROUP BY c.category_id, c.category_name
        ORDER BY book_count DESC
      `;
      const rows = await query<any[]>(sql).catch(() => []);
      return NextResponse.json({ reportType: type, data: rows || [] });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error: any) {
    console.error('Reports API GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate report' }, { status: 500 });
  }
}
