import { cache } from "react";
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  MAKRO_BASE_URL: z.string().url().default("https://www.makro.pro"),
  MAKRO_SEARCH_URL_TEMPLATE: z
    .string()
    .default("https://www.makro.pro/en/search?q={query}"),
  HEYZINE_API_BASE_URL: z.string().url().default("https://heyzine.com/api"),
  HEYZINE_CLIENT_ID: z.string().optional(),
  HEYZINE_API_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export const getEnv = cache(() => {
  const parsed = envSchema.safeParse(process.env);

  return {
    data: parsed.success ? parsed.data : null,
    error: parsed.success ? null : parsed.error.flatten(),
  };
});

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasServiceRoleEnv() {
  return hasSupabaseEnv() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSetupDiagnostics() {
  return {
    supabaseClient: hasSupabaseEnv(),
    supabaseServiceRole: hasServiceRoleEnv(),
    heyzineClientId: Boolean(process.env.HEYZINE_CLIENT_ID),
    heyzineApiKey: Boolean(process.env.HEYZINE_API_KEY),
  };
}

export function requireEnv() {
  const env = getEnv();

  if (!env.data) {
    throw new Error("Environment variables are not configured correctly.");
  }

  return env.data;
}
