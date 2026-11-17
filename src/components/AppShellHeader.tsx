import React from 'react';
import { LogOut } from 'lucide-react';
import type { AppUser } from '@/src/types/muliabara';
import { BrandMark } from './BrandMark';

interface AppShellHeaderProps {
  currentUser: AppUser;
  onLogout: () => void;
}

export const AppShellHeader: React.FC<AppShellHeaderProps> = ({
  currentUser,
  onLogout,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#090e13]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <BrandMark variant="light" className="h-6 w-auto dark:hidden" />
          <BrandMark variant="dark" className="hidden h-6 w-auto dark:block" />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            Muliabara
          </span>
        </div>

        <nav
          aria-label="Navigasi Ruang Kerja"
          className="hidden items-center gap-4 text-xs font-medium text-slate-500 md:flex dark:text-slate-400"
        >
          <span className="whitespace-nowrap shrink-0">
            Plant &amp; Maintenance
          </span>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            {currentUser.role}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular whitespace-nowrap shrink-0">
            {currentUser.name} ({currentUser.id})
          </span>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-slate-700 dark:bg-[#10171f] dark:text-slate-200 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-300 whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
};
