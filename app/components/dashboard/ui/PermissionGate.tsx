'use client';

import { useDashboardContext } from '../context/DashboardContext';
import type { Permission } from '../context/permissions';

interface PermissionGateProps {
  /** The permission required to view this content */
  permission: Permission;
  /** Content to show when the user HAS the permission */
  children: React.ReactNode;
  /** Optional fallback UI — defaults to a styled "Access Denied" card */
  fallback?: React.ReactNode;
}

function AccessDenied({ permission }: { permission: Permission }) {
  const label: Record<Permission, string> = {
    view_analytics: 'View Analytics',
    manage_data: 'Manage Data',
    export_reports: 'Export Reports',
    manage_members: 'Manage Members',
    manage_settings: 'Manage Settings',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Access Restricted</h2>
      <p className="text-sm text-gray-400 max-w-xs">
        You don&apos;t have permission to access this page.
        {label[permission] && (
          <> The <strong className="text-gray-600">{label[permission]}</strong> permission is required.</>
        )}
      </p>
      <p className="text-xs text-gray-300 mt-3">
        Contact your workspace admin to request access.
      </p>
    </div>
  );
}

/**
 * Renders children only if the current user has the required permission.
 * Otherwise shows an "Access Denied" screen (or a custom fallback).
 *
 * Usage:
 * ```tsx
 * <PermissionGate permission="view_analytics">
 *   <AnalyticsContent />
 * </PermissionGate>
 * ```
 */
export default function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const { myPermissions, loading } = useDashboardContext();

  // While loading, don't render anything (avoid flash)
  if (loading) return null;

  if (!myPermissions.includes(permission)) {
    return <>{fallback ?? <AccessDenied permission={permission} />}</>;
  }

  return <>{children}</>;
}
