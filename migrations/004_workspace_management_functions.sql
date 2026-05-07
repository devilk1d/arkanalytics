-- =========================================================
-- Arkanalytics: Workspace Management Functions
-- =========================================================
-- Functions yang bisa dipanggil langsung dari app
-- untuk manage workspace, member, dan invitation

-- =========================================================
-- 1. CREATE WORKSPACE (auto add owner as admin)
-- =========================================================

create or replace function public.create_workspace(
  p_name text,
  p_industry_sector text,
  p_support_email citext,
  p_team_scale text,
  p_owner_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if char_length(btrim(p_name)) < 2 then
    raise exception 'Workspace name must be at least 2 characters';
  end if;

  if p_owner_user_id is null then
    raise exception 'Owner user ID is required';
  end if;

  insert into public.workspaces (name, industry_sector, support_email, team_scale, owner_user_id)
  values (p_name, p_industry_sector, p_support_email, p_team_scale, p_owner_user_id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, p_owner_user_id, 'admin')
  on conflict (workspace_id, user_id) do nothing;

  return json_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'message', 'Workspace created successfully'
  );
exception when others then
  return json_build_object(
    'success', false,
    'error', sqlerrm
  );
end;
$$;

grant execute on function public.create_workspace(text, text, citext, text, uuid) to authenticated;

-- =========================================================
-- 2. INVITE MEMBER
-- =========================================================

create or replace function public.invite_workspace_member(
  p_workspace_id uuid,
  p_invited_email citext,
  p_invited_by_user_id uuid,
  p_role_to_assign text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_pending_invite_id uuid;
begin
  if p_workspace_id is null or p_invited_email is null or p_role_to_assign is null then
    raise exception 'Missing required fields';
  end if;

  v_is_admin := exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_invited_by_user_id
      and wm.role = 'admin'
  );

  if not v_is_admin then
    raise exception 'Only admin can invite members';
  end if;

  select id into v_pending_invite_id
  from public.workspace_invitations
  where workspace_id = p_workspace_id
    and invited_email = p_invited_email
    and status = 'pending'
  limit 1;

  if v_pending_invite_id is not null then
    raise exception 'Pending invitation already exists for this email';
  end if;

  insert into public.workspace_invitations 
    (workspace_id, invited_email, invited_by_user_id, role_to_assign, status)
  values (p_workspace_id, p_invited_email, p_invited_by_user_id, p_role_to_assign, 'pending')
  returning id into v_pending_invite_id;

  return json_build_object(
    'success', true,
    'invitation_id', v_pending_invite_id,
    'message', 'Invitation sent successfully'
  );
exception when others then
  return json_build_object(
    'success', false,
    'error', sqlerrm
  );
end;
$$;

grant execute on function public.invite_workspace_member(uuid, citext, uuid, text) to authenticated;

-- =========================================================
-- 3. ACCEPT INVITATION
-- =========================================================

create or replace function public.accept_workspace_invitation_v2(
  p_token uuid,
  p_user_id uuid,
  p_user_email citext
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_member_id uuid;
begin
  if p_token is null or p_user_id is null or p_user_email is null then
    raise exception 'Missing required fields';
  end if;

  select id, workspace_id, role_to_assign, status, expires_at, invited_email
  into v_inv
  from public.workspace_invitations
  where token = p_token
  for update;

  if v_inv is null then
    raise exception 'Invitation not found';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'Invitation is not pending';
  end if;

  if v_inv.expires_at < now() then
    update public.workspace_invitations
    set status = 'expired', updated_at = now()
    where id = v_inv.id;
    raise exception 'Invitation has expired';
  end if;

  if v_inv.invited_email <> p_user_email then
    raise exception 'This invitation is not for your email address';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, p_user_id, v_inv.role_to_assign)
  on conflict (workspace_id, user_id) do update
  set role = v_inv.role_to_assign
  returning id into v_member_id;

  update public.workspace_invitations
  set status = 'accepted',
      accepted_by_user_id = p_user_id,
      accepted_at = now(),
      updated_at = now()
  where id = v_inv.id;

  return json_build_object(
    'success', true,
    'member_id', v_member_id,
    'workspace_id', v_inv.workspace_id,
    'message', 'Invitation accepted successfully'
  );
exception when others then
  return json_build_object(
    'success', false,
    'error', sqlerrm
  );
end;
$$;

