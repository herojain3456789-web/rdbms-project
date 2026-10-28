'use server';

import { revalidatePath } from 'next/cache';
import { query, transaction, initDatabase } from '@/lib/db';
import { toISODateString } from '@/lib/dateUtils';

// 1. Books Actions
export async function createBookAction(data: {
  isbn: string;
  title: string;
  category_id: number | string;
  publisher_id: number | string;
  publication_year?: number | string | null;
  total_copies: number | string;
  authors: string;
}) {
  const { isbn, title, category_id, publisher_id, publication_year, total_copies, authors } = data;

  if (!isbn || !title || !category_id || !publisher_id) {
    return { error: 'ISBN, Title, Category, and Publisher are required' };
  }

  const copies = parseInt(String(total_copies), 10);
  if (isNaN(copies) || copies < 0) {
    return { error: 'Total copies must be a non-negative integer' };
  }

  const year = publication_year ? parseInt(String(publication_year), 10) : null;
  if (year && (year < -1000 || year > 2100)) {
    return { error: 'Invalid publication year' };
  }

  try {
    await transaction(async (conn) => {
      // 1. Check duplicate ISBN
      const existing: any = await conn.execute('SELECT book_id FROM Books WHERE isbn = ?', [isbn.trim()]);
      const existingRows = Array.isArray(existing) && Array.isArray(existing[0]) ? existing[0] : (existing[0] ? [existing[0]] : existing);
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        throw new Error(`A book with ISBN ${isbn} already exists.`);
      }

      // 2. Insert into Books
      const [insertResult]: any = await conn.execute(
        'INSERT INTO Books (isbn, title, category_id, publisher_id, publication_year, total_copies) VALUES (?, ?, ?, ?, ?, ?)',
        [isbn.trim(), title.trim(), Number(category_id), Number(publisher_id), year, copies]
      );
      const bookId = insertResult.insertId || insertResult[0]?.book_id;

      // 3. Authors handling
      const authorList: string[] = typeof authors === 'string'
        ? authors.split(',').map((a) => a.trim()).filter(Boolean)
        : ['Various Authors'];

      for (const authorName of authorList) {
        const found: any = await conn.execute('SELECT author_id FROM Authors WHERE author_name = ?', [authorName]);
        const foundRows = Array.isArray(found) && Array.isArray(found[0]) ? found[0] : (found[0] ? [found[0]] : found);
        let authorId: number;
        if (Array.isArray(foundRows) && foundRows.length > 0) {
          authorId = foundRows[0].author_id;
        } else {
          const [insAuth]: any = await conn.execute('INSERT INTO Authors (author_name) VALUES (?)', [authorName]);
          authorId = insAuth.insertId || insAuth[0]?.author_id;
        }
        await conn.execute('INSERT INTO Book_Authors (book_id, author_id) VALUES (?, ?)', [bookId, authorId]);
      }
    });

    revalidatePath('/');
    revalidatePath('/books');
    revalidatePath('/reports');
    revalidatePath('/circulation');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create book' };
  }
}

