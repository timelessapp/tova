import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}
