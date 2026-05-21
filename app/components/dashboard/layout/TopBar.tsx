'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useDashboardContext } from '../context/DashboardContext';
import { useEffect, useState } from 'react';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard/overview': 'Overview',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/segmentation': 'Segmentation',
  '/dashboard/data-management': 'Data Management',
  '/dashboard/reports': 'Reports',
  '/dashboard/chat': 'Team Chat',
  '/dashboard/settings': 'Settings',
};

function getPageLabel(pathname: string | null): string {
  if (!pathname) return 'Dashboard';
  for (const [key, label] of Object.entries(PAGE_LABELS)) {
    if (pathname.startsWith(key)) return label;
  }
  return 'Dashboard';
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateTheme = () => {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const initial = stored || (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
      setTheme(initial);
    };

    updateTheme();
    window.addEventListener('themechange', updateTheme);
    return () => {
      window.removeEventListener('themechange', updateTheme);
    };
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    window.dispatchEvent(new Event('themechange'));
  };

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="w-8 h-8 rounded-lg border border-[var(--b)] bg-transparent flex items-center justify-center text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] transition-all duration-200"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        /* Sun icon */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Moon icon */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

interface TopBarProps {
  page?: string;
}

export default function TopBar({ page }: TopBarProps) {
  const pathname = usePathname();
  const { workspace, profile } = useDashboardContext();

  const workspaceName = workspace?.name || 'Workspace';
  const workspaceLogo = workspace?.logoUrl ?? null;
  const currentPage = page || getPageLabel(pathname);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div
      className="h-14 border-b border-[var(--b)] bg-[var(--surf)] flex items-center justify-between px-5 shrink-0 sticky top-0 z-20"
      style={{ transition: 'background .35s, border-color .35s' }}
    >
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Workspace badge */}
        <div className="flex items-center gap-1.5 bg-[var(--bg1)] border border-[var(--b)] rounded-lg px-2.5 py-1.5 shrink-0">
          <div className="w-5 h-5 rounded-md border border-[var(--b)] bg-[var(--surf)] flex items-center justify-center overflow-hidden shrink-0">
            {workspaceLogo ? (
              <img src={workspaceLogo} alt="Company logo" className="w-full h-full object-cover" />
            ) : (
              <Image src="/images/logo_arka_hitam.png" alt="Arka" width={14} height={14} className="object-contain" />
            )}
          </div>
          <span className="text-[12px] font-bold text-[var(--t)] truncate max-w-[100px]">{workspaceName}</span>
        </div>

        {/* Separator */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--t4)] shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>

        {/* Current page */}
        <span className="text-[13px] font-semibold text-[var(--t)] truncate">{currentPage}</span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Date chip */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[var(--t3)] font-medium px-3 py-1.5 rounded-lg bg-[var(--bg1)] border border-[var(--b)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{today}</span>
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button
          title="Notifications"
          className="relative w-8 h-8 rounded-lg border border-[var(--b)] flex items-center justify-center text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] transition-all duration-200"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--b2)]" />

        {/* Profile chip */}
        <div className="flex items-center gap-2 pl-1">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-semibold text-[var(--t)] leading-tight">{profile?.fullName?.split(' ')[0] || 'User'}</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-[var(--bg3)] border border-[var(--b)] flex items-center justify-center text-[11px] font-bold text-[var(--t)] overflow-hidden">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{(profile?.fullName || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
