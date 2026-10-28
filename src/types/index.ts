export interface Member {
  member_id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  registration_date: string;
  membership_status: 'active' | 'inactive';
  active_loans?: number;
}

export interface Book {
  book_id: number;
  title: string;
  isbn: string;
  author?: string;
  category?: string;
  total_copies: number;
  available?: number;
}

export interface ActiveLoan {
  loan_id: number;
  book_id?: number;
  title: string;
  member_id?: number;
  full_name: string;
  issue_date: string;
  due_date: string;
}

export interface HistoryLoan {
  loan_id: number;
  book_id?: number;
  title: string;
  isbn: string;
  full_name: string;
  email: string;
  issue_date: string;
  due_date: string;
  return_date?: string | null;
  status: 'active' | 'returned' | 'overdue';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
