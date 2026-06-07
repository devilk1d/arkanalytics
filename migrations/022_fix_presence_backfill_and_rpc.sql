-- =========================================================
-- Arkanalytics: Fix presence tracking - backfill & RPC
-- =========================================================
-- 1. Backfill last_active_at from auth sign-in time for
--    users whose goOnline() heartbeat never fired (null rows).
-- 2. Recreate list_workspace_members_with_profile to:
--    - Return is_online (was missing since migration 009)
--    - Return arka_id (was missing since migration 009)
--    - Use COALESCE(last_active_at, auth.last_sign_in_at) so
--      users always have a meaningful last-active value even
--      if the client-side heartbeat fails.

UPDATE public.users u
SET last_active_at = au.last_sign_in_at
FROM auth.users au
WHERE u.id = au.id
  AND u.last_active_at IS NULL
  AND au.last_sign_in_at IS NOT NULL;

DROP FUNCTION IF EXISTS public.list_workspace_members_with_profile(uuid);

CREATE FUNCTION public.list_workspace_members_with_profile(p_workspace_id uuid)
RETURNS TABLE (
  user_id        uuid,
  full_name      text,
  email          text,
  avatar_url     text,
  arka_id        text,
  role           text,
  joined_at      timestamptz,
  last_active_at timestamptz,
  is_online      boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wm.user_id,
    u.full_name,
    u.email::text,
    u.avatar_url,
    u.arka_id,
    wm.role,
    wm.joined_at,
    COALESCE(u.last_active_at, au.last_sign_in_at) AS last_active_at,
    u.is_online
  FROM public.workspace_members wm
  JOIN public.users u  ON u.id  = wm.user_id
  JOIN auth.users  au ON au.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id
  ORDER BY wm.joined_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_workspace_members_with_profile(uuid) TO authenticated;
