-- =========================================================
-- Arkanalytics: Custom Workspace Roles Table
-- =========================================================

-- Create workspace_roles table to store custom role definitions
CREATE TABLE IF NOT EXISTS public.workspace_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT workspace_roles_name_not_empty CHECK (char_length(btrim(name)) > 0)
);

-- Create unique index for case-insensitive role name per workspace
CREATE UNIQUE INDEX idx_workspace_roles_unique_name ON public.workspace_roles(workspace_id, LOWER(name));

-- Enable RLS
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace members can read roles
CREATE POLICY "workspace_roles_select" ON public.workspace_roles
FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Only admins can insert/update/delete roles
CREATE POLICY "workspace_roles_insert" ON public.workspace_roles
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "workspace_roles_update" ON public.workspace_roles
FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "workspace_roles_delete" ON public.workspace_roles
FOR DELETE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_workspace_roles_workspace_id ON public.workspace_roles(workspace_id);

-- Grant permissions
GRANT SELECT ON public.workspace_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workspace_roles TO authenticated;
