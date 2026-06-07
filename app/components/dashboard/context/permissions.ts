// ─────────────────────────────────────────────────────────────
// Permission constants for ArkAnalytics RBAC
// ─────────────────────────────────────────────────────────────

/** All available permission keys */
export const ALL_PERMISSIONS = [
  'view_analytics',
  'manage_data',
  'export_reports',
  'manage_members',
  'manage_settings',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * Permissions granted to the built-in "admin" role.
 * Admins always have every permission.
 */
export const ADMIN_PERMISSIONS: Permission[] = [...ALL_PERMISSIONS];

/**
 * Permissions granted to the built-in "members" role.
 * Members can view analytics, manage customer data, and export reports,
 * but cannot manage team members or change workspace settings.
 */
export const DEFAULT_MEMBER_PERMISSIONS: Permission[] = [
  'view_analytics',
  'manage_data',
  'export_reports',
];

/**
 * Given a user's role name and the list of custom roles from the workspace,
 * returns the effective set of permission strings for that user.
 */
export function resolvePermissions(
  myRole: string,
  customRoles: { name: string; permissions: string[] }[]
): string[] {
  const normalised = myRole.toLowerCase().trim();

  // Admin → all permissions
  if (normalised === 'admin') return [...ADMIN_PERMISSIONS];

  // Built-in "members" → default member permissions
  if (normalised === 'members' || normalised === 'member') {
    return [...DEFAULT_MEMBER_PERMISSIONS];
  }

  // Custom role → look up in workspace_roles table
  const matchedRole = customRoles.find(
    (r) => r.name.toLowerCase().trim() === normalised
  );
  if (matchedRole) return matchedRole.permissions;

  // Unknown role → no permissions (fail safe)
  return [];
}

/**
 * Returns true if the given permission string is in the user's resolved permissions.
 */
export function hasPermission(
  permissions: string[],
  required: Permission
): boolean {
  return permissions.includes(required);
}
