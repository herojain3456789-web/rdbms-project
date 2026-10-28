'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggle } = useSidebar();
  const [currentDate, setCurrentDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const today = new Date();
    setCurrentDate(
      today.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    );
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Generate breadcrumb items
  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'BOOKSTACK', href: '/' },
    ...pathParts.map((part, index) => {
      const href = '/' + pathParts.slice(0, index + 1).join('/');
      let label = part.charAt(0).toUpperCase() + part.slice(1);
      if (part === 'circulation') label = 'Issue & Return';
      if (part === 'sql-concepts') label = 'SQL Concepts';
      return { label, href };
    }),
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b-[3px] border-black px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
      {/* Left side: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="lg:hidden p-2 bg-[#FFE566] border-2 border-black rounded-md shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5 text-black" />
        </button>

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-black/40" />}
              <span
                className={
                  idx === breadcrumbs.length - 1
                    ? 'bg-[#FFE566] px-2 py-0.5 border border-black rounded text-black font-extrabold uppercase'
                    : 'text-black/60 hover:text-black hover:underline cursor-pointer'
                }
                onClick={() => router.push(crumb.href)}
              >
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Center: Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden md:block">
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books, ISBN, author, members..."
            className="w-full bg-[#FFFDF5] border-[2.5px] border-black rounded-md py-1.5 pl-9 pr-3 text-sm font-medium placeholder:text-black/40 focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#000] transition-all"
          />
          <Search className="w-4 h-4 text-black/60 absolute left-3 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1.5 px-2 py-0.5 bg-[#4169FF] text-white text-[11px] font-mono font-bold uppercase rounded border border-black hover:bg-[#3454cc] transition-colors"
          >
            Go
          </button>
        </div>
      </form>

      {/* Right side: Date, Notifications, Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Date Display */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono font-bold bg-[#FFFDF5] border-2 border-black px-2.5 py-1.5 rounded-md shadow-[2px_2px_0px_#000]">
          <Calendar className="w-3.5 h-3.5 text-black" />
          <span>{currentDate || 'Today'}</span>
        </div>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative p-2 bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_#000] hover:bg-[#FFE566] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-black" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#FF7B72] border-2 border-black rounded-full flex items-center justify-center text-[9px] font-bold text-white">
              3
            </span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white border-[2.5px] border-black rounded-md shadow-[5px_5px_0px_#000] p-3 z-50 animate-slide-up">
              <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
                <span className="font-extrabold text-xs uppercase tracking-wider text-black">
                  System Alerts
                </span>
                <span className="text-[10px] font-mono bg-[#FF7B72] text-white px-1.5 py-0.5 rounded border border-black font-bold">
                  2 Overdue
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-[#FFFDF5] border border-black rounded">
                  <p className="font-bold text-black">Overdue Book Alert</p>
                  <p className="text-black/70 text-[11px]">
                    "The Great Gatsby" is overdue by 21 days (Charlie Brown).
                  </p>
                </div>
                <div className="p-2 bg-[#FFFDF5] border border-black rounded">
                  <p className="font-bold text-black">Trigger Fired</p>
                  <p className="text-black/70 text-[11px]">
                    Audit_Log updated after book return event.
                  </p>
                </div>
                <div className="p-2 bg-[#FFFDF5] border border-black rounded">
                  <p className="font-bold text-black">System Ready</p>
                  <p className="text-black/70 text-[11px]">
                    Relational integrity checks passing 100%.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2 bg-white border-2 border-black rounded-md p-1 pr-2.5 shadow-[2px_2px_0px_#000]">
          <div className="w-7 h-7 bg-[#4169FF] text-white rounded font-mono font-bold text-xs flex items-center justify-center border border-black">
            A
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold leading-tight text-black flex items-center gap-1">
              Admin
              <ShieldCheck className="w-3 h-3 text-[#4169FF]" />
            </div>
            <div className="text-[10px] font-mono text-black/60 leading-none">
              DBA Mode
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
