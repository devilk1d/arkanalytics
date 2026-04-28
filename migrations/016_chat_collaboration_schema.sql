-- Migration 016: Chat collaboration schema
-- Adds workspace-scoped conversations, messages, notes, tasks, and media attachments.

-- =========================================================
-- 0. HELPER FUNCTIONS (defined first, before tables)
-- =========================================================
create or replace function public.extract_workspace_id_from_storage_path(p_path text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_workspace_id text;
begin
  if p_path is null then
    return null;
  end if;

  v_workspace_id := split_part(p_path, '/', 1);

  if v_workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return v_workspace_id::uuid;
  end if;

  return null;
end;
$$;

grant execute on function public.extract_workspace_id_from_storage_path(text) to authenticated;

-- =========================================================
-- 1. CHAT CONVERSATIONS
-- =========================================================

create table if not exists public.workspace_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_type text not null check (conversation_type in ('direct', 'group')),
  name text,
  direct_key text,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_conversations_type_check check (
    (
      conversation_type = 'direct'
      and direct_key is not null
      and name is null
    )
    or
    (
      conversation_type = 'group'
      and name is not null
      and char_length(btrim(name)) >= 2
    )
  ),
  constraint workspace_conversations_direct_key_unique unique (workspace_id, direct_key)
);

create index if not exists idx_workspace_conversations_workspace_id on public.workspace_conversations(workspace_id);
create index if not exists idx_workspace_conversations_created_by_user_id on public.workspace_conversations(created_by_user_id);
create index if not exists idx_workspace_conversations_last_message_at on public.workspace_conversations(last_message_at desc nulls last);

drop trigger if exists trg_workspace_conversations_updated_at on public.workspace_conversations;
create trigger trg_workspace_conversations_updated_at
before update on public.workspace_conversations
for each row
execute function public.set_updated_at();

alter table public.workspace_conversations enable row level security;
-- `create_workspace_conversation` implementation moved below, after conversation member table exists

-- =========================================================
-- 2. CONVERSATION MEMBERS
-- =========================================================

