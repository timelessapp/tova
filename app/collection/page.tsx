"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { Species, SpeciesCategory } from "@/lib/types";

type SpeciesCard = Pick<
  Species,
  "id" | "common_name" | "scientific_name" | "category" | "image_url"
>;

type SightingSpeciesRef = {
  species_id: string | null;
  seen_at: string;
};

type CategoryFilter = "all" | SpeciesCategory;

type CategoryOption = {
  label: string;
  value: CategoryFilter;
};

const categoryOptions: CategoryOption[] = [
  { label: "Todos", value: "all" },
  { label: "Mamíferos", value: "mammal" },
  { label: "Aves", value: "bird" },
  { label: "Reptiles", value: "reptile" },
  { label: "Anfibios", value: "amphibian" },
  { label: "Insectos", value: "insect" },
  { label: "Peces", value: "fish" },
  { label: "Otros", value: "other" },
];

const categoryLabelMap: Record<SpeciesCategory, string> = {
  mammal: "Mamífero",
  bird: "Ave",
  reptile: "Reptil",
  amphibian: "Anfibio",
  insect: "Insecto",
  fish: "Pez",
  other: "Otro",
};

type CategoryStyle = {
  cardBorder: string;
  badgeBg: string;
  badgeText: string;
  topTint: string;
  placeholderBg: string;
};

const getCategoryStyle = (category: SpeciesCategory): CategoryStyle => {
  switch (category) {
    case "mammal":
      return {
        cardBorder: "border-[#c8b39a]",
        badgeBg: "bg-[#eadfce]",
        badgeText: "text-[#6f5239]",
        topTint: "bg-gradient-to-b from-[#f0e6d8] to-[#f8f4ee]",
        placeholderBg: "bg-[#e8dac7]",
      };
    case "bird":
      return {
        cardBorder: "border-[#b8ccdc]",
        badgeBg: "bg-[#dcebf7]",
        badgeText: "text-[#35566f]",
        topTint: "bg-gradient-to-b from-[#e5f0fa] to-[#f6fafd]",
        placeholderBg: "bg-[#d8e9f6]",
      };
    case "reptile":
      return {
        cardBorder: "border-[#c8c1a2]",
        badgeBg: "bg-[#e8e2c8]",
        badgeText: "text-[#5f5a3b]",
        topTint: "bg-gradient-to-b from-[#ede8d3] to-[#f8f6ec]",
        placeholderBg: "bg-[#e2dcbf]",
      };
    case "amphibian":
      return {
        cardBorder: "border-[#b8d1be]",
        badgeBg: "bg-[#dceee0]",
        badgeText: "text-[#315a40]",
        topTint: "bg-gradient-to-b from-[#e2f1e6] to-[#f4faf5]",
        placeholderBg: "bg-[#d4e7d9]",
      };
    case "insect":
      return {
        cardBorder: "border-[#d9c292]",
        badgeBg: "bg-[#f2e3bf]",
        badgeText: "text-[#72592c]",
        topTint: "bg-gradient-to-b from-[#f5e8c9] to-[#fcf8ef]",
        placeholderBg: "bg-[#ecd9ae]",
      };
    case "fish":
      return {
        cardBorder: "border-[#a7ced6]",
        badgeBg: "bg-[#d5eef2]",
        badgeText: "text-[#2f5e67]",
        topTint: "bg-gradient-to-b from-[#ddf2f6] to-[#f4fbfc]",
        placeholderBg: "bg-[#cce7ec]",
      };
    default:
      return {
        cardBorder: "border-[#cfd4d8]",
        badgeBg: "bg-[#e8eaec]",
        badgeText: "text-[#4f5962]",
        topTint: "bg-gradient-to-b from-[#eceff1] to-[#f8f9fa]",
        placeholderBg: "bg-[#dfe3e6]",
      };
  }
};

const categoryLockedIcon: Record<SpeciesCategory, string> = {
  mammal: "🐾",
  bird: "🪶",
  reptile: "🦎",
  amphibian: "🐸",
  insect: "🪲",
  fish: "🐟",
  other: "❓",
};

const speciesSelectFields = "id, common_name, scientific_name, category, image_url";

