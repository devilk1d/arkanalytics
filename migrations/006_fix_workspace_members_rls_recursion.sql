-- =========================================================
-- Arkanalytics: Fix workspace_members RLS recursion
-- =========================================================
-- Apply this if the current database already has the recursive policies deployed.

-- Helper checks to avoid recursive RLS evaluation on workspace_members
create or replace function public.is_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
  );
$$;

create or replace function public.is_workspace_admin(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
      and wm.role = 'admin'
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.owner_user_id = p_user_id
  );
$$;

grant execute on function public.is_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid, uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid, uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member
on public.workspaces
for select
to authenticated
using (
  public.is_workspace_member(workspaces.id, auth.uid())
);

drop policy if exists workspaces_insert_owner on public.workspaces;
create policy workspaces_insert_owner
on public.workspaces
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists workspaces_update_admin on public.workspaces;
create policy workspaces_update_admin
on public.workspaces
for update
to authenticated
using (
  public.is_workspace_admin(workspaces.id, auth.uid())
)
with check (
  public.is_workspace_admin(workspaces.id, auth.uid())
);

drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member
on public.workspace_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_workspace_admin(workspace_members.workspace_id, auth.uid())
);

drop policy if exists workspace_members_insert_admin on public.workspace_members;
create policy workspace_members_insert_admin
on public.workspace_members
for insert
to authenticated
with check (
  public.is_workspace_admin(workspace_members.workspace_id, auth.uid())
  or public.is_workspace_owner(workspace_members.workspace_id, auth.uid())
);

drop policy if exists workspace_members_update_admin on public.workspace_members;
create policy workspace_members_update_admin
on public.workspace_members
for update
to authenticated
using (
  public.is_workspace_admin(workspace_members.workspace_id, auth.uid())
)
with check (
  public.is_workspace_admin(workspace_members.workspace_id, auth.uid())
);

drop policy if exists workspace_members_delete_admin on public.workspace_members;
create policy workspace_members_delete_admin
on public.workspace_members
for delete
to authenticated
using (
  public.is_workspace_admin(workspace_members.workspace_id, auth.uid())
);

drop policy if exists workspace_invitations_select_member on public.workspace_invitations;
create policy workspace_invitations_select_member
on public.workspace_invitations
for select
to authenticated
using (
  public.is_workspace_member(workspace_invitations.workspace_id, auth.uid())
);

drop policy if exists workspace_invitations_insert_admin on public.workspace_invitations;
create policy workspace_invitations_insert_admin
on public.workspace_invitations
for insert
to authenticated
with check (
  public.is_workspace_admin(workspace_invitations.workspace_id, auth.uid())
  and invited_by_user_id = auth.uid()
);

drop policy if exists workspace_invitations_update_admin on public.workspace_invitations;
create policy workspace_invitations_update_admin
on public.workspace_invitations
for update
to authenticated
using (
  public.is_workspace_admin(workspace_invitations.workspace_id, auth.uid())
)
with check (
  public.is_workspace_admin(workspace_invitations.workspace_id, auth.uid())
);
