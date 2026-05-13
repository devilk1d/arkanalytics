-- =========================================================
-- Arkanalytics: Scheduled Reports Management
-- =========================================================

-- 1. Create Scheduled Reports Table
create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  report_category text not null check (report_category in ('churn', 'segmentation', 'forecast')),
  export_type text not null check (export_type in ('pdf', 'csv', 'xlsx')),
  include_segments text not null default 'all',
  recipients text[] default '{}',
  time_of_day text not null default '08:00',
  day_of_week integer,
  day_of_month integer,
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable RLS
alter table public.scheduled_reports enable row level security;

-- 3. RLS Policies
-- Users can see scheduled reports in their workspace
create policy "Users can see scheduled reports in their workspace"
on public.scheduled_reports for select
to authenticated
using (
  public.is_workspace_member(scheduled_reports.workspace_id, auth.uid())
);

-- Users can insert scheduled reports in their workspace
create policy "Users can insert scheduled reports in their workspace"
on public.scheduled_reports for insert
to authenticated
with check (
  public.is_workspace_member(scheduled_reports.workspace_id, auth.uid())
);

-- Users can update scheduled reports in their workspace
create policy "Users can update scheduled reports in their workspace"
on public.scheduled_reports for update
to authenticated
using (
  public.is_workspace_member(scheduled_reports.workspace_id, auth.uid())
);

-- Users can delete scheduled reports in their workspace
create policy "Users can delete scheduled reports in their workspace"
on public.scheduled_reports for delete
to authenticated
using (
  public.is_workspace_member(scheduled_reports.workspace_id, auth.uid())
);

-- 4. Trigger for updated_at
create trigger trg_scheduled_reports_updated_at
before update on public.scheduled_reports
for each row
execute function public.set_updated_at();
