'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Pencil,
  History,
  PowerOff,
  Power,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
} from 'lucide-react';
import MemberModal from '@/components/MemberModal';
import MemberDetailModal from '@/components/MemberDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toggleMemberStatusAction } from '@/app/actions';

interface MembersClientWrapperProps {
  members: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search: string;
    status: string;
  };
}

export default function MembersClientWrapper({
  members,
  pagination,
  filters,
}: MembersClientWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Local filter state
  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(filters.status || 'all');

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<any | null>(null);
  const [memberHistoryId, setMemberHistoryId] = useState<number | null>(null);
  const [memberToToggle, setMemberToToggle] = useState<any | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const updateParams = (newParams: Record<string, string | number>) => {
    const current = new URLSearchParams();
    if (search) current.set('search', search);
    if (status && status !== 'all') current.set('status', status);
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

  const handleToggleStatus = async () => {
    if (!memberToToggle) return;
    try {
      setIsToggling(true);
      const res = await toggleMemberStatusAction(memberToToggle.member_id);
      if (res.error) {
        throw new Error(res.error);
      }
      setFeedback({
        type: 'success',
        message: `Member status updated to "${res.newStatus}".`,
      });
      setMemberToToggle(null);
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      setMemberToToggle(null);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-[3px] border-black p-5 rounded-lg shadow-[5px_5px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#4169FF] text-white border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-black">
                Member Directory
              </h1>
              <span className="font-mono text-xs font-black bg-[#4169FF] text-white border-2 border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_#000]">
                {pagination.total} Registered
              </span>
              {isPending && (
                <span className="text-xs font-mono font-bold text-black/60 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-black/60">
              Manage library patrons, membership statuses, active loans, and borrowing privileges
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMemberToEdit(null);
            setIsMemberModalOpen(true);
          }}
          className="btn-brutal btn-blue cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Member</span>
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
      <div className="bg-[#FFFDF5] border-[2.5px] border-black rounded-lg p-4 shadow-[4px_4px_0px_#000]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              placeholder="Search by name, email, or phone..."
              className="input-brutal pl-9 text-xs"
            />
            <Search className="w-4 h-4 text-black/50 absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              const val = e.target.value;
              setStatus(val);
              updateParams({ status: val });
            }}
            className="select-brutal text-xs"
          >
            <option value="all">All Membership Statuses</option>
            <option value="active">Active Members Only</option>
            <option value="inactive">Inactive Members Only</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#4169FF] text-white border-b-[2.5px] border-black font-mono font-bold uppercase">
              <tr>
                <th className="p-3 border-r-2 border-black">ID</th>
                <th className="p-3 border-r-2 border-black">Full Name</th>
                <th className="p-3 border-r-2 border-black">Contact Details</th>
                <th className="p-3 border-r-2 border-black text-center">Registration</th>
                <th className="p-3 border-r-2 border-black text-center">Active Loans</th>
                <th className="p-3 border-r-2 border-black text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/20 font-medium">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-black/60 font-mono">
                    No registered members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.member_id} className="hover:bg-[#FFFDF5] transition-colors">
                    <td className="p-3 font-mono font-bold border-r-2 border-black/20">
                      #{m.member_id}
                    </td>
                    <td className="p-3 border-r-2 border-black/20">
                      <div className="font-black text-black">{m.full_name}</div>
                    </td>
                    <td className="p-3 border-r-2 border-black/20">
                      <div className="flex items-center gap-1.5 text-black/80">
                        <Mail className="w-3 h-3 text-black/50" />
                        <span>{m.email}</span>
                      </div>
                      {m.phone && (
                        <div className="flex items-center gap-1.5 text-black/60 text-[11px] mt-0.5">
                          <Phone className="w-3 h-3 text-black/40" />
                          <span>{m.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-center font-mono">
                      {m.registration_date}
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-center">
                      <span
                        className={`font-mono font-black px-2 py-0.5 rounded border border-black text-xs ${
                          m.active_loans_count > 0
                            ? 'bg-[#FFE566] text-black shadow-[1px_1px_0px_#000]'
                            : 'bg-black/5 text-black/60'
                        }`}
                      >
                        {m.active_loans_count} Active
                      </span>
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-center">
                      <span
                        className={`badge-brutal ${
                          m.membership_status === 'active' ? 'badge-active' : 'badge-inactive'
                        }`}
                      >
                        {m.membership_status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setMemberHistoryId(m.member_id)}
                          title="Borrowing History"
                          className="p-1.5 bg-white hover:bg-[#FFE566] border-2 border-black rounded transition-colors shadow-[1px_1px_0px_#000] cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-black" />
                        </button>
                        <button
                          onClick={() => {
                            setMemberToEdit(m);
                            setIsMemberModalOpen(true);
                          }}
                          title="Edit Member"
                          className="p-1.5 bg-white hover:bg-[#4169FF] hover:text-white border-2 border-black rounded transition-colors shadow-[1px_1px_0px_#000] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setMemberToToggle(m)}
                          title={m.membership_status === 'active' ? 'Deactivate Member' : 'Activate Member'}
                          className={`p-1.5 border-2 border-black rounded transition-colors shadow-[1px_1px_0px_#000] cursor-pointer ${
                            m.membership_status === 'active'
                              ? 'bg-white hover:bg-[#FF7B72] hover:text-white text-black'
                              : 'bg-white hover:bg-[#B8F28B] text-black'
                          }`}
                        >
                          {m.membership_status === 'active' ? (
                            <PowerOff className="w-3.5 h-3.5" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
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
            Showing Page <span className="underline">{pagination.page}</span> of {pagination.totalPages} ({pagination.total} total members)
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

      {/* Modals */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setMemberToEdit(null);
        }}
        onSuccess={() => {
          setFeedback({
            type: 'success',
            message: memberToEdit ? 'Member updated successfully!' : 'Member registered successfully!',
          });
          router.refresh();
        }}
        memberToEdit={memberToEdit}
      />

      <MemberDetailModal
        isOpen={Boolean(memberHistoryId)}
        onClose={() => setMemberHistoryId(null)}
        memberId={memberHistoryId}
      />

      <ConfirmDialog
        isOpen={Boolean(memberToToggle)}
        title={memberToToggle?.membership_status === 'active' ? 'Deactivate Member' : 'Activate Member'}
        message={`Are you sure you want to ${
          memberToToggle?.membership_status === 'active' ? 'deactivate' : 'reactivate'
        } ${memberToToggle?.full_name}? ${
          memberToToggle?.membership_status === 'active'
            ? 'Inactive members are restricted from issuing new books, but historical borrowing logs will remain intact.'
            : 'Active members regain book issuing privileges.'
        }`}
        confirmLabel={
          isToggling
            ? 'Updating...'
            : memberToToggle?.membership_status === 'active'
            ? 'Deactivate'
            : 'Activate'
        }
        isLoading={isToggling}
        danger={memberToToggle?.membership_status === 'active'}
        onConfirm={handleToggleStatus}
        onCancel={() => setMemberToToggle(null)}
      />
    </div>
  );
}
