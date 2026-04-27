'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  arkaId: string;
  lastActiveAt: string | null;
};

type WorkspaceInfo = {
  id: string;
  name: string;
  industrySector: string;
  supportEmail: string;
  teamScale: string;
  websiteUrl: string | null;
  logoUrl: string | null;
};

type WorkspaceMember = {
  userId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
  lastActiveAt: string | null;
};

type RoleSummary = {
  role: string;
  users: number;
};

type CustomRole = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userId: string;
  createdAt: string;
};

type DashboardContextValue = {
  loading: boolean;
  error: string;
  actionLoading: boolean;
  profile: UserProfile | null;
  workspace: WorkspaceInfo | null;
  myRole: string;
  members: WorkspaceMember[];
  roleSummary: RoleSummary[];
  customRoles: CustomRole[];
  refresh: () => Promise<void>;
  saveCompanyInfo: (payload: { name: string; supportEmail: string; websiteUrl: string }) => Promise<{ error?: string }>;
  createCustomRole: (payload: { name: string; description: string; permissions: string[] }) => Promise<{ error?: string }>;
  uploadCompanyLogo: (file: File) => Promise<{ error?: string; logoUrl?: string }>;
  removeCompanyLogo: () => Promise<{ error?: string }>;
  inviteMember: (payload: { invitedEmail: string; roleToAssign: string }) => Promise<{ error?: string }>;
  updateMemberRole: (payload: { memberUserId: string; newRole: string }) => Promise<{ error?: string }>;
  deleteMember: (payload: { memberUserId: string }) => Promise<{ error?: string }>;
  saveUserProfile: (payload: { fullName: string }) => Promise<{ error?: string }>;
  uploadUserAvatar: (file: File) => Promise<{ error?: string; avatarUrl?: string }>;
};

