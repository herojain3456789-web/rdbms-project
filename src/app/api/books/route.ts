import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const category = searchParams.get('category')?.trim() || '';
    const availability = searchParams.get('availability')?.trim().toLowerCase() || 'all';
    const sortBy = searchParams.get('sort') || 'title';
    const sortOrder = searchParams.get('order')?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    // Get books with joined metadata and computed available copies
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
      GROUP BY b.book_id, b.isbn, b.title, b.publication_year, b.total_copies, b.category_id, c.category_name, b.publisher_id, p.publisher_name, active_loans.cnt
    `;

    let allBooks = await query<any[]>(sql);

    // Apply filtering in memory if query didn't filter
    if (search) {
      allBooks = allBooks.filter(b => 
        (b.title && b.title.toLowerCase().includes(search)) ||
        (b.isbn && b.isbn.toLowerCase().includes(search)) ||
        (b.authors && b.authors.toLowerCase().includes(search))
      );
    }

    if (category && category !== 'all') {
      allBooks = allBooks.filter(b => 
        String(b.category_id) === category || 
        (b.category_name && b.category_name.toLowerCase() === category.toLowerCase())
      );
    }

    if (availability === 'available') {
      allBooks = allBooks.filter(b => Number(b.available_copies) > 0);
    } else if (availability === 'unavailable') {
      allBooks = allBooks.filter(b => Number(b.available_copies) <= 0);
    }

    // Sorting
    allBooks.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    const total = allBooks.length;
    const paginated = allBooks.slice(offset, offset + limit);

    return NextResponse.json({
      books: paginated.map(b => ({
        book_id: b.book_id,
        isbn: b.isbn,
        title: b.title,
        publication_year: b.publication_year,
        total_copies: Number(b.total_copies),
        available_copies: Math.max(0, Number(b.available_copies)),
        category_id: b.category_id,
        category_name: b.category_name,
        publisher_id: b.publisher_id,
        publisher_name: b.publisher_name,
        authors: b.authors || 'Unknown Author',
        status: Number(b.available_copies) > 0 ? 'available' : 'unavailable'
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      }
    });
  } catch (error: any) {
    console.error('Books API GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { isbn, title, category_id, publisher_id, publication_year, total_copies, authors } = body;

    // Validations
    if (!isbn || !title || !category_id || !publisher_id) {
      return NextResponse.json({ error: 'ISBN, Title, Category, and Publisher are required' }, { status: 400 });
    }

    const copies = parseInt(total_copies, 10);
    if (isNaN(copies) || copies < 0) {
      return NextResponse.json({ error: 'Total copies must be a non-negative integer' }, { status: 400 });
    }

    const year = publication_year ? parseInt(publication_year, 10) : null;
    if (year && (year < -1000 || year > 2100)) {
      return NextResponse.json({ error: 'Invalid publication year' }, { status: 400 });
    }

    // Insert Book inside transaction
    const newBook = await transaction(async (conn) => {
      // 1. Check duplicate ISBN
      const [existing] = await conn.execute('SELECT book_id FROM Books WHERE isbn = ?', [isbn.trim()]);
      if (Array.isArray(existing) && existing.length > 0) {
        throw new Error(`A book with ISBN ${isbn} already exists.`);
      }

      // 2. Insert into Books
      const [insertResult]: any = await conn.execute(
        'INSERT INTO Books (isbn, title, category_id, publisher_id, publication_year, total_copies) VALUES (?, ?, ?, ?, ?, ?)',
        [isbn.trim(), title.trim(), Number(category_id), Number(publisher_id), year, copies]
      );
      const bookId = insertResult.insertId || insertResult[0]?.book_id;

      // 3. Authors handling
      const authorList: string[] = Array.isArray(authors)
        ? authors
        : typeof authors === 'string'
        ? authors.split(',').map(a => a.trim()).filter(Boolean)
        : ['Various Authors'];

      for (const authorName of authorList) {
        // Find or create author
        const [foundAuthors]: any = await conn.execute('SELECT author_id FROM Authors WHERE author_name = ?', [authorName]);
        let authorId: number;
        if (Array.isArray(foundAuthors) && foundAuthors.length > 0) {
          authorId = foundAuthors[0].author_id;
        } else {
          const [insAuth]: any = await conn.execute('INSERT INTO Authors (author_name) VALUES (?)', [authorName]);
          authorId = insAuth.insertId || insAuth[0]?.author_id;
        }

        // Insert junction
        await conn.execute('INSERT INTO Book_Authors (book_id, author_id) VALUES (?, ?)', [bookId, authorId]);
      }

      return {
        book_id: bookId,
        isbn: isbn.trim(),
        title: title.trim(),
        category_id: Number(category_id),
        publisher_id: Number(publisher_id),
        publication_year: year,
        total_copies: copies,
        available_copies: copies,
        authors: authorList.join(', '),
      };
    });

    return NextResponse.json({ success: true, message: 'Book created successfully', book: newBook }, { status: 201 });
  } catch (error: any) {
    console.error('Books API POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add book' }, { status: 400 });
  }
}