export async function updateBookAction(
  bookId: number,
  data: {
    isbn: string;
    title: string;
    category_id: number | string;
    publisher_id: number | string;
    publication_year?: number | string | null;
    total_copies: number | string;
    authors: string;
  }
) {
  const { isbn, title, category_id, publisher_id, publication_year, total_copies, authors } = data;
  const copies = parseInt(String(total_copies), 10);
  if (isNaN(copies) || copies < 0) {
    return { error: 'Total copies must be >= 0' };
  }

  try {
    const activeRes = await query<any[]>('SELECT COUNT(*) as active FROM Loans WHERE book_id = ? AND return_date IS NULL', [bookId]);
    const activeCount = Number(activeRes[0]?.active || 0);

    if (copies < activeCount) {
      return {
        error: `Cannot reduce total copies to ${copies}. There are currently ${activeCount} active loans of this book.`,
      };
    }

    await transaction(async (conn) => {
      if (isbn) {
        const existing: any = await conn.execute('SELECT book_id FROM Books WHERE isbn = ? AND book_id != ?', [isbn.trim(), bookId]);
        const existingRows = Array.isArray(existing) && Array.isArray(existing[0]) ? existing[0] : (existing[0] ? [existing[0]] : existing);
        if (Array.isArray(existingRows) && existingRows.length > 0) {
          throw new Error('This ISBN is already assigned to another book.');
        }
      }

      await conn.execute(
        `UPDATE Books 
         SET isbn = ?, title = ?, category_id = ?, publisher_id = ?, publication_year = ?, total_copies = ?
         WHERE book_id = ?`,
        [isbn.trim(), title.trim(), Number(category_id), Number(publisher_id), publication_year ? Number(publication_year) : null, copies, bookId]
      );

      if (authors) {
        await conn.execute('DELETE FROM Book_Authors WHERE book_id = ?', [bookId]);
        const authorList: string[] = typeof authors === 'string'
          ? authors.split(',').map((a) => a.trim()).filter(Boolean)
          : [];

        for (const authorName of authorList) {
          const found: any = await conn.execute('SELECT author_id FROM Authors WHERE author_name = ?', [authorName]);
          const foundRows = Array.isArray(found) && Array.isArray(found[0]) ? found[0] : (found[0] ? [found[0]] : found);
          let authorId: number;
          if (Array.isArray(foundRows) && foundRows.length > 0) {
            authorId = foundRows[0].author_id;
          } else {
            const [ins]: any = await conn.execute('INSERT INTO Authors (author_name) VALUES (?)', [authorName]);
            authorId = ins.insertId || ins[0]?.author_id;
          }
          await conn.execute('INSERT INTO Book_Authors (book_id, author_id) VALUES (?, ?)', [bookId, authorId]);
        }
      }
    });

    revalidatePath('/');
    revalidatePath('/books');
    revalidatePath('/reports');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update book' };
  }
}

export async function deleteBookAction(bookId: number) {
  try {
    const loansRes = await query<any[]>('SELECT COUNT(*) as active FROM Loans WHERE book_id = ? AND return_date IS NULL', [bookId]);
    const activeCount = Number(loansRes[0]?.active || 0);

    if (activeCount > 0) {
      return {
        error: `Cannot delete book. It currently has ${activeCount} active loan(s). Please return all copies first.`,
      };
    }

    await transaction(async (conn) => {
      await conn.execute('DELETE FROM Book_Authors WHERE book_id = ?', [bookId]);
      await conn.execute('DELETE FROM Loans WHERE book_id = ?', [bookId]);
      await conn.execute('DELETE FROM Books WHERE book_id = ?', [bookId]);
    });

    revalidatePath('/');
    revalidatePath('/books');
    revalidatePath('/reports');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete book' };
  }
}

// 2. Members Actions
export async function createMemberAction(data: {
  full_name: string;
  email: string;
  phone?: string;
}) {
  const { full_name, email, phone } = data;
  if (!full_name || !email) {
    return { error: 'Full name and email are required' };
  }

  try {
    const existing = await query<any[]>('SELECT member_id FROM Members WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing && existing.length > 0) {
      return { error: 'A member with this email already exists' };
    }

    await query(
      'INSERT INTO Members (full_name, email, phone, registration_date, membership_status) VALUES (?, ?, ?, CURRENT_DATE, ?)',
      [full_name.trim(), email.trim(), phone ? phone.trim() : null, 'active']
    );

    revalidatePath('/');
    revalidatePath('/members');
    revalidatePath('/circulation');
    revalidatePath('/reports');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to register member' };
  }
}

export async function updateMemberAction(
  memberId: number,
  data: {
    full_name: string;
    email: string;
    phone?: string;
    membership_status: string;
  }
) {
  const { full_name, email, phone, membership_status } = data;
  if (!full_name || !email) {
    return { error: 'Full name and email are required' };
  }

  try {
    const existing = await query<any[]>(
      'SELECT member_id FROM Members WHERE LOWER(email) = LOWER(?) AND member_id != ?',
      [email.trim(), memberId]
    );
    if (existing && existing.length > 0) {
      return { error: 'This email is already in use by another member' };
    }

    await query(
      'UPDATE Members SET full_name = ?, email = ?, phone = ?, membership_status = ? WHERE member_id = ?',
      [full_name.trim(), email.trim(), phone ? phone.trim() : null, membership_status, memberId]
    );

    revalidatePath('/');
    revalidatePath('/members');
    revalidatePath('/circulation');
    revalidatePath('/reports');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update member' };
  }
}

