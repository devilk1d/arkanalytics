-- Migration: Make workspace_members.role flexible for custom role names
-- This allows admin to create custom roles like "crm team", "sales", etc.

-- =========================================================
-- Step 1: Update workspace_members.role from enum to text
-- =========================================================

-- Backup existing data (if needed)
-- SELECT * INTO public.workspace_members_backup FROM public.workspace_members;

-- Change role column type from enum to text
ALTER TABLE public.workspace_members
ALTER COLUMN role TYPE text;

-- Add check constraint untuk ensure role tidak kosong
ALTER TABLE public.workspace_members
ADD CONSTRAINT workspace_members_role_not_empty 
CHECK (char_length(btrim(role)) > 0);

-- =========================================================
-- Step 2: Update workspace_invitations.role_to_assign to text
-- =========================================================

ALTER TABLE public.workspace_invitations
ALTER COLUMN role_to_assign TYPE text;

ALTER TABLE public.workspace_invitations
ADD CONSTRAINT workspace_invitations_role_not_empty
CHECK (char_length(btrim(role_to_assign)) > 0);

-- =========================================================
-- Step 3: Remove enum type if no longer needed (optional)
-- =========================================================

-- Hanya jalankan ini kalau YAKIN tidak ada place lain yang pakai enum member_role
-- DROP TYPE IF EXISTS public.member_role;

-- =========================================================
-- Notes:
-- =========================================================
-- 1. Default roles: "admin", "member"
-- 2. Custom roles: "crm team", "sales", "finance", etc.
-- 3. Admin bisa assign role apapun saat invite
-- 4. Update role member juga bisa custom
-- 5. Validasi business logic (hanya admin yang bisa set role) ada di application layer
