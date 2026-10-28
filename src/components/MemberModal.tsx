'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, AlertCircle } from 'lucide-react';

import { createMemberAction, updateMemberAction } from '@/app/actions';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  memberToEdit?: any | null;
}

export default function MemberModal({
  isOpen,
  onClose,
  onSuccess,
  memberToEdit,
}: MemberModalProps) {
  const isEditing = Boolean(memberToEdit);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memberToEdit) {
      setFullName(memberToEdit.full_name || '');
      setEmail(memberToEdit.email || '');
      setPhone(memberToEdit.phone || '');
      setStatus(memberToEdit.membership_status || 'active');
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setStatus('active');
    }
    setError(null);
  }, [memberToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid email format (e.g. name@example.com)');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        membership_status: status,
      };

      const res = isEditing
        ? await updateMemberAction(memberToEdit.member_id, payload)
        : await createMemberAction(payload);

      if (res.error) {
        throw new Error(res.error);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving member details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-md p-6 bg-white border-[3px] border-black rounded-lg shadow-[8px_8px_0px_#000] relative m-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4169FF] text-white border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
              {isEditing ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-extrabold text-xl tracking-tight text-black">
                {isEditing ? 'Edit Member Profile' : 'Register New Member'}
              </h2>
              <p className="text-xs font-mono font-medium text-black/60">
                {isEditing ? `Member ID #${memberToEdit.member_id}` : 'Create a library patron account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border-2 border-black bg-white hover:bg-[#FF7B72] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
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
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Full Name <span className="text-[#FF7B72]">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Samantha Vance"
              className="input-brutal"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Email Address <span className="text-[#FF7B72]">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. samantha.vance@example.com"
              className="input-brutal font-mono text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 555-0199"
              className="input-brutal font-mono"
            />
          </div>

          {isEditing && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Membership Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="select-brutal w-full"
              >
                <option value="active">Active (Can borrow books)</option>
                <option value="inactive">Inactive (Circulation suspended)</option>
              </select>
            </div>
          )}

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
              className="btn-brutal btn-blue cursor-pointer"
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
