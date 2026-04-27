-- Migration 012: Add user_id and description to workspace_roles table
-- Store who created the role and add optional description

ALTER TABLE workspace_roles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Create index for user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_workspace_roles_user_id ON workspace_roles(user_id);
