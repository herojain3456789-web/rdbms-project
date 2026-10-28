'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Network,
  ShieldAlert,
  GitMerge,
  SearchCode,
  Zap,
  Lock,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Code2,
} from 'lucide-react';

export default function SqlConceptsPage() {
  const [conceptsData, setConceptsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Collapsible section states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    er: true,
    constraints: true,
    joins: true,
    subqueries: true,
    triggers: true,
    transactions: true,
    normalization: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const fetchConcepts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sql-concepts');
      const data = await res.json();
      setConceptsData(data);
    } catch (err) {
      console.error('Failed to load SQL concepts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcepts();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-[#4169FF] text-white border-[3px] border-black p-6 rounded-lg shadow-[6px_6px_0px_#000]">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-black text-[#FFE566] rounded-md font-mono text-xs font-black uppercase mb-3">
            <Database className="w-3.5 h-3.5" />
            <span>Academic Demonstration Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-2">
            RDBMS Lab Concepts & Working Proofs
          </h1>
          <p className="text-sm font-semibold text-white/90 leading-relaxed">
            Live evaluation of Relational Database Management Systems concepts: ER Mapping, Constraints, Joins, Subqueries, Triggers, Transactions, and Normalization.
          </p>
        </div>
      </div>

      {/* SECTION 1: ER-TO-RELATIONAL CONVERSION */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <button
          onClick={() => toggleSection('er')}
          className="w-full p-4 bg-[#FFE566] border-b-2 border-black flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Network className="w-5 h-5 text-black" />
            <h2 className="font-black text-lg text-black uppercase tracking-tight">
              1. ER-to-Relational Schema Conversion
            </h2>
          </div>
          {openSections.er ? <ChevronUp className="w-5 h-5 text-black" /> : <ChevronDown className="w-5 h-5 text-black" />}
        </button>

        {openSections.er && (
          <div className="p-6 space-y-6">
            <p className="text-sm font-medium text-black/80">
              The conceptual Entity-Relationship (ER) model has been transformed into a fully normalized physical relational model according to standard RDBMS conversion algorithms:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                  <span className="font-black text-xs uppercase text-black">Categories ➔ Books</span>
                  <span className="badge badge-yellow text-[10px]">1 : N (One-to-Many)</span>
                </div>
                <p className="text-xs text-black/70">
                  Primary key <code className="font-mono bg-white px-1 border border-black font-bold">Categories.category_id</code> is embedded as foreign key <code className="font-mono bg-white px-1 border border-black font-bold">Books.category_id</code> with ON UPDATE CASCADE, ON DELETE RESTRICT.
                </p>
              </div>

              <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                  <span className="font-black text-xs uppercase text-black">Publishers ➔ Books</span>
                  <span className="badge badge-yellow text-[10px]">1 : N (One-to-Many)</span>
                </div>
                <p className="text-xs text-black/70">
                  Primary key <code className="font-mono bg-white px-1 border border-black font-bold">Publishers.publisher_id</code> is imported as foreign key <code className="font-mono bg-white px-1 border border-black font-bold">Books.publisher_id</code>.
                </p>
              </div>

              <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                  <span className="font-black text-xs uppercase text-black">Books ➔ Authors</span>
                  <span className="badge badge-blue text-[10px]">M : N (Many-to-Many)</span>
                </div>
                <p className="text-xs text-black/70">
                  Decomposed via associative bridge entity <code className="font-mono bg-white px-1 border border-black font-bold">Book_Authors(book_id, author_id)</code> with composite primary key.
                </p>
              </div>

              <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                  <span className="font-black text-xs uppercase text-black">Books ➔ Loans</span>
                  <span className="badge badge-green text-[10px]">1 : N (One-to-Many)</span>
                </div>
                <p className="text-xs text-black/70">
                  Each physical book title can be borrowed multiple times across history. <code className="font-mono bg-white px-1 border border-black font-bold">Loans.book_id</code> references <code className="font-mono bg-white px-1 border border-black font-bold">Books.book_id</code>.
                </p>
              </div>

              <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                  <span className="font-black text-xs uppercase text-black">Members ➔ Loans</span>
                  <span className="badge badge-green text-[10px]">1 : N (One-to-Many)</span>
                </div>
                <p className="text-xs text-black/70">
                  Each library patron can generate multiple circulation loan transactions. <code className="font-mono bg-white px-1 border border-black font-bold">Loans.member_id</code> references <code className="font-mono bg-white px-1 border border-black font-bold">Members.member_id</code>.
                </p>
              </div>

              <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                  <span className="font-black text-xs uppercase text-black">Stock Derivation</span>
                  <span className="badge badge-coral text-[10px]">No Stock Drift</span>
                </div>
                <p className="text-xs text-black/70">
                  Available copies are dynamically computed via <code className="font-mono bg-white px-1 border border-black font-bold">total_copies - COUNT(Loans WHERE return_date IS NULL)</code> to eliminate anomalies.
                </p>
              </div>
            </div>

            {/* Relational Schema Text Blueprint */}
            <div className="bg-[#1A1A1A] text-[#FFE566] p-4 rounded-md border-2 border-black font-mono text-xs overflow-x-auto">
              <div className="text-white/60 mb-2 font-bold uppercase">// Relational Table Signatures:</div>
              Categories(<u>category_id</u>, category_name [UNIQUE])<br />
              Authors(<u>author_id</u>, author_name)<br />
              Publishers(<u>publisher_id</u>, publisher_name)<br />
              Books(<u>book_id</u>, isbn [UNIQUE], title, <i>category_id</i>, <i>publisher_id</i>, publication_year, total_copies [CHECK &gt;= 0])<br />
              Book_Authors(<u><i>book_id</i>, <i>author_id</i></u>)<br />
              Members(<u>member_id</u>, full_name, email [UNIQUE], phone, registration_date, membership_status)<br />
              Loans(<u>loan_id</u>, <i>book_id</i>, <i>member_id</i>, issue_date, due_date [CHECK &gt;= issue_date], return_date)<br />
              Audit_Log(<u>log_id</u>, event_type, table_name, record_id, details, created_at)
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: CONSTRAINTS DEMONSTRATION */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <button
          onClick={() => toggleSection('constraints')}
          className="w-full p-4 bg-[#B8F28B] border-b-2 border-black flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-black" />
            <h2 className="font-black text-lg text-black uppercase tracking-tight">
              2. Integrity Constraints & Invalid Data Rejection
            </h2>
          </div>
          {openSections.constraints ? <ChevronUp className="w-5 h-5 text-black" /> : <ChevronDown className="w-5 h-5 text-black" />}
        </button>

        {openSections.constraints && (
          <div className="p-6 space-y-4">
            <p className="text-sm font-medium text-black/80">
              The schema enforces entity, domain, and referential integrity using declarative MySQL constraints:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded">
                <span className="badge badge-yellow mb-2 block w-fit">PRIMARY KEY</span>
                <p className="text-black font-bold">Uniquely identifies each tuple.</p>
                <code className="text-black/70 block mt-1">book_id, member_id, loan_id</code>
                <div className="mt-2 text-[11px] text-red-600 font-bold">
                  ❌ Rejects duplicate or NULL identifier insertion.
                </div>
              </div>

              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded">
                <span className="badge badge-blue mb-2 block w-fit">FOREIGN KEY</span>
                <p className="text-black font-bold">Referential integrity across tables.</p>
                <code className="text-black/70 block mt-1">category_id, publisher_id, book_id</code>
                <div className="mt-2 text-red-600 font-bold text-[11px]">
                  ❌ Rejects orphan records (ON DELETE RESTRICT).
                </div>
              </div>

              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded">
                <span className="badge badge-coral mb-2 block w-fit">UNIQUE</span>
                <p className="text-black font-bold">Precludes duplicate values in attribute.</p>
                <code className="text-black/70 block mt-1">isbn, email, category_name</code>
                <div className="mt-2 text-red-600 font-bold text-[11px]">
                  ❌ Rejects inserting duplicate ISBN or Member Email.
                </div>
              </div>

              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded">
                <span className="badge badge-green mb-2 block w-fit">CHECK CONSTRAINT</span>
                <p className="text-black font-bold">Validates attribute domain predicate.</p>
                <code className="text-black/70 block mt-1">CHECK (total_copies &gt;= 0)</code>
                <div className="mt-2 text-red-600 font-bold text-[11px]">
                  ❌ Rejects negative total copies or due_date &lt; issue_date.
                </div>
              </div>

              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded">
                <span className="badge badge-yellow mb-2 block w-fit">NOT NULL</span>
                <p className="text-black font-bold">Mandates presence of crucial data.</p>
                <code className="text-black/70 block mt-1">title, full_name, due_date</code>
                <div className="mt-2 text-red-600 font-bold text-[11px]">
                  ❌ Rejects null or empty string submission.
                </div>
              </div>

              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded">
                <span className="badge badge-blue mb-2 block w-fit">COMPOSITE KEY</span>
                <p className="text-black font-bold">Multi-column primary key.</p>
                <code className="text-black/70 block mt-1">PRIMARY KEY(book_id, author_id)</code>
                <div className="mt-2 text-red-600 font-bold text-[11px]">
                  ❌ Rejects duplicate author-book pairings.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: JOINS DEMONSTRATION */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <button
          onClick={() => toggleSection('joins')}
          className="w-full p-4 bg-[#FF7B72] text-white border-b-2 border-black flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <GitMerge className="w-5 h-5 text-white" />
            <h2 className="font-black text-lg text-white uppercase tracking-tight">
              3. Relational Joins (INNER JOIN & LEFT JOIN)
            </h2>
          </div>
          {openSections.joins ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
        </button>

        {openSections.joins && (
          <div className="p-6 space-y-6">
            {/* INNER JOIN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm uppercase tracking-wider text-black flex items-center gap-2">
                  <span className="badge badge-yellow">Query A</span>
                  INNER JOIN: Current Issued Book Context (Loans ⨝ Books ⨝ Members)
                </h3>
                <button
                  onClick={() => copyToClipboard(conceptsData?.innerJoin?.sql || '', 'inner')}
                  className="px-2.5 py-1 bg-white border border-black rounded text-[11px] font-mono font-bold flex items-center gap-1 hover:bg-[#FFE566] cursor-pointer"
                >
                  {copiedIndex === 'inner' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === 'inner' ? 'Copied SQL' : 'Copy Query'}</span>
                </button>
              </div>

              <div className="bg-[#1A1A1A] text-[#B8F28B] p-3 rounded border-2 border-black font-mono text-xs overflow-x-auto">
                <pre>{conceptsData?.innerJoin?.sql || `SELECT l.loan_id, b.title, m.full_name, l.issue_date, l.due_date
FROM Loans l
INNER JOIN Books b ON l.book_id = b.book_id
INNER JOIN Members m ON l.member_id = m.member_id`}</pre>
              </div>

              {/* Live INNER JOIN Data Table */}
              <div className="border-2 border-black rounded-md overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FFE566] border-b border-black font-mono font-bold uppercase sticky top-0">
                    <tr>
                      <th className="p-2 border-r border-black">Loan ID</th>
                      <th className="p-2 border-r border-black">Book Title</th>
                      <th className="p-2 border-r border-black">Borrower</th>
                      <th className="p-2 border-r border-black">Issue Date</th>
                      <th className="p-2">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/20 font-medium">
                    {conceptsData?.innerJoin?.data?.slice(0, 5).map((row: any) => (
                      <tr key={row.loan_id} className="hover:bg-[#FFFDF5]">
                        <td className="p-2 font-mono font-bold border-r border-black/20">#{row.loan_id}</td>
                        <td className="p-2 font-bold border-r border-black/20">{row.book_title || row.title}</td>
                        <td className="p-2 border-r border-black/20">{row.member_name || row.full_name}</td>
                        <td className="p-2 font-mono border-r border-black/20">{row.issue_date}</td>
                        <td className="p-2 font-mono">{row.due_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LEFT JOIN */}
            <div className="space-y-3 pt-4 border-t-2 border-black/20">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm uppercase tracking-wider text-black flex items-center gap-2">
                  <span className="badge badge-coral">Query B</span>
                  LEFT JOIN: Books That Have Never Been Borrowed (Books ⟕ Loans WHERE Loan IS NULL)
                </h3>
                <button
                  onClick={() => copyToClipboard(conceptsData?.leftJoin?.sql || '', 'left')}
                  className="px-2.5 py-1 bg-white border border-black rounded text-[11px] font-mono font-bold flex items-center gap-1 hover:bg-[#FFE566] cursor-pointer"
                >
                  {copiedIndex === 'left' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === 'left' ? 'Copied SQL' : 'Copy Query'}</span>
                </button>
              </div>

              <div className="bg-[#1A1A1A] text-[#FF7B72] p-3 rounded border-2 border-black font-mono text-xs overflow-x-auto">
                <pre>{conceptsData?.leftJoin?.sql || `SELECT b.book_id, b.isbn, b.title, c.category_name
FROM Books b
JOIN Categories c ON b.category_id = c.category_id
LEFT JOIN Loans l ON b.book_id = l.book_id
WHERE l.loan_id IS NULL`}</pre>
              </div>

              {/* Live LEFT JOIN Data Table */}
              <div className="border-2 border-black rounded-md overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FFE566] border-b border-black font-mono font-bold uppercase sticky top-0">
                    <tr>
                      <th className="p-2 border-r border-black">Book ID</th>
                      <th className="p-2 border-r border-black">ISBN</th>
                      <th className="p-2 border-r border-black">Unborrowed Book Title</th>
                      <th className="p-2">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/20 font-medium">
                    {conceptsData?.leftJoin?.data && conceptsData.leftJoin.data.length > 0 ? (
                      conceptsData.leftJoin.data.map((row: any) => (
                        <tr key={row.book_id} className="hover:bg-[#FFFDF5]">
                          <td className="p-2 font-mono font-bold border-r border-black/20">#{row.book_id}</td>
                          <td className="p-2 font-mono border-r border-black/20">{row.isbn}</td>
                          <td className="p-2 font-bold border-r border-black/20">{row.title}</td>
                          <td className="p-2"><span className="badge badge-yellow">{row.category_name}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center font-mono text-black/50">
                          All books have been borrowed at least once.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: SUBQUERIES DEMONSTRATION */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <button
          onClick={() => toggleSection('subqueries')}
          className="w-full p-4 bg-[#FFE566] border-b-2 border-black flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <SearchCode className="w-5 h-5 text-black" />
            <h2 className="font-black text-lg text-black uppercase tracking-tight">
              4. Advanced Nested Subqueries
            </h2>
          </div>
          {openSections.subqueries ? <ChevronUp className="w-5 h-5 text-black" /> : <ChevronDown className="w-5 h-5 text-black" />}
        </button>

        {openSections.subqueries && (
          <div className="p-6 space-y-6">
            {/* Subquery 1: Books Above Average */}
            <div className="space-y-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-black">
                A. Books Borrowed More Often Than Average Borrow Count
              </h3>
              <div className="bg-[#1A1A1A] text-[#FFE566] p-3 rounded border-2 border-black font-mono text-xs overflow-x-auto">
                <pre>{conceptsData?.subqueryAboveAvg?.sql || `SELECT b.title, COUNT(l.loan_id) as borrow_count
FROM Books b JOIN Loans l ON b.book_id = l.book_id
GROUP BY b.book_id, b.title
HAVING borrow_count > (
  SELECT AVG(cnt) FROM (SELECT COUNT(*) as cnt FROM Loans GROUP BY book_id) as sub
)`}</pre>
              </div>
              <div className="border-2 border-black rounded-md overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#B8F28B] border-b border-black font-mono font-bold uppercase">
                    <tr>
                      <th className="p-2 border-r border-black">Book Title</th>
                      <th className="p-2 text-center">Borrow Count (Above Average)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/20 font-medium">
                    {conceptsData?.subqueryAboveAvg?.data?.map((row: any) => (
                      <tr key={row.book_id || row.title} className="hover:bg-[#FFFDF5]">
                        <td className="p-2 font-bold border-r border-black/20">{row.title}</td>
                        <td className="p-2 font-mono font-bold text-center bg-[#FFE566]/30">{row.borrow_count} loans</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subquery 2: Members Who Never Borrowed */}
            <div className="space-y-3 pt-4 border-t-2 border-black/20">
              <h3 className="font-black text-sm uppercase tracking-wider text-black">
                B. Members Who Have Never Borrowed a Book (NOT IN Subquery)
              </h3>
              <div className="bg-[#1A1A1A] text-[#FFE566] p-3 rounded border-2 border-black font-mono text-xs overflow-x-auto">
                <pre>{conceptsData?.subqueryNeverBorrowed?.sql || `SELECT m.member_id, m.full_name, m.email
FROM Members m
WHERE m.member_id NOT IN (SELECT DISTINCT member_id FROM Loans)`}</pre>
              </div>
              <div className="border-2 border-black rounded-md overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#B8F28B] border-b border-black font-mono font-bold uppercase">
                    <tr>
                      <th className="p-2 border-r border-black">Member ID</th>
                      <th className="p-2 border-r border-black">Full Name</th>
                      <th className="p-2">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/20 font-medium">
                    {conceptsData?.subqueryNeverBorrowed?.data && conceptsData.subqueryNeverBorrowed.data.length > 0 ? (
                      conceptsData.subqueryNeverBorrowed.data.map((row: any) => (
                        <tr key={row.member_id} className="hover:bg-[#FFFDF5]">
                          <td className="p-2 font-mono font-bold border-r border-black/20">#{row.member_id}</td>
                          <td className="p-2 font-bold border-r border-black/20">{row.full_name}</td>
                          <td className="p-2 font-mono">{row.email}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-3 text-center font-mono text-black/50">
                          All registered patrons have at least 1 historical loan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5: TRIGGERS & AUDIT LOG */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <button
          onClick={() => toggleSection('triggers')}
          className="w-full p-4 bg-[#B8F28B] border-b-2 border-black flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-black" />
            <h2 className="font-black text-lg text-black uppercase tracking-tight">
              5. MySQL Triggers & Automated Audit Logging
            </h2>
          </div>
          {openSections.triggers ? <ChevronUp className="w-5 h-5 text-black" /> : <ChevronDown className="w-5 h-5 text-black" />}
        </button>

        {openSections.triggers && (
          <div className="p-6 space-y-6">
            <p className="text-sm font-medium text-black/80">
              The system utilizes three stored database triggers to guarantee date integrity and automate compliance recording:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded">
                <span className="badge badge-coral mb-2 block w-fit font-mono">BEFORE INSERT ON Loans</span>
                <p className="font-bold text-black mb-1">Pre-Insert Validation</p>
                <p className="text-black/70">
                  Verifies that patron is active, due_date &gt;= issue_date, and available stock &gt; 0 via <code className="font-mono">SIGNAL SQLSTATE '45000'</code>.
                </p>
              </div>

              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded">
                <span className="badge badge-green mb-2 block w-fit font-mono">AFTER INSERT ON Loans</span>
                <p className="font-bold text-black mb-1">Audit Log Recording</p>
                <p className="text-black/70">
                  Automatically appends a timestamped audit entry into the <code className="font-mono">Audit_Log</code> table capturing Book ID, Member ID, and Due Date.
                </p>
              </div>

              <div className="p-3 bg-[#FFFDF5] border-2 border-black rounded">
                <span className="badge badge-blue mb-2 block w-fit font-mono">BEFORE UPDATE ON Loans</span>
                <p className="font-bold text-black mb-1">Return Date Validator</p>
                <p className="text-black/70">
                  Prevents backdated return dates (return_date &lt; issue_date) and logs return completion event in Audit_Log.
                </p>
              </div>
            </div>

            {/* Live Audit Log Stream */}
            <div className="space-y-2">
              <h3 className="font-black text-xs uppercase tracking-wider text-black flex items-center justify-between">
                <span>Live Audit_Log Database Output</span>
                <span className="text-[10px] font-mono font-bold bg-[#FFE566] px-2 py-0.5 border border-black rounded">
                  Autonomous Trigger Output
                </span>
              </h3>

              <div className="border-2 border-black rounded-md overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FFE566] border-b border-black font-mono font-bold uppercase sticky top-0">
                    <tr>
                      <th className="p-2 border-r border-black">Log ID</th>
                      <th className="p-2 border-r border-black">Event Type</th>
                      <th className="p-2 border-r border-black">Table</th>
                      <th className="p-2 border-r border-black">Details</th>
                      <th className="p-2 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/20 font-medium">
                    {conceptsData?.auditLogs?.data && conceptsData.auditLogs.data.length > 0 ? (
                      conceptsData.auditLogs.data.map((log: any) => (
                        <tr key={log.log_id} className="hover:bg-[#FFFDF5]">
                          <td className="p-2 font-mono font-bold border-r border-black/20">#{log.log_id}</td>
                          <td className="p-2 font-mono font-bold border-r border-black/20">
                            <span
                              className={`badge ${
                                log.event_type === 'BOOK_ISSUED' ? 'badge-yellow' : 'badge-green'
                              }`}
                            >
                              {log.event_type}
                            </span>
                          </td>
                          <td className="p-2 font-mono border-r border-black/20">{log.table_name}</td>
                          <td className="p-2 font-mono text-[11px] border-r border-black/20 text-black/80">{log.details}</td>
                          <td className="p-2 font-mono text-right text-black/60 text-[10px]">{log.created_at}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-3 text-center font-mono text-black/50">
                          Audit log empty. Issue or return a book to fire the triggers.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 6: NORMALIZATION (1NF, 2NF, 3NF) */}
      <div className="bg-white border-[3px] border-black rounded-lg shadow-[5px_5px_0px_#000] overflow-hidden">
        <button
          onClick={() => toggleSection('normalization')}
          className="w-full p-4 bg-[#FFE566] border-b-2 border-black flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <FileCheck2 className="w-5 h-5 text-black" />
            <h2 className="font-black text-lg text-black uppercase tracking-tight">
              6. Database Normalization Proof (1NF, 2NF, 3NF)
            </h2>
          </div>
          {openSections.normalization ? <ChevronUp className="w-5 h-5 text-black" /> : <ChevronDown className="w-5 h-5 text-black" />}
        </button>

        {openSections.normalization && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                  <span className="font-black text-xs uppercase text-black">First Normal Form</span>
                  <span className="badge badge-green font-mono">1NF</span>
                </div>
                <ul className="text-xs space-y-1.5 text-black/80 list-disc pl-4 font-medium">
                  <li>All table columns hold strictly atomic (indivisible) scalar values.</li>
                  <li>No comma-separated author lists stored in the Books table.</li>
                  <li>Multi-valued authors decomposed via the <code className="font-mono font-bold">Book_Authors</code> junction table.</li>
                </ul>
              </div>

              <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                  <span className="font-black text-xs uppercase text-black">Second Normal Form</span>
                  <span className="badge badge-blue font-mono">2NF</span>
                </div>
                <ul className="text-xs space-y-1.5 text-black/80 list-disc pl-4 font-medium">
                  <li>Satisfies 1NF completely.</li>
                  <li>Eliminates partial functional dependencies.</li>
                  <li>In <code className="font-mono font-bold">Book_Authors(book_id, author_id)</code>, neither non-key attributes depend on only part of the composite primary key.</li>
                </ul>
              </div>

              <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                  <span className="font-black text-xs uppercase text-black">Third Normal Form</span>
                  <span className="badge badge-coral font-mono">3NF</span>
                </div>
                <ul className="text-xs space-y-1.5 text-black/80 list-disc pl-4 font-medium">
                  <li>Satisfies 2NF completely.</li>
                  <li>Eliminates transitive dependencies (X ➔ Y and Y ➔ Z).</li>
                  <li>Publisher metadata (<code className="font-mono">publisher_name</code>) isolated into <code className="font-mono font-bold">Publishers</code>, Category names into <code className="font-mono font-bold">Categories</code>.</li>
                  <li>Available copies dynamically derived, preventing state drift.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
