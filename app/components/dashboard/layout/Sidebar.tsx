'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDashboardContext } from '../context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import type { Permission } from '../context/permissions';

const INSIGHT_ITEMS: {
  href: string;
  label: string;
  requiredPermission?: Permission;
  icon: React.ReactNode;
}[] = [
    {
      href: '/dashboard/overview',
      label: 'Overview',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      href: '/dashboard/analytics',
      label: 'Analytics',
      requiredPermission: 'view_analytics',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: '/dashboard/segmentation',
      label: 'Segmentation',
      requiredPermission: 'view_analytics',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      ),
    },
  ];

const WORKSPACE_ITEMS: {
  href: string;
  label: string;
  requiredPermission?: Permission;
  icon: React.ReactNode;
  badge?: 'chat';
}[] = [
    {
      href: '/dashboard/data-management',
      label: 'Data Management',
      requiredPermission: 'manage_data',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
    },
    {
      href: '/dashboard/reports',
      label: 'Reports',
      requiredPermission: 'export_reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      href: '/dashboard/chat',
      label: 'Team Chat',
      badge: 'chat',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { myPermissions, unreadChatCount } = useDashboardContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync collapsed state with localStorage on client mount
  useEffect(() => {
    const val = localStorage.getItem('arkanalytics-sidebar-collapsed');
    if (val === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('arkanalytics-sidebar-collapsed', String(nextVal));
  };

  const filterNavItems = <T extends { requiredPermission?: Permission }>(items: T[]): T[] => {
    return items.filter(
      (item) => !item.requiredPermission || myPermissions.includes(item.requiredPermission)
    );
  };

  const visibleInsightItems = filterNavItems(INSIGHT_ITEMS);
  const visibleWorkspaceItems = filterNavItems(WORKSPACE_ITEMS);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/signin');
    router.refresh();
  };

  return (
    <aside
      className={`${isCollapsed ? 'w-[72px]' : 'w-[240px]'
        } bg-[var(--surf)] border-r border-[var(--b)] flex flex-col py-4 shrink-0 h-screen sticky top-0 z-30 transition-all duration-300`}
    >
      {/* Logo Section */}
      <div className={`flex items-center mb-6 px-4 ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
        {!isCollapsed ? (
          <>
            <Link
              href="/dashboard/overview"
              className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-[var(--bg2)] border border-[var(--b)] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-6">
                <img className="logo-theme-sensitive w-5 h-5 object-contain" alt="Arka" />
              </div>
              <span className="text-[14px] font-bold text-[var(--t)] tracking-[-0.02em] whitespace-nowrap animate-in fade-in duration-200">
                Arkanalytics
              </span>
            </Link>
            <button
              onClick={toggleSidebar}
              title="Collapse Sidebar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--t3)] hover:text-[var(--t)] hover:bg-[var(--bg2)] transition-all duration-200"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            title="Expand Sidebar"
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg2)] border border-[var(--b)] text-[var(--t2)] hover:text-[var(--t)] hover:opacity-80 transition-all duration-200 group"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <div className="block group-hover:hidden transition-all">
                <img className="logo-theme-sensitive w-4 h-4 object-contain" alt="Arka" />
              </div>
              <div className="hidden group-hover:block transition-all text-[var(--t)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto px-2">

        {/* GROUP 1: INSIGHT */}
        {visibleInsightItems.length > 0 && (
          <div>
            {!isCollapsed ? (
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em]">Insight</span>
              </div>
            ) : (
              <div className="px-2 mb-2 flex justify-center">
                <div className="w-5 h-px bg-[var(--b)]" />
              </div>
            )}

            <nav className="flex flex-col gap-0.5">
              {visibleInsightItems.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 group ${isCollapsed ? 'justify-center px-0 py-2.5 h-10 w-10 mx-auto' : 'gap-3 px-3 py-2.5'
                      } ${isActive
                        ? 'bg-[var(--t)] text-[var(--inv-t)]'
                        : 'text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg2)]'
                      }`}
                  >
                    {isActive && (
                      <span
                        className={`absolute w-0.5 rounded-r-full bg-[var(--inv-t)] opacity-50 ${isCollapsed ? 'left-1 top-1/2 -translate-y-1/2 h-4' : 'left-0 top-1/2 -translate-y-1/2 h-5'
                          }`}
                      />
                    )}
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* GROUP 2: WORKSPACE */}
        {visibleWorkspaceItems.length > 0 && (
          <div>
            {!isCollapsed ? (
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em]">Workspace</span>
              </div>
            ) : (
              <div className="px-2 mb-2 flex justify-center">
                <div className="w-5 h-px bg-[var(--b)]" />
              </div>
            )}

            <nav className="flex flex-col gap-0.5">
              {visibleWorkspaceItems.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                const badgeCount = item.badge === 'chat' && unreadChatCount > 0 ? unreadChatCount : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 group ${isCollapsed ? 'justify-center px-0 py-2.5 h-10 w-10 mx-auto' : 'gap-3 px-3 py-2.5'
                      } ${isActive
                        ? 'bg-[var(--t)] text-[var(--inv-t)]'
                        : 'text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg2)]'
                      }`}
                  >
                    {isActive && (
                      <span
                        className={`absolute w-0.5 rounded-r-full bg-[var(--inv-t)] opacity-50 ${isCollapsed ? 'left-1 top-1/2 -translate-y-1/2 h-4' : 'left-0 top-1/2 -translate-y-1/2 h-5'
                          }`}
                      />
                    )}
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {badgeCount > 0 && (
                      isCollapsed ? (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300">
                          {badgeCount > 9 ? '!' : badgeCount}
                        </span>
                      ) : (
                        <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300 shrink-0">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 my-2 h-px bg-[var(--b)]" />

      {/* Bottom Actions Section */}
      <div className="flex flex-col gap-0.5 px-2">
        {/* Settings */}
        <Link
          href="/dashboard/settings"
          title={isCollapsed ? 'Settings' : undefined}
          className={`flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 ${isCollapsed ? 'justify-center px-0 py-2.5 h-10 w-10 mx-auto' : 'gap-3 px-3 py-2.5'
            } ${pathname?.startsWith('/dashboard/settings')
              ? 'bg-[var(--t)] text-[var(--inv-t)]'
              : 'text-[var(--t2)] hover:text-[var(--t)] hover:bg-[var(--bg2)]'
            }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {!isCollapsed && <span>Settings</span>}
        </Link>

        {/* Log Out */}
        <button
          onClick={() => { void handleLogout(); }}
          title={isCollapsed ? 'Log Out' : undefined}
          className={`flex items-center rounded-xl text-[13px] font-medium text-[var(--t2)] hover:text-red-500 hover:bg-red-50/50 transition-all duration-200 ${isCollapsed ? 'justify-center px-0 py-2.5 h-10 w-10 mx-auto' : 'gap-3 px-3 py-2.5 w-full text-left'
            }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!isCollapsed && <span>Log Out</span>}
        </button>
      </div>

    </aside>
  );
}
