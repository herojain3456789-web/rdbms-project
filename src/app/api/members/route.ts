import { NextRequest, NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { toISODateString } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

// GET /api/members - List members with search, filter by status, and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim().toLowerCase() || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search) {
      whereClauses.push('(m.full_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (status && status !== 'all') {
      whereClauses.push('m.membership_status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count for pagination
    const countSql = `SELECT COUNT(*) as total FROM Members m ${whereSql}`;
    const countRows = await query<RowDataPacket[]>(countSql, params);
    const total = Number(countRows[0]?.total || 0);

    // List members with active loans count
    const listSql = `
      SELECT m.member_id, m.full_name, m.email, m.phone, m.registration_date, m.membership_status,
             COUNT(CASE WHEN l.return_date IS NULL THEN 1 END) as active_loans
      FROM Members m
      LEFT JOIN Loans l ON m.member_id = l.member_id
      ${whereSql}
      GROUP BY m.member_id, m.full_name, m.email, m.phone, m.registration_date, m.membership_status
      ORDER BY m.member_id DESC
      LIMIT ? OFFSET ?
    `;

    const listParams = [...params, limit, offset];
    const memberRows = await query<RowDataPacket[]>(listSql, listParams);

    const members = memberRows.map((row) => ({
      member_id: row.member_id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      registration_date: toISODateString(row.registration_date),
      membership_status: row.membership_status,
      active_loans: Number(row.active_loans || 0),
    }));

    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/members - Register a new member
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, email, phone } = body;

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

    // Check email uniqueness
    const existing = await query<RowDataPacket[]>(
      'SELECT member_id FROM Members WHERE LOWER(email) = LOWER(?)',
      [trimmedEmail]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A member with this email address already exists' },
        { status: 400 }
      );
    }

    // Insert new member
    const insertSql = `
      INSERT INTO Members (full_name, email, phone, registration_date, membership_status)
      VALUES (?, ?, ?, CURDATE(), 'active')
    `;
    const result = await query<ResultSetHeader>(insertSql, [trimmedName, trimmedEmail, trimmedPhone]);

    return NextResponse.json(
      {
        success: true,
        message: 'Member registered successfully',
        member: {
          member_id: result.insertId,
          full_name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          registration_date: new Date().toISOString().slice(0, 10),
          membership_status: 'active',
          active_loans: 0,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register member' },
      { status: 500 }
    );
  }
}
