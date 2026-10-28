'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, BookOpen, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: number | null;
}

export default function MemberDetailModal({
  isOpen,
  onClose,
  memberId,
}: MemberDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && memberId) {
      setLoading(true);
      setError(null);
      fetch(`/api/members/${memberId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load member profile');
          return res.json();
        })
        .then((json) => setData(json))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, memberId]);

  if (!isOpen || !memberId) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-2xl p-6 bg-white border-[3px] border-black rounded-lg shadow-[8px_8px_0px_#000] relative m-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#B8F28B] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <User className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-black text-white px-2 py-0.5 rounded uppercase">
                  ID #{memberId}
                </span>
                {data?.member && (
                  <span
                    className={`badge ${
                      data.member.membership_status === 'active'
                        ? 'badge-green'
                        : 'badge-gray'
                    }`}
                  >
                    {data.member.membership_status}
                  </span>
                )}
              </div>
              <h2 className="font-extrabold text-xl tracking-tight text-black mt-1">
                {data?.member?.full_name || 'Member Profile'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border-2 border-black bg-white hover:bg-[#FF7B72] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center font-mono text-sm font-bold text-black/50">
            Fetching member and borrowing history...
          </div>
        ) : error ? (
          <div className="p-4 bg-[#FF7B72]/20 border-2 border-[#FF7B72] rounded-md text-xs font-bold text-black flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#FF7B72]" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Patron Profile Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md">
                <span className="text-[10px] font-mono font-bold text-black/50 uppercase block mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Address
                </span>
                <span className="text-xs font-mono font-bold text-black break-all">
                  {data?.member?.email}
                </span>
              </div>
              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md">
                <span className="text-[10px] font-mono font-bold text-black/50 uppercase block mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number
                </span>
                <span className="text-xs font-mono font-bold text-black">
                  {data?.member?.phone || 'Not provided'}
                </span>
              </div>
              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md">
                <span className="text-[10px] font-mono font-bold text-black/50 uppercase block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Registered
                </span>
                <span className="text-xs font-mono font-bold text-black">
                  {data?.member?.registration_date}
                </span>
              </div>
            </div>

            {/* Borrowing History Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-black flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#4169FF]" />
                  Borrowing History ({data?.loans?.length || 0})
                </h3>
                <span className="text-[11px] font-mono font-bold text-black/60">
                  Active Loans: {data?.member?.active_loans || 0}
                </span>
              </div>

              <div className="border-2 border-black rounded-md overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FFE566] border-b-2 border-black font-extrabold uppercase font-mono sticky top-0">
                    <tr>
                      <th className="p-2 border-r border-black">Loan ID</th>
                      <th className="p-2 border-r border-black">Book Title</th>
                      <th className="p-2 border-r border-black">Issue Date</th>
                      <th className="p-2 border-r border-black">Due Date</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/20 font-medium">
                    {data?.loans && data.loans.length > 0 ? (
                      data.loans.map((loan: any) => (
                        <tr key={loan.loan_id} className="hover:bg-[#FFFDF5]">
                          <td className="p-2 font-mono font-bold border-r border-black/20">
                            #{loan.loan_id}
                          </td>
                          <td className="p-2 font-bold text-black border-r border-black/20 max-w-[200px] truncate">
                            {loan.title}
                          </td>
                          <td className="p-2 font-mono border-r border-black/20">
                            {loan.issue_date}
                          </td>
                          <td className="p-2 font-mono border-r border-black/20">
                            {loan.due_date}
                          </td>
                          <td className="p-2">
                            {loan.status === 'returned' && (
                              <span className="badge badge-green flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3" /> Returned
                              </span>
                            )}
                            {loan.status === 'active' && (
                              <span className="badge badge-yellow flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" /> Active
                              </span>
                            )}
                            {loan.status === 'overdue' && (
                              <span className="badge badge-coral flex items-center gap-1 w-fit">
                                <AlertCircle className="w-3 h-3" /> Overdue
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-black/50 font-mono">
                          No borrowing records found for this patron.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-5 border-t-2 border-black mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-black text-white border-2 border-black rounded-md font-bold text-xs uppercase tracking-wider hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
