"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  achievementKeyToLabel,
  buildReachedAchievementKeys,
  isAchievementKey,
  type AchievementKey,
} from "@/lib/achievements";
import type { SpeciesCategory } from "@/lib/types";
import AchievementDetailModal from "@/components/AchievementDetailModal";
import AchievementsPanel, { type TrophyItem } from "@/components/AchievementsPanel";

type AchievementRow = {
  achievement_key: string;
  achievement_label: string;
  unlocked_at: string;
};

export default function TrophiesPage() {
  const { user, loading: authLoading } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [trophies, setTrophies] = useState<TrophyItem[]>([]);
  const [activeTrophy, setActiveTrophy] = useState<TrophyItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadTrophies = async () => {
      setLoading(true);
      setMessage(null);

      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setMessage("No encontramos la configuracion de Supabase.");
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      // Carga avistamientos para detectar logros alcanzados
      const [{ data: sightingsData }, { data: speciesData }] = await Promise.all([
        supabase.from("sightings").select("species_id").eq("user_id", user.id),
        supabase
          .from("species")
          .select("id, category")
          .eq("is_active", true),
      ]);

      const discoveredIds = Array.from(
        new Set(
          ((sightingsData ?? []) as { species_id: string | null }[])
            .map((s) => s.species_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      const discoveredCategories = Array.from(
        new Set(
          ((speciesData ?? []) as { id: string; category: string }[])
            .filter((item) => discoveredIds.includes(item.id))
            .map((item) => item.category)
            .filter((c): c is SpeciesCategory =>
              ["mammal", "bird", "reptile", "amphibian", "insect", "fish", "other"].includes(c),
            ),
        ),
      );

      const reachedKeys = buildReachedAchievementKeys({
        distinctSpeciesCount: discoveredIds.length,
        discoveredCategories,
      });

      const { data: achievementData, error: achievementError } = await supabase
        .from("user_achievements")
        .select("achievement_key, achievement_label, unlocked_at")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false });

      let merged = (achievementData ?? []) as AchievementRow[];

      if (!achievementError && reachedKeys.length > 0) {
        const existingKeys = new Set(merged.map((item) => item.achievement_key));
        const missingKeys = reachedKeys.filter((key) => !existingKeys.has(key));

        if (missingKeys.length > 0) {
          await supabase.from("user_achievements").upsert(
            missingKeys.map((key) => ({
              user_id: user.id,
              achievement_key: key,
              achievement_label: achievementKeyToLabel(key),
              source: "trophies_sync",
            })),
            { onConflict: "user_id,achievement_key", ignoreDuplicates: true },
          );

          merged = [
            ...merged,
            ...missingKeys.map((key) => ({
              achievement_key: key,
              achievement_label: achievementKeyToLabel(key),
              unlocked_at: new Date().toISOString(),
            })),
          ];
        }
      }

      const valid = merged.filter(
        (item): item is AchievementRow & { achievement_key: AchievementKey } =>
          isAchievementKey(item.achievement_key),
      );

      const unique = Array.from(
        new Map(valid.map((item) => [item.achievement_key, item])).values(),
      ).sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());

      setTrophies(
        unique.map((item) => ({
          achievementKey: item.achievement_key,
          achievementLabel: item.achievement_label,
          unlockedAt: item.unlocked_at,
        })),
      );
      setLoading(false);
    };

    if (!authLoading) {
      loadTrophies();
    }
  }, [authLoading, user]);

  return (
    <main className="min-h-screen bg-sand px-5 pb-28 pt-6 text-forest-dark sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="overflow-hidden rounded-2xl border border-[#d8cdb5] bg-[#f1eadb] p-6 shadow-[0_10px_22px_-16px_rgba(47,93,80,0.55)] sm:p-7">
          <div className="-mx-6 -mt-6 mb-4 h-1.5 bg-[#2F5D50] sm:-mx-7 sm:-mt-7" />
          <Link
            href="/collection"
            className="text-xs font-medium text-[#5e7367] underline-offset-4 hover:underline"
          >
            ← Mi colección
          </Link>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-forest-soft">TOVA</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-forest-dark">Trofeos</h1>
          <p className="mt-2 text-sm text-forest">
            {trophies.length === 0 && !loading
              ? "Aún no has desbloqueado ningún trofeo."
              : `${trophies.length} trofeo${trophies.length === 1 ? "" : "s"} desbloqueado${trophies.length === 1 ? "" : "s"}.`}
          </p>
        </header>

        {loading ? (
          <section className="rounded-2xl border border-sand-dark bg-sand p-6 text-center">
            <p className="text-sm text-forest-soft">Cargando trofeos...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="rounded-2xl border border-sand-dark bg-sand p-6 text-center">
            <p className="text-sm text-forest-soft">{message}</p>
          </section>
        ) : null}

        {!loading && !authLoading && !user ? (
          <section className="rounded-2xl border border-sand-dark bg-sand p-6 text-center">
            <p className="text-sm text-forest-soft">Entra para ver tus trofeos.</p>
            <Link
              href="/auth"
              className="mt-4 inline-flex rounded-full bg-[#2F5D50] px-5 py-2.5 text-sm font-semibold text-[#F4F1E8]"
            >
              Entrar
            </Link>
          </section>
        ) : null}

        {!loading && user ? (
          <AchievementsPanel trophies={trophies} onOpenDetail={setActiveTrophy} />
        ) : null}
      </div>

      <Link
        href="/capture"
        className="fixed bottom-5 left-1/2 z-20 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 rounded-full bg-[#2F5D50] px-6 py-4 text-center text-sm font-semibold text-[#F4F1E8] shadow-[0_18px_34px_-18px_rgba(26,42,34,0.95)]"
      >
        Capturar nuevo descubrimiento
      </Link>

      <AchievementDetailModal
        isOpen={Boolean(activeTrophy)}
        achievementKey={activeTrophy?.achievementKey ?? null}
        unlockedAt={activeTrophy?.unlockedAt ?? null}
        onClose={() => setActiveTrophy(null)}
      />
    </main>
  );
}