type DashboardInitialState = {
  profile?: UserProfile | null;
  workspace?: WorkspaceInfo | null;
  members?: WorkspaceMember[];
  myRole?: string;
  error?: string;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

function toTitleCase(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function mapPermissionLabel(role: string) {
  const normalized = role.toLowerCase();
  if (normalized === 'admin') {
    return 'All Permissions';
  }
  if (normalized === 'member') {
    return 'View Reports, Manage Customers';
  }
  return 'Custom Role Permissions';
}

export function DashboardProvider({ children, initialState }: { children: React.ReactNode; initialState?: DashboardInitialState }) {
  const [loading, setLoading] = useState(!(initialState?.profile && initialState?.workspace));
  const [error, setError] = useState(initialState?.error || '');
  const [actionLoading, setActionLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(initialState?.profile ?? null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(initialState?.workspace ?? null);
  const [myRole, setMyRole] = useState(initialState?.myRole || '');
  const [members, setMembers] = useState<WorkspaceMember[]>(initialState?.members ?? []);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setProfile(null);
      setWorkspace(null);
      setMyRole('');
      setMembers([]);
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    const [{ data: profileRow, error: profileError }, { data: memberRows, error: memberError }] = await Promise.all([
      supabase
        .from('users')
        .select('id, full_name, email, avatar_url, arka_id, last_active_at')
        .eq('id', userId)
        .single(),
      supabase
        .from('workspace_members')
        .select('workspace_id, role, joined_at')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true }),
    ]);

    const profileNeedsFallback = /last_active_at/i.test(profileError?.message || '');
    const { data: fallbackProfileRow, error: fallbackProfileError } = profileNeedsFallback
      ? await supabase
          .from('users')
          .select('id, full_name, email, avatar_url, arka_id')
          .eq('id', userId)
          .single()
      : { data: null, error: null };

    if (profileError && !profileNeedsFallback) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (fallbackProfileError) {
      setError(fallbackProfileError.message);
      setLoading(false);
      return;
    }

    const profileData = profileRow ?? fallbackProfileRow;

    if (!profileData) {
      setError('Profile not found.');
      setLoading(false);
      return;
    }

    setProfile({
      id: profileData.id,
      fullName: profileData.full_name || 'User',
      email: profileData.email || authData.user.email || '',
      avatarUrl: profileData.avatar_url,
      arkaId: profileData.arka_id,
      lastActiveAt: profileRow?.last_active_at || null,
    });

    if (memberError || !memberRows || memberRows.length === 0) {
      // Don't clear workspace immediately - fallback to empty members but keep workspace context
      if (memberError && !/no rows/i.test(memberError.message || '')) {
        setError(memberError.message);
        setMembers([]);
        setCustomRoles([]);
        setLoading(false);
        return;
      }
      // Allow empty members list but keep workspace loaded
      setMembers([]);
      setMyRole('');
      setCustomRoles([]);
      setLoading(false);
      return;
    }

    const activeMembership = memberRows[0];
    setMyRole(activeMembership.role || 'member');

    const { data: workspaceRow, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, industry_sector, support_email, team_scale, website_url, logo_url')
      .eq('id', activeMembership.workspace_id)
      .single();

    if (workspaceError) {
      const needsBrandingMigration = /website_url|logo_url/i.test(workspaceError.message || '');
      if (!needsBrandingMigration) {
        setError(workspaceError.message);
        setLoading(false);
        return;
      }

      const { data: workspaceFallback, error: workspaceFallbackError } = await supabase
        .from('workspaces')
        .select('id, name, industry_sector, support_email, team_scale')
        .eq('id', activeMembership.workspace_id)
        .single();

      if (workspaceFallbackError) {
        setError(workspaceFallbackError.message);
        setLoading(false);
        return;
      }

      setWorkspace({
        id: workspaceFallback.id,
        name: workspaceFallback.name,
        industrySector: workspaceFallback.industry_sector,
        supportEmail: workspaceFallback.support_email,
        teamScale: workspaceFallback.team_scale,
        websiteUrl: null,
        logoUrl: null,
      });
    } else {
      setWorkspace({
        id: workspaceRow.id,
        name: workspaceRow.name,
        industrySector: workspaceRow.industry_sector,
        supportEmail: workspaceRow.support_email,
        teamScale: workspaceRow.team_scale,
        websiteUrl: workspaceRow.website_url,
        logoUrl: workspaceRow.logo_url,
      });
    }

    const { data: memberListRows, error: memberListError } = await supabase.rpc('list_workspace_members_with_profile', {
      p_workspace_id: activeMembership.workspace_id,
    });

    // Fetch custom roles in parallel
    const { data: rolesData, error: rolesError } = await supabase
      .from('workspace_roles')
      .select('id, name, description, permissions, user_id, created_at')
      .eq('workspace_id', activeMembership.workspace_id)
      .order('created_at', { ascending: true });

    // Debug: log roles fetch result
    if (rolesError) {
      console.error('Roles fetch error:', rolesError);
    } else {
      console.log('Roles fetched:', rolesData?.length || 0);
    }

    const mappedRoles: CustomRole[] = (rolesData || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      permissions: row.permissions || [],
      userId: row.user_id,
      createdAt: row.created_at,
    }));

    setCustomRoles(mappedRoles);

    if (memberListError) {
      setError(memberListError.message);
      setMembers([]);
      setLoading(false);
      return;
    }

    const mappedMembers: WorkspaceMember[] = (memberListRows || []).map((row: any) => ({
      userId: row.user_id,
      fullName: row.full_name || 'User',
      email: row.email || null,
      avatarUrl: row.avatar_url || null,
      role: row.role,
      joinedAt: row.joined_at,
      lastActiveAt: row.last_active_at,
    }));

    setMembers(mappedMembers);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Always refresh on mount to ensure customRoles (and other runtime-only data)
    // are fetched even when initialState is provided via SSR.
    // initialState never includes customRoles, so without this call they stay empty
    // until the user triggers another action (e.g. createCustomRole).
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  const saveCompanyInfo = useCallback(
    async (payload: { name: string; supportEmail: string; websiteUrl: string }) => {
      if (!workspace) {
        return { error: 'Workspace not found.' };
      }

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({
          name: payload.name,
          support_email: payload.supportEmail,
          website_url: payload.websiteUrl || null,
        })
        .eq('id', workspace.id);

      if (updateError) {
        const needsBrandingMigration = /website_url/i.test(updateError.message || '');
        if (needsBrandingMigration) {
          const { error: fallbackUpdateError } = await supabase
            .from('workspaces')
            .update({
              name: payload.name,
              support_email: payload.supportEmail,
            })
            .eq('id', workspace.id);

          if (fallbackUpdateError) {
            return { error: fallbackUpdateError.message };
          }

          setWorkspace((prev) => {
            if (!prev) {
              return prev;
            }
            return {
              ...prev,
              name: payload.name,
              supportEmail: payload.supportEmail,
            };
          });

          return {};
        }

        return { error: updateError.message };
      }

      setWorkspace((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          name: payload.name,
          supportEmail: payload.supportEmail,
          websiteUrl: payload.websiteUrl || null,
        };
      });

      return {};
    },
    [workspace],
  );

  const uploadCompanyLogo = useCallback(
    async (file: File) => {
      if (!workspace) {
        return { error: 'Workspace not found.' };
      }

      const supabase = createClient();
      const safeFileName = file.name.replace(/\s+/g, '-').toLowerCase();
      const path = `company-logos/${workspace.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { data: publicUrlData } = supabase.storage.from('files').getPublicUrl(path);
      const logoUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('workspaces')
        .update({ logo_url: logoUrl })
        .eq('id', workspace.id);

      if (updateError) {
        if (/logo_url/i.test(updateError.message || '')) {
          return { error: 'Kolom logo_url belum tersedia. Jalankan migration 007 terlebih dahulu.' };
        }
        return { error: updateError.message };
      }

      setWorkspace((prev) => (prev ? { ...prev, logoUrl } : prev));
      return { logoUrl };
    },
    [workspace],
  );

  const removeCompanyLogo = useCallback(async () => {
    if (!workspace) {
      return { error: 'Workspace not found.' };
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ logo_url: null })
      .eq('id', workspace.id);

    if (updateError) {
      if (/logo_url/i.test(updateError.message || '')) {
        return { error: 'Kolom logo_url belum tersedia. Jalankan migration 007 terlebih dahulu.' };
      }
      return { error: updateError.message };
    }

    setWorkspace((prev) => (prev ? { ...prev, logoUrl: null } : prev));
    return {};
  }, [workspace]);

  const inviteMember = useCallback(
    async (payload: { invitedEmail: string; roleToAssign: string }) => {
      if (!workspace || !profile) {
        return { error: 'Workspace or user data is missing.' };
      }

      setActionLoading(true);
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('invite_workspace_member', {
        p_workspace_id: workspace.id,
        p_invited_email: payload.invitedEmail,
        p_invited_by_user_id: profile.id,
        p_role_to_assign: payload.roleToAssign,
      });

      setActionLoading(false);

      if (rpcError) {
        return { error: rpcError.message };
      }

      if (data?.success === false) {
        return { error: data.error || 'Failed to invite member.' };
      }

      await refresh();
      return {};
    },
    [profile, refresh, workspace],
  );

  const updateMemberRole = useCallback(
    async (payload: { memberUserId: string; newRole: string }) => {
      if (!workspace || !profile) {
        return { error: 'Workspace or user data is missing.' };
      }

      setActionLoading(true);
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('update_workspace_member_role', {
        p_workspace_id: workspace.id,
        p_member_user_id: payload.memberUserId,
        p_new_role: payload.newRole,
        p_requester_user_id: profile.id,
      });

      setActionLoading(false);

      if (rpcError) {
        return { error: rpcError.message };
      }

      if (data?.success === false) {
        return { error: data.error || 'Failed to update member role.' };
      }

      await refresh();
      return {};
    },
    [profile, refresh, workspace],
  );

  const deleteMember = useCallback(
    async (payload: { memberUserId: string }) => {
      if (!workspace || !profile) {
        return { error: 'Workspace or user data is missing.' };
      }

      setActionLoading(true);
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('delete_workspace_member', {
        p_workspace_id: workspace.id,
        p_member_user_id: payload.memberUserId,
        p_requester_user_id: profile.id,
      });

      setActionLoading(false);

      if (rpcError) {
        return { error: rpcError.message };
      }

      if (data?.success === false) {
        return { error: data.error || 'Failed to delete member.' };
      }

      await refresh();
      return {};
    },
    [profile, refresh, workspace],
  );

  const saveUserProfile = useCallback(
    async (payload: { fullName: string }) => {
      if (!profile) {
        return { error: 'User profile not found.' };
      }

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('users')
        .update({ full_name: payload.fullName })
        .eq('id', profile.id);

      if (updateError) {
        return { error: updateError.message };
      }

      setProfile((prev) => (prev ? { ...prev, fullName: payload.fullName } : prev));
      return {};
    },
    [profile],
  );

  const uploadUserAvatar = useCallback(
    async (file: File) => {
      if (!profile) {
        return { error: 'User profile not found.' };
      }

      const supabase = createClient();
      const safeFileName = file.name.replace(/\s+/g, '-').toLowerCase();
      const path = `user-avatar/${profile.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { data: publicUrlData } = supabase.storage.from('files').getPublicUrl(path);
      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (updateError) {
        return { error: updateError.message };
      }

      setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
      return { avatarUrl };
    },
    [profile],
  );

  const createCustomRole = useCallback(
    async (payload: { name: string; description: string; permissions: string[] }) => {
      if (!workspace || !profile) {
        return { error: 'Workspace or user not found.' };
      }

      setActionLoading(true);
      const supabase = createClient();

      // Get current user ID
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setActionLoading(false);
        return { error: 'User not authenticated.' };
      }

      // Insert new role into workspace_roles table
      const { error: insertError } = await supabase
        .from('workspace_roles')
        .insert({
          workspace_id: workspace.id,
          name: payload.name.trim(),
          description: payload.description.trim(),
          permissions: payload.permissions,
          user_id: authData.user.id,
        });

      setActionLoading(false);

      if (insertError) {
        return { error: insertError.message };
      }

      // Refresh to get the new role
      await refresh();
      return {};
    },
    [workspace, profile, refresh],
  );

  const roleSummary = useMemo<RoleSummary[]>(() => {
    const grouped = members.reduce<Record<string, number>>((acc, member) => {
      const key = member.role?.trim() || 'member';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([role, users]) => ({ role, users }))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [members]);

  const value = useMemo(
    () => ({
      loading,
      error,
      actionLoading,
      profile,
      workspace,
      myRole,
      members,
      roleSummary,
      customRoles,
      refresh,
      saveCompanyInfo,
      uploadCompanyLogo,
      removeCompanyLogo,
      inviteMember,
      updateMemberRole,
      deleteMember,
      saveUserProfile,
      uploadUserAvatar,
      createCustomRole,
    }),
    [
      actionLoading,
      createCustomRole,
      customRoles,
      deleteMember,
      error,
      inviteMember,
      loading,
      members,
      myRole,
      profile,
      refresh,
      removeCompanyLogo,
      roleSummary,
      saveCompanyInfo,
      saveUserProfile,
      updateMemberRole,
      uploadCompanyLogo,
      uploadUserAvatar,
      workspace,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboardContext must be used inside DashboardProvider');
  }
  return ctx;
}

export function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function formatRoleLabel(role: string) {
  return toTitleCase(role || 'member');
}

export function formatRolePermission(role: string) {
  return mapPermissionLabel(role);
}