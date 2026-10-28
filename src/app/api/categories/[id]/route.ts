import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const catId = parseInt(id, 10);
    if (isNaN(catId)) return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });

    const { category_name } = await request.json();
    if (!category_name || !category_name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const trimmed = category_name.trim();

    // Check duplicate excluding self
    const dup = await query<any[]>(
      'SELECT category_id FROM Categories WHERE LOWER(category_name) = LOWER(?) AND category_id != ?',
      [trimmed, catId]
    );
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    }

    await query('UPDATE Categories SET category_name = ? WHERE category_id = ?', [trimmed, catId]);

    return NextResponse.json({ success: true, message: 'Category updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const catId = parseInt(id, 10);
    if (isNaN(catId)) return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });

    // Check if books are assigned to this category (Foreign Key RESTRICT rule)
    const books = await query<any[]>('SELECT COUNT(*) as cnt FROM Books WHERE category_id = ?', [catId]);
    const bookCount = Number(books[0]?.cnt || 0);

    if (bookCount > 0) {
      return NextResponse.json({
        error: `Cannot delete category: ${bookCount} book(s) belong to this category. Foreign key constraint prevents deletion.`
      }, { status: 400 });
    }

    await query('DELETE FROM Categories WHERE category_id = ?', [catId]);

    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 });
  }
}
