'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  BookCheck,
  Undo2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  Lock,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { issueBookAction, returnBookAction } from '@/app/actions';

interface CirculationClientWrapperProps {
  activeMembers: any[];
  availableBooks: any[];
  activeLoans: any[];
  sessionLogs: any[];
}

export default function CirculationClientWrapper({
  activeMembers,
  availableBooks,
  activeLoans,
  sessionLogs: initialSessionLogs,
}: CirculationClientWrapperProps) {
  const router = useRouter();

  // Issue Form State
  const [issueBookId, setIssueBookId] = useState('');
  const [issueMemberId, setIssueMemberId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueFeedback, setIssueFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Return Form State
  const [returnLoanId, setReturnLoanId] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [returnFeedback, setReturnFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Recent Session Transactions
  const [sessionLogs, setSessionLogs] = useState<any[]>(initialSessionLogs || []);

  // Initialize dates
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    setIssueDate(todayStr);
    setReturnDate(todayStr);

    const twoWeeks = new Date();
    twoWeeks.setDate(today.getDate() + 14);
    setDueDate(twoWeeks.toISOString().slice(0, 10));
  }, []);

  // Handle Book Issue
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueFeedback(null);

    if (!issueBookId || !issueMemberId || !dueDate) {
      setIssueFeedback({ type: 'error', message: 'Please select a book, member, and due date.' });
      return;
    }

    try {
      setIsIssuing(true);
      const res = await issueBookAction({
        book_id: issueBookId,
        member_id: issueMemberId,
        issue_date: issueDate,
        due_date: dueDate,
      });

      if (res.error) {
        throw new Error(res.error);
      }

      setIssueFeedback({
        type: 'success',
        message: res.message || 'Book issued successfully!',
      });

      setSessionLogs((prev) => [
        {
          id: Date.now(),
          type: 'ISSUE',
          message: `Issued Book #${issueBookId} to Member #${issueMemberId}`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      // Reset selection
      setIssueBookId('');
      router.refresh();
    } catch (err: any) {
      setIssueFeedback({ type: 'error', message: err.message });
    } finally {
      setIsIssuing(false);
    }
  };

  // Handle Book Return
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReturnFeedback(null);

    if (!returnLoanId) {
      setReturnFeedback({ type: 'error', message: 'Please select an active loan to return.' });
      return;
    }

    try {
      setIsReturning(true);
      const res = await returnBookAction({
        loan_id: returnLoanId,
        return_date: returnDate,
      });

      if (res.error) {
        throw new Error(res.error);
      }

      setReturnFeedback({
        type: 'success',
        message: res.message || 'Book returned successfully!',
      });

      setSessionLogs((prev) => [
        {
          id: Date.now(),
          type: 'RETURN',
          message: `Returned Loan #${returnLoanId}`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      setReturnLoanId('');
      router.refresh();
    } catch (err: any) {
      setReturnFeedback({ type: 'error', message: err.message });
    } finally {
      setIsReturning(false);
    }
  };

  const selectedLoan = activeLoans.find((l) => l.loan_id.toString() === returnLoanId);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-[3px] border-black p-5 rounded-lg shadow-[5px_5px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#B8F28B] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <ArrowLeftRight className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              Circulation Desk
            </h1>
            <p className="text-xs font-semibold text-black/60">
              ACID-compliant Book Issue and Return desk with transactional row-level concurrency locking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold bg-[#FFE566] border-2 border-black px-3 py-1.5 rounded shadow-[2px_2px_0px_#000]">
            {activeLoans.length} Active Loans
          </span>
          <span className="font-mono text-xs font-bold bg-[#B8F28B] border-2 border-black px-3 py-1.5 rounded shadow-[2px_2px_0px_#000]">
            {availableBooks.length} Titles Available
          </span>
        </div>
      </div>

      {/* Main Grid: Issue on Left, Return on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= ISSUE WORKFLOW ================= */}
        <div className="bg-white border-[3px] border-black rounded-lg p-6 shadow-[6px_6px_0px_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#FFE566] border-2 border-black rounded flex items-center justify-center shadow-[1px_1px_0px_#000]">
                  <BookCheck className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h2 className="font-black text-lg text-black">Issue Book</h2>
                  <p className="text-[11px] font-mono text-black/60">Verify stock, lock book, insert loan</p>
                </div>
              </div>
              <span className="badge-brutal bg-[#FFE566] text-black text-[10px]">
                TRANSACTION
              </span>
            </div>

            {issueFeedback && (
              <div
                className={`p-3 border-2 border-black rounded-md mb-4 flex items-center justify-between text-xs font-bold shadow-[2px_2px_0px_#000] animate-slide-up ${
                  issueFeedback.type === 'success' ? 'bg-[#B8F28B]' : 'bg-[#FF7B72] text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {issueFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{issueFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIssueFeedback(null)}
                  className="underline uppercase font-mono cursor-pointer ml-3"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form id="issueForm" onSubmit={handleIssueSubmit} className="space-y-4">
              {/* Select Member */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Select Active Member *</span>
                </label>
                <select
                  value={issueMemberId}
                  onChange={(e) => setIssueMemberId(e.target.value)}
                  className="select-brutal text-xs"
                  required
                >
                  <option value="">-- Choose registered patron --</option>
                  {activeMembers.map((m) => (
                    <option key={m.member_id} value={m.member_id.toString()}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-black/50 mt-1 font-mono">
                  Only members with status &apos;active&apos; are permitted to borrow.
                </p>
              </div>

              {/* Select Book */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Select Available Book *</span>
                </label>
                <select
                  value={issueBookId}
                  onChange={(e) => setIssueBookId(e.target.value)}
                  className="select-brutal text-xs"
                  required
                >
                  <option value="">-- Choose in-stock book --</option>
                  {availableBooks.map((b) => (
                    <option key={b.book_id} value={b.book_id.toString()}>
                      {b.title} [Copies Left: {b.available_copies}]
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-black/50 mt-1 font-mono">
                  Titles with zero available copies are excluded.
                </p>
              </div>

              {/* Issue Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Issue Date *</span>
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="input-brutal text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Due Date *</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    min={issueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input-brutal text-xs"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md text-[11px] font-mono space-y-1 text-black/80">
                <div className="flex items-center gap-1.5 font-bold text-black">
                  <Lock className="w-3 h-3 text-[#4169FF]" />
                  <span>Transactional Invariants Enforced:</span>
                </div>
                <div>1. Validates Member is active and Book has available copies &gt; 0.</div>
                <div>2. Atomically records Loan in database with auto-generated audit log.</div>
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-black">
            <button
              type="submit"
              form="issueForm"
              disabled={isIssuing}
              className="btn-brutal btn-yellow w-full cursor-pointer justify-center text-sm py-2.5 font-black"
            >
              <BookCheck className="w-4 h-4" />
              <span>{isIssuing ? 'Processing Transaction...' : 'Confirm & Issue Book'}</span>
            </button>
          </div>
        </div>

        {/* ================= RETURN WORKFLOW ================= */}
        <div className="bg-white border-[3px] border-black rounded-lg p-6 shadow-[6px_6px_0px_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#B8F28B] border-2 border-black rounded flex items-center justify-center shadow-[1px_1px_0px_#000]">
                  <Undo2 className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h2 className="font-black text-lg text-black">Return Book</h2>
                  <p className="text-[11px] font-mono text-black/60">Close loan, record timestamp, restore copy</p>
                </div>
              </div>
              <span className="badge-brutal bg-[#B8F28B] text-black text-[10px]">
                CHECK-IN
              </span>
            </div>

            {returnFeedback && (
              <div
                className={`p-3 border-2 border-black rounded-md mb-4 flex items-center justify-between text-xs font-bold shadow-[2px_2px_0px_#000] animate-slide-up ${
                  returnFeedback.type === 'success' ? 'bg-[#B8F28B]' : 'bg-[#FF7B72] text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {returnFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{returnFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReturnFeedback(null)}
                  className="underline uppercase font-mono cursor-pointer ml-3"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form id="returnForm" onSubmit={handleReturnSubmit} className="space-y-4">
              {/* Select Active Loan */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Select Active Loan *</span>
                </label>
                <select
                  value={returnLoanId}
                  onChange={(e) => setReturnLoanId(e.target.value)}
                  className="select-brutal text-xs"
                  required
                >
                  <option value="">-- Choose active loan to return --</option>
                  {activeLoans.map((l) => (
                    <option key={l.loan_id} value={l.loan_id.toString()}>
                      #{l.loan_id}: &quot;{l.title}&quot; by {l.full_name} (Due: {l.due_date}
                      {l.days_overdue > 0 ? ` - ${l.days_overdue}d OVERDUE` : ''})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-black/50 mt-1 font-mono">
                  Only loans with return_date IS NULL appear here.
                </p>
              </div>

              {/* Loan Details Preview if Selected */}
              {selectedLoan && (
                <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md space-y-1.5 text-xs font-mono">
                  <div className="font-bold text-black border-b border-black/20 pb-1 flex justify-between items-center">
                    <span>Loan #{selectedLoan.loan_id} Details:</span>
                    {selectedLoan.days_overdue > 0 ? (
                      <span className="badge-brutal badge-overdue text-[10px]">
                        {selectedLoan.days_overdue} Days Overdue
                      </span>
                    ) : (
                      <span className="badge-brutal badge-available text-[10px]">On Schedule</span>
                    )}
                  </div>
                  <div className="text-black/80">
                    <span className="font-bold text-black">Book:</span> {selectedLoan.title} ({selectedLoan.isbn})
                  </div>
                  <div className="text-black/80">
                    <span className="font-bold text-black">Member:</span> {selectedLoan.full_name} ({selectedLoan.email})
                  </div>
                  <div className="text-black/80">
                    <span className="font-bold text-black">Issued:</span> {selectedLoan.issue_date} |{' '}
                    <span className="font-bold text-black">Due:</span> {selectedLoan.due_date}
                  </div>
                </div>
              )}

              {/* Return Date Input */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Return Date *</span>
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="input-brutal text-xs"
                  required
                />
              </div>

              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded-md text-[11px] font-mono space-y-1 text-black/80">
                <div className="flex items-center gap-1.5 font-bold text-black">
                  <Sparkles className="w-3 h-3 text-[#B8F28B]" />
                  <span>Automated Stock Calculation:</span>
                </div>
                <div>Available copies automatically increase by 1 upon closing active loan.</div>
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-black">
            <button
              type="submit"
              form="returnForm"
              disabled={isReturning || !returnLoanId}
              className="btn-brutal btn-mint w-full cursor-pointer justify-center text-sm py-2.5 font-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-4 h-4" />
              <span>{isReturning ? 'Processing Return...' : 'Record Book Return'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Session Transaction Log */}
      <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[5px_5px_0px_#000]">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-black" />
          <h3 className="font-black text-sm uppercase tracking-wider text-black">
            Audit Activity & Circulation Log
          </h3>
        </div>

        {sessionLogs.length === 0 ? (
          <p className="text-xs font-mono text-black/50 py-3">
            No circulation operations recorded in this session.
          </p>
        ) : (
          <div className="space-y-2">
            {sessionLogs.map((log: any, index: number) => (
              <div
                key={log.id || log.log_id || index}
                className="flex items-center justify-between p-2.5 bg-[#FFFDF5] border-2 border-black rounded text-xs font-mono shadow-[2px_2px_0px_#000]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`badge-brutal text-[9px] ${
                      (log.type || log.event_type) === 'BOOK_RETURNED' || log.type === 'RETURN'
                        ? 'bg-[#B8F28B] text-black'
                        : 'bg-[#FFE566] text-black'
                    }`}
                  >
                    {log.type || log.event_type}
                  </span>
                  <span className="font-bold text-black">{log.message || log.details}</span>
                </div>
                <span className="text-black/60 text-[11px]">{log.time || log.created_at}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
