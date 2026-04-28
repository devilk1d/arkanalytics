-- Migration 015: Invitation context RPC for invite page + return invite token on creation

create or replace function public.get_workspace_invitation_context(
  p_token uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_invited_user record;
  v_auth_user record;
begin
  if p_token is null then
    raise exception 'Invitation token is required';
  end if;

  select
    wi.id,
    wi.workspace_id,
    wi.invited_email,
    wi.role_to_assign,
    wi.status,
    wi.expires_at,
    w.name as workspace_name,
    coalesce(inviter.full_name, 'Workspace Admin') as inviter_name
  into v_inv
  from public.workspace_invitations wi
  join public.workspaces w on w.id = wi.workspace_id
  left join public.users inviter on inviter.id = wi.invited_by_user_id
  where wi.token = p_token
  limit 1;

  if v_inv is null then
    return json_build_object(
      'success', false,
      'error', 'Invitation not found'
    );
  end if;

  if v_inv.status <> 'pending' then
    return json_build_object(
      'success', false,
      'error', format('Invitation is %s', v_inv.status)
    );
  end if;

  if v_inv.expires_at < now() then
    update public.workspace_invitations
    set status = 'expired', updated_at = now()
    where id = v_inv.id;

    return json_build_object(
      'success', false,
      'error', 'Invitation has expired'
    );
  end if;

  select id, full_name, arka_id
  into v_invited_user
  from public.users
  where email = v_inv.invited_email
  limit 1;

  select id, encrypted_password, email_confirmed_at
  into v_auth_user
  from auth.users
  where email = v_inv.invited_email
  limit 1;

  return json_build_object(
    'success', true,
    'invitation_id', v_inv.id,
    'workspace_id', v_inv.workspace_id,
    'workspace_name', v_inv.workspace_name,
    'invited_email', v_inv.invited_email,
    'role_to_assign', v_inv.role_to_assign,
    'inviter_name', v_inv.inviter_name,
    'invitee_exists', v_invited_user.id is not null,
    'invitee_can_sign_in',
      coalesce(v_auth_user.encrypted_password is not null and v_auth_user.email_confirmed_at is not null, false),
    'invitee_name', coalesce(v_invited_user.full_name, split_part(v_inv.invited_email::text, '@', 1)),
    'invitee_arka_id', v_invited_user.arka_id
  );
exception when others then
  return json_build_object(
    'success', false,
    'error', sqlerrm
  );
end;
$$;

grant execute on function public.get_workspace_invitation_context(uuid) to anon, authenticated;

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
  v_pending_invite_token uuid;
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
  returning id, token into v_pending_invite_id, v_pending_invite_token;

  return json_build_object(
    'success', true,
    'invitation_id', v_pending_invite_id,
    'invitation_token', v_pending_invite_token,
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
