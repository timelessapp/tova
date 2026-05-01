"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/auth";

type UseCurrentUserResult = {
  user: User | null;
  loading: boolean;
};

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    getCurrentUser().then((nextUser) => {
      if (mounted) {
        setUser(nextUser);
        setLoading(false);
      }
    });

    if (!supabase) {
      setLoading(false);

      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
