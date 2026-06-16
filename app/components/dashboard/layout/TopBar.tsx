'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDashboardContext, type DatasetSummary } from '../context/DashboardContext';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard/overview': 'Overview',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/segmentation': 'Segmentation',
  '/dashboard/simulation': 'Simulation',
  '/dashboard/data-management': 'Data Management',
  '/dashboard/reports': 'Reports',
  '/dashboard/chat': 'Team Chat',
  '/dashboard/settings': 'Settings',
};

// Pages where the dataset switcher is meaningful
const DATASET_PAGES = [
  '/dashboard/overview',
  '/dashboard/analytics',
  '/dashboard/segmentation',
  '/dashboard/simulation',
  '/dashboard/reports',
];

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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function DatasetSwitcherDropdown({
  triggerRef,
  datasets,
  activeId,
  onSelect,
  onClose,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  datasets: DatasetSummary[];
  activeId: string | null;
  onSelect: (d: DatasetSummary) => void;
  onClose: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!triggerRef.current) return;
    setRect(triggerRef.current.getBoundingClientRect());
  }, [triggerRef]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      const portal = document.getElementById('dataset-switcher-portal');
      if (portal?.contains(e.target as Node)) return;
      onClose();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose, triggerRef]);

  if (!rect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    right: window.innerWidth - rect.right,
    top: rect.bottom + 6,
    minWidth: Math.max(rect.width, 260),
    zIndex: 9999,
  };

  return createPortal(
    <div
      id="dataset-switcher-portal"
      style={style}
      className="rounded-xl border border-[var(--b3)] bg-[var(--surf)] shadow-2xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-[var(--b)] bg-[var(--bg1)]/60">
        <p className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-[0.1em] font-mono">Switch Dataset</p>
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {datasets.map((d, i) => {
          const isActive = d.id === activeId;
          const label = d.displayId ?? d.id.slice(0, 8).toUpperCase();
          const date = new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-[var(--bg2)] transition-colors ${isActive ? 'bg-[var(--bg1)]' : ''}`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black font-mono ${isActive ? 'bg-[var(--t)] text-[var(--inv-t)]' : 'bg-[var(--bg2)] text-[var(--t3)]'}`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[12px] font-bold truncate ${isActive ? 'text-[var(--t)]' : 'text-[var(--t2)]'}`}>{label}</div>
                <div className="text-[10px] font-mono text-[var(--t3)] mt-0.5 truncate">
                  {date}{d.totalCustomers ? ` · ${d.totalCustomers.toLocaleString()} customers` : ''}
                </div>
              </div>
              {isActive && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0 text-[var(--t)]">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

function DatasetSwitcher() {
  const { availableDatasets, activeDataset, setActiveDataset } = useDashboardContext();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleSelect = useCallback((d: DatasetSummary) => {
    setActiveDataset(d.id);
    setOpen(false);
    if (!d.displayId) return;
    if (pathname?.startsWith('/dashboard/analytics')) {
      router.push(`/dashboard/analytics?d=${d.displayId}`);
    } else if (pathname?.startsWith('/dashboard/segmentation')) {
      router.push(`/dashboard/segmentation?d=${d.displayId}`);
    } else if (pathname?.startsWith('/dashboard/overview')) {
      router.push(`/dashboard/overview?d=${d.displayId}`);
    }
    // Reports and Simulation: context update alone is sufficient
    // (Reports uses activeDatasetId for generation; Simulation uses activeDatasetId for customer list)
  }, [pathname, router, setActiveDataset]);

  const isDatasetPage = DATASET_PAGES.some(p => pathname?.startsWith(p));

  if (!mounted || availableDatasets.length === 0 || !isDatasetPage) return null;

  const label = activeDataset?.displayId ?? '—';
  const hasMultiple = availableDatasets.length > 1;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => hasMultiple && setOpen(o => !o)}
        title={hasMultiple ? 'Switch dataset' : `Dataset: ${label}`}
        className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11px] font-medium transition-all duration-200 ${
          hasMultiple ? 'cursor-pointer' : 'cursor-default'
        } ${open
          ? 'border-[var(--t)] bg-[var(--bg2)] text-[var(--t)]'
          : 'border-[var(--b)] bg-[var(--bg1)] text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg2)] hover:border-[var(--b2)]'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--t3)]">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5V19A9 3 0 0 0 21 19V5" />
          <path d="M3 12A9 3 0 0 0 21 12" />
        </svg>
        <span className="font-semibold text-[var(--t)]">{label}</span>
        {hasMultiple && (
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`shrink-0 text-[var(--t3)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {open && (
        <DatasetSwitcherDropdown
          triggerRef={triggerRef}
          datasets={availableDatasets}
          activeId={activeDataset?.id ?? null}
          onSelect={handleSelect}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

interface TopBarProps {
  page?: string;
}

export default function TopBar({ page }: TopBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { workspace, profile } = useDashboardContext();

  const workspaceName = workspace?.name || 'Workspace';
  const workspaceLogo = workspace?.logoUrl ?? null;
  const currentPage = page || getPageLabel(pathname);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const customerId = searchParams.get('customer_id');

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
        {customerId && currentPage === 'Simulation' ? (
          <Link href="/dashboard/simulation" className="text-[13px] font-semibold text-[var(--t3)] hover:text-[var(--t)] transition-colors truncate">
            {currentPage}
          </Link>
        ) : (
          <span className="text-[13px] font-semibold text-[var(--t)] truncate">{currentPage}</span>
        )}

        {customerId && currentPage === 'Simulation' && (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--t4)] shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-[13px] font-semibold text-[var(--t)] truncate">{customerId}</span>
          </>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dataset switcher */}
        <DatasetSwitcher />

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--b2)]" />

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
