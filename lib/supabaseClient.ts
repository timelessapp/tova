import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

function getNormalizedSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (supabaseAnonKey.startsWith("sb_secret_")) {
    return null;
  }

  try {
    const parsed = new URL(supabaseUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return {
      supabaseUrl: parsed.origin,
      supabaseAnonKey,
    };
  } catch {
    return null;
  }
}

export function createSupabaseClient() {
  const config = getNormalizedSupabaseConfig();

  if (!config) {
    return null;
  }

  try {
    return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch {
    return null;
  }
}

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const config = getNormalizedSupabaseConfig();

  if (!config) {
    return null;
  }

  try {
    browserClient = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    return browserClient;
  } catch {
    return null;
  }
}

export function createSupabaseRouteClient(accessToken?: string) {
  const config = getNormalizedSupabaseConfig();

  if (!config) {
    return null;
  }

  try {
    return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    });
  } catch {
    return null;
  }
}
