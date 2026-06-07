-- =========================================================
-- Arkanalytics: Reports Management
-- =========================================================

-- 1. Create Reports Table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete cascade,
  name text not null,
  type text not null check (type in ('pdf', 'csv', 'xlsx')),
  status text not null default 'pending' check (status in ('pending', 'ready', 'error')),
  storage_path text,
  file_size bigint,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable RLS
alter table public.reports enable row level security;

-- 3. RLS Policies
-- Users can see reports in their workspace
create policy "Users can see reports in their workspace"
on public.reports for select
to authenticated
using (
  public.is_workspace_member(reports.workspace_id, auth.uid())
);

-- Users can delete reports in their workspace (if admin)
create policy "Admins can delete reports"
on public.reports for delete
to authenticated
using (
  public.is_workspace_admin(reports.workspace_id, auth.uid())
);

-- 4. Storage Bucket (Manual step usually, but we record policy here)
-- Bucket: reports
-- Policy: authenticated users can read/write to their workspace folder

-- 5. Enable Realtime for Reports table
-- This depends on how Realtime is configured in Supabase, but typically:
-- alter publication supabase_realtime add table reports;
-- (Usually done in Supabase Dashboard or via specific SQL)

-- 6. Trigger for updated_at
create trigger trg_reports_updated_at
before update on public.reports
for each row
execute function public.set_updated_at();
