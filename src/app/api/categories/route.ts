import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureDefaultCategoriesAndPublishers } from '@/lib/serverData';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDefaultCategoriesAndPublishers();
    const sql = `
      SELECT c.category_id, c.category_name, COUNT(b.book_id) as book_count,
             COALESCE(SUM(b.total_copies), 0) as total_copies
      FROM Categories c
      LEFT JOIN Books b ON c.category_id = b.category_id
      GROUP BY c.category_id, c.category_name
      ORDER BY c.category_name ASC
    `;
    const rows = await query<any[]>(sql).catch(() => []);
    return NextResponse.json({ categories: rows });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { category_name } = await request.json();
    if (!category_name || !category_name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const trimmed = category_name.trim();

    // Check duplicate
    const existing = await query<any[]>('SELECT category_id FROM Categories WHERE LOWER(category_name) = LOWER(?)', [trimmed]);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 400 });
    }

    const res: any = await query('INSERT INTO Categories (category_name) VALUES (?)', [trimmed]);
    const newId = res.insertId;

    return NextResponse.json({
      success: true,
      category: { category_id: newId, category_name: trimmed, book_count: 0, total_copies: 0 }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 400 });
  }
}