create table if not exists public.workspace_conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.workspace_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  added_by_user_id uuid not null references public.users(id) on delete restrict,
  member_role text not null default 'member' check (member_role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index if not exists idx_workspace_conversation_members_conversation_id on public.workspace_conversation_members(conversation_id);
create index if not exists idx_workspace_conversation_members_user_id on public.workspace_conversation_members(user_id);

drop trigger if exists trg_workspace_conversation_members_updated_at on public.workspace_conversation_members;

-- Define conversation-related helper functions now tables exist
create or replace function public.is_conversation_member(p_conversation_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1 from public.workspace_conversation_members wcm
    where wcm.conversation_id = p_conversation_id
      and wcm.user_id = p_user_id
  ) into v_exists;

  return v_exists;
end;
$$;

create or replace function public.can_manage_conversation_members(p_conversation_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
  v_workspace_id uuid;
begin
  select wc.workspace_id into v_workspace_id
  from public.workspace_conversations wc
  where wc.id = p_conversation_id;

  if v_workspace_id is null then
    return false;
  end if;

  -- owners and workspace admins or conversation creator can manage
  if public.is_workspace_owner(v_workspace_id, p_user_id)
     or public.is_workspace_admin(v_workspace_id, p_user_id) then
    return true;
  end if;

  select exists (
    select 1 from public.workspace_conversations wc
    where wc.id = p_conversation_id and wc.created_by_user_id = p_user_id
  ) into v_exists;

  return coalesce(v_exists, false);
end;
$$;

create or replace function public.create_workspace_conversation(p_workspace_id uuid, p_conversation_type text, p_name text, p_peer_user_id uuid, p_member_ids uuid[])
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_direct_key text;
  v_member_id uuid;
begin
  if v_auth_user_id is null then
    return json_build_object('success', false, 'error', 'authentication required');
  end if;

  if not public.is_workspace_member(p_workspace_id, v_auth_user_id) then
    return json_build_object('success', false, 'error', 'not a workspace member');
  end if;

  if p_conversation_type = 'direct' then
    if p_peer_user_id is null or p_peer_user_id = v_auth_user_id then
      return json_build_object('success', false, 'error', 'invalid peer');
    end if;

    if not public.is_workspace_member(p_workspace_id, p_peer_user_id) then
      return json_build_object('success', false, 'error', 'peer is not a workspace member');
    end if;

    v_direct_key := least(v_auth_user_id::text, p_peer_user_id::text) || ':' || greatest(v_auth_user_id::text, p_peer_user_id::text);

    insert into public.workspace_conversations (workspace_id, conversation_type, name, direct_key, created_by_user_id)
    values (p_workspace_id, 'direct', null, v_direct_key, v_auth_user_id)
    on conflict (workspace_id, direct_key) do update set updated_at = now()
    returning id into v_conversation_id;

    insert into public.workspace_conversation_members (conversation_id, user_id, added_by_user_id, member_role)
    values (v_conversation_id, v_auth_user_id, v_auth_user_id, 'member')
    on conflict (conversation_id, user_id) do nothing;

    insert into public.workspace_conversation_members (conversation_id, user_id, added_by_user_id, member_role)
    values (v_conversation_id, p_peer_user_id, v_auth_user_id, 'member')
    on conflict (conversation_id, user_id) do nothing;

    return json_build_object('success', true, 'conversation_id', v_conversation_id, 'conversation_type', 'direct');
  end if;

  if p_conversation_type = 'group' then
    if p_name is null or char_length(btrim(p_name)) < 2 then
      return json_build_object('success', false, 'error', 'invalid name');
    end if;

    insert into public.workspace_conversations (workspace_id, conversation_type, name, created_by_user_id)
    values (p_workspace_id, 'group', btrim(p_name), v_auth_user_id)
    returning id into v_conversation_id;

    insert into public.workspace_conversation_members (conversation_id, user_id, added_by_user_id, member_role)
    values (v_conversation_id, v_auth_user_id, v_auth_user_id, 'admin')
    on conflict (conversation_id, user_id) do nothing;

    if array_length(p_member_ids, 1) is not null then
      foreach v_member_id in array p_member_ids loop
        if v_member_id is not null and v_member_id <> v_auth_user_id and public.is_workspace_member(p_workspace_id, v_member_id) then
          insert into public.workspace_conversation_members (conversation_id, user_id, added_by_user_id, member_role)
          values (v_conversation_id, v_member_id, v_auth_user_id, 'member')
          on conflict (conversation_id, user_id) do nothing;
        end if;
      end loop;
    end if;

    return json_build_object('success', true, 'conversation_id', v_conversation_id, 'conversation_type', 'group');
  end if;

  return json_build_object('success', false, 'error', 'invalid conversation type');
exception when others then
  return json_build_object('success', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;
grant execute on function public.can_manage_conversation_members(uuid, uuid) to authenticated;
grant execute on function public.create_workspace_conversation(uuid, text, text, uuid, uuid[]) to authenticated;

drop policy if exists workspace_conversations_select_participant on public.workspace_conversations;
create policy workspace_conversations_select_participant
on public.workspace_conversations
for select
to authenticated
using (
  public.is_conversation_member(workspace_conversations.id, auth.uid())
  or public.is_workspace_admin(workspace_conversations.workspace_id, auth.uid())
  or public.is_workspace_owner(workspace_conversations.workspace_id, auth.uid())
);

drop policy if exists workspace_conversations_insert_member on public.workspace_conversations;
create policy workspace_conversations_insert_member
on public.workspace_conversations
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.is_workspace_member(workspace_conversations.workspace_id, auth.uid())
);

drop policy if exists workspace_conversations_update_owner on public.workspace_conversations;
create policy workspace_conversations_update_owner
on public.workspace_conversations
for update
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_conversations.workspace_id, auth.uid())
  or public.is_workspace_owner(workspace_conversations.workspace_id, auth.uid())
)
with check (
  created_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_conversations.workspace_id, auth.uid())
  or public.is_workspace_owner(workspace_conversations.workspace_id, auth.uid())
);

drop policy if exists workspace_conversations_delete_owner on public.workspace_conversations;
create policy workspace_conversations_delete_owner
on public.workspace_conversations
for delete
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_conversations.workspace_id, auth.uid())
  or public.is_workspace_owner(workspace_conversations.workspace_id, auth.uid())
);

alter table public.workspace_conversation_members enable row level security;