export default function CollectionPage() {
  const UNDISCOVERED_PAGE_SIZE = 20;
  const { user, loading: authLoading } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [species, setSpecies] = useState<SpeciesCard[]>([]);
  const [discoveredSpeciesIds, setDiscoveredSpeciesIds] = useState<string[]>([]);
  const [recentSpeciesIds, setRecentSpeciesIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [undiscoveredVisibleCount, setUndiscoveredVisibleCount] = useState(UNDISCOVERED_PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const loadCollection = async () => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setMessage(
          "No encontramos la configuracion de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
        setSpecies([]);
        setDiscoveredSpeciesIds([]);
        setRecentSpeciesIds([]);
        setLoading(false);

        return;
      }

      setLoading(true);
      setMessage(null);

      const { data: speciesData, error: speciesError } = await supabase
        .from("species")
        .select(speciesSelectFields)
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("common_name", { ascending: true });

      if (speciesError) {
        setMessage("No pudimos cargar el catalogo ahora mismo.");
        setSpecies([]);
        setDiscoveredSpeciesIds([]);
        setRecentSpeciesIds([]);
        setLoading(false);

        return;
      }

      const loadedSpecies = speciesData ?? [];
      setSpecies(loadedSpecies);

      if (loadedSpecies.length === 0) {
        setMessage("Aun no hay especies cargadas en el catalogo.");
      }

      if (!user) {
        setDiscoveredSpeciesIds([]);
        setRecentSpeciesIds([]);
        setLoading(false);

        return;
      }

      const { data: sightingsData, error: sightingsError } = await supabase
        .from("sightings")
        .select("species_id, seen_at")
        .eq("user_id", user.id);

      if (sightingsError) {
        setMessage("No pudimos cargar tus avistamientos por ahora.");
        setDiscoveredSpeciesIds([]);
        setRecentSpeciesIds([]);
        setLoading(false);

        return;
      }

      const ids = new Set(
        ((sightingsData ?? []) as SightingSpeciesRef[])
          .map((sighting) => sighting.species_id)
          .filter((id): id is string => Boolean(id)),
      );

      const recentIds: string[] = [];
      const recentSeenIds = new Set<string>();

      ((sightingsData ?? []) as SightingSpeciesRef[])
        .filter((sighting) => Boolean(sighting.species_id))
        .sort(
          (a, b) =>
            new Date(b.seen_at).getTime() - new Date(a.seen_at).getTime(),
        )
        .forEach((sighting) => {
          const speciesId = sighting.species_id;

          if (!speciesId || recentSeenIds.has(speciesId) || recentIds.length >= 5) {
            return;
          }

          recentSeenIds.add(speciesId);
          recentIds.push(speciesId);
        });

      const discoveredIds = Array.from(ids);
      setDiscoveredSpeciesIds(discoveredIds);
      setRecentSpeciesIds(recentIds);

      setLoading(false);
    };

    if (!authLoading) {
      loadCollection();
    }
  }, [authLoading, user]);

  const discoveredCount = useMemo(
    () => species.filter((item) => discoveredSpeciesIds.includes(item.id)).length,
    [species, discoveredSpeciesIds],
  );

  const recentSpecies = useMemo(() => {
    const speciesById = new Map(species.map((item) => [item.id, item]));

    return recentSpeciesIds
      .map((id) => speciesById.get(id))
      .filter((item): item is SpeciesCard => Boolean(item));
  }, [recentSpeciesIds, species]);

  const unlockedCollectionSpecies = useMemo(() => {
    const recentSet = new Set(recentSpeciesIds);

    return species.filter(
      (item) => discoveredSpeciesIds.includes(item.id) && !recentSet.has(item.id),
    );
  }, [discoveredSpeciesIds, recentSpeciesIds, species]);

  const undiscoveredSpecies = useMemo(
    () => species.filter((item) => !discoveredSpeciesIds.includes(item.id)),
    [discoveredSpeciesIds, species],
  );

  const filteredRecentSpecies = useMemo(() => {
    if (selectedCategory === "all") {
      return recentSpecies;
    }

    return recentSpecies.filter((item) => item.category === selectedCategory);
  }, [recentSpecies, selectedCategory]);

  const filteredUnlockedCollectionSpecies = useMemo(() => {
    if (selectedCategory === "all") {
      return unlockedCollectionSpecies;
    }

    return unlockedCollectionSpecies.filter(
      (item) => item.category === selectedCategory,
    );
  }, [selectedCategory, unlockedCollectionSpecies]);

  const filteredUndiscoveredSpecies = useMemo(() => {
    if (selectedCategory === "all") {
      return undiscoveredSpecies;
    }

    return undiscoveredSpecies.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, undiscoveredSpecies]);

  useEffect(() => {
    setUndiscoveredVisibleCount(UNDISCOVERED_PAGE_SIZE);
  }, [selectedCategory]);

  const visibleUndiscoveredSpecies = useMemo(
    () => filteredUndiscoveredSpecies.slice(0, undiscoveredVisibleCount),
    [filteredUndiscoveredSpecies, undiscoveredVisibleCount],
  );

  const speciesNumberById = useMemo(() => {
    return new Map(species.map((item, index) => [item.id, `#${String(index + 1).padStart(3, "0")}`]));
  }, [species]);

  const displayedTotal =
    filteredRecentSpecies.length +
    filteredUnlockedCollectionSpecies.length +
    filteredUndiscoveredSpecies.length;

  const renderUnlockedCard = (speciesItem: SpeciesCard) => {
    const category = (speciesItem.category as SpeciesCategory) ?? "other";
    const categoryLabel = categoryLabelMap[category] ?? "Otro";
    const categoryStyle = getCategoryStyle(category);
    const stickerNumber = speciesNumberById.get(speciesItem.id) ?? "#000";

    return (
      <Link
        key={speciesItem.id}
        href={`/species/${speciesItem.id}`}
        className={`flex min-h-[18rem] flex-col overflow-hidden rounded-lg border bg-white transition hover:-translate-y-0.5 hover:shadow-sm ${categoryStyle.cardBorder}`}
      >
        <div className="p-3 pb-0">
          <div className={`relative overflow-hidden rounded-md border border-black/5 ${categoryStyle.topTint}`}>
            <div className="aspect-[4/5] w-full">
              {speciesItem.image_url ? (
                <img
                  src={speciesItem.image_url}
                  alt={speciesItem.common_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className={`flex h-full items-center justify-center text-5xl ${categoryStyle.placeholderBg}`}>
                  {"🐾"}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
          <h3 className="text-sm font-semibold text-[#2b3b33]">{speciesItem.common_name}</h3>
          <p className="mt-1 text-xs italic text-[#5c6f64]">
            {speciesItem.scientific_name ?? "Sin nombre cientifico"}
          </p>
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <span
              className={`inline-flex w-fit rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${categoryStyle.badgeBg} ${categoryStyle.badgeText}`}
            >
              {categoryLabel}
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-[#607066]">{stickerNumber}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <main className="min-h-screen bg-[#f7f6ef] px-5 pb-28 pt-6 text-[#253028] sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-3xl border border-[#d8e0ce] bg-[#fbfbf8] p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5b7464]">TOVA</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-[#223127]">Mi colección</h1>
              <Link
                href="/trophies"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#c9d4bf] bg-white text-xl text-[#496053] transition hover:bg-[#edf2e7]"
                aria-label="Ir a trofeos"
                title="Ver trofeos"
              >
                🏆
              </Link>
            </div>
            <p className="mt-2 text-sm text-[#4f6256]">
              Has descubierto {discoveredCount} de {species.length} animales.
            </p>
            {!authLoading && !user ? (
              <p className="mt-2 text-xs text-[#5f7468]">Entra para empezar tu colección.</p>
            ) : null}
          </div>
        </header>



        {loading ? (
          <section className="rounded-3xl border border-[#d8e0ce] bg-[#fbfbf8] p-6 text-center sm:p-8">
            <p className="text-sm text-[#55695d]">Cargando colección...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="rounded-3xl border border-[#d8e0ce] bg-[#fbfbf8] p-6 text-center sm:p-8">
            <p className="text-base font-medium text-[#2c3e34]">Catalogo no disponible</p>
            <p className="mt-2 text-sm text-[#55695d]">{message}</p>
            <Link
              href="/capture"
              className="mt-5 inline-flex rounded-full bg-[#3f684f] px-5 py-2.5 text-sm font-semibold text-[#f7f6ef]"
            >
              Ir a captura mock
            </Link>
          </section>
        ) : null}

        {lockedMessage ? (
          <section className="rounded-2xl border border-[#d8e0ce] bg-[#fbfbf8] px-4 py-3">
            <p className="text-sm text-[#55695d]">{lockedMessage}</p>
          </section>
        ) : null}

        {filteredRecentSpecies.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#4f6458]">
                Descubrimientos recientes
              </h2>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filtersOpen || selectedCategory !== "all"
                    ? "border-[#3f684f] bg-[#3f684f] text-[#f7f6ef]"
                    : "border-[#c9d4bf] bg-white text-[#496053] hover:bg-[#edf2e7]"
                }`}
              >
                <span>Filtros</span>
                {selectedCategory !== "all" && (
                  <span className="rounded-full bg-white/30 px-1.5 py-0.5 text-[10px]">
                    {categoryOptions.find((o) => o.value === selectedCategory)?.label}
                  </span>
                )}
              </button>
            </div>
            {filtersOpen && (
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((option) => {
                  const isActive = selectedCategory === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedCategory(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-[#3f684f] bg-[#3f684f] text-[#f7f6ef]"
                          : "border-[#c9d4bf] bg-white text-[#496053] hover:bg-[#edf2e7]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredRecentSpecies.map(renderUnlockedCard)}
            </div>
          </section>
        ) : null}

        {filteredUnlockedCollectionSpecies.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#4f6458]">
              Tu colección
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredUnlockedCollectionSpecies.map(renderUnlockedCard)}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#4f6458]">
            Por descubrir
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleUndiscoveredSpecies.map((speciesItem) => {
              const cat = (speciesItem.category as SpeciesCategory) ?? "other";
              const categoryLabel = categoryLabelMap[cat] ?? "Otro";
              const categoryStyle = getCategoryStyle(cat);
              const stickerNumber = speciesNumberById.get(speciesItem.id) ?? "#000";
              const lockedIcon = categoryLockedIcon[cat] ?? "❓";

              return (
                <button
                  type="button"
                  key={speciesItem.id}
                  onClick={() => setLockedMessage("Todavía no has descubierto este animal")}
                  className={`flex min-h-[18rem] flex-col overflow-hidden rounded-lg border bg-white/90 text-left opacity-85 transition hover:-translate-y-0.5 hover:shadow-sm ${categoryStyle.cardBorder}`}
                >
                  <div className="p-3 pb-0">
                    <div className={`relative overflow-hidden rounded-md border border-black/5 ${categoryStyle.topTint}`}>
                      <div className={`aspect-[4/5] w-full flex items-center justify-center ${categoryStyle.placeholderBg}`}>
                        <span className="text-5xl opacity-60">{lockedIcon}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                    <h3 className="text-sm font-semibold text-[#2b3b33]">
                      {speciesItem.common_name}
                    </h3>
                    <p className="mt-1 text-xs text-[#5c6f64]">Por descubrir</p>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <span
                        className={`inline-flex w-fit rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${categoryStyle.badgeBg} ${categoryStyle.badgeText}`}
                      >
                        {categoryLabel}
                      </span>
                      <span className="text-[10px] font-semibold tracking-wider text-[#607066]">{stickerNumber}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredUndiscoveredSpecies.length > visibleUndiscoveredSpecies.length ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  setUndiscoveredVisibleCount((current) => current + UNDISCOVERED_PAGE_SIZE)
                }
                className="rounded-full border border-[#cfdac5] bg-[#f2f5ed] px-4 py-2 text-sm font-medium text-[#385443]"
              >
                Cargar 20 mas
              </button>
            </div>
          ) : null}
        </section>

        {!loading && !message && displayedTotal === 0 ? (
          <section className="rounded-2xl border border-[#d8e0ce] bg-[#fbfbf8] p-4 text-center">
            <p className="text-sm text-[#55695d]">No hay especies en esta categoría.</p>
          </section>
        ) : null}

        <Link
          href="/map"
          className="self-start rounded-full border border-[#cfdac5] bg-[#f2f5ed] px-4 py-2 text-sm font-medium text-[#385443]"
        >
          Ver recuerdos en el mapa
        </Link>
      </div>

      <Link
        href="/capture"
        className="fixed bottom-5 left-1/2 z-20 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 rounded-full bg-[#3f684f] px-6 py-4 text-center text-sm font-semibold text-[#f7f6ef] shadow-[0_12px_24px_-16px_rgba(26,42,34,0.8)]"
      >
        Capturar nuevo descubrimiento
      </Link>

    </main>
  );
}
