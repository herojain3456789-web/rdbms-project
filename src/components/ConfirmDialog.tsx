'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  danger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  danger = true,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-md p-6 bg-white border-[3px] border-black rounded-lg shadow-[8px_8px_0px_#000] relative m-4">
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded border-2 border-black bg-white hover:bg-[#FF7B72] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-md border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] ${
              danger ? 'bg-[#FF7B72] text-white' : 'bg-[#FFE566] text-black'
            }`}
          >
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-black tracking-tight leading-tight mb-2">
              {title}
            </h3>
            <p className="text-sm font-medium text-black/70 leading-relaxed mb-6">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t-2 border-black">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border-2 border-black rounded-md font-bold text-sm bg-white hover:bg-[#F5F3EB] transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 border-2 border-black rounded-md font-bold text-sm text-white shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer ${
              danger ? 'bg-[#FF7B72] hover:bg-[#e8665d]' : 'bg-[#4169FF] hover:bg-[#3256db]'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
