import { NextResponse } from 'next/server';
import { query, getDbStatus } from '@/lib/db';
import { toISODateString } from '@/lib/dateUtils';

export async function GET() {
  try {
    const dbStatus = await getDbStatus();

    // 1. Total books
    const totalBooksRes = await query<any[]>('SELECT COUNT(*) as total FROM Books').catch(() => [{ total: 0 }]);
    const totalBooks = Number(totalBooksRes[0]?.total || 0);

    // 2. Total available copies (derived from total_copies - active_loans)
    const availRes = await query<any[]>(
      `SELECT SUM(b.total_copies - COALESCE(al.cnt, 0)) as total_available 
       FROM Books b 
       LEFT JOIN (SELECT book_id, COUNT(*) as cnt FROM Loans WHERE return_date IS NULL GROUP BY book_id) al 
       ON b.book_id = al.book_id`
    ).catch(() => [{ total_available: 0 }]);
    const availableCopies = Number(availRes[0]?.total_available || 0);

    // 3. Books currently issued
    const issuedRes = await query<any[]>('SELECT COUNT(*) as issued FROM Loans WHERE return_date IS NULL').catch(() => [{ issued: 0 }]);
    const currentlyIssued = Number(issuedRes[0]?.issued || 0);

    // 4. Registered active members
    const membersRes = await query<any[]>("SELECT COUNT(*) as total FROM Members WHERE membership_status = 'active'").catch(() => [{ total: 0 }]);
    const registeredMembers = Number(membersRes[0]?.total || 0);

    // 5. Overdue loans
    const overdueRes = await query<any[]>(
      'SELECT COUNT(*) as overdue FROM Loans WHERE return_date IS NULL AND due_date < CURDATE()'
    ).catch(() => [{ overdue: 0 }]);
    const overdueLoans = Number(overdueRes[0]?.overdue || 0);

    // 6. Recent activity
    const activitySql = `
      SELECT l.loan_id, m.full_name, b.title, l.issue_date, l.due_date, l.return_date,
             CASE 
               WHEN l.return_date IS NOT NULL THEN 'returned'
               WHEN l.due_date < CURDATE() THEN 'overdue'
               ELSE 'active'
             END as status
      FROM Loans l
      JOIN Books b ON l.book_id = b.book_id
      JOIN Members m ON l.member_id = m.member_id
      ORDER BY l.issue_date DESC, l.loan_id DESC
      LIMIT 6
    `;
    const activityRows = await query<any[]>(activitySql).catch(() => []);
    const recentActivity = activityRows.map(row => ({
      loan_id: row.loan_id,
      full_name: row.full_name,
      title: row.title,
      issue_date: toISODateString(row.issue_date),
      due_date: toISODateString(row.due_date),
      return_date: row.return_date ? toISODateString(row.return_date) : null,
      status: row.status,
    }));

    // 7. Monthly borrowing trends (calculated from real Loans table)
    const monthlySql = `
      SELECT DATE_FORMAT(issue_date, '%b') as month,
             COUNT(*) as count,
             DATE_FORMAT(issue_date, '%Y-%m') as ym
      FROM Loans
      GROUP BY ym, month
      ORDER BY ym ASC
      LIMIT 6
    `;
    const monthlyTrends = await query<any[]>(monthlySql).catch(() => []);

    // 8. Category distribution for breakdown chart (calculated from Categories & Books)
    const catDistSql = `
      SELECT c.category_name as name, COUNT(b.book_id) as value
      FROM Categories c
      JOIN Books b ON c.category_id = b.category_id
      GROUP BY c.category_id, c.category_name
      ORDER BY value DESC
      LIMIT 6
    `;
    const categoryDistribution = await query<any[]>(catDistSql).catch(() => []);

    // 9. Overdue books list
    const overdueListSql = `
      SELECT l.loan_id, b.title, m.full_name, l.due_date,
             DATEDIFF(CURDATE(), l.due_date) as days_overdue
      FROM Loans l
      JOIN Books b ON l.book_id = b.book_id
      JOIN Members m ON l.member_id = m.member_id
      WHERE l.return_date IS NULL AND l.due_date < CURDATE()
      ORDER BY l.due_date ASC
      LIMIT 5
    `;
    const overdueRows = await query<any[]>(overdueListSql).catch(() => []);
    const overdueList = overdueRows.map((row: any) => ({
      loan_id: row.loan_id,
      title: row.title,
      full_name: row.full_name,
      due_date: toISODateString(row.due_date),
      days_overdue: Math.max(1, Number(row.days_overdue || 1)),
    }));

    return NextResponse.json({
      stats: {
        totalBooks,
        availableCopies,
        currentlyIssued,
        registeredMembers,
        overdueLoans,
      },
      recentActivity,
      monthlyTrends,
      categoryDistribution,
      overdueList,
      dbStatus,
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
