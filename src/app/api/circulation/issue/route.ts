import { NextResponse } from 'next/server';
import { transaction } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { book_id, member_id, issue_date, due_date } = body;

    if (!book_id || !member_id || !due_date) {
      return NextResponse.json({ error: 'Book, Member, and Due Date are required' }, { status: 400 });
    }

    const bId = Number(book_id);
    const mId = Number(member_id);
    const issueDateStr = issue_date ? issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const dueDateStr = due_date.slice(0, 10);

    if (dueDateStr < issueDateStr) {
      return NextResponse.json({ error: 'Due date cannot be before issue date.' }, { status: 400 });
    }

    // Execute with transaction and row-level locking
    const newLoan = await transaction(async (conn) => {
      // 1. Check member status
      const [members]: any = await conn.execute(
        'SELECT member_id, full_name, membership_status FROM Members WHERE member_id = ?',
        [mId]
      );
      if (!Array.isArray(members) || members.length === 0) {
        throw new Error('Member not found.');
      }
      if (members[0].membership_status !== 'active') {
        throw new Error('Cannot issue book: Member is inactive.');
      }

      // 2. Lock book row with FOR UPDATE to prevent race condition
      const [bookRows]: any = await conn.execute(
        'SELECT book_id, title, total_copies FROM Books WHERE book_id = ? FOR UPDATE',
        [bId]
      );
      if (!Array.isArray(bookRows) || bookRows.length === 0) {
        throw new Error('Book not found.');
      }
      const totalCopies = Number(bookRows[0].total_copies);

      // 3. Check active loans for this book
      const [activeRows]: any = await conn.execute(
        'SELECT COUNT(*) as active_cnt FROM Loans WHERE book_id = ? AND return_date IS NULL',
        [bId]
      );
      const activeCount = Number(activeRows[0]?.active_cnt || 0);

      if (activeCount >= totalCopies) {
        throw new Error(`Cannot issue book: No copies available! (Total: ${totalCopies}, Issued: ${activeCount})`);
      }

      // 4. Insert loan record
      const [loanResult]: any = await conn.execute(
        'INSERT INTO Loans (book_id, member_id, issue_date, due_date, return_date) VALUES (?, ?, ?, ?, NULL)',
        [bId, mId, issueDateStr, dueDateStr]
      );
      const loanId = loanResult.insertId;

      // 5. Ensure audit log entry (in case triggers are bypassed or simulated)
      await conn.execute(
        `INSERT INTO Audit_Log (event_type, table_name, record_id, details) VALUES (?, ?, ?, ?)`,
        [
          'BOOK_ISSUED',
          'Loans',
          loanId,
          `Book ID: ${bId} (${bookRows[0].title}), Member ID: ${mId} (${members[0].full_name}), Issued: ${issueDateStr}, Due: ${dueDateStr}`
        ]
      );

      return {
        loan_id: loanId,
        book_id: bId,
        book_title: bookRows[0].title,
        member_id: mId,
        member_name: members[0].full_name,
        issue_date: issueDateStr,
        due_date: dueDateStr,
        remaining_available: totalCopies - (activeCount + 1),
      };
    });

    return NextResponse.json({
      success: true,
      message: `Book "${newLoan.book_title}" successfully issued to ${newLoan.member_name}!`,
      loan: newLoan,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Issue Book Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to issue book' }, { status: 400 });
  }
}