drop policy if exists workspace_conversation_members_select_participant on public.workspace_conversation_members;
create policy workspace_conversation_members_select_participant
on public.workspace_conversation_members
for select
to authenticated
using (
  public.is_conversation_member(workspace_conversation_members.conversation_id, auth.uid())
  or public.can_manage_conversation_members(workspace_conversation_members.conversation_id, auth.uid())
);

drop policy if exists workspace_conversation_members_insert_manager on public.workspace_conversation_members;
create policy workspace_conversation_members_insert_manager
on public.workspace_conversation_members
for insert
to authenticated
with check (
  public.can_manage_conversation_members(workspace_conversation_members.conversation_id, auth.uid())
  and added_by_user_id = auth.uid()
);

drop policy if exists workspace_conversation_members_update_manager on public.workspace_conversation_members;
create policy workspace_conversation_members_update_manager
on public.workspace_conversation_members
for update
to authenticated
using (
  public.can_manage_conversation_members(workspace_conversation_members.conversation_id, auth.uid())
)
with check (
  public.can_manage_conversation_members(workspace_conversation_members.conversation_id, auth.uid())
);

drop policy if exists workspace_conversation_members_delete_manager on public.workspace_conversation_members;
create policy workspace_conversation_members_delete_manager
on public.workspace_conversation_members
for delete
to authenticated
using (
  public.can_manage_conversation_members(workspace_conversation_members.conversation_id, auth.uid())
  or user_id = auth.uid()
);

-- =========================================================
-- 3. MESSAGES
-- =========================================================

create table if not exists public.workspace_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.workspace_conversations(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete restrict,
  message_type text not null default 'text' check (message_type in ('text', 'system', 'attachment')),
  body text,
  metadata jsonb not null default '{}'::jsonb,
  replied_to_message_id uuid references public.workspace_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_messages_workspace_id on public.workspace_messages(workspace_id);
create index if not exists idx_workspace_messages_conversation_id on public.workspace_messages(conversation_id);
create index if not exists idx_workspace_messages_sender_user_id on public.workspace_messages(sender_user_id);
create index if not exists idx_workspace_messages_created_at on public.workspace_messages(created_at desc);

-- Define message trigger helper functions now that conversation tables exist
create or replace function public.sync_workspace_message_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  select wc.workspace_id into v_workspace_id
  from public.workspace_conversations wc
  where wc.id = new.conversation_id;

  if v_workspace_id is null then
    raise exception 'Conversation not found';
  end if;

  new.workspace_id := v_workspace_id;
  return new;
end;
$$;

create or replace function public.bump_conversation_last_message_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.workspace_conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_workspace_messages_updated_at on public.workspace_messages;
create trigger trg_workspace_messages_updated_at
before update on public.workspace_messages
for each row
execute function public.set_updated_at();

drop trigger if exists trg_sync_workspace_message_context on public.workspace_messages;
create trigger trg_sync_workspace_message_context
before insert or update of conversation_id on public.workspace_messages
for each row
execute function public.sync_workspace_message_context();

alter table public.workspace_messages enable row level security;

drop policy if exists workspace_messages_select_participant on public.workspace_messages;
create policy workspace_messages_select_participant
on public.workspace_messages
for select
to authenticated
using (
  public.is_conversation_member(workspace_messages.conversation_id, auth.uid())
);

drop policy if exists workspace_messages_insert_participant on public.workspace_messages;
create policy workspace_messages_insert_participant
on public.workspace_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and public.is_conversation_member(workspace_messages.conversation_id, auth.uid())
);

drop policy if exists workspace_messages_update_owner on public.workspace_messages;
create policy workspace_messages_update_owner
on public.workspace_messages
for update
to authenticated
using (
  sender_user_id = auth.uid()
  or public.can_manage_conversation_members(workspace_messages.conversation_id, auth.uid())
)
with check (
  sender_user_id = auth.uid()
  or public.can_manage_conversation_members(workspace_messages.conversation_id, auth.uid())
);

drop policy if exists workspace_messages_delete_owner on public.workspace_messages;
create policy workspace_messages_delete_owner
on public.workspace_messages
for delete
to authenticated
using (
  sender_user_id = auth.uid()
  or public.can_manage_conversation_members(workspace_messages.conversation_id, auth.uid())
);