export async function toggleMemberStatusAction(memberId: number) {
  try {
    const rows = await query<any[]>('SELECT membership_status FROM Members WHERE member_id = ?', [memberId]);
    if (!rows || rows.length === 0) {
      return { error: 'Member not found' };
    }
    const currentStatus = rows[0].membership_status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    await query('UPDATE Members SET membership_status = ? WHERE member_id = ?', [newStatus, memberId]);

    revalidatePath('/');
    revalidatePath('/members');
    revalidatePath('/circulation');
    return { success: true, newStatus };
  } catch (err: any) {
    return { error: err.message || 'Failed to toggle member status' };
  }
}

// 3. Category Actions
export async function createCategoryAction(category_name: string) {
  if (!category_name || !category_name.trim()) {
    return { error: 'Category name is required' };
  }
  const trimmed = category_name.trim();

  try {
    const existing = await query<any[]>('SELECT category_id FROM Categories WHERE LOWER(category_name) = LOWER(?)', [trimmed]);
    if (existing && existing.length > 0) {
      return { error: 'A category with this name already exists' };
    }

    await query('INSERT INTO Categories (category_name) VALUES (?)', [trimmed]);

    revalidatePath('/');
    revalidatePath('/categories');
    revalidatePath('/books');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create category' };
  }
}

export async function updateCategoryAction(categoryId: number, category_name: string) {
  if (!category_name || !category_name.trim()) {
    return { error: 'Category name is required' };
  }
  const trimmed = category_name.trim();

  try {
    const existing = await query<any[]>(
      'SELECT category_id FROM Categories WHERE LOWER(category_name) = LOWER(?) AND category_id != ?',
      [trimmed, categoryId]
    );
    if (existing && existing.length > 0) {
      return { error: 'A category with this name already exists' };
    }

    await query('UPDATE Categories SET category_name = ? WHERE category_id = ?', [trimmed, categoryId]);

    revalidatePath('/categories');
    revalidatePath('/books');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update category' };
  }
}

export async function deleteCategoryAction(categoryId: number) {
  try {
    const books = await query<any[]>('SELECT COUNT(*) as cnt FROM Books WHERE category_id = ?', [categoryId]);
    const bookCount = Number(books[0]?.cnt || 0);

    if (bookCount > 0) {
      return {
        error: `Cannot delete category: ${bookCount} book(s) belong to this category. Foreign key constraint prevents deletion.`,
      };
    }

    await query('DELETE FROM Categories WHERE category_id = ?', [categoryId]);

    revalidatePath('/categories');
    revalidatePath('/books');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete category' };
  }
}

