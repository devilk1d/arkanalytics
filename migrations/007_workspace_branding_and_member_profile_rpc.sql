-- =========================================================
-- Arkanalytics: Workspace Branding + Member Profile RPC
-- =========================================================

alter table public.workspaces
add column if not exists website_url text,
add column if not exists logo_url text;

create or replace function public.list_workspace_members_with_profile(p_workspace_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email citext,
  avatar_url text,
  arka_id text,
  role text,
  joined_at timestamptz,
  last_active_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_workspace_member(p_workspace_id, auth.uid()) then
    raise exception 'Access denied for this workspace';
  end if;

  return query
  select
    wm.user_id,
    u.full_name,
    u.email,
    u.avatar_url,
    u.arka_id,
    wm.role,
    wm.joined_at,
    u.last_active_at
  from public.workspace_members wm
  join public.users u on u.id = wm.user_id
  where wm.workspace_id = p_workspace_id
  order by wm.joined_at asc;
end;
$$;

grant execute on function public.list_workspace_members_with_profile(uuid) to authenticated;
