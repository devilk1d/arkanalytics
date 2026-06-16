import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DashboardProvider } from '../components/dashboard/context/DashboardContext';
import DashboardShell from '../components/dashboard/layout/DashboardLayout';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect('/auth/signin');
  }

  const userId = authData.user.id;

  const { data: profileRow, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url, arka_id, last_active_at')
    .eq('id', userId)
    .single();

  const profileNeedsFallback = /last_active_at/i.test(profileError?.message || '');
  const { data: fallbackProfileRow } = profileNeedsFallback
    ? await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, arka_id')
        .eq('id', userId)
        .single()
    : { data: null };

  const { data: memberRows } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, joined_at')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });

  const activeMembership = memberRows?.[0] || null;

  if (!activeMembership) {
    redirect('/');
  }

  let workspace = null as null | {
    id: string;
    name: string;
    industrySector: string;
    supportEmail: string;
    teamScale: string;
    websiteUrl: string | null;
    logoUrl: string | null;
  };

  if (activeMembership?.workspace_id) {
    const { data: workspaceRow } = await supabase
      .from('workspaces')
      .select('id, name, industry_sector, support_email, team_scale, website_url, logo_url')
      .eq('id', activeMembership.workspace_id)
      .single();

    if (workspaceRow) {
      workspace = {
        id: workspaceRow.id,
        name: workspaceRow.name,
        industrySector: workspaceRow.industry_sector,
        supportEmail: workspaceRow.support_email,
        teamScale: workspaceRow.team_scale,
        websiteUrl: workspaceRow.website_url,
        logoUrl: workspaceRow.logo_url,
      };
    }
  }

  const initialMembers = activeMembership?.workspace_id
    ? await supabase.rpc('list_workspace_members_with_profile', { p_workspace_id: activeMembership.workspace_id })
    : { data: [] };

  const members = (initialMembers.data || []).map((row: any) => ({
    userId: row.user_id,
    fullName: row.full_name || 'User',
    email: row.email || null,
    avatarUrl: row.avatar_url || null,
    role: row.role,
    joinedAt: row.joined_at,
    lastActiveAt: row.last_active_at,
  }));

  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get('arka_sidebar')?.value === 'true';

  return (
    <DashboardProvider
      initialState={{
        profile: profileRow
          ? {
                id: (profileRow || fallbackProfileRow).id,
                fullName: (profileRow || fallbackProfileRow).full_name || 'User',
                email: (profileRow || fallbackProfileRow).email || authData.user.email || '',
                avatarUrl: (profileRow || fallbackProfileRow).avatar_url,
                arkaId: (profileRow || fallbackProfileRow).arka_id,
                lastActiveAt: profileRow?.last_active_at || null,
              }
          : null,
        workspace,
        members,
        myRole: activeMembership?.role || '',
      }}
    >
      <DashboardShell initialSidebarCollapsed={sidebarCollapsed}>
        {children}
      </DashboardShell>
    </DashboardProvider>
  );
}