// 4. Circulation Actions
export async function issueBookAction(data: {
  book_id: number | string;
  member_id: number | string;
  issue_date?: string;
  due_date: string;
}) {
  const { book_id, member_id, issue_date, due_date } = data;
  if (!book_id || !member_id || !due_date) {
    return { error: 'Book, Member, and Due Date are required' };
  }

  const bId = Number(book_id);
  const mId = Number(member_id);
  const issueDateStr = issue_date ? issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const dueDateStr = due_date.slice(0, 10);

  if (dueDateStr < issueDateStr) {
    return { error: 'Due date cannot be before issue date.' };
  }

  try {
    const loan = await transaction(async (conn) => {
      const members: any = await conn.execute('SELECT member_id, full_name, membership_status FROM Members WHERE member_id = ?', [mId]);
      const memberRows = Array.isArray(members) && Array.isArray(members[0]) ? members[0] : (members[0] ? [members[0]] : members);
      if (!Array.isArray(memberRows) || memberRows.length === 0) {
        throw new Error('Member not found.');
      }
      if (memberRows[0].membership_status !== 'active') {
        throw new Error('Cannot issue book: Member is inactive.');
      }

      const bookRows: any = await conn.execute('SELECT book_id, title, total_copies FROM Books WHERE book_id = ? FOR UPDATE', [bId]);
      const booksList = Array.isArray(bookRows) && Array.isArray(bookRows[0]) ? bookRows[0] : (bookRows[0] ? [bookRows[0]] : bookRows);
      if (!Array.isArray(booksList) || booksList.length === 0) {
        throw new Error('Book not found.');
      }
      const totalCopies = Number(booksList[0].total_copies);

      const activeRows: any = await conn.execute('SELECT COUNT(*) as active_cnt FROM Loans WHERE book_id = ? AND return_date IS NULL', [bId]);
      const activeList = Array.isArray(activeRows) && Array.isArray(activeRows[0]) ? activeRows[0] : (activeRows[0] ? [activeRows[0]] : activeRows);
      const activeCount = Number(activeList[0]?.active_cnt || 0);

      if (activeCount >= totalCopies) {
        throw new Error(`Cannot issue book: No copies available! (Total: ${totalCopies}, Issued: ${activeCount})`);
      }

      const [loanResult]: any = await conn.execute(
        'INSERT INTO Loans (book_id, member_id, issue_date, due_date, return_date) VALUES (?, ?, ?, ?, NULL)',
        [bId, mId, issueDateStr, dueDateStr]
      );
      const loanId = loanResult.insertId || loanResult[0]?.loan_id;

      await conn.execute(
        'INSERT INTO Audit_Log (event_type, table_name, record_id, details) VALUES (?, ?, ?, ?)',
        ['BOOK_ISSUED', 'Loans', loanId, `Book ID: ${bId} (${booksList[0].title}), Member ID: ${mId} (${memberRows[0].full_name}), Issued: ${issueDateStr}, Due: ${dueDateStr}`]
      );

      return {
        loan_id: loanId,
        book_title: booksList[0].title,
        member_name: memberRows[0].full_name,
      };
    });

    revalidatePath('/');
    revalidatePath('/circulation');
    revalidatePath('/history');
    revalidatePath('/reports');
    return { success: true, message: `Successfully issued "${loan.book_title}" to ${loan.member_name}!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to issue book' };
  }
}

export async function returnBookAction(data: {
  loan_id: number | string;
  return_date?: string;
}) {
  const { loan_id, return_date } = data;
  if (!loan_id) {
    return { error: 'Loan ID is required' };
  }

  const loanId = Number(loan_id);
  const returnDateStr = return_date ? return_date.slice(0, 10) : new Date().toISOString().slice(0, 10);

  try {
    const loan = await transaction(async (conn) => {
      const loanRows: any = await conn.execute(
        `SELECT l.loan_id, l.book_id, l.member_id, l.issue_date, l.due_date, l.return_date,
                b.title as book_title, m.full_name as member_name
         FROM Loans l
         JOIN Books b ON l.book_id = b.book_id
         JOIN Members m ON l.member_id = m.member_id
         WHERE l.loan_id = ?`,
        [loanId]
      );
      const loansList = Array.isArray(loanRows) && Array.isArray(loanRows[0]) ? loanRows[0] : (loanRows[0] ? [loanRows[0]] : loanRows);
      if (!Array.isArray(loansList) || loansList.length === 0) {
        throw new Error('Active loan record not found.');
      }

      const l = loansList[0];
      if (l.return_date !== null) {
        throw new Error(`This book has already been returned on ${toISODateString(l.return_date)}.`);
      }

      const issueDateStr = toISODateString(l.issue_date);
      if (returnDateStr < issueDateStr) {
        throw new Error(`Return date (${returnDateStr}) cannot be earlier than issue date (${issueDateStr}).`);
      }

      await conn.execute('UPDATE Loans SET return_date = ? WHERE loan_id = ?', [returnDateStr, loanId]);

      await conn.execute(
        'INSERT INTO Audit_Log (event_type, table_name, record_id, details) VALUES (?, ?, ?, ?)',
        ['BOOK_RETURNED', 'Loans', loanId, `Book ID: ${l.book_id} (${l.book_title}), Member ID: ${l.member_id} (${l.member_name}), Returned: ${returnDateStr}`]
      );

      return l;
    });

    revalidatePath('/');
    revalidatePath('/circulation');
    revalidatePath('/history');
    revalidatePath('/reports');
    return { success: true, message: `Book "${loan.book_title}" returned successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to return book' };
  }
}

// 5. Database Initialization Action
export async function initializeDatabaseAction() {
  try {
    const res = await initDatabase();
    revalidatePath('/');
    revalidatePath('/settings');
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to initialize database' };
  }
}
