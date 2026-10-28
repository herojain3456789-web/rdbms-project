import { query, getDbStatus } from './db';
import { toISODateString } from './dateUtils';

// Helper to ensure base taxonomy exists in database
export async function ensureDefaultCategoriesAndPublishers() {
  try {
    const catCheck = await query<any[]>('SELECT COUNT(*) as cnt FROM Categories');
    const catCount = Number(catCheck[0]?.cnt || 0);
    if (catCount === 0) {
      const defaultCategories = [
        'Computer Science',
        'Software Engineering',
        'Database Systems',
        'Artificial Intelligence',
        'Web Development',
        'Mathematics',
        'Physics',
        'Literature & Fiction',
        'Business & Management',
        'History',
      ];
      for (const name of defaultCategories) {
        await query(
          'INSERT INTO Categories (category_name) VALUES (?) ON CONFLICT (category_name) DO NOTHING',
          [name]
        ).catch(async () => {
          await query('INSERT INTO Categories (category_name) VALUES (?)', [name]).catch(() => {});
        });
      }
    }

    const pubCheck = await query<any[]>('SELECT COUNT(*) as cnt FROM Publishers');
    const pubCount = Number(pubCheck[0]?.cnt || 0);
    if (pubCount === 0) {
      const defaultPublishers = [
        "O'Reilly Media",
        'MIT Press',
        'Addison-Wesley',
        'Pearson Education',
        'McGraw-Hill',
        'Cambridge University Press',
        'Springer Nature',
        'Penguin Random House',
        'HarperCollins',
        'Simon & Schuster',
      ];
      for (const name of defaultPublishers) {
        await query(
          'INSERT INTO Publishers (publisher_name) VALUES (?)',
          [name]
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error ensuring default categories and publishers:', err);
  }
}

// 1. Books Data
export async function getBooksData(params: {
  search?: string;
  category?: string;
  availability?: string;
  sort?: string;
  order?: string;
  page?: string | number;
  limit?: string | number;
}) {
  await ensureDefaultCategoriesAndPublishers();

  const search = (params.search || '').trim().toLowerCase();
  const category = (params.category || '').trim();
  const availability = (params.availability || 'all').trim().toLowerCase();
  const sortBy = params.sort || 'title';
  const sortOrder = (params.order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const page = Math.max(1, parseInt(String(params.page || '1'), 10));
  const limit = Math.max(1, Math.min(100, parseInt(String(params.limit || '10'), 10)));
  const offset = (page - 1) * limit;

  // Categories & Publishers list for dropdowns
  const [categories, publishers] = await Promise.all([
    query<any[]>('SELECT category_id, category_name FROM Categories ORDER BY category_name ASC'),
    query<any[]>('SELECT publisher_id, publisher_name FROM Publishers ORDER BY publisher_name ASC'),
  ]);

  // Books query with authors and available copies
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

  if (search) {
    allBooks = allBooks.filter((b) =>
      (b.title && b.title.toLowerCase().includes(search)) ||
      (b.isbn && b.isbn.toLowerCase().includes(search)) ||
      (b.authors && b.authors.toLowerCase().includes(search))
    );
  }

  if (category && category !== 'all') {
    allBooks = allBooks.filter((b) =>
      String(b.category_id) === category ||
      (b.category_name && b.category_name.toLowerCase() === category.toLowerCase())
    );
  }

  if (availability === 'available') {
    allBooks = allBooks.filter((b) => Number(b.available_copies) > 0);
  } else if (availability === 'unavailable') {
    allBooks = allBooks.filter((b) => Number(b.available_copies) <= 0);
  }

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

  return {
    books: paginated.map((b) => ({
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
      status: Number(b.available_copies) > 0 ? 'available' : 'unavailable',
    })),
    categories,
    publishers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    filters: {
      search,
      category: category || 'all',
      availability,
      sort: sortBy,
      order: sortOrder,
    },
  };
}

// 2. Members Data
export async function getMembersData(params: {
  search?: string;
  status?: string;
  page?: string | number;
  limit?: string | number;
}) {
  const search = (params.search || '').trim().toLowerCase();
  const status = (params.status || 'all').trim().toLowerCase();
  const page = Math.max(1, parseInt(String(params.page || '1'), 10));
  const limit = Math.max(1, Math.min(100, parseInt(String(params.limit || '10'), 10)));
  const offset = (page - 1) * limit;

  const sql = `
    SELECT m.member_id, m.full_name, m.email, m.phone, m.registration_date, m.membership_status,
           COALESCE(active_loans.cnt, 0) as active_loans_count
    FROM Members m
    LEFT JOIN (
      SELECT member_id, COUNT(*) as cnt FROM Loans WHERE return_date IS NULL GROUP BY member_id
    ) active_loans ON m.member_id = active_loans.member_id
    ORDER BY m.member_id DESC
  `;

  let members = await query<any[]>(sql);

  if (search) {
    members = members.filter(
      (m) =>
        (m.full_name && m.full_name.toLowerCase().includes(search)) ||
        (m.email && m.email.toLowerCase().includes(search)) ||
        (m.phone && m.phone.toLowerCase().includes(search))
    );
  }

  if (status && status !== 'all') {
    members = members.filter((m) => m.membership_status?.toLowerCase() === status);
  }

  const total = members.length;
  const paginated = members.slice(offset, offset + limit);

  return {
    members: paginated.map((m) => ({
      member_id: m.member_id,
      full_name: m.full_name,
      email: m.email,
      phone: m.phone,
      registration_date: toISODateString(m.registration_date),
      membership_status: m.membership_status,
      active_loans_count: Number(m.active_loans_count),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    filters: {
      search,
      status,
    },
  };
}

// 3. Circulation Data
export async function getCirculationData() {
  const [activeMembers, availableBooks, activeLoans, sessionLogs] = await Promise.all([
    query<any[]>(
      "SELECT member_id, full_name, email FROM Members WHERE membership_status = 'active' ORDER BY full_name ASC"
    ),
    query<any[]>(`
      SELECT b.book_id, b.title, b.isbn,
             b.total_copies - COALESCE(al.cnt, 0) as available_copies
      FROM Books b
      LEFT JOIN (
        SELECT book_id, COUNT(*) as cnt FROM Loans WHERE return_date IS NULL GROUP BY book_id
      ) al ON b.book_id = al.book_id
      WHERE (b.total_copies - COALESCE(al.cnt, 0)) > 0
      ORDER BY b.title ASC
    `),
    query<any[]>(`
      SELECT l.loan_id, l.book_id, l.member_id, l.issue_date, l.due_date,
             b.title, b.isbn, m.full_name, m.email,
             DATEDIFF(CURRENT_DATE, l.due_date) as days_overdue
      FROM Loans l
      JOIN Books b ON l.book_id = b.book_id
      JOIN Members m ON l.member_id = m.member_id
      WHERE l.return_date IS NULL
      ORDER BY l.due_date ASC
    `),
    query<any[]>(`
      SELECT log_id, event_type, details, created_at
      FROM Audit_Log
      ORDER BY log_id DESC
      LIMIT 10
    `),
  ]);

  return {
    activeMembers,
    availableBooks: availableBooks.map((b) => ({
      ...b,
      available_copies: Number(b.available_copies),
    })),
    activeLoans: activeLoans.map((l) => ({
      ...l,
      issue_date: toISODateString(l.issue_date),
      due_date: toISODateString(l.due_date),
      days_overdue: Math.max(0, Number(l.days_overdue || 0)),
    })),
    sessionLogs: sessionLogs.map((log) => ({
      ...log,
      created_at: toISODateString(log.created_at),
    })),
  };
}

// 4. History Data
export async function getHistoryData(params: {
  status?: string;
  search?: string;
  page?: string | number;
  limit?: string | number;
}) {
  const status = (params.status || 'all').trim().toLowerCase();
  const search = (params.search || '').trim().toLowerCase();
  const page = Math.max(1, parseInt(String(params.page || '1'), 10));
  const limit = Math.max(1, Math.min(100, parseInt(String(params.limit || '10'), 10)));
  const offset = (page - 1) * limit;

  const sql = `
    SELECT l.loan_id, l.book_id, l.member_id, l.issue_date, l.due_date, l.return_date,
           b.title, b.isbn, m.full_name, m.email,
           CASE 
             WHEN l.return_date IS NOT NULL THEN 'returned'
             WHEN l.due_date < CURRENT_DATE THEN 'overdue'
             ELSE 'active'
           END as status,
           CASE
             WHEN l.return_date IS NULL AND l.due_date < CURRENT_DATE 
             THEN DATEDIFF(CURRENT_DATE, l.due_date)
             ELSE 0
           END as days_overdue
    FROM Loans l
    JOIN Books b ON l.book_id = b.book_id
    JOIN Members m ON l.member_id = m.member_id
    ORDER BY l.loan_id DESC
  `;

  let loans = await query<any[]>(sql);

  if (search) {
    loans = loans.filter((l) =>
      (l.title && l.title.toLowerCase().includes(search)) ||
      (l.isbn && l.isbn.toLowerCase().includes(search)) ||
      (l.full_name && l.full_name.toLowerCase().includes(search)) ||
      (l.email && l.email.toLowerCase().includes(search))
    );
  }

  if (status === 'active') {
    loans = loans.filter((l) => l.status === 'active');
  } else if (status === 'returned') {
    loans = loans.filter((l) => l.status === 'returned');
  } else if (status === 'overdue') {
    loans = loans.filter((l) => l.status === 'overdue');
  }

  const total = loans.length;
  const paginated = loans.slice(offset, offset + limit);

  return {
    loans: paginated.map((l) => ({
      ...l,
      issue_date: toISODateString(l.issue_date),
      due_date: toISODateString(l.due_date),
      return_date: l.return_date ? toISODateString(l.return_date) : null,
      days_overdue: Number(l.days_overdue || 0),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    filters: {
      status,
      search,
    },
  };
}

// 5. Categories Data
export async function getCategoriesData() {
  await ensureDefaultCategoriesAndPublishers();
  const sql = `
    SELECT c.category_id, c.category_name,
           COUNT(DISTINCT b.book_id) as book_count,
           COALESCE(SUM(b.total_copies), 0) as total_copies
    FROM Categories c
    LEFT JOIN Books b ON c.category_id = b.category_id
    GROUP BY c.category_id, c.category_name
    ORDER BY c.category_name ASC
  `;

  const rows = await query<any[]>(sql);
  return rows.map((r) => ({
    category_id: r.category_id,
    category_name: r.category_name,
    book_count: Number(r.book_count || 0),
    total_copies: Number(r.total_copies || 0),
  }));
}

// 6. Reports Data
export async function getReportsData(type: string = 'most-borrowed') {
  let data: any[] = [];

  switch (type) {
    case 'most-borrowed':
      data = await query<any[]>(`
        SELECT b.book_id, b.isbn, b.title, c.category_name,
               COUNT(l.loan_id) as borrow_count,
               GROUP_CONCAT(DISTINCT a.author_name SEPARATOR ', ') as authors
        FROM Books b
        JOIN Categories c ON b.category_id = c.category_id
        LEFT JOIN Loans l ON b.book_id = l.book_id
        LEFT JOIN Book_Authors ba ON b.book_id = ba.book_id
        LEFT JOIN Authors a ON ba.author_id = a.author_id
        GROUP BY b.book_id, b.isbn, b.title, c.category_name
        ORDER BY borrow_count DESC, b.title ASC
        LIMIT 10
      `);
      break;

    case 'active-members':
      data = await query<any[]>(`
        SELECT m.member_id, m.full_name, m.email, m.membership_status,
               COUNT(l.loan_id) as total_borrows,
               SUM(CASE WHEN l.return_date IS NULL THEN 1 ELSE 0 END) as active_loans
        FROM Members m
        LEFT JOIN Loans l ON m.member_id = l.member_id
        GROUP BY m.member_id, m.full_name, m.email, m.membership_status
        ORDER BY total_borrows DESC, m.full_name ASC
        LIMIT 10
      `);
      break;

    case 'currently-issued':
      data = await query<any[]>(`
        SELECT l.loan_id, b.title, b.isbn, m.full_name, m.email,
               l.issue_date, l.due_date,
               CASE WHEN l.due_date < CURRENT_DATE THEN 'Overdue' ELSE 'Normal' END as loan_status
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        JOIN Members m ON l.member_id = m.member_id
        WHERE l.return_date IS NULL
        ORDER BY l.due_date ASC
      `);
      break;

    case 'overdue':
      data = await query<any[]>(`
        SELECT l.loan_id, b.title, b.isbn, m.full_name, m.email, m.phone,
               l.due_date,
               DATEDIFF(CURRENT_DATE, l.due_date) as days_overdue
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        JOIN Members m ON l.member_id = m.member_id
        WHERE l.return_date IS NULL AND l.due_date < CURRENT_DATE
        ORDER BY days_overdue DESC
      `);
      break;

    case 'monthly-stats': {
      const rows = await query<any[]>(`
        SELECT issue_date, return_date FROM Loans ORDER BY issue_date ASC
      `).catch(() => []);
      const monthMap = new Map<string, { month: string; total_issued: number; total_returned: number }>();
      for (const r of rows) {
        const d = toISODateString(r.issue_date);
        const m = d.slice(0, 7);
        if (!monthMap.has(m)) {
          monthMap.set(m, { month: m, total_issued: 0, total_returned: 0 });
        }
        const item = monthMap.get(m)!;
        item.total_issued += 1;
        if (r.return_date) {
          item.total_returned += 1;
        }
      }
      data = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
      break;
    }

    case 'category-distribution':
      data = await query<any[]>(`
        SELECT c.category_name,
               COUNT(b.book_id) as book_count,
               COALESCE(SUM(b.total_copies), 0) as total_copies
        FROM Categories c
        LEFT JOIN Books b ON c.category_id = b.category_id
        GROUP BY c.category_id, c.category_name
        ORDER BY book_count DESC
      `);
      break;

    default:
      data = [];
  }

  return data.map((row) => {
    const formatted: any = { ...row };
    if (formatted.issue_date) formatted.issue_date = toISODateString(formatted.issue_date);
    if (formatted.due_date) formatted.due_date = toISODateString(formatted.due_date);
    if (formatted.return_date) formatted.return_date = toISODateString(formatted.return_date);
    if (formatted.borrow_count !== undefined) formatted.borrow_count = Number(formatted.borrow_count);
    if (formatted.total_borrows !== undefined) formatted.total_borrows = Number(formatted.total_borrows);
    if (formatted.active_loans !== undefined) formatted.active_loans = Number(formatted.active_loans);
    if (formatted.days_overdue !== undefined) formatted.days_overdue = Number(formatted.days_overdue);
    if (formatted.book_count !== undefined) formatted.book_count = Number(formatted.book_count);
    if (formatted.total_copies !== undefined) formatted.total_copies = Number(formatted.total_copies);
    return formatted;
  });
}

// 7. Settings Data
export async function getSettingsData() {
  const dbStatus = await getDbStatus();

  const [booksCount, membersCount, loansCount, categoriesCount, authorsCount, publishersCount] = await Promise.all([
    query<any[]>('SELECT COUNT(*) as cnt FROM Books').then((r) => Number(r[0]?.cnt || 0)).catch(() => 0),
    query<any[]>('SELECT COUNT(*) as cnt FROM Members').then((r) => Number(r[0]?.cnt || 0)).catch(() => 0),
    query<any[]>('SELECT COUNT(*) as cnt FROM Loans').then((r) => Number(r[0]?.cnt || 0)).catch(() => 0),
    query<any[]>('SELECT COUNT(*) as cnt FROM Categories').then((r) => Number(r[0]?.cnt || 0)).catch(() => 0),
    query<any[]>('SELECT COUNT(*) as cnt FROM Authors').then((r) => Number(r[0]?.cnt || 0)).catch(() => 0),
    query<any[]>('SELECT COUNT(*) as cnt FROM Publishers').then((r) => Number(r[0]?.cnt || 0)).catch(() => 0),
  ]);

  return {
    dbStatus,
    counts: {
      books: booksCount,
      members: membersCount,
      loans: loansCount,
      categories: categoriesCount,
      authors: authorsCount,
      publishers: publishersCount,
    },
  };
}
