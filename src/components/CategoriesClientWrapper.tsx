'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '@/app/actions';

interface CategoryItem {
  category_id: number;
  category_name: string;
  book_count: number;
  total_copies: number;
}

interface CategoriesClientWrapperProps {
  categories: CategoryItem[];
}

export default function CategoriesClientWrapper({
  categories,
}: CategoriesClientWrapperProps) {
  const router = useRouter();

  // Add / Edit State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Category
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const res = await createCategoryAction(newCategoryName.trim());
      if (res.error) {
        throw new Error(res.error);
      }

      setFeedback({ type: 'success', message: `Category "${newCategoryName}" created successfully!` });
      setNewCategoryName('');
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Category
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const res = await updateCategoryAction(editingCategory.category_id, editName.trim());
      if (res.error) {
        throw new Error(res.error);
      }

      setFeedback({ type: 'success', message: `Category updated to "${editName}"!` });
      setEditingCategory(null);
      setEditName('');
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category
  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      setIsDeleting(true);
      setFeedback(null);
      const res = await deleteCategoryAction(categoryToDelete.category_id);
      if (res.error) {
        throw new Error(res.error);
      }

      setFeedback({ type: 'success', message: `Category "${categoryToDelete.category_name}" deleted!` });
      setCategoryToDelete(null);
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      setCategoryToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-[3px] border-black p-5 rounded-lg shadow-[5px_5px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FF7B72] text-white border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Tags className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-black">
                Categories & Genres
              </h1>
              <span className="font-mono text-xs font-black bg-[#FF7B72] text-white border-2 border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_#000]">
                {categories.length} Genres
              </span>
            </div>
            <p className="text-xs font-semibold text-black/60">
              Taxonomy classification enforcing foreign key constraints on books
            </p>
          </div>
        </div>
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

      {/* Create New Category Form */}
      <div className="bg-[#FFFDF5] border-[2.5px] border-black rounded-lg p-5 shadow-[4px_4px_0px_#000]">
        <h2 className="font-black text-sm uppercase tracking-wider text-black mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-black" />
          <span>Add New Category</span>
        </h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Distributed Systems, Quantum Computing, Classic Fiction..."
            className="input-brutal flex-1 text-xs"
            disabled={isSubmitting}
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !newCategoryName.trim()}
            className="btn-brutal btn-yellow cursor-pointer text-xs py-2 px-5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Adding...' : 'Create Category'}</span>
          </button>
        </form>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.category_id}
            className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-transform flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#FFFDF5] border border-black rounded shadow-[1px_1px_0px_#000]">
                  #{cat.category_id}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setEditName(cat.category_name);
                    }}
                    title="Edit Category Name"
                    className="p-1 bg-white hover:bg-[#FFE566] border border-black rounded transition-colors shadow-[1px_1px_0px_#000] cursor-pointer"
                  >
                    <Pencil className="w-3 h-3 text-black" />
                  </button>
                  <button
                    onClick={() => setCategoryToDelete(cat)}
                    title="Delete Category"
                    className="p-1 bg-white hover:bg-[#FF7B72] hover:text-white border border-black rounded transition-colors shadow-[1px_1px_0px_#000] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {editingCategory?.category_id === cat.category_id ? (
                <form onSubmit={handleUpdate} className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-brutal text-xs py-1.5 px-2"
                    autoFocus
                    required
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="submit"
                      disabled={isSubmitting || !editName.trim()}
                      className="btn-brutal btn-yellow text-xs py-1 px-3 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="p-1 bg-white border border-black rounded shadow-[1px_1px_0px_#000] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <h3 className="font-black text-lg text-black mb-1 leading-tight">
                  {cat.category_name}
                </h3>
              )}
            </div>

            <div className="pt-3 border-t-2 border-black/20 mt-3 flex items-center justify-between text-xs font-mono font-bold text-black/70">
              <div className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-black" />
                <span>{cat.book_count} Titles</span>
              </div>
              <div>
                <span>{cat.total_copies} Total Copies</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(categoryToDelete)}
        title="Delete Category"
        message={`Are you sure you want to delete category "${categoryToDelete?.category_name}"? If any books belong to this category, MySQL foreign key constraints will reject this operation.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Yes, Delete Category'}
        isLoading={isDeleting}
        danger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
