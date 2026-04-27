-- =========================================================
-- Arkanalytics: track last active time for users
-- =========================================================

do $$
begin
  alter table public.users add column last_active_at timestamptz;
exception
  when duplicate_column then
    null;
end $$;

drop function if exists public.list_workspace_members_with_profile(uuid);

create function public.list_workspace_members_with_profile(p_workspace_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  role text,
  joined_at timestamptz,
  last_active_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    wm.user_id,
    u.full_name,
    u.email,
    u.avatar_url,
    wm.role,
    wm.joined_at,
    u.last_active_at
  from public.workspace_members wm
  join public.users u on u.id = wm.user_id
  where wm.workspace_id = p_workspace_id
  order by wm.joined_at asc;
$$;

grant execute on function public.list_workspace_members_with_profile(uuid) to authenticated;