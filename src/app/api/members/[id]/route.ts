import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { toISODateString } from '@/lib/dateUtils';

// GET /api/members/[id] - Get member details with borrowing history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memberId = parseInt(id, 10);

    if (isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 });
    }

    // Member profile query
    const memberSql = `
      SELECT m.member_id, m.full_name, m.email, m.phone, m.registration_date, m.membership_status,
             COUNT(CASE WHEN l.return_date IS NULL THEN 1 END) as active_loans
      FROM Members m
      LEFT JOIN Loans l ON m.member_id = l.member_id
      WHERE m.member_id = ?
      GROUP BY m.member_id, m.full_name, m.email, m.phone, m.registration_date, m.membership_status
    `;
    const memberRows = await query<RowDataPacket[]>(memberSql, [memberId]);

    if (!memberRows || memberRows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const row = memberRows[0];
    const member = {
      member_id: row.member_id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      registration_date: toISODateString(row.registration_date),
      membership_status: row.membership_status,
      active_loans: Number(row.active_loans || 0),
    };

    // Borrowing history query
    const loansSql = `
      SELECT l.loan_id, l.book_id, b.title, b.isbn,
             l.issue_date, l.due_date, l.return_date,
             CASE 
               WHEN l.return_date IS NOT NULL THEN 'returned'
               WHEN l.due_date < CURDATE() THEN 'overdue'
               ELSE 'active'
             END as status
      FROM Loans l
      JOIN Books b ON l.book_id = b.book_id
      WHERE l.member_id = ?
      ORDER BY l.issue_date DESC
    `;
    const loanRows = await query<RowDataPacket[]>(loansSql, [memberId]);

    const loans = loanRows.map((loan) => ({
      loan_id: loan.loan_id,
      book_id: loan.book_id,
      title: loan.title,
      isbn: loan.isbn,
      issue_date: toISODateString(loan.issue_date),
      due_date: toISODateString(loan.due_date),
      return_date: loan.return_date ? toISODateString(loan.return_date) : null,
      status: loan.status,
    }));

    return NextResponse.json({ member, loans });
  } catch (error: any) {
    console.error('Error fetching member details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch member details' },
      { status: 500 }
    );
  }
}

// PUT /api/members/[id] - Update member (validate email uniqueness excluding self)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memberId = parseInt(id, 10);

    if (isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 });
    }

    const body = await request.json();
    const { full_name, email, phone, membership_status } = body;

    // Validate required fields
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedName = full_name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone && typeof phone === 'string' ? phone.trim() : null;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Validate email uniqueness excluding current member
    const existing = await query<RowDataPacket[]>(
      'SELECT member_id FROM Members WHERE LOWER(email) = LOWER(?) AND member_id != ?',
      [trimmedEmail, memberId]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email is already in use by another member' },
        { status: 400 }
      );
    }

    // Check if status is valid if provided
    let statusToUpdate = null;
    if (membership_status) {
      if (!['active', 'inactive'].includes(membership_status)) {
        return NextResponse.json({ error: 'Invalid membership status' }, { status: 400 });
      }
      statusToUpdate = membership_status;
    }

    const updateSql = `
      UPDATE Members 
      SET full_name = ?, email = ?, phone = ?, 
          membership_status = COALESCE(?, membership_status)
      WHERE member_id = ?
    `;

    const result = await query<ResultSetHeader>(updateSql, [
      trimmedName,
      trimmedEmail,
      trimmedPhone,
      statusToUpdate,
      memberId,
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member' },
      { status: 500 }
    );
  }
}

// PATCH /api/members/[id] - Toggle membership status (active/inactive)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memberId = parseInt(id, 10);

    if (isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 });
    }

    // Check existing member status
    const existing = await query<RowDataPacket[]>(
      'SELECT member_id, membership_status FROM Members WHERE member_id = ?',
      [memberId]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    let targetStatus: 'active' | 'inactive';
    try {
      const body = await request.json();
      if (body.membership_status && ['active', 'inactive'].includes(body.membership_status)) {
        targetStatus = body.membership_status;
      } else {
        targetStatus = existing[0].membership_status === 'active' ? 'inactive' : 'active';
      }
    } catch {
      // Empty body: just toggle
      targetStatus = existing[0].membership_status === 'active' ? 'inactive' : 'active';
    }

    await query(
      'UPDATE Members SET membership_status = ? WHERE member_id = ?',
      [targetStatus, memberId]
    );

    return NextResponse.json({
      success: true,
      membership_status: targetStatus,
      message: `Member status updated to ${targetStatus}`,
    });
  } catch (error: any) {
    console.error('Error toggling member status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update membership status' },
      { status: 500 }
    );
  }
}
