// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ReturnType<typeof createClient> resolves to SupabaseClient<unknown,...> in TS5,
// making .update() accept `never`. Explicit <any,any,any> keeps Schema = any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: SupabaseClient<any, any, any> | null = null

export function createAdminClient() {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin env vars')
  _admin = createClient(url, key, { auth: { persistSession: false } })
  return _admin
}
