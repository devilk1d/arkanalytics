-- Migration 017: conversation read states for unread counters and read receipts

create table if not exists public.workspace_conversation_reads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.workspace_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index if not exists idx_workspace_conversation_reads_workspace_id
  on public.workspace_conversation_reads(workspace_id);
create index if not exists idx_workspace_conversation_reads_conversation_id
  on public.workspace_conversation_reads(conversation_id);
create index if not exists idx_workspace_conversation_reads_user_id
  on public.workspace_conversation_reads(user_id);

create or replace function public.sync_workspace_conversation_read_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  select wc.workspace_id
  into v_workspace_id
  from public.workspace_conversations wc
  where wc.id = new.conversation_id;

  if v_workspace_id is null then
    raise exception 'Conversation not found';
  end if;

  new.workspace_id := v_workspace_id;
  return new;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
begin
  if v_auth_user_id is null then
    return json_build_object('success', false, 'error', 'authentication required');
  end if;

  if not public.is_conversation_member(p_conversation_id, v_auth_user_id) then
    return json_build_object('success', false, 'error', 'not a conversation member');
  end if;

  insert into public.workspace_conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation_id, v_auth_user_id, now())
  on conflict (conversation_id, user_id)
  do update set
    last_read_at = excluded.last_read_at,
    updated_at = now();

  return json_build_object('success', true);
exception
  when others then
    return json_build_object('success', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

drop trigger if exists trg_workspace_conversation_reads_updated_at on public.workspace_conversation_reads;
create trigger trg_workspace_conversation_reads_updated_at
before update on public.workspace_conversation_reads
for each row
execute function public.set_updated_at();

drop trigger if exists trg_sync_workspace_conversation_read_context on public.workspace_conversation_reads;
create trigger trg_sync_workspace_conversation_read_context
before insert or update of conversation_id on public.workspace_conversation_reads
for each row
execute function public.sync_workspace_conversation_read_context();

alter table public.workspace_conversation_reads enable row level security;

drop policy if exists workspace_conversation_reads_select_participant on public.workspace_conversation_reads;
create policy workspace_conversation_reads_select_participant
on public.workspace_conversation_reads
for select
to authenticated
using (
  public.is_conversation_member(workspace_conversation_reads.conversation_id, auth.uid())
);

drop policy if exists workspace_conversation_reads_insert_self on public.workspace_conversation_reads;
create policy workspace_conversation_reads_insert_self
on public.workspace_conversation_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_conversation_member(workspace_conversation_reads.conversation_id, auth.uid())
);

drop policy if exists workspace_conversation_reads_update_self on public.workspace_conversation_reads;
create policy workspace_conversation_reads_update_self
on public.workspace_conversation_reads
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_conversation_member(workspace_conversation_reads.conversation_id, auth.uid())
)
with check (
  user_id = auth.uid()
  and public.is_conversation_member(workspace_conversation_reads.conversation_id, auth.uid())
);
