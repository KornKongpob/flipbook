import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { hasServiceRoleEnv } from "@/lib/env";

let adminClient: SupabaseClient<Database> | null = null;

export function createAdminSupabaseClient(): SupabaseClient<Database> | null {
  if (!hasServiceRoleEnv()) {
    return null;
  }

  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return adminClient;
}
