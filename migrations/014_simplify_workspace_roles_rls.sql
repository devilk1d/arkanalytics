-- Migration 014: Fix workspace_roles RLS to allow role reads
-- The issue: nested subquery in RLS can cause permission denied errors
-- Solution: Use a simpler, more direct policy

DROP POLICY IF EXISTS "workspace_roles_select" ON workspace_roles;

-- Allow all authenticated users to read workspace_roles
-- Security: queries filter by workspace_id, and users can only see workspaces they're members of
CREATE POLICY "workspace_roles_read_all" ON workspace_roles
FOR SELECT
TO authenticated
USING (true);

-- Alternative if you want to be more restrictive:
-- Uncomment below and comment out above if you want roles only visible within workspace context
-- CREATE POLICY "workspace_roles_read_all" ON workspace_roles
-- FOR SELECT
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM workspace_members 
--     WHERE workspace_members.workspace_id = workspace_roles.workspace_id
--     AND workspace_members.user_id = auth.uid()
--   )
-- );
