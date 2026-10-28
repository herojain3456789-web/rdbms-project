'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeftRight,
  History,
  Tags,
  BarChart3,
  Database,
  Settings,
  X,
  Library,
  Sparkles,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Books', href: '/books', icon: BookOpen },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Issue & Return', href: '/circulation', icon: ArrowLeftRight },
  { name: 'Borrowing History', href: '/history', icon: History },
  { name: 'Categories', href: '/categories', icon: Tags },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={close}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r-[3px] border-black flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo & Header */}
          <div className="p-5 border-b-[3px] border-black bg-[#FFE566] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group" onClick={close}>
              <div className="w-10 h-10 bg-black text-[#FFE566] flex items-center justify-center font-black text-xl rounded-md shadow-[2px_2px_0px_#000] border-2 border-black group-hover:rotate-6 transition-transform">
                <Library className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-black block leading-none">
                  BOOKSTACK
                </span>
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-black/70">
                  RDBMS LAB SYSTEM
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={close}
              className="lg:hidden p-1.5 border-2 border-black rounded-md bg-white hover:bg-[#FF7B72] hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-170px)]">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/50 px-3 py-1">
              Menu Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={close}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md font-bold text-sm tracking-tight transition-all duration-150 border-2 ${
                    isActive
                      ? 'bg-[#FFE566] border-black text-black shadow-[3px_3px_0px_#000] translate-x-1'
                      : 'border-transparent text-black/80 hover:bg-[#FFFDF5] hover:border-black hover:text-black hover:shadow-[2px_2px_0px_#000]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-black stroke-[2.5]' : 'text-black/70'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Info Box */}
        <div className="p-4 border-t-[3px] border-black bg-[#FFFDF5]">
          <div className="p-3 bg-[#B8F28B] border-2 border-black rounded-md shadow-[3px_3px_0px_#000]">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-black shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-black">
                RDBMS Lab 2026
              </span>
            </div>
            <p className="text-[11px] font-medium text-black/80 leading-tight">
              BY ARYAN RAJ - 2502050786
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
