import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  BookCopy,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  Database,
} from 'lucide-react';
import { query, getDbStatus } from '@/lib/db';
import { toISODateString } from '@/lib/dateUtils';
import DashboardCharts from '@/components/DashboardCharts';
import DashboardQuickActions from '@/components/DashboardQuickActions';

export default async function DashboardPage() {
  const dbStatus = await getDbStatus();

  // 1. Total books
  const totalBooksRes = await query<any[]>('SELECT COUNT(*) as total FROM Books').catch(() => [{ total: 0 }]);
  const totalBooks = Number(totalBooksRes[0]?.total || 0);

  // 2. Total available copies (derived from total_copies - active_loans)
  const availRes = await query<any[]>(
    `SELECT SUM(b.total_copies - COALESCE(al.cnt, 0)) as total_available 
     FROM Books b 
     LEFT JOIN (SELECT book_id, COUNT(*) as cnt FROM Loans WHERE return_date IS NULL GROUP BY book_id) al 
     ON b.book_id = al.book_id`
  ).catch(() => [{ total_available: 0 }]);
  const availableCopies = Number(availRes[0]?.total_available || 0);

  // 3. Books currently issued
  const issuedRes = await query<any[]>('SELECT COUNT(*) as issued FROM Loans WHERE return_date IS NULL').catch(() => [{ issued: 0 }]);
  const currentlyIssued = Number(issuedRes[0]?.issued || 0);

  // 4. Registered active members
  const membersRes = await query<any[]>("SELECT COUNT(*) as total FROM Members WHERE membership_status = 'active'").catch(() => [{ total: 0 }]);
  const registeredMembers = Number(membersRes[0]?.total || 0);

  // 5. Overdue loans
  const overdueRes = await query<any[]>(
    'SELECT COUNT(*) as overdue FROM Loans WHERE return_date IS NULL AND due_date < CURRENT_DATE'
  ).catch(() => [{ overdue: 0 }]);
  const overdueLoans = Number(overdueRes[0]?.overdue || 0);

  // 6. Recent circulation activity
  const activitySql = `
    SELECT l.loan_id, m.full_name, b.title, l.issue_date, l.due_date, l.return_date,
           CASE 
             WHEN l.return_date IS NOT NULL THEN 'returned'
             WHEN l.due_date < CURRENT_DATE THEN 'overdue'
             ELSE 'active'
           END as status
    FROM Loans l
    JOIN Books b ON l.book_id = b.book_id
    JOIN Members m ON l.member_id = m.member_id
    ORDER BY l.issue_date DESC, l.loan_id DESC
    LIMIT 6
  `;
  const activityRows = await query<any[]>(activitySql).catch(() => []);
  const recentActivity = activityRows.map((row: any) => ({
    loan_id: row.loan_id,
    full_name: row.full_name,
    title: row.title,
    issue_date: toISODateString(row.issue_date),
    due_date: toISODateString(row.due_date),
    return_date: row.return_date ? toISODateString(row.return_date) : null,
    status: row.status,
  }));

  // 7. Monthly borrowing trends
  const monthlySql = `
    SELECT TO_CHAR(issue_date, 'Mon') as month,
           COUNT(*) as count,
           TO_CHAR(issue_date, 'YYYY-MM') as ym
    FROM Loans
    GROUP BY ym, month
    ORDER BY ym ASC
    LIMIT 6
  `;
  const monthlyTrends = await query<any[]>(monthlySql).catch(() => []);

  // 8. Catalog by genre
  const catDistSql = `
    SELECT c.category_name as name, COUNT(b.book_id) as value
    FROM Categories c
    JOIN Books b ON c.category_id = b.category_id
    GROUP BY c.category_id, c.category_name
    ORDER BY value DESC
    LIMIT 6
  `;
  const categoryDistribution = await query<any[]>(catDistSql).catch(() => []);

  // 9. Overdue books list
  const overdueListSql = `
    SELECT l.loan_id, b.title, m.full_name, l.due_date,
           (CURRENT_DATE - l.due_date)::integer as days_overdue
    FROM Loans l
    JOIN Books b ON l.book_id = b.book_id
    JOIN Members m ON l.member_id = m.member_id
    WHERE l.return_date IS NULL AND l.due_date < CURRENT_DATE
    ORDER BY l.due_date ASC
    LIMIT 5
  `;
  const overdueRows = await query<any[]>(overdueListSql).catch(() => []);
  const overdueList = overdueRows.map((row: any) => ({
    loan_id: row.loan_id,
    title: row.title,
    full_name: row.full_name,
    due_date: toISODateString(row.due_date),
    days_overdue: Math.max(1, Number(row.days_overdue || 1)),
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="bg-[#FFE566] border-[3px] border-black rounded-lg p-6 lg:p-8 shadow-[6px_6px_0px_#000] relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-black text-[#FFE566] rounded-md font-mono text-xs font-black uppercase mb-3 tracking-wider">
            <Database className="w-3.5 h-3.5" />
            <span>RDBMS Lab Project • Server-Side Relational Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-black leading-none mb-3">
            Your Library, <br />
            <span className="underline decoration-black decoration-wavy decoration-2">
              Under Control.
            </span>
          </h1>
          <p className="text-sm sm:text-base font-bold text-black/80 max-w-xl leading-relaxed">
            Real-time book tracking, circulation workflows, constraint enforcement, and transactional integrity rendered directly on the server.
          </p>
        </div>

        {/* Database Status indicator */}
        <div className="mt-4 pt-4 border-t-2 border-black/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono font-bold">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full border border-black ${
                dbStatus.connected ? 'bg-[#B8F28B]' : 'bg-[#FF7B72]'
              }`}
            />
            <span className="text-black/80">{dbStatus.message}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Panel */}
      <DashboardQuickActions />

      {/* Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Books */}
        <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[4px_4px_0px_#000] border-l-[8px] border-l-[#FFE566]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black">
              Total Books
            </span>
            <div className="p-2 bg-[#FFE566] border-2 border-black rounded-md shadow-[2px_2px_0px_#000]">
              <BookOpen className="w-4 h-4 text-black" />
            </div>
          </div>
          <div className="text-3xl font-black text-black tracking-tight font-mono">
            {totalBooks}
          </div>
          <span className="text-[11px] font-bold text-black/80 block mt-1">
            Catalog Entries
          </span>
        </div>

        {/* Available Copies */}
        <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[4px_4px_0px_#000] border-l-[8px] border-l-[#B8F28B]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black">
              Available Copies
            </span>
            <div className="p-2 bg-[#B8F28B] border-2 border-black rounded-md shadow-[2px_2px_0px_#000]">
              <CheckCircle2 className="w-4 h-4 text-black" />
            </div>
          </div>
          <div className="text-3xl font-black text-black tracking-tight font-mono">
            {availableCopies}
          </div>
          <span className="text-[11px] font-bold text-black/80 block mt-1">
            Ready on Shelves
          </span>
        </div>

        {/* Currently Issued */}
        <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[4px_4px_0px_#000] border-l-[8px] border-l-[#4169FF]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black">
              Currently Issued
            </span>
            <div className="p-2 bg-[#4169FF] text-white border-2 border-black rounded-md shadow-[2px_2px_0px_#000]">
              <BookCopy className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-black tracking-tight font-mono">
            {currentlyIssued}
          </div>
          <span className="text-[11px] font-bold text-black/80 block mt-1">
            Active Member Loans
          </span>
        </div>

        {/* Registered Members */}
        <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[4px_4px_0px_#000] border-l-[8px] border-l-[#FF7B72]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black">
              Active Members
            </span>
            <div className="p-2 bg-[#FF7B72] text-white border-2 border-black rounded-md shadow-[2px_2px_0px_#000]">
              <Users className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-black tracking-tight font-mono">
            {registeredMembers}
          </div>
          <span className="text-[11px] font-bold text-black/80 block mt-1">
            Registered Patrons
          </span>
        </div>

        {/* Overdue Loans */}
        <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[4px_4px_0px_#000] border-l-[8px] border-l-red-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black">
              Overdue Loans
            </span>
            <div className="p-2 bg-red-500 text-white border-2 border-black rounded-md shadow-[2px_2px_0px_#000]">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-red-600 tracking-tight font-mono">
            {overdueLoans}
          </div>
          <span className="text-[11px] font-bold text-red-700 block mt-1">
            Requires Attention
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <DashboardCharts
        monthlyTrends={monthlyTrends}
        categoryDistribution={categoryDistribution}
      />

      {/* Two Column Bottom Grid: Recent Activity & Overdue Books */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Borrowing Activity */}
        <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[5px_5px_0px_#000]">
          <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-black" />
              <h3 className="font-extrabold text-base uppercase tracking-tight text-black">
                Recent Circulation Activity
              </h3>
            </div>
            <Link
              href="/history"
              className="text-xs font-mono font-bold hover:underline flex items-center gap-0.5 text-black"
            >
              View History <ArrowRight className="w-3 h-3 text-black" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FFE566] border-b-2 border-black font-extrabold uppercase font-mono">
                <tr>
                  <th className="p-2 border-r border-black text-black">Book</th>
                  <th className="p-2 border-r border-black text-black">Member</th>
                  <th className="p-2 border-r border-black text-black">Due Date</th>
                  <th className="p-2 text-black">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/20 font-medium">
                {recentActivity.length > 0 ? (
                  recentActivity.map((act) => (
                    <tr key={act.loan_id} className="hover:bg-[#FFFDF5]">
                      <td className="p-2 font-bold text-black border-r border-black/20 max-w-[160px] truncate">
                        {act.title}
                      </td>
                      <td className="p-2 font-bold text-black border-r border-black/20">
                        {act.full_name}
                      </td>
                      <td className="p-2 font-mono font-bold text-black border-r border-black/20">
                        {act.due_date}
                      </td>
                      <td className="p-2">
                        {act.status === 'returned' && (
                          <span className="badge badge-green text-[10px]">Returned</span>
                        )}
                        {act.status === 'active' && (
                          <span className="badge badge-yellow text-[10px]">Active</span>
                        )}
                        {act.status === 'overdue' && (
                          <span className="badge badge-coral text-[10px]">Overdue</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center font-mono text-black font-bold">
                      No recent circulation activity recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue Loans List */}
        <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[5px_5px_0px_#000]">
          <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FF7B72]" />
              <h3 className="font-extrabold text-base uppercase tracking-tight text-black">
                Overdue Books Watchlist
              </h3>
            </div>
            <Link
              href="/history?status=overdue"
              className="text-xs font-mono font-bold text-[#FF7B72] hover:underline flex items-center gap-0.5"
            >
              Resolve <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {overdueList.length > 0 ? (
              overdueList.map((item) => (
                <div
                  key={item.loan_id}
                  className="p-3 bg-red-50 border-2 border-red-400 rounded-md flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-black leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-black/80 font-medium">
                      Patron: <span className="font-bold">{item.full_name}</span> • Due:{' '}
                      <span className="font-mono">{item.due_date}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-black bg-red-500 text-white px-2 py-0.5 rounded border border-black inline-block">
                      +{item.days_overdue} days
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-[#B8F28B]/20 border-2 border-[#B8F28B] rounded-md font-mono text-xs font-bold text-black">
                🎉 Excellent! No loans are currently overdue.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
