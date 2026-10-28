'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  History,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

interface HistoryClientWrapperProps {
  loans: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status: string;
    search: string;
  };
}

export default function HistoryClientWrapper({
  loans,
  pagination,
  filters,
}: HistoryClientWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [filter, setFilter] = useState(filters.status || 'all');
  const [search, setSearch] = useState(filters.search || '');

  const updateParams = (newParams: Record<string, string | number>) => {
    const current = new URLSearchParams();
    if (search) current.set('search', search);
    if (filter && filter !== 'all') current.set('status', filter);
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

  // Export to CSV
  const handleExportCSV = () => {
    if (!loans.length) return;

    const headers = [
      'Loan ID',
      'Book Title',
      'ISBN',
      'Member Name',
      'Member Email',
      'Issue Date',
      'Due Date',
      'Return Date',
      'Status',
      'Days Overdue',
    ];
    const rows = loans.map((l) => [
      l.loan_id,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      l.isbn,
      `"${(l.full_name || '').replace(/"/g, '""')}"`,
      l.email,
      l.issue_date,
      l.due_date,
      l.return_date || 'N/A',
      l.status,
      l.days_overdue || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bookstack-circulation-history-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-[3px] border-black p-5 rounded-lg shadow-[5px_5px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FFE566] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <History className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-black">
                Borrowing Ledger
              </h1>
              <span className="font-mono text-xs font-black bg-[#FFE566] border-2 border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_#000]">
                {pagination.total} Records
              </span>
              {isPending && (
                <span className="text-xs font-mono font-bold text-black/60 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-black/60">
              Audit log of all book circulation events, loan timelines, and return timestamps
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={loans.length === 0}
          className="btn-brutal btn-yellow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Export History to CSV</span>
        </button>
      </div>

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
              placeholder="Search by book title, member name, or email..."
              className="input-brutal pl-9 text-xs"
            />
            <Search className="w-4 h-4 text-black/50 absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <select
            value={filter}
            onChange={(e) => {
              const val = e.target.value;
              setFilter(val);
              updateParams({ status: val });
            }}
            className="select-brutal text-xs"
          >
            <option value="all">All Loan Records</option>
            <option value="active">Active Loans Only</option>
            <option value="returned">Returned Books Only</option>
            <option value="overdue">Overdue Loans Only</option>
          </select>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FFE566] border-b-[2.5px] border-black font-mono font-bold uppercase text-black">
              <tr>
                <th className="p-3 border-r-2 border-black">Loan ID</th>
                <th className="p-3 border-r-2 border-black">Book Title & ISBN</th>
                <th className="p-3 border-r-2 border-black">Member</th>
                <th className="p-3 border-r-2 border-black text-center">Issue Date</th>
                <th className="p-3 border-r-2 border-black text-center">Due Date</th>
                <th className="p-3 border-r-2 border-black text-center">Return Date</th>
                <th className="p-3 text-center">Loan Status</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/20 font-medium">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-black/60 font-mono">
                    No borrowing records found.
                  </td>
                </tr>
              ) : (
                loans.map((l) => (
                  <tr key={l.loan_id} className="hover:bg-[#FFFDF5] transition-colors">
                    <td className="p-3 font-mono font-bold border-r-2 border-black/20">
                      #{l.loan_id}
                    </td>
                    <td className="p-3 border-r-2 border-black/20">
                      <div className="font-black text-black">{l.title}</div>
                      <div className="font-mono text-[11px] text-black/60">{l.isbn}</div>
                    </td>
                    <td className="p-3 border-r-2 border-black/20">
                      <div className="font-bold text-black">{l.full_name}</div>
                      <div className="text-[11px] text-black/60">{l.email}</div>
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-center font-mono">
                      {l.issue_date}
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-center font-mono">
                      {l.due_date}
                    </td>
                    <td className="p-3 border-r-2 border-black/20 text-center font-mono">
                      {l.return_date ? (
                        <span className="text-black font-bold">{l.return_date}</span>
                      ) : (
                        <span className="text-black/40 italic">Not Returned</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {l.status === 'returned' && (
                        <span className="badge-brutal badge-available">
                          <CheckCircle className="w-3 h-3 inline mr-1" /> Returned
                        </span>
                      )}
                      {l.status === 'overdue' && (
                        <span className="badge-brutal badge-overdue">
                          <AlertTriangle className="w-3 h-3 inline mr-1" /> Overdue ({l.days_overdue}d)
                        </span>
                      )}
                      {l.status === 'active' && (
                        <span className="badge-brutal badge-issued">
                          <Clock className="w-3 h-3 inline mr-1" /> Active Loan
                        </span>
                      )}
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
            Showing Page <span className="underline">{pagination.page}</span> of {pagination.totalPages} ({pagination.total} records)
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
    </div>
  );
}
