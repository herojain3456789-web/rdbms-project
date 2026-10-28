'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Database,
  RefreshCw,
  Layers,
  Wrench,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { initializeDatabaseAction } from '@/app/actions';

interface SettingsClientWrapperProps {
  initialDbStatus: {
    connected: boolean;
    engine: string;
    database: string;
    host: string;
    message?: string;
  };
  initialCounts: {
    books: number;
    members: number;
    loans: number;
    categories: number;
    authors: number;
    publishers: number;
  };
}

export default function SettingsClientWrapper({
  initialDbStatus,
  initialCounts,
}: SettingsClientWrapperProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [initializing, setInitializing] = useState(false);
  const [initResult, setInitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleInitDatabase = async () => {
    try {
      setInitializing(true);
      setInitResult(null);
      const res: any = await initializeDatabaseAction();
      if (!res.success) {
        throw new Error(res.error || 'Failed to initialize database tables.');
      }
      setInitResult({ type: 'success', message: res.message || 'Database schema initialized successfully!' });
      router.refresh();
    } catch (err: any) {
      setInitResult({ type: 'error', message: err.message });
    } finally {
      setInitializing(false);
    }
  };

  const isConnected = initialDbStatus.connected;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-[3px] border-black p-5 rounded-lg shadow-[5px_5px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FFE566] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Settings className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              System Settings & Architecture
            </h1>
            <p className="text-xs font-semibold text-black/70">
              Live database connection diagnostics and schema initialization
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="btn-brutal btn-yellow text-xs py-2 px-3.5 cursor-pointer font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
            <span>Re-test Connection</span>
          </button>
        </div>
      </div>

      {/* Database Connection Diagnostic Card */}
      <div className="bg-white border-[3px] border-black rounded-lg p-6 shadow-[5px_5px_0px_#000]">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#4169FF]" />
            <h2 className="font-extrabold text-base uppercase tracking-tight text-black">
              Database Connection Health
            </h2>
          </div>
          <span
            className={`badge ${
              isConnected ? 'badge-green text-black font-black' : 'badge-coral text-white font-black'
            } text-xs font-mono font-bold`}
          >
            {isConnected ? 'ONLINE • Connected' : 'DISCONNECTED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md">
            <span className="text-black uppercase font-black text-[10px] block mb-1">
              Connection Target
            </span>
            <div className="space-y-1 font-bold text-black">
              <div>Target: {initialDbStatus.host || 'Not Configured'}</div>
              <div>Database: {initialDbStatus.database || 'neondb'}</div>
              <div>
                Engine:{' '}
                {initialDbStatus.engine === 'postgres'
                  ? 'PostgreSQL (Neon Cloud Serverless)'
                  : 'MySQL Relational Engine'}
              </div>
              <div>
                Driver:{' '}
                {initialDbStatus.engine === 'postgres'
                  ? 'node-postgres (pg) with TLS/SSL pooler'
                  : 'mysql2/promise'}
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#FFFDF5] border-2 border-black rounded-md">
            <span className="text-black uppercase font-black text-[10px] block mb-1">
              Engine Status Message
            </span>
            <p className="font-bold text-black">
              {initialDbStatus.message || 'Database connected and operational.'}
            </p>
            <p className="text-[11px] font-sans text-black/80 font-medium mt-2">
              Connected via <code className="font-mono bg-white px-1 border border-black font-bold">DATABASE_URL</code> in <code className="font-mono bg-white px-1 border border-black font-bold">.env.local</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Schema Initialization Card */}
      <div className="bg-white border-[3px] border-black rounded-lg p-6 shadow-[5px_5px_0px_#000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b-2 border-black mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-black" />
            <h2 className="font-extrabold text-base uppercase tracking-tight text-black">
              Database Tables Initialization
            </h2>
          </div>
          <button
            onClick={handleInitDatabase}
            disabled={initializing || !isConnected}
            className="btn-brutal btn-green text-xs py-2 px-4 cursor-pointer font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${initializing ? 'animate-spin' : ''}`} />
            <span>{initializing ? 'Creating Tables...' : 'Initialize Schema Tables'}</span>
          </button>
        </div>

        <p className="text-xs text-black/80 font-medium mb-3">
          Creates all normalized tables (<code className="font-mono bg-[#FFFDF5] px-1 border border-black font-bold">Categories</code>, <code className="font-mono bg-[#FFFDF5] px-1 border border-black font-bold">Authors</code>, <code className="font-mono bg-[#FFFDF5] px-1 border border-black font-bold">Publishers</code>, <code className="font-mono bg-[#FFFDF5] px-1 border border-black font-bold">Books</code>, <code className="font-mono bg-[#FFFDF5] px-1 border border-black font-bold">Book_Authors</code>, <code className="font-mono bg-[#FFFDF5] px-1 border border-black font-bold">Members</code>, <code className="font-mono bg-[#FFFDF5] px-1 border border-black font-bold">Loans</code>, <code className="font-mono bg-[#FFFDF5] px-1 border border-black font-bold">Audit_Log</code>) with foreign keys and constraints on your connected database.
        </p>

        {initResult && (
          <div
            className={`p-3 border-2 border-black rounded-md flex items-center gap-2 text-xs font-bold ${
              initResult.type === 'success' ? 'bg-[#B8F28B] text-black' : 'bg-[#FF7B72] text-white'
            }`}
          >
            {initResult.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{initResult.message}</span>
          </div>
        )}
      </div>

      {/* Live Table Records Count */}
      <div className="bg-white border-[3px] border-black rounded-lg p-6 shadow-[5px_5px_0px_#000]">
        <h2 className="font-extrabold text-base uppercase tracking-tight text-black mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-black" />
          Live Database Record Counts
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-white border-2 border-black border-l-[6px] border-l-[#FFE566] rounded-md shadow-[2px_2px_0px_#000]">
            <span className="text-[10px] font-mono font-bold uppercase text-black block mb-1">
              Books Table
            </span>
            <span className="text-2xl font-black font-mono text-black">
              {initialCounts.books}
            </span>
          </div>

          <div className="p-4 bg-white border-2 border-black border-l-[6px] border-l-[#B8F28B] rounded-md shadow-[2px_2px_0px_#000]">
            <span className="text-[10px] font-mono font-bold uppercase text-black block mb-1">
              Members Table
            </span>
            <span className="text-2xl font-black font-mono text-black">
              {initialCounts.members}
            </span>
          </div>

          <div className="p-4 bg-white border-2 border-black border-l-[6px] border-l-[#4169FF] rounded-md shadow-[2px_2px_0px_#000]">
            <span className="text-[10px] font-mono font-bold uppercase text-black block mb-1">
              Loans Table
            </span>
            <span className="text-2xl font-black font-mono text-black">
              {initialCounts.loans}
            </span>
          </div>

          <div className="p-4 bg-white border-2 border-black border-l-[6px] border-l-[#FF7B72] rounded-md shadow-[2px_2px_0px_#000]">
            <span className="text-[10px] font-mono font-bold uppercase text-black block mb-1">
              Categories Table
            </span>
            <span className="text-2xl font-black font-mono text-black">
              {initialCounts.categories}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
