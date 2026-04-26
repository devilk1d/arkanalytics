-- =========================================================
-- Arkanalytics: Workspace & Member Management Tables
-- =========================================================
-- Clean setup untuk workspace management dengan flexible roles
-- Role bisa custom: "admin", "member", "crm team", "sales", etc.

-- =========================================================
-- 1. WORKSPACES TABLE
-- =========================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  industry_sector text not null,
  support_email citext not null,
  team_scale text not null,
  owner_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspaces_owner_user_id on public.workspaces(owner_user_id);

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();

-- =========================================================
-- 2. WORKSPACE MEMBERS TABLE
-- Role as TEXT (flexible): "admin", "member", atau custom role names
-- =========================================================

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null 
    check (char_length(btrim(role)) > 0),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_workspace_members_role on public.workspace_members(role);

-- Auto-add owner as admin member when workspace created
create or replace function public.add_owner_as_workspace_member()
returns trigger
language plpgsql
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_user_id, 'admin')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_workspaces_add_owner_member on public.workspaces;
create trigger trg_workspaces_add_owner_member
after insert on public.workspaces
for each row
execute function public.add_owner_as_workspace_member();

-- =========================================================
-- 3. WORKSPACE INVITATIONS TABLE
-- =========================================================

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_email citext not null,
  invited_by_user_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  token uuid not null default gen_random_uuid(),
  role_to_assign text not null 
    check (char_length(btrim(role_to_assign)) > 0),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by_user_id uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists idx_workspace_invitations_workspace_id on public.workspace_invitations(workspace_id);
create index if not exists idx_workspace_invitations_invited_email on public.workspace_invitations(invited_email);
create index if not exists idx_workspace_invitations_status on public.workspace_invitations(status);
create index if not exists idx_workspace_invitations_token on public.workspace_invitations(token);

-- Prevent duplicate pending invitation for same email+workspace
create unique index if not exists uq_pending_invite_per_email_workspace
on public.workspace_invitations(workspace_id, invited_email)
where status = 'pending';

drop trigger if exists trg_workspace_invitations_updated_at on public.workspace_invitations;
create trigger trg_workspace_invitations_updated_at
before update on public.workspace_invitations
for each row
execute function public.set_updated_at();

-- =========================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;

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

-- workspaces: member workspace dapat lihat
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member
on public.workspaces
for select
to authenticated
using (
  public.is_workspace_member(workspaces.id, auth.uid())
);

-- workspaces: user dapat create workspace sebagai owner
drop policy if exists workspaces_insert_owner on public.workspaces;
create policy workspaces_insert_owner
on public.workspaces
for insert
to authenticated
with check (owner_user_id = auth.uid());

-- workspaces: admin workspace dapat update
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

-- workspace_members: member workspace dapat lihat list member
drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member
on public.workspace_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_workspace_admin(workspace_members.workspace_id, auth.uid())
);

-- workspace_members: admin dapat insert member
drop policy if exists workspace_members_insert_admin on public.workspace_members;
create policy workspace_members_insert_admin
on public.workspace_members
for insert
to authenticated
with check (
  public.is_workspace_admin(workspace_members.workspace_id, auth.uid())
  or public.is_workspace_owner(workspace_members.workspace_id, auth.uid())
);

-- workspace_members: admin dapat update role member
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

-- workspace_members: admin dapat delete member
drop policy if exists workspace_members_delete_admin on public.workspace_members;
create policy workspace_members_delete_admin
on public.workspace_members
for delete
to authenticated
using (
  public.is_workspace_admin(workspace_members.workspace_id, auth.uid())
);

-- workspace_invitations: member workspace dapat lihat invitations
drop policy if exists workspace_invitations_select_member on public.workspace_invitations;
create policy workspace_invitations_select_member
on public.workspace_invitations
for select
to authenticated
using (
  public.is_workspace_member(workspace_invitations.workspace_id, auth.uid())
);

-- workspace_invitations: admin dapat create invitation
drop policy if exists workspace_invitations_insert_admin on public.workspace_invitations;
create policy workspace_invitations_insert_admin
on public.workspace_invitations
for insert
to authenticated
with check (
  public.is_workspace_admin(workspace_invitations.workspace_id, auth.uid())
  and invited_by_user_id = auth.uid()
);

-- workspace_invitations: admin dapat update invitation
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

-- =========================================================
-- Notes
-- =========================================================
-- 1. Roles are flexible text: "admin", "member", or custom ("crm team", "sales", etc)
-- 2. Only admin can manage members (invite, update role, delete)
-- 3. Auto-add owner as admin when workspace created
-- 4. Auto-expire invitation logic handled in application or function
-- 5. Email validation strict: invitation email must match login email saat accept
