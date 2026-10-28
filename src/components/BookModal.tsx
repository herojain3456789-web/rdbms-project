'use client';

import React, { useState, useEffect } from 'react';
import { X, BookPlus, Edit3, AlertCircle } from 'lucide-react';
import { createBookAction, updateBookAction } from '@/app/actions';

interface Category {
  category_id: number;
  category_name: string;
}

interface Publisher {
  publisher_id: number;
  publisher_name: string;
}

interface BookFormData {
  book_id?: number;
  isbn: string;
  title: string;
  category_id: number | '';
  publisher_id: number | '';
  publication_year: number | '';
  total_copies: number;
  authors: string;
}

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookToEdit?: any | null;
  initialCategories?: Category[];
  initialPublishers?: Publisher[];
}

export default function BookModal({
  isOpen,
  onClose,
  onSuccess,
  bookToEdit,
  initialCategories,
  initialPublishers,
}: BookModalProps) {
  const isEditing = Boolean(bookToEdit);

  const [formData, setFormData] = useState<BookFormData>({
    isbn: '',
    title: '',
    category_id: '',
    publisher_id: '',
    publication_year: 2024,
    total_copies: 3,
    authors: '',
  });

  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const [publishers, setPublishers] = useState<Publisher[]>(initialPublishers || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dropdowns if not provided
  useEffect(() => {
    if (isOpen) {
      if (initialCategories && initialCategories.length > 0) {
        setCategories(initialCategories);
      }
      if (initialPublishers && initialPublishers.length > 0) {
        setPublishers(initialPublishers);
      }
      if ((!initialCategories || initialCategories.length === 0) || (!initialPublishers || initialPublishers.length === 0)) {
        Promise.all([
          (!initialCategories || initialCategories.length === 0) ? fetch('/api/categories').then((r) => r.json()) : Promise.resolve({}),
          (!initialPublishers || initialPublishers.length === 0) ? fetch('/api/publishers').then((r) => r.json()) : Promise.resolve({}),
        ])
          .then(([catData, pubData]) => {
            if (catData?.categories) setCategories(catData.categories);
            if (pubData?.publishers) setPublishers(pubData.publishers);
          })
          .catch((err) => console.error('Failed to load categories/publishers:', err));
      }
    }
  }, [isOpen, initialCategories, initialPublishers]);

  // Pre-fill when editing
  useEffect(() => {
    if (bookToEdit) {
      setFormData({
        book_id: bookToEdit.book_id,
        isbn: bookToEdit.isbn || '',
        title: bookToEdit.title || '',
        category_id: bookToEdit.category_id || '',
        publisher_id: bookToEdit.publisher_id || '',
        publication_year: bookToEdit.publication_year || '',
        total_copies: bookToEdit.total_copies ?? 1,
        authors: bookToEdit.authors || '',
      });
    } else {
      setFormData({
        isbn: '',
        title: '',
        category_id: '',
        publisher_id: '',
        publication_year: 2024,
        total_copies: 3,
        authors: '',
      });
    }
    setError(null);
  }, [bookToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.isbn.trim()) {
      setError('ISBN is required (e.g. 978-0-123-45678-9)');
      return;
    }
    if (!formData.title.trim()) {
      setError('Book title is required');
      return;
    }
    if (!formData.category_id) {
      setError('Please select a Category');
      return;
    }
    if (!formData.publisher_id) {
      setError('Please select a Publisher');
      return;
    }
    if (formData.total_copies < 0 || isNaN(formData.total_copies)) {
      setError('Total copies must be a non-negative number');
      return;
    }

    try {
      setLoading(true);
      const res = isEditing
        ? await updateBookAction(formData.book_id!, formData)
        : await createBookAction(formData);

      if (res.error) {
        throw new Error(res.error);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the book.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-lg p-6 bg-white border-[3px] border-black rounded-lg shadow-[8px_8px_0px_#000] relative m-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFE566] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <BookPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-extrabold text-xl tracking-tight text-black">
                {isEditing ? 'Edit Book Details' : 'Add New Book'}
              </h2>
              <p className="text-xs font-mono font-medium text-black/60">
                {isEditing ? `Book ID #${formData.book_id}` : 'Fill in book attributes for MySQL table insertion'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border-2 border-black bg-white hover:bg-[#FF7B72] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-[#FF7B72]/20 border-2 border-[#FF7B72] rounded-md flex items-start gap-2 text-xs font-bold text-black animate-slide-up">
            <AlertCircle className="w-4 h-4 text-[#FF7B72] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Title <span className="text-[#FF7B72]">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Design Patterns: Elements of Reusable Object-Oriented Software"
              className="input-brutal"
              required
            />
          </div>

          {/* ISBN & Total Copies Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                ISBN <span className="text-[#FF7B72]">*</span>
              </label>
              <input
                type="text"
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                placeholder="e.g. 978-0-201-63361-0"
                className="input-brutal font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Total Copies <span className="text-[#FF7B72]">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.total_copies}
                onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value, 10) || 0 })}
                className="input-brutal font-mono"
                required
              />
            </div>
          </div>

          {/* Authors */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Author(s) <span className="text-black/50 lowercase font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={formData.authors}
              onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
              placeholder="e.g. Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides"
              className="input-brutal"
            />
          </div>

          {/* Category & Publisher Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Category <span className="text-[#FF7B72]">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) || '' })}
                className="select-brutal w-full"
                required
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Publisher <span className="text-[#FF7B72]">*</span>
              </label>
              <select
                value={formData.publisher_id}
                onChange={(e) => setFormData({ ...formData, publisher_id: Number(e.target.value) || '' })}
                className="select-brutal w-full"
                required
              >
                <option value="">-- Select Publisher --</option>
                {publishers.map((p) => (
                  <option key={p.publisher_id} value={p.publisher_id}>
                    {p.publisher_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Publication Year */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Publication Year
            </label>
            <input
              type="number"
              value={formData.publication_year}
              onChange={(e) => setFormData({ ...formData, publication_year: parseInt(e.target.value, 10) || '' })}
              placeholder="e.g. 1994"
              className="input-brutal font-mono"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border-2 border-black rounded-md font-bold text-sm bg-white hover:bg-[#F5F3EB] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-brutal btn-yellow cursor-pointer"
            >
              {loading ? 'Saving to Database...' : isEditing ? 'Update Book' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