drop trigger if exists trg_bump_conversation_last_message_at on public.workspace_messages;
create trigger trg_bump_conversation_last_message_at
after insert on public.workspace_messages
for each row
execute function public.bump_conversation_last_message_at();

-- =========================================================
-- 4. NOTES
-- =========================================================

create table if not exists public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid references public.workspace_conversations(id) on delete set null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  content text not null default '',
  color text not null default 'gray',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_notes_workspace_id on public.workspace_notes(workspace_id);
create index if not exists idx_workspace_notes_conversation_id on public.workspace_notes(conversation_id);
create index if not exists idx_workspace_notes_created_by_user_id on public.workspace_notes(created_by_user_id);

drop trigger if exists trg_workspace_notes_updated_at on public.workspace_notes;
create trigger trg_workspace_notes_updated_at
before update on public.workspace_notes
for each row
execute function public.set_updated_at();

alter table public.workspace_notes enable row level security;

drop policy if exists workspace_notes_select_member on public.workspace_notes;
create policy workspace_notes_select_member
on public.workspace_notes
for select
to authenticated
using (
  public.is_workspace_member(workspace_notes.workspace_id, auth.uid())
);

drop policy if exists workspace_notes_insert_member on public.workspace_notes;
create policy workspace_notes_insert_member
on public.workspace_notes
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.is_workspace_member(workspace_notes.workspace_id, auth.uid())
  and (
    conversation_id is null
    or public.is_conversation_member(conversation_id, auth.uid())
  )
);

drop policy if exists workspace_notes_update_owner on public.workspace_notes;
create policy workspace_notes_update_owner
on public.workspace_notes
for update
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_notes.workspace_id, auth.uid())
)
with check (
  created_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_notes.workspace_id, auth.uid())
);

drop policy if exists workspace_notes_delete_owner on public.workspace_notes;
create policy workspace_notes_delete_owner
on public.workspace_notes
for delete
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_notes.workspace_id, auth.uid())
);

-- =========================================================
-- 5. TASKS
-- =========================================================

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid references public.workspace_conversations(id) on delete set null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  assignee_user_id uuid references public.users(id) on delete set null,
  title text not null,
  details text not null default '',
  due_at timestamptz,
  completed_at timestamptz,
  completed_by_user_id uuid references public.users(id) on delete set null,
  task_status text not null default 'open' check (task_status in ('open', 'done', 'archived')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_tasks_workspace_id on public.workspace_tasks(workspace_id);
create index if not exists idx_workspace_tasks_conversation_id on public.workspace_tasks(conversation_id);
create index if not exists idx_workspace_tasks_created_by_user_id on public.workspace_tasks(created_by_user_id);
create index if not exists idx_workspace_tasks_assignee_user_id on public.workspace_tasks(assignee_user_id);

drop trigger if exists trg_workspace_tasks_updated_at on public.workspace_tasks;
create trigger trg_workspace_tasks_updated_at
before update on public.workspace_tasks
for each row
execute function public.set_updated_at();

alter table public.workspace_tasks enable row level security;

drop policy if exists workspace_tasks_select_member on public.workspace_tasks;
create policy workspace_tasks_select_member
on public.workspace_tasks
for select
to authenticated
using (
  public.is_workspace_member(workspace_tasks.workspace_id, auth.uid())
);

drop policy if exists workspace_tasks_insert_member on public.workspace_tasks;
create policy workspace_tasks_insert_member
on public.workspace_tasks
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.is_workspace_member(workspace_tasks.workspace_id, auth.uid())
  and (
    conversation_id is null
    or public.is_conversation_member(conversation_id, auth.uid())
  )
);

drop policy if exists workspace_tasks_update_owner on public.workspace_tasks;
create policy workspace_tasks_update_owner
on public.workspace_tasks
for update
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_tasks.workspace_id, auth.uid())
)
with check (
  created_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_tasks.workspace_id, auth.uid())
);

drop policy if exists workspace_tasks_delete_owner on public.workspace_tasks;
create policy workspace_tasks_delete_owner
on public.workspace_tasks
for delete
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_tasks.workspace_id, auth.uid())
);

-- =========================================================
-- 6. ATTACHMENTS / MEDIA
-- =========================================================

