import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookId = parseInt(id, 10);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    const sql = `
      SELECT b.book_id, b.isbn, b.title, b.publication_year, b.total_copies,
             b.category_id, c.category_name, b.publisher_id, p.publisher_name,
             GROUP_CONCAT(DISTINCT a.author_name SEPARATOR ', ') as authors,
             b.total_copies - COALESCE(active_loans.cnt, 0) as available_copies
      FROM Books b
      JOIN Categories c ON b.category_id = c.category_id
      JOIN Publishers p ON b.publisher_id = p.publisher_id
      LEFT JOIN Book_Authors ba ON b.book_id = ba.book_id
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      LEFT JOIN (
        SELECT book_id, COUNT(*) as cnt FROM Loans WHERE return_date IS NULL GROUP BY book_id
      ) active_loans ON b.book_id = active_loans.book_id
      WHERE b.book_id = ?
      GROUP BY b.book_id, b.isbn, b.title, b.publication_year, b.total_copies, b.category_id, c.category_name, b.publisher_id, p.publisher_name
    `;
    const rows = await query<any[]>(sql, [bookId]);

    const book = rows && rows.length > 0 ? rows[0] : null;

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({ book });
  } catch (error: any) {
    console.error('Error fetching book detail:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch book' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookId = parseInt(id, 10);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    const body = await request.json();
    const { isbn, title, category_id, publisher_id, publication_year, total_copies, authors } = body;

    const copies = parseInt(total_copies, 10);
    if (isNaN(copies) || copies < 0) {
      return NextResponse.json({ error: 'Total copies must be >= 0' }, { status: 400 });
    }

    // Check active loans so total_copies cannot be reduced below active loans count
    const activeRes = await query<any[]>('SELECT COUNT(*) as active FROM Loans WHERE book_id = ? AND return_date IS NULL', [bookId]);
    const activeCount = Number(activeRes[0]?.active || 0);

    if (copies < activeCount) {
      return NextResponse.json({
        error: `Cannot reduce total copies to ${copies}. There are currently ${activeCount} active loans of this book.`
      }, { status: 400 });
    }

    await transaction(async (conn) => {
      // Check ISBN uniqueness excluding self
      if (isbn) {
        const [existing]: any = await conn.execute('SELECT book_id FROM Books WHERE isbn = ? AND book_id != ?', [isbn.trim(), bookId]);
        if (Array.isArray(existing) && existing.length > 0) {
          throw new Error('This ISBN is already assigned to another book.');
        }
      }

      await conn.execute(
        `UPDATE Books 
         SET isbn = ?, title = ?, category_id = ?, publisher_id = ?, publication_year = ?, total_copies = ?
         WHERE book_id = ?`,
        [isbn.trim(), title.trim(), Number(category_id), Number(publisher_id), publication_year ? Number(publication_year) : null, copies, bookId]
      );

      // Update authors if provided
      if (authors) {
        await conn.execute('DELETE FROM Book_Authors WHERE book_id = ?', [bookId]);

        const authorList: string[] = Array.isArray(authors)
          ? authors
          : typeof authors === 'string'
          ? authors.split(',').map(a => a.trim()).filter(Boolean)
          : [];

        for (const authorName of authorList) {
          const [found]: any = await conn.execute('SELECT author_id FROM Authors WHERE author_name = ?', [authorName]);
          let authorId: number;
          if (Array.isArray(found) && found.length > 0) {
            authorId = found[0].author_id;
          } else {
            const [ins]: any = await conn.execute('INSERT INTO Authors (author_name) VALUES (?)', [authorName]);
            authorId = ins.insertId;
          }
          await conn.execute('INSERT INTO Book_Authors (book_id, author_id) VALUES (?, ?)', [bookId, authorId]);
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Book updated successfully' });
  } catch (error: any) {
    console.error('Error updating book:', error);
    return NextResponse.json({ error: error.message || 'Failed to update book' }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookId = parseInt(id, 10);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    // Check if book has active loans
    const loansRes = await query<any[]>('SELECT COUNT(*) as active FROM Loans WHERE book_id = ? AND return_date IS NULL', [bookId]);
    const activeCount = Number(loansRes[0]?.active || 0);

    if (activeCount > 0) {
      return NextResponse.json({
        error: `Cannot delete book. It currently has ${activeCount} active loan(s). Please return all copies first.`
      }, { status: 400 });
    }

    await transaction(async (conn) => {
      await conn.execute('DELETE FROM Book_Authors WHERE book_id = ?', [bookId]);
      await conn.execute('DELETE FROM Loans WHERE book_id = ?', [bookId]);
      await conn.execute('DELETE FROM Books WHERE book_id = ?', [bookId]);
    });

    return NextResponse.json({ success: true, message: 'Book deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting book:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete book' }, { status: 400 });
  }
}
