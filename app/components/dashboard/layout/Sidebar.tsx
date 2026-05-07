'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Avatar from '../ui/Avatar';
import { getInitials, useDashboardContext } from '../context/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import type { Permission } from '../context/permissions';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, myPermissions, unreadChatCount } = useDashboardContext();
  const initials = getInitials(profile?.fullName || 'User');

  const navItems: {
    href: string;
    icon: React.ReactNode;
    /** If set, this item is only shown when the user has this permission */
    requiredPermission?: Permission;
    badge?: number;
  }[] = [
    {
      href: '/dashboard/overview',
      // Overview is always visible — no permission required
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      href: '/dashboard/analytics',
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
      requiredPermission: 'view_analytics',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
    },
    {
      href: '/dashboard/data-management',
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
      // Chat is always accessible
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
    },
  ];

  // Filter out items the user doesn't have permission for
  const visibleNavItems = navItems.filter(
    (item) =>
      !item.requiredPermission || myPermissions.includes(item.requiredPermission)
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/signin');
    router.refresh();
  };

  return (
    <aside className="w-17 bg-white border-r border-gray-100 flex flex-col items-center py-4 gap-2 shrink-0 h-screen sticky top-0 z-30">
      {/* Logo */}
      <Link href="/dashboard/overview" className="w-10 h-10 flex items-center justify-center mb-3 hover:opacity-75 transition-opacity">
        <Image src="/images/logo_arka_hitam.png" alt="Arka" width={28} height={28} />
      </Link>

      {/* Nav items — filtered by permission */}
      <nav className="flex flex-col gap-1 flex-1">
        {visibleNavItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200
                ${isActive ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}
            >
              {item.icon}
              {item.badge && !isActive && (
                <span
                  key={item.badge}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300"
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Settings + Avatar */}
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/dashboard/settings"
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200
            ${pathname?.startsWith('/dashboard/settings') ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
        <button
          onClick={() => { void handleLogout(); }}
          title="Log Out"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
        <div className="cursor-pointer hover:opacity-80 transition-opacity">
          <Avatar initials={initials} src={profile?.avatarUrl || undefined} size="md" />
        </div>
      </div>
    </aside>
  );
}

