import { NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import { toISODateString } from '@/lib/dateUtils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { loan_id, return_date } = body;

    if (!loan_id) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    const loanId = Number(loan_id);
    const returnDateStr = return_date ? return_date.slice(0, 10) : new Date().toISOString().slice(0, 10);

    const returnResult = await transaction(async (conn) => {
      // 1. Fetch loan details
      const [loanRows]: any = await conn.execute(
        `SELECT l.loan_id, l.book_id, l.member_id, l.issue_date, l.due_date, l.return_date,
                b.title as book_title, m.full_name as member_name
         FROM Loans l
         JOIN Books b ON l.book_id = b.book_id
         JOIN Members m ON l.member_id = m.member_id
         WHERE l.loan_id = ?`,
        [loanId]
      );

      if (!Array.isArray(loanRows) || loanRows.length === 0) {
        throw new Error('Active loan record not found.');
      }

      const loan = loanRows[0];
      if (loan.return_date !== null) {
        throw new Error(`This book has already been returned on ${toISODateString(loan.return_date)}.`);
      }

      const issueDateStr = toISODateString(loan.issue_date);
      if (returnDateStr < issueDateStr) {
        throw new Error(`Return date (${returnDateStr}) cannot be earlier than issue date (${issueDateStr}).`);
      }

      // Check overdue
      const dueDateStr = toISODateString(loan.due_date);
      const isOverdue = returnDateStr > dueDateStr;
      const daysOverdue = isOverdue
        ? Math.ceil((new Date(returnDateStr).getTime() - new Date(dueDateStr).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // 2. Mark returned
      await conn.execute(
        'UPDATE Loans SET return_date = ? WHERE loan_id = ?',
        [returnDateStr, loanId]
      );

      // 3. Write to Audit_Log
      await conn.execute(
        `INSERT INTO Audit_Log (event_type, table_name, record_id, details) VALUES (?, ?, ?, ?)`,
        [
          'BOOK_RETURNED',
          'Loans',
          loanId,
          `Book ID: ${loan.book_id} (${loan.book_title}), Member: ${loan.member_name}, Returned: ${returnDateStr}${isOverdue ? ` (OVERDUE by ${daysOverdue} days)` : ''}`
        ]
      );

      return {
        loan_id: loanId,
        book_title: loan.book_title,
        member_name: loan.member_name,
        return_date: returnDateStr,
        is_overdue: isOverdue,
        days_overdue: daysOverdue,
      };
    });

    const statusMsg = returnResult.is_overdue 
      ? `Book "${returnResult.book_title}" returned. (Note: Returned ${returnResult.days_overdue} days after due date)`
      : `Book "${returnResult.book_title}" returned on time. Stock availability updated!`;

    return NextResponse.json({
      success: true,
      message: statusMsg,
      data: returnResult,
    });
  } catch (error: any) {
    console.error('Return Book Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to return book' }, { status: 400 });
  }
}
