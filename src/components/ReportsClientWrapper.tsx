'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  Download,
  BookOpen,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const REPORT_TABS = [
  { id: 'most-borrowed', label: 'Most Borrowed Books', icon: BookOpen },
  { id: 'active-members', label: 'Most Active Patrons', icon: Users },
  { id: 'currently-issued', label: 'Currently Issued', icon: Clock },
  { id: 'overdue', label: 'Overdue Books', icon: AlertTriangle },
  { id: 'monthly-stats', label: 'Monthly Trends', icon: TrendingUp },
  { id: 'category-distribution', label: 'Genre Breakdown', icon: PieIcon },
];

interface ReportsClientWrapperProps {
  activeTab: string;
  reportData: any[];
}

export default function ReportsClientWrapper({
  activeTab,
  reportData,
}: ReportsClientWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleTabChange = (tabId: string) => {
    startTransition(() => {
      router.push(`${pathname}?type=${tabId}`);
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData.length) return;

    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeTab === 'most-borrowed') {
      headers = ['Book ID', 'Title', 'ISBN', 'Genre', 'Authors', 'Borrow Count'];
      rows = reportData.map((r) => [
        r.book_id,
        `"${(r.title || '').replace(/"/g, '""')}"`,
        r.isbn,
        r.category_name,
        `"${r.authors || ''}"`,
        r.borrow_count,
      ]);
    } else if (activeTab === 'active-members') {
      headers = ['Member ID', 'Name', 'Email', 'Status', 'Total Borrows', 'Active Loans'];
      rows = reportData.map((r) => [
        r.member_id,
        `"${r.full_name}"`,
        r.email,
        r.membership_status,
        r.total_borrows,
        r.active_loans,
      ]);
    } else if (activeTab === 'currently-issued') {
      headers = ['Loan ID', 'Book Title', 'ISBN', 'Patron Name', 'Patron Email', 'Issue Date', 'Due Date', 'Status'];
      rows = reportData.map((r) => [
        r.loan_id,
        `"${r.title}"`,
        r.isbn,
        `"${r.full_name}"`,
        r.email,
        r.issue_date,
        r.due_date,
        r.loan_status,
      ]);
    } else if (activeTab === 'overdue') {
      headers = ['Loan ID', 'Book Title', 'ISBN', 'Patron Name', 'Patron Email', 'Phone', 'Due Date', 'Days Overdue'];
      rows = reportData.map((r) => [
        r.loan_id,
        `"${r.title}"`,
        r.isbn,
        `"${r.full_name}"`,
        r.email,
        r.phone || 'N/A',
        r.due_date,
        r.days_overdue,
      ]);
    } else if (activeTab === 'monthly-stats') {
      headers = ['Month', 'Books Issued', 'Books Returned'];
      rows = reportData.map((r) => [r.month, r.total_issued, r.total_returned]);
    } else if (activeTab === 'category-distribution') {
      headers = ['Category', 'Book Count', 'Total Inventory Copies'];
      rows = reportData.map((r) => [r.category_name, r.book_count, r.total_copies]);
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bookstack_report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-[3px] border-black p-5 rounded-lg shadow-[5px_5px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#B8F28B] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <BarChart3 className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-black">
                Reports & Analytical Summaries
              </h1>
              {isPending && (
                <span className="text-xs font-mono font-bold text-black/60 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Querying...
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-black/60">
              Aggregated MySQL statistical queries, circulation KPIs, and CSV data extraction
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={!reportData.length}
          className="btn-brutal btn-yellow text-black font-extrabold cursor-pointer disabled:opacity-50 shadow-[3px_3px_0px_#000]"
        >
          <Download className="w-4 h-4 text-black" />
          <span>Export Current Report (CSV)</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-bold text-xs uppercase tracking-wider border-2 border-black transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#FFE566] text-black shadow-[3px_3px_0px_#000] translate-x-0.5'
                  : 'bg-white hover:bg-[#FFFDF5] text-black'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chart Previews (for Monthly Trends and Category Distribution) */}
      {activeTab === 'monthly-stats' && (
        <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[5px_5px_0px_#000] mb-6">
          <h2 className="font-extrabold text-sm uppercase tracking-tight text-black mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#4169FF]" />
            Monthly Borrowing vs Return Comparison
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData}>
                <XAxis dataKey="month" stroke="#000" fontSize={12} fontWeight={700} />
                <YAxis stroke="#000" fontSize={12} fontWeight={700} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFDF5',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    boxShadow: '3px 3px 0px #000',
                    fontWeight: 'bold',
                  }}
                />
                <Legend />
                <Bar dataKey="total_issued" name="Books Issued" fill="#FFE566" stroke="#000" strokeWidth={2} />
                <Bar dataKey="total_returned" name="Books Returned" fill="#B8F28B" stroke="#000" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'category-distribution' && (
        <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[5px_5px_0px_#000] mb-6">
          <h2 className="font-extrabold text-sm uppercase tracking-tight text-black mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-[#FF7B72]" />
            Catalog Volume by Genre Distribution
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData} layout="vertical">
                <XAxis type="number" stroke="#000" fontSize={12} fontWeight={700} />
                <YAxis type="category" dataKey="category_name" stroke="#000" fontSize={11} fontWeight={700} width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFDF5',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    boxShadow: '3px 3px 0px #000',
                    fontWeight: 'bold',
                  }}
                />
                <Bar dataKey="book_count" name="Book Titles" fill="#4169FF" stroke="#000" strokeWidth={2} />
                <Bar dataKey="total_copies" name="Total Copies" fill="#FFE566" stroke="#000" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Report Table */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <div className="p-4 bg-[#FFFDF5] border-b-2 border-black flex items-center justify-between">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
            Report Query Output ({reportData.length} records)
          </span>
          <span className="text-[11px] font-mono text-black font-bold">
            Generated via SQL GROUP BY & Aggregation
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportData.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse bg-white text-black">
              <thead className="bg-[#FFE566] border-b-[2.5px] border-black font-mono font-bold uppercase text-black">
                {activeTab === 'most-borrowed' && (
                  <tr>
                    <th className="p-3 border-r-2 border-black">Book ID</th>
                    <th className="p-3 border-r-2 border-black">Book Title</th>
                    <th className="p-3 border-r-2 border-black">ISBN</th>
                    <th className="p-3 border-r-2 border-black">Genre</th>
                    <th className="p-3 border-r-2 border-black">Authors</th>
                    <th className="p-3 text-center">Times Borrowed</th>
                  </tr>
                )}
                {activeTab === 'active-members' && (
                  <tr>
                    <th className="p-3 border-r-2 border-black">Member ID</th>
                    <th className="p-3 border-r-2 border-black">Patron Name</th>
                    <th className="p-3 border-r-2 border-black">Email</th>
                    <th className="p-3 border-r-2 border-black">Status</th>
                    <th className="p-3 border-r-2 border-black text-center">Lifetime Borrows</th>
                    <th className="p-3 text-center">Active Loans</th>
                  </tr>
                )}
                {activeTab === 'currently-issued' && (
                  <tr>
                    <th className="p-3 border-r-2 border-black">Loan ID</th>
                    <th className="p-3 border-r-2 border-black">Book Title</th>
                    <th className="p-3 border-r-2 border-black">Patron</th>
                    <th className="p-3 border-r-2 border-black text-center">Issue Date</th>
                    <th className="p-3 border-r-2 border-black text-center">Due Date</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                )}
                {activeTab === 'overdue' && (
                  <tr>
                    <th className="p-3 border-r-2 border-black">Loan ID</th>
                    <th className="p-3 border-r-2 border-black">Book Title</th>
                    <th className="p-3 border-r-2 border-black">Patron Name</th>
                    <th className="p-3 border-r-2 border-black">Contact Info</th>
                    <th className="p-3 border-r-2 border-black text-center">Due Date</th>
                    <th className="p-3 text-center">Days Overdue</th>
                  </tr>
                )}
                {activeTab === 'monthly-stats' && (
                  <tr>
                    <th className="p-3 border-r-2 border-black">Year-Month</th>
                    <th className="p-3 border-r-2 border-black text-center">Total Issued</th>
                    <th className="p-3 text-center">Total Returned</th>
                  </tr>
                )}
                {activeTab === 'category-distribution' && (
                  <tr>
                    <th className="p-3 border-r-2 border-black">Category / Genre</th>
                    <th className="p-3 border-r-2 border-black text-center">Distinct Titles</th>
                    <th className="p-3 text-center">Total Physical Copies</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y-2 divide-black/10 font-medium text-black">
                {activeTab === 'most-borrowed' &&
                  reportData.map((row) => (
                    <tr key={row.book_id} className="hover:bg-[#FFFDF5]">
                      <td className="p-3 font-mono font-bold border-r border-black/20 text-black">#{row.book_id}</td>
                      <td className="p-3 font-black text-sm text-black border-r border-black/20">{row.title}</td>
                      <td className="p-3 font-mono font-bold text-black border-r border-black/20">{row.isbn}</td>
                      <td className="p-3 border-r border-black/20">
                        <span className="badge-brutal bg-[#FFE566] text-black font-extrabold">{row.category_name}</span>
                      </td>
                      <td className="p-3 border-r border-black/20 text-black font-bold">{row.authors}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-3 py-1 font-mono font-black text-xs bg-[#FFE566] text-black border-2 border-black rounded shadow-[2px_2px_0px_#000]">
                          {row.borrow_count} loans
                        </span>
                      </td>
                    </tr>
                  ))}

                {activeTab === 'active-members' &&
                  reportData.map((row) => (
                    <tr key={row.member_id} className="hover:bg-[#FFFDF5]">
                      <td className="p-3 font-mono font-bold border-r border-black/20 text-black">#{row.member_id}</td>
                      <td className="p-3 font-black text-sm text-black border-r border-black/20">{row.full_name}</td>
                      <td className="p-3 font-mono font-bold text-black border-r border-black/20">{row.email}</td>
                      <td className="p-3 border-r border-black/20">
                        <span className={`badge-brutal ${row.membership_status === 'active' ? 'bg-[#B8F28B] text-black' : 'bg-black/10 text-black'} font-black`}>
                          {row.membership_status}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-center border-r border-black/20 text-black">
                        {row.total_borrows}
                      </td>
                      <td className="p-3 font-mono font-black text-center">
                        <span className="badge-brutal bg-[#FFE566] text-black font-black">{row.active_loans}</span>
                      </td>
                    </tr>
                  ))}

                {activeTab === 'currently-issued' &&
                  reportData.map((row) => (
                    <tr key={row.loan_id} className="hover:bg-[#FFFDF5]">
                      <td className="p-3 font-mono font-bold border-r border-black/20 text-black">#{row.loan_id}</td>
                      <td className="p-3 font-black text-sm text-black border-r border-black/20">{row.title}</td>
                      <td className="p-3 border-r border-black/20 text-black">
                        <div className="font-extrabold text-black">{row.full_name}</div>
                        <div className="font-mono text-[11px] text-black/80 font-bold">{row.email}</div>
                      </td>
                      <td className="p-3 font-mono text-center border-r border-black/20 text-black font-bold">{row.issue_date}</td>
                      <td className="p-3 font-mono text-center border-r border-black/20 text-black font-bold">{row.due_date}</td>
                      <td className="p-3 text-center">
                        <span className={`badge-brutal ${row.loan_status === 'Overdue' ? 'bg-[#FF7B72] text-white' : 'bg-[#B8F28B] text-black'} font-black`}>
                          {row.loan_status}
                        </span>
                      </td>
                    </tr>
                  ))}

                {activeTab === 'overdue' &&
                  reportData.map((row) => (
                    <tr key={row.loan_id} className="hover:bg-[#FFFDF5]">
                      <td className="p-3 font-mono font-black border-r border-black/20 text-red-600">#{row.loan_id}</td>
                      <td className="p-3 font-black text-sm text-black border-r border-black/20">{row.title}</td>
                      <td className="p-3 border-r border-black/20 font-black text-black">{row.full_name}</td>
                      <td className="p-3 font-mono text-xs border-r border-black/20 text-black">
                        <div className="font-bold text-black">{row.email}</div>
                        <div className="text-black/80 font-bold">{row.phone}</div>
                      </td>
                      <td className="p-3 font-mono text-center border-r border-black/20 text-red-600 font-black">
                        {row.due_date}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono font-black text-xs bg-[#FF7B72] text-white px-2.5 py-1 rounded border-2 border-black inline-block shadow-[2px_2px_0px_#000]">
                          +{row.days_overdue} days
                        </span>
                      </td>
                    </tr>
                  ))}

                {activeTab === 'monthly-stats' &&
                  reportData.map((row) => (
                    <tr key={row.month} className="hover:bg-[#FFFDF5]">
                      <td className="p-3 font-mono font-bold text-black border-r border-black/20">{row.month}</td>
                      <td className="p-3 font-mono font-black text-center text-black border-r border-black/20 bg-[#FFE566]/20">
                        {row.total_issued}
                      </td>
                      <td className="p-3 font-mono font-black text-center text-black bg-[#B8F28B]/20">
                        {row.total_returned}
                      </td>
                    </tr>
                  ))}

                {activeTab === 'category-distribution' &&
                  reportData.map((row) => (
                    <tr key={row.category_name} className="hover:bg-[#FFFDF5]">
                      <td className="p-3 font-black text-sm text-black border-r border-black/20">{row.category_name}</td>
                      <td className="p-3 font-mono font-black text-center text-black border-r border-black/20">
                        {row.book_count}
                      </td>
                      <td className="p-3 font-mono font-black text-center text-black bg-[#FFE566]/20">
                        {row.total_copies}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center font-mono font-bold text-black/50">
              No data returned for this query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
