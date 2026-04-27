-- Migration 013: Fix RLS policies for workspace_roles table
-- Simplify RLS to ensure users can query custom roles properly

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_roles_select" ON workspace_roles;
DROP POLICY IF EXISTS "workspace_roles_insert" ON workspace_roles;
DROP POLICY IF EXISTS "workspace_roles_update" ON workspace_roles;
DROP POLICY IF EXISTS "workspace_roles_delete" ON workspace_roles;

-- RLS Policy: Workspace members can read roles (simplified)
CREATE POLICY "workspace_roles_select" ON workspace_roles
FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Only admins can insert roles
CREATE POLICY "workspace_roles_insert" ON workspace_roles
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Only admins can update roles
CREATE POLICY "workspace_roles_update" ON workspace_roles
FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Only admins can delete roles
CREATE POLICY "workspace_roles_delete" ON workspace_roles
FOR DELETE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
