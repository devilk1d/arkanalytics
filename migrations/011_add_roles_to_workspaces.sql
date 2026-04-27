-- Migration 011: Add roles column to workspaces table
-- Store custom roles directly in workspaces table as JSONB array
-- Default roles (admin, members) are hardcoded in frontend

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance if filtering by roles is needed
CREATE INDEX IF NOT EXISTS idx_workspaces_roles ON workspaces USING GIN (roles);

-- Update RLS policy to allow authenticated users to update workspace roles (for admins only)
-- This is handled by application-level permission checks in the context
