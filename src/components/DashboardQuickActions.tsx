'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, UserPlus, ArrowLeftRight } from 'lucide-react';
import BookModal from '@/components/BookModal';
import MemberModal from '@/components/MemberModal';
import { useRouter } from 'next/navigation';

export default function DashboardQuickActions() {
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <>
      <div className="bg-white border-[3px] border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black uppercase tracking-wider text-black">
            Fast Operations:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="btn-brutal btn-yellow text-xs py-2 px-3.5 cursor-pointer font-bold text-black"
          >
            <PlusCircle className="w-4 h-4 text-black" />
            <span>Add Book</span>
          </button>
          <button
            onClick={() => setIsMemberModalOpen(true)}
            className="btn-brutal btn-blue text-xs py-2 px-3.5 cursor-pointer font-bold text-white"
          >
            <UserPlus className="w-4 h-4 text-white" />
            <span>Register Member</span>
          </button>
          <Link
            href="/circulation"
            className="btn-brutal btn-green text-xs py-2 px-3.5 cursor-pointer font-bold text-black"
          >
            <ArrowLeftRight className="w-4 h-4 text-black" />
            <span>Issue / Return Book</span>
          </Link>
        </div>
      </div>

      <BookModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={handleRefresh}
      />
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </>
  );
}
