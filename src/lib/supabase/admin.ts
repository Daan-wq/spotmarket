import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Only use server-side.
 * Used for: setting user_metadata.role, admin operations, Realtime broadcast.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
