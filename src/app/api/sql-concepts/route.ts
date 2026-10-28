import { NextRequest, NextResponse } from 'next/server';
import { query, getDbStatus } from '@/lib/db';
import { toISODateString } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const concept = searchParams.get('concept') || 'all';

    // 1. INNER JOIN Query
    const innerJoinSql = `
      SELECT l.loan_id, b.title as book_title, b.isbn,
             m.full_name as member_name, m.email,
             l.issue_date, l.due_date, l.return_date
      FROM Loans l
      INNER JOIN Books b ON l.book_id = b.book_id
      INNER JOIN Members m ON l.member_id = m.member_id
      ORDER BY l.issue_date DESC
      LIMIT 10
    `;
    const innerJoinData = await query<any[]>(innerJoinSql).catch(() => []);

    // 2. LEFT JOIN Query: Books never borrowed
    const leftJoinSql = `
      SELECT b.book_id, b.isbn, b.title, c.category_name, b.total_copies,
             l.loan_id
      FROM Books b
      JOIN Categories c ON b.category_id = c.category_id
      LEFT JOIN Loans l ON b.book_id = l.book_id
      WHERE l.loan_id IS NULL
    `;
    const leftJoinData = await query<any[]>(leftJoinSql).catch(() => []);

    // 3. Subquery: Books borrowed above average borrowing frequency
    const subqueryAboveAvgSql = `
      SELECT b.book_id, b.title, COUNT(l.loan_id) as borrow_count
      FROM Books b
      JOIN Loans l ON b.book_id = l.book_id
      GROUP BY b.book_id, b.title
      HAVING COUNT(l.loan_id) > (
        SELECT AVG(book_borrow_count)
        FROM (
          SELECT COUNT(loan_id) as book_borrow_count
          FROM Loans
          GROUP BY book_id
        ) as sub
      )
    `;
    const subqueryAboveAvgData = await query<any[]>(subqueryAboveAvgSql).catch(() => []);

    // 4. Subquery: Members who have NEVER borrowed a book (NOT IN)
    const subqueryNeverSql = `
      SELECT member_id, full_name, email, membership_status, registration_date
      FROM Members
      WHERE member_id NOT IN (
        SELECT DISTINCT member_id FROM Loans
      )
    `;
    const subqueryNeverData = await query<any[]>(subqueryNeverSql).catch(() => []);

    // 5. Subquery: The single most frequently borrowed book
    const subqueryMaxSql = `
      SELECT b.book_id, b.title, b.isbn, COUNT(l.loan_id) as max_borrows
      FROM Books b
      JOIN Loans l ON b.book_id = l.book_id
      GROUP BY b.book_id, b.title, b.isbn
      HAVING COUNT(l.loan_id) >= ALL (
        SELECT COUNT(loan_id)
        FROM Loans
        GROUP BY book_id
      )
      LIMIT 1
    `;
    const subqueryMaxData = await query<any[]>(subqueryMaxSql).catch(() => []);

    // 6. Audit_Log rows
    const auditSql = `
      SELECT log_id, event_type, table_name, record_id, details, created_at
      FROM Audit_Log
      ORDER BY created_at DESC, log_id DESC
      LIMIT 10
    `;
    const auditLogs = await query<any[]>(auditSql).catch(() => []);

    return NextResponse.json({
      innerJoin: {
        sql: innerJoinSql.trim(),
        description: 'Demonstrates INNER JOIN matching active loans with Books and Members records.',
        data: (innerJoinData || []).map(r => ({
          ...r,
          issue_date: toISODateString(r.issue_date),
          due_date: toISODateString(r.due_date),
          return_date: r.return_date ? toISODateString(r.return_date) : null,
        })),
      },
      leftJoin: {
        sql: leftJoinSql.trim(),
        description: 'Demonstrates LEFT JOIN identifying Books that have zero records in Loans table.',
        data: leftJoinData || [],
      },
      subqueryAboveAvg: {
        sql: subqueryAboveAvgSql.trim(),
        description: 'Correlated subquery computing overall average borrowing volume and returning books exceeding that average.',
        data: subqueryAboveAvgData || [],
      },
      subqueryNeverBorrowed: {
        sql: subqueryNeverSql.trim(),
        description: 'NOT IN subquery identifying registered patrons who have never borrowed any books.',
        data: (subqueryNeverData || []).map(m => ({
          ...m,
          registration_date: toISODateString(m.registration_date),
        })),
      },
      subqueryMostBorrowed: {
        sql: subqueryMaxSql.trim(),
        description: 'Subquery using ALL comparison to return the most frequently borrowed book.',
        data: subqueryMaxData || [],
      },
      triggersAudit: {
        description: 'Audit trail populated automatically by BEFORE INSERT and AFTER INSERT MySQL triggers on Loans.',
        data: auditLogs || [],
      },
      dbStatus: await getDbStatus(),
    });
  } catch (error: any) {
    console.error('SQL Concepts API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch SQL concepts demo' }, { status: 500 });
  }
}
