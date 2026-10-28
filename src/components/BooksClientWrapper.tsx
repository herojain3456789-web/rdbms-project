'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Hash,
} from 'lucide-react';
import BookModal from '@/components/BookModal';
import BookDetailModal from '@/components/BookDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { deleteBookAction } from '@/app/actions';

interface BooksClientWrapperProps {
  books: any[];
  categories: any[];
  publishers?: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search: string;
    category: string;
    availability: string;
    sort: string;
    order: string;
  };
}

export default function BooksClientWrapper({
  books,
  categories,
  publishers,
  pagination,
  filters,
}: BooksClientWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Local filter states
  const [search, setSearch] = useState(filters.search || '');
  const [category, setCategory] = useState(filters.category || 'all');
  const [availability, setAvailability] = useState(filters.availability || 'all');
  const [sortBy, setSortBy] = useState(filters.sort || 'title');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(
    (filters.order as 'ASC' | 'DESC') || 'ASC'
  );

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<any | null>(null);
  const [bookToView, setBookToView] = useState<any | null>(null);
  const [bookToDelete, setBookToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Update URL search parameters
  const updateParams = (newParams: Record<string, string | number>) => {
    const current = new URLSearchParams();
    if (search) current.set('search', search);
    if (category && category !== 'all') current.set('category', category);
    if (availability && availability !== 'all') current.set('availability', availability);
    if (sortBy) current.set('sort', sortBy);
    if (sortOrder) current.set('order', sortOrder);
    current.set('page', '1');

    Object.entries(newParams).forEach(([key, val]) => {
      if (val === 'all' || val === '' || val === undefined) {
        current.delete(key);
      } else {
        current.set(key, String(val));
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${current.toString()}`);
    });
  };

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;
    try {
      setIsDeleting(true);
      const res = await deleteBookAction(bookToDelete.book_id);
      if (res.error) {
        throw new Error(res.error);
      }
      setFeedback({ type: 'success', message: `Book "${bookToDelete.title}" deleted successfully.` });
      setBookToDelete(null);
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      setBookToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-[3px] border-black p-5 rounded-lg shadow-[5px_5px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FFE566] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <BookOpen className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-black">
                Book Inventory
              </h1>
              <span className="font-mono text-xs font-black bg-[#FFE566] border-2 border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_#000]">
                {pagination.total} Total
              </span>
              {isPending && (
                <span className="text-xs font-mono font-bold text-black/60 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-black/60">
              Manage library catalog, ISBN records, author junctions, and copy availability
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setBookToEdit(null);
            setIsBookModalOpen(true);
          }}
          className="btn-brutal btn-yellow cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Book</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3 border-2 border-black rounded-md flex items-center justify-between shadow-[3px_3px_0px_#000] animate-slide-up ${
            feedback.type === 'success' ? 'bg-[#B8F28B]' : 'bg-[#FF7B72] text-white'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-mono font-bold uppercase underline cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-[#FFFDF5] border-[2.5px] border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateParams({ search });
                }
              }}
              onBlur={() => {
                if (search !== filters.search) {
                  updateParams({ search });
                }
              }}
              placeholder="Search by Title, ISBN, Author..."
              className="input-brutal pl-9 text-xs"
            />
            <Search className="w-4 h-4 text-black/50 absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              const val = e.target.value;
              setCategory(val);
              updateParams({ category: val });
            }}
            className="select-brutal text-xs"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id.toString()}>
                {c.category_name}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availability}
            onChange={(e) => {
              const val = e.target.value;
              setAvailability(val);
              updateParams({ availability: val });
            }}
            className="select-brutal text-xs"
          >
            <option value="all">All Availability Status</option>
            <option value="available">Available in Stock</option>
            <option value="unavailable">Fully Issued / Out of Stock</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                const val = e.target.value;
                setSortBy(val);
                updateParams({ sort: val });
              }}
              className="select-brutal text-xs flex-1"
            >
              <option value="title">Sort by Title</option>
              <option value="publication_year">Sort by Year</option>
              <option value="available_copies">Sort by Available Copies</option>
              <option value="book_id">Sort by Book ID</option>
            </select>
            <button
              onClick={() => {
                const newOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
                setSortOrder(newOrder);
                updateParams({ order: newOrder });
              }}
              title="Toggle Sort Order"
              className="p-2.5 bg-white border-2 border-black rounded-md hover:bg-[#FFE566] transition-colors cursor-pointer shrink-0 shadow-[2px_2px_0px_#000]"
            >
              <ArrowUpDown className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FFE566] border-b-[2.5px] border-black font-mono font-bold uppercase text-black">
              <tr>
                <th className="p-3 border-r-2 border-black">ID</th>
                <th className="p-3 border-r-2 border-black">ISBN</th>
                <th className="p-3 border-r-2 border-black">Title & Author</th>
                <th className="p-3 border-r-2 border-black">Category</th>
                <th className="p-3 border-r-2 border-black">Publisher</th>
                <th className="p-3 border-r-2 border-black text-center">Year</th>
                <th className="p-3 border-r-2 border-black text-center">Copies</th>
                <th className="p-3 border-r-2 border-black text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/20 font-medium">
              {books.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-black/60 font-mono">
                    No books matched the filter criteria.
                  </td>
                </tr>
              ) : (
                books.map((b) => (
                  <tr key={b.book_id} className="hover:bg-[#FFFDF5] transition-colors">
                    <td className="p-3 font-mono font-bold border-r-2 border-black/20">
                      #{b.book_id}
                    </td>
                    <td className="p-3 font-mono text-[11px] border-r-2 border-black/20">
                      {b.isbn}
                    </td>
                    <td className="p-3 border-r-2 border-black/20">
                      <div className="font-black text-black">{b.title}</div>
                      <div className="text-[11px] text-black/70">by {b.authors}</div>
                    </td>
                    <td className="p-3 border-r-2 border-black/20">
                      <span className="badge-brutal bg-[#FFE566] text-black text-[10px]">
                        {b.category_name}
                      </span>
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-black/80">
                      {b.publisher_name}
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-center font-mono">
                      {b.publication_year || '—'}
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-center">
                      <span className="font-mono font-bold text-black">
                        {b.available_copies}
                      </span>
                      <span className="text-black/50 text-[11px]"> / {b.total_copies}</span>
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-center">
                      <span
                        className={`badge-brutal ${
                          b.available_copies > 0 ? 'badge-available' : 'badge-unavailable'
                        }`}
                      >
                        {b.available_copies > 0 ? 'Available' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setBookToView(b)}
                          title="View Details"
                          className="p-1.5 bg-white hover:bg-[#FFE566] border-2 border-black rounded transition-colors shadow-[1px_1px_0px_#000] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-black" />
                        </button>
                        <button
                          onClick={() => {
                            setBookToEdit(b);
                            setIsBookModalOpen(true);
                          }}
                          title="Edit Book"
                          className="p-1.5 bg-white hover:bg-[#4169FF] hover:text-white border-2 border-black rounded transition-colors shadow-[1px_1px_0px_#000] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setBookToDelete(b)}
                          title="Delete Book"
                          className="p-1.5 bg-white hover:bg-[#FF7B72] hover:text-white border-2 border-black rounded transition-colors shadow-[1px_1px_0px_#000] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-[#FFFDF5] border-t-[2.5px] border-black p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono font-bold">
          <div>
            Showing Page <span className="underline">{pagination.page}</span> of {pagination.totalPages} ({pagination.total} total books)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateParams({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
              className="p-1.5 border-2 border-black rounded bg-white hover:bg-[#FFE566] disabled:opacity-40 disabled:cursor-not-allowed shadow-[1px_1px_0px_#000] cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 py-1 bg-white border-2 border-black rounded shadow-[1px_1px_0px_#000]">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => updateParams({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 border-2 border-black rounded bg-white hover:bg-[#FFE566] disabled:opacity-40 disabled:cursor-not-allowed shadow-[1px_1px_0px_#000] cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Book Modals */}
      <BookModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setBookToEdit(null);
        }}
        onSuccess={() => {
          setFeedback({
            type: 'success',
            message: bookToEdit ? 'Book updated successfully!' : 'New book added successfully!',
          });
          router.refresh();
        }}
        bookToEdit={bookToEdit}
        initialCategories={categories}
        initialPublishers={publishers}
      />

      <BookDetailModal
        isOpen={Boolean(bookToView)}
        onClose={() => setBookToView(null)}
        book={bookToView}
      />

      <ConfirmDialog
        isOpen={Boolean(bookToDelete)}
        title="Delete Book"
        message={`Are you sure you want to permanently delete "${bookToDelete?.title}" (ISBN: ${bookToDelete?.isbn})? This operation cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Yes, Delete Book'}
        isLoading={isDeleting}
        danger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setBookToDelete(null)}
      />
    </div>
  );
}