create table if not exists public.workspace_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid references public.workspace_conversations(id) on delete set null,
  note_id uuid references public.workspace_notes(id) on delete set null,
  task_id uuid references public.workspace_tasks(id) on delete set null,
  uploaded_by_user_id uuid not null references public.users(id) on delete restrict,
  storage_bucket text not null default 'workspace-media',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  media_kind text not null check (media_kind in ('image', 'video', 'audio', 'document', 'other')),
  created_at timestamptz not null default now(),
  constraint workspace_attachments_single_parent check (
    (
      case when conversation_id is not null then 1 else 0 end
      + case when note_id is not null then 1 else 0 end
      + case when task_id is not null then 1 else 0 end
    ) = 1
  ),
  unique (storage_bucket, storage_path)
);

create index if not exists idx_workspace_attachments_workspace_id on public.workspace_attachments(workspace_id);
create index if not exists idx_workspace_attachments_conversation_id on public.workspace_attachments(conversation_id);
create index if not exists idx_workspace_attachments_note_id on public.workspace_attachments(note_id);
create index if not exists idx_workspace_attachments_task_id on public.workspace_attachments(task_id);
create index if not exists idx_workspace_attachments_uploaded_by_user_id on public.workspace_attachments(uploaded_by_user_id);

alter table public.workspace_attachments enable row level security;

drop policy if exists workspace_attachments_select_member on public.workspace_attachments;
create policy workspace_attachments_select_member
on public.workspace_attachments
for select
to authenticated
using (
  public.is_workspace_member(workspace_attachments.workspace_id, auth.uid())
);

drop policy if exists workspace_attachments_insert_member on public.workspace_attachments;
create policy workspace_attachments_insert_member
on public.workspace_attachments
for insert
to authenticated
with check (
  uploaded_by_user_id = auth.uid()
  and public.is_workspace_member(workspace_attachments.workspace_id, auth.uid())
  and (
    conversation_id is null
    or public.is_conversation_member(conversation_id, auth.uid())
  )
);

drop policy if exists workspace_attachments_update_owner on public.workspace_attachments;
create policy workspace_attachments_update_owner
on public.workspace_attachments
for update
to authenticated
using (
  uploaded_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_attachments.workspace_id, auth.uid())
)
with check (
  uploaded_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_attachments.workspace_id, auth.uid())
);

drop policy if exists workspace_attachments_delete_owner on public.workspace_attachments;
create policy workspace_attachments_delete_owner
on public.workspace_attachments
for delete
to authenticated
using (
  uploaded_by_user_id = auth.uid()
  or public.is_workspace_admin(workspace_attachments.workspace_id, auth.uid())
);

-- =========================================================
-- 7. MEDIA STORAGE BUCKET + POLICIES
-- =========================================================

insert into storage.buckets (id, name, public)
values ('workspace-media', 'workspace-media', false)
on conflict (id) do nothing;

drop policy if exists files_select_workspace_media on storage.objects;
create policy files_select_workspace_media
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workspace-media'
  and public.is_workspace_member(public.extract_workspace_id_from_storage_path(name), auth.uid())
);

drop policy if exists files_insert_workspace_media on storage.objects;
create policy files_insert_workspace_media
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workspace-media'
  and public.is_workspace_member(public.extract_workspace_id_from_storage_path(name), auth.uid())
);

drop policy if exists files_update_workspace_media on storage.objects;
create policy files_update_workspace_media
on storage.objects
for update
to authenticated
using (
  bucket_id = 'workspace-media'
  and public.is_workspace_member(public.extract_workspace_id_from_storage_path(name), auth.uid())
)
with check (
  bucket_id = 'workspace-media'
  and public.is_workspace_member(public.extract_workspace_id_from_storage_path(name), auth.uid())
);

drop policy if exists files_delete_workspace_media on storage.objects;
create policy files_delete_workspace_media
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workspace-media'
  and public.is_workspace_member(public.extract_workspace_id_from_storage_path(name), auth.uid())
);

-- =========================================================
-- Notes
-- =========================================================
-- 1. Direct conversations are unique per workspace via workspace_id + direct_key.
-- 2. Conversation members control visibility for direct and group chats.
-- 3. Notes, tasks, and attachments stay workspace-scoped for simple dashboard integration.
-- 4. Media uploads must use path format: <workspace_id>/<optional_folder>/<file_name>.