'use client';

import React from 'react';
import { X, BookOpen, Hash, Tag, Building2, Calendar, Layers, CheckCircle, AlertTriangle } from 'lucide-react';

interface BookDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: any | null;
}

export default function BookDetailModal({
  isOpen,
  onClose,
  book,
}: BookDetailModalProps) {
  if (!isOpen || !book) return null;

  const isAvailable = Number(book.available_copies) > 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-lg p-6 bg-white border-[3px] border-black rounded-lg shadow-[8px_8px_0px_#000] relative m-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b-2 border-black mb-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-[#FFE566] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000] shrink-0 mt-0.5">
              <BookOpen className="w-6 h-6 text-black" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold bg-black text-white px-2 py-0.5 rounded uppercase">
                ID #{book.book_id}
              </span>
              <h2 className="font-extrabold text-xl tracking-tight text-black mt-1 leading-snug">
                {book.title}
              </h2>
              <p className="text-sm font-semibold text-black/70">
                by {book.authors || 'Unknown Author'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border-2 border-black bg-white hover:bg-[#FF7B72] hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Availability Banner */}
        <div
          className={`p-3 border-2 border-black rounded-md mb-5 flex items-center justify-between shadow-[3px_3px_0px_#000] ${
            isAvailable ? 'bg-[#B8F28B]' : 'bg-[#FF7B72]'
          }`}
        >
          <div className="flex items-center gap-2">
            {isAvailable ? (
              <CheckCircle className="w-5 h-5 text-black" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-white" />
            )}
            <span className={`font-extrabold text-xs uppercase tracking-wider ${isAvailable ? 'text-black' : 'text-white'}`}>
              {isAvailable ? 'Available for Circulation' : 'Currently Out of Stock'}
            </span>
          </div>
          <span className="font-mono font-bold text-xs bg-white text-black border border-black px-2 py-0.5 rounded">
            {book.available_copies} of {book.total_copies} Available
          </span>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 text-xs font-medium">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md">
              <span className="text-black uppercase font-mono font-bold text-[10px] block mb-0.5 flex items-center gap-1">
                <Hash className="w-3 h-3 text-black" /> ISBN Code
              </span>
              <span className="font-mono font-bold text-black text-xs break-all">
                {book.isbn}
              </span>
            </div>
            <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md">
              <span className="text-black uppercase font-mono font-bold text-[10px] block mb-0.5 flex items-center gap-1">
                <Tag className="w-3 h-3 text-black" /> Category
              </span>
              <span className="badge badge-yellow font-bold text-black">{book.category_name || 'General'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md">
              <span className="text-black uppercase font-mono font-bold text-[10px] block mb-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-black" /> Publisher
              </span>
              <span className="font-bold text-black">{book.publisher_name || 'Publisher'}</span>
            </div>
            <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md">
              <span className="text-black uppercase font-mono font-bold text-[10px] block mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-black" /> Publication Year
              </span>
              <span className="font-mono font-bold text-black">
                {book.publication_year ? (book.publication_year < 0 ? `${Math.abs(book.publication_year)} BC` : book.publication_year) : 'N/A'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md flex items-center justify-between">
            <span className="text-black uppercase font-mono font-bold text-[10px] flex items-center gap-1">
              <Layers className="w-3 h-3 text-black" /> Copies Breakdown
            </span>
            <div className="flex gap-2">
              <span className="font-mono font-bold text-[11px] bg-white text-black border border-black px-2 py-0.5 rounded">
                Total: {book.total_copies}
              </span>
              <span className="font-mono font-bold text-[11px] bg-[#FFE566] text-black border border-black px-2 py-0.5 rounded">
                Issued: {Math.max(0, book.total_copies - book.available_copies)}
              </span>
              <span className="font-mono font-bold text-[11px] bg-[#B8F28B] text-black border border-black px-2 py-0.5 rounded">
                Available: {book.available_copies}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-5 border-t-2 border-black mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-black text-white border-2 border-black rounded-md font-bold text-xs uppercase tracking-wider hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
