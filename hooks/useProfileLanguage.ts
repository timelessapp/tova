"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { ProfileLanguage } from "@/lib/getLocalizedSpeciesText";

type UseProfileLanguageResult = {
  language: ProfileLanguage;
  loading: boolean;
};

export function useProfileLanguage(): UseProfileLanguageResult {
  const { user, loading: authLoading } = useCurrentUser();
  const [language, setLanguage] = useState<ProfileLanguage>("ca");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfileLanguage = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setLanguage("ca");
        setLoading(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setLanguage("ca");
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", user.id)
        .maybeSingle<{ language: ProfileLanguage | null }>();

      setLanguage(data?.language === "es" ? "es" : "ca");
      setLoading(false);
    };

    loadProfileLanguage();
  }, [authLoading, user]);

  return { language, loading };
}