grant execute on function public.accept_workspace_invitation_v2(uuid, uuid, citext) to authenticated;

-- =========================================================
-- 4. UPDATE MEMBER ROLE
-- =========================================================

create or replace function public.update_workspace_member_role(
  p_workspace_id uuid,
  p_member_user_id uuid,
  p_new_role text,
  p_requester_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  if p_workspace_id is null or p_member_user_id is null or p_new_role is null then
    raise exception 'Missing required fields';
  end if;

  v_is_admin := exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_requester_user_id
      and wm.role = 'admin'
  );

  if not v_is_admin then
    raise exception 'Only admin can update member roles';
  end if;

  update public.workspace_members
  set role = p_new_role
  where workspace_id = p_workspace_id and user_id = p_member_user_id;

  return json_build_object(
    'success', true,
    'message', 'Member role updated successfully'
  );
exception when others then
  return json_build_object(
    'success', false,
    'error', sqlerrm
  );
end;
$$;

grant execute on function public.update_workspace_member_role(uuid, uuid, text, uuid) to authenticated;

-- =========================================================
-- 5. DELETE WORKSPACE MEMBER
-- =========================================================

create or replace function public.delete_workspace_member(
  p_workspace_id uuid,
  p_member_user_id uuid,
  p_requester_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_workspace_owner_id uuid;
begin
  if p_workspace_id is null or p_member_user_id is null then
    raise exception 'Missing required fields';
  end if;

  v_is_admin := exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_requester_user_id
      and wm.role = 'admin'
  );

  if not v_is_admin then
    raise exception 'Only admin can delete members';
  end if;

  select owner_user_id into v_workspace_owner_id
  from public.workspaces
  where id = p_workspace_id;

  if v_workspace_owner_id = p_member_user_id then
    raise exception 'Cannot delete workspace owner';
  end if;

  delete from public.workspace_members
  where workspace_id = p_workspace_id and user_id = p_member_user_id;

  return json_build_object(
    'success', true,
    'message', 'Member removed successfully'
  );
exception when others then
  return json_build_object(
    'success', false,
    'error', sqlerrm
  );
end;
$$;

grant execute on function public.delete_workspace_member(uuid, uuid, uuid) to authenticated;

-- =========================================================
-- 6. LIST WORKSPACE MEMBERS
-- =========================================================

create or replace function public.list_workspace_members(p_workspace_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  arka_id text,
  full_name text,
  avatar_url text,
  role text,
  joined_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    wm.id,
    wm.user_id,
    u.arka_id,
    u.full_name,
    u.avatar_url,
    wm.role,
    wm.joined_at,
    wm.created_at
  from public.workspace_members wm
  join public.users u on wm.user_id = u.id
  where wm.workspace_id = p_workspace_id
  order by wm.joined_at asc;
end;
$$;

grant execute on function public.list_workspace_members(uuid) to authenticated;

-- =========================================================
-- 7. GET USER WORKSPACES
-- =========================================================

create or replace function public.get_user_workspaces(p_user_id uuid)
returns table (
  workspace_id uuid,
  workspace_name text,
  industry_sector text,
  member_role text,
  joined_at timestamptz,
  is_owner boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    w.id,
    w.name,
    w.industry_sector,
    wm.role,
    wm.joined_at,
    (w.owner_user_id = p_user_id)::boolean
  from public.workspaces w
  join public.workspace_members wm on w.id = wm.workspace_id
  where wm.user_id = p_user_id
  order by wm.joined_at desc;
end;
$$;

grant execute on function public.get_user_workspaces(uuid) to authenticated;

-- =========================================================
-- 8. GET WORKSPACE DETAIL
-- =========================================================

create or replace function public.get_workspace_detail(p_workspace_id uuid)
returns table (
  workspace_id uuid,
  workspace_name text,
  industry_sector text,
  support_email citext,
  team_scale text,
  owner_user_id uuid,
  owner_arka_id text,
  owner_name text,
  member_count bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    w.id,
    w.name,
    w.industry_sector,
    w.support_email,
    w.team_scale,
    w.owner_user_id,
    u.arka_id,
    u.full_name,
    (select count(*) from public.workspace_members where workspace_id = w.id),
    w.created_at
  from public.workspaces w
  join public.users u on w.owner_user_id = u.id
  where w.id = p_workspace_id;
end;
$$;

grant execute on function public.get_workspace_detail(uuid) to authenticated;
