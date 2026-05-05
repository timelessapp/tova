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
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
};

type LatestSightingBySpeciesId = Record<
  string,
  Pick<SightingSpeciesRef, "location_name" | "latitude" | "longitude" | "seen_at">
>;

type CategoryFilter = "all" | SpeciesCategory;

type CategoryOption = {
  label: string;
  value: CategoryFilter;
};

const categoryOptions: CategoryOption[] = [
  { label: "Tots", value: "all" },
  { label: "Mamífers", value: "mammal" },
  { label: "Ocells", value: "bird" },
  { label: "Rèptils", value: "reptile" },
  { label: "Amfibis", value: "amphibian" },
  { label: "Insectes", value: "insect" },
  { label: "Peixos", value: "fish" },
  { label: "Altres", value: "other" },
];

const categoryLabelMap: Record<SpeciesCategory, string> = {
  mammal: "Mamífer",
  bird: "Ocell",
  reptile: "Rèptil",
  amphibian: "Amfibi",
  insect: "Insecte",
  fish: "Peix",
  other: "Altre",
};

type CategoryStyle = {
  cardBorder: string;
  categoryColor: string;
  badgeBg: string;
  badgeText: string;
  topTint: string;
  placeholderBg: string;
};

const getCategoryStyle = (category: SpeciesCategory): CategoryStyle => {
  switch (category) {
    case "mammal":
      return {
        cardBorder: "border-[#BE9A74]",
        categoryColor: "#9C6F43",
        badgeBg: "bg-[#EEDDC7]",
        badgeText: "text-[#65452D]",
        topTint: "bg-gradient-to-b from-[#F3E8D8] to-[#FBF6EE]",
        placeholderBg: "bg-[#E6D1B4]",
      };
    case "bird":
      return {
        cardBorder: "border-[#F0943A]",
        categoryColor: "#D4620A",
        badgeBg: "bg-[#FDE9CC]",
        badgeText: "text-[#7A3008]",
        topTint: "bg-gradient-to-b from-[#FDE5C0] to-[#FFF8F0]",
        placeholderBg: "bg-[#FAC97A]",
      };
    case "reptile":
      return {
        cardBorder: "border-[#B8B084]",
        categoryColor: "#7E7750",
        badgeBg: "bg-[#E6E0C0]",
        badgeText: "text-[#585333]",
        topTint: "bg-gradient-to-b from-[#ECE7CF] to-[#F8F5EA]",
        placeholderBg: "bg-[#DDD6AE]",
      };
    case "amphibian":
      return {
        cardBorder: "border-[#92B99B]",
        categoryColor: "#4D7D58",
        badgeBg: "bg-[#D9EADB]",
        badgeText: "text-[#2F5A3A]",
        topTint: "bg-gradient-to-b from-[#E3F0E5] to-[#F5FAF6]",
        placeholderBg: "bg-[#CFE2D2]",
      };
    case "insect":
      return {
        cardBorder: "border-[#C7CDD1]",
        categoryColor: "#8A939A",
        badgeBg: "bg-[#ECEFF1]",
        badgeText: "text-[#4F5962]",
        topTint: "bg-gradient-to-b from-[#F1F3F5] to-[#FAFBFC]",
        placeholderBg: "bg-[#E2E6E9]",
      };
    case "fish":
      return {
        cardBorder: "border-[#8FB9C9]",
        categoryColor: "#3E7C99",
        badgeBg: "bg-[#D7EAF1]",
        badgeText: "text-[#2B5668]",
        topTint: "bg-gradient-to-b from-[#E1EFF5] to-[#F6FBFD]",
        placeholderBg: "bg-[#C8E0EA]",
      };
    default:
      return {
        cardBorder: "border-[#BBC3C8]",
        categoryColor: "#707A82",
        badgeBg: "bg-[#E6EAED]",
        badgeText: "text-[#49535C]",
        topTint: "bg-gradient-to-b from-[#EDF1F3] to-[#F9FAFB]",
        placeholderBg: "bg-[#D9E0E4]",
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
  const [latestSightingBySpeciesId, setLatestSightingBySpeciesId] =
    useState<LatestSightingBySpeciesId>({});
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [undiscoveredVisibleCount, setUndiscoveredVisibleCount] = useState(UNDISCOVERED_PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadCollection = async () => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setMessage(
          "No hem trobat la configuració de Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
        setSpecies([]);
        setDiscoveredSpeciesIds([]);
        setRecentSpeciesIds([]);
        setLatestSightingBySpeciesId({});
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
        setMessage("Ara mateix no hem pogut carregar el catàleg.");
        setSpecies([]);
        setDiscoveredSpeciesIds([]);
        setRecentSpeciesIds([]);
        setLatestSightingBySpeciesId({});
        setLoading(false);

        return;
      }

      const loadedSpecies = speciesData ?? [];
      setSpecies(loadedSpecies);

      if (loadedSpecies.length === 0) {
        setMessage("Encara no hi ha espècies carregades al catàleg.");
      }

      if (!user) {
        setDiscoveredSpeciesIds([]);
        setRecentSpeciesIds([]);
        setLatestSightingBySpeciesId({});
        setLoading(false);

        return;
      }

      const { data: sightingsData, error: sightingsError } = await supabase
        .from("sightings")
        .select("species_id, seen_at, location_name, latitude, longitude")
        .eq("user_id", user.id);

      if (sightingsError) {
        setMessage("Ara mateix no hem pogut carregar els teus albiraments.");
        setDiscoveredSpeciesIds([]);
        setRecentSpeciesIds([]);
        setLatestSightingBySpeciesId({});
        setLoading(false);

        return;
      }

      const ids = new Set(
        ((sightingsData ?? []) as SightingSpeciesRef[])
          .map((sighting) => sighting.species_id)
          .filter((id): id is string => Boolean(id)),
      );

      const sortedSightings = ((sightingsData ?? []) as SightingSpeciesRef[])
        .filter((sighting) => Boolean(sighting.species_id))
        .sort(
          (a, b) =>
            new Date(b.seen_at).getTime() - new Date(a.seen_at).getTime(),
        );

      const latestBySpecies: LatestSightingBySpeciesId = {};
      sortedSightings.forEach((sighting) => {
        const speciesId = sighting.species_id;
        if (!speciesId || latestBySpecies[speciesId]) {
          return;
        }

        latestBySpecies[speciesId] = {
          seen_at: sighting.seen_at,
          location_name: sighting.location_name,
          latitude: sighting.latitude,
          longitude: sighting.longitude,
        };
      });

      const recentIds: string[] = [];
      const recentSeenIds = new Set<string>();

      sortedSightings.forEach((sighting) => {
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
      setLatestSightingBySpeciesId(latestBySpecies);

      setLoading(false);
    };

    if (!authLoading) {
      loadCollection();
    }
  }, [authLoading, user]);

  useEffect(() => {
    const loadProfileAvatar = async () => {
      if (!user) {
        setProfileAvatarUrl(null);
        return;
      }

      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setProfileAvatarUrl(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle<{ avatar_url: string | null }>();

      setProfileAvatarUrl(data?.avatar_url ?? null);
    };

    loadProfileAvatar();
  }, [user]);

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
  const progressPercent =
    species.length > 0 ? Math.min(100, Math.round((discoveredCount / species.length) * 100)) : 0;

  const renderUnlockedCard = (speciesItem: SpeciesCard) => {
    const category = (speciesItem.category as SpeciesCategory) ?? "other";
    const categoryLabel = categoryLabelMap[category] ?? "Otro";
    const categoryStyle = getCategoryStyle(category);
    const stickerNumber = speciesNumberById.get(speciesItem.id) ?? "#000";
    const latestSighting = latestSightingBySpeciesId[speciesItem.id];
    const locationText = latestSighting?.location_name
      ? `📍 ${latestSighting.location_name}`
      : latestSighting?.latitude != null && latestSighting?.longitude != null
        ? "📍 Ubicació desada"
        : null;

    return (
      <Link
        key={speciesItem.id}
        href={`/species/${speciesItem.id}`}
        className={`flex min-h-[18rem] flex-col overflow-hidden rounded-lg border-2 bg-[#fbf8f2] transition hover:-translate-y-0.5 hover:shadow-sm ${categoryStyle.cardBorder}`}
      >
        <div className="h-2 w-full" style={{ backgroundColor: categoryStyle.categoryColor }} />
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
          <h3 className="text-sm font-semibold text-forest-dark">{speciesItem.common_name}</h3>
          <p className="mt-1 text-xs italic text-[#5c6f64]">
            {speciesItem.scientific_name ?? "Sense nom científic"}
          </p>
          {locationText ? (
            <p className="mt-1 truncate text-[11px] text-forest-soft">{locationText}</p>
          ) : null}
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <span
              className={`inline-flex w-fit rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${categoryStyle.badgeBg} ${categoryStyle.badgeText}`}
            >
              {categoryLabel}
            </span>
            <span className="text-xs font-bold text-forest-dark opacity-70">{stickerNumber}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <main className="min-h-screen bg-sand px-5 pb-28 pt-6 text-forest-dark sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="overflow-hidden rounded-2xl border border-[#d8cdb5] bg-[#f1eadb] p-6 shadow-[0_10px_22px_-16px_rgba(47,93,80,0.55)] sm:p-7">
          <div className="-mx-6 -mt-6 mb-4 h-1.5 bg-[#2F5D50] sm:-mx-7 sm:-mt-7" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link
                href="/"
                className="inline-flex text-xs font-semibold uppercase tracking-wider text-forest-soft underline-offset-4 hover:underline"
              >
                TOVA
              </Link>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-forest-dark">La meva col·lecció</h1>
              <p className="mt-1 text-sm text-forest">El teu àlbum de descobriments</p>

              <div className="mt-4">
                <p className="text-sm font-medium text-forest-dark">
                  Has descobert {discoveredCount} de {species.length} animals
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#d9cfbb]">
                  <div
                    className="h-full rounded-full bg-[#2F5D50] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {!authLoading && !user ? (
                <p className="mt-3 text-xs text-forest-soft">Entra per començar la teva col·lecció.</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#c5d4c7] bg-[#fcfaf5] text-xl text-forest shadow-sm transition hover:bg-sand"
                aria-label="Anar al perfil"
                title="Veure perfil"
              >
                {profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "👤"
                )}
              </Link>

              <Link
                href="/trophies"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c5d4c7] bg-[#fcfaf5] text-xl text-forest shadow-sm transition hover:bg-sand"
                aria-label="Anar als trofeus"
                title="Veure trofeus"
              >
                🏆
              </Link>
            </div>
          </div>
        </header>



        {loading ? (
          <section className="rounded-3xl border border-sand-dark bg-sand p-6 text-center sm:p-8">
            <p className="text-sm text-forest-soft">Carregant col·lecció...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="rounded-3xl border border-sand-dark bg-sand p-6 text-center sm:p-8">
            <p className="text-base font-medium text-forest-dark">Catàleg no disponible</p>
            <p className="mt-2 text-sm text-forest-soft">{message}</p>
            <Link
              href="/capture"
              className="mt-5 inline-flex rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-sand"
            >
              Anar a la captura de prova
            </Link>
          </section>
        ) : null}

        {lockedMessage ? (
          <section className="rounded-2xl border border-sand-dark bg-sand px-4 py-3">
            <p className="text-sm text-forest-soft">{lockedMessage}</p>
          </section>
        ) : null}

        {!loading && !message ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-forest-soft">
                Filtres
              </h2>
              <div className="flex items-center gap-2">
                <Link
                  href="/map"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sand-dark bg-white text-sm text-forest transition-colors hover:bg-sand-dark"
                  aria-label="Veure records al mapa"
                  title="Veure records al mapa"
                >
                  🗺️
                </Link>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    filtersOpen || selectedCategory !== "all"
                      ? "border-forest bg-forest text-sand"
                      : "border-sand-dark bg-white text-forest hover:bg-sand-dark"
                  }`}
                >
                  <span>Filtres</span>
                  {selectedCategory !== "all" && (
                    <span className="rounded-full bg-white/30 px-1.5 py-0.5 text-[10px]">
                      {categoryOptions.find((o) => o.value === selectedCategory)?.label}
                    </span>
                  )}
                </button>
              </div>
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
                          ? "border-forest bg-forest text-sand"
                          : "border-sand-dark bg-white text-forest hover:bg-sand-dark"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {filteredRecentSpecies.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-forest-soft">
              Descobriments recents
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredRecentSpecies.map(renderUnlockedCard)}
            </div>
          </section>
        ) : null}

        {filteredUnlockedCollectionSpecies.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-forest-soft">
              La teva col·lecció
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredUnlockedCollectionSpecies.map(renderUnlockedCard)}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-forest-soft">
            Per descobrir
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleUndiscoveredSpecies.map((speciesItem) => {
              const cat = (speciesItem.category as SpeciesCategory) ?? "other";
              const categoryLabel = categoryLabelMap[cat] ?? "Altre";
              const categoryStyle = getCategoryStyle(cat);
              const stickerNumber = speciesNumberById.get(speciesItem.id) ?? "#000";
              const lockedIcon = categoryLockedIcon[cat] ?? "❓";

              return (
                <button
                  type="button"
                  key={speciesItem.id}
                  onClick={() => setLockedMessage("Encara no has descobert aquest animal")}
                  className={`flex min-h-[18rem] flex-col overflow-hidden rounded-lg border-2 bg-[#fbf8f2] text-left opacity-85 transition hover:-translate-y-0.5 hover:shadow-sm ${categoryStyle.cardBorder}`}
                >
                  <div className="h-2 w-full" style={{ backgroundColor: categoryStyle.categoryColor }} />
                  <div className="p-3 pb-0">
                    <div className={`relative overflow-hidden rounded-md border border-black/5 ${categoryStyle.topTint}`}>
                      <div className={`aspect-[4/5] w-full flex items-center justify-center ${categoryStyle.placeholderBg}`}>
                        <span className="text-5xl opacity-60">{lockedIcon}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                    <h3 className="text-sm font-semibold text-forest-dark">
                      {speciesItem.common_name}
                    </h3>
                    <p className="mt-1 text-xs text-forest-soft">Per descobrir</p>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <span
                        className={`inline-flex w-fit rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${categoryStyle.badgeBg} ${categoryStyle.badgeText}`}
                      >
                        {categoryLabel}
                      </span>
                      <span className="text-xs font-bold text-forest-dark opacity-70">{stickerNumber}</span>
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
                className="rounded-full border border-sand-dark bg-sand px-4 py-2 text-sm font-medium text-forest"
              >
                Carregar 20 més
              </button>
            </div>
          ) : null}
        </section>

        {!loading && !message && displayedTotal === 0 ? (
          <section className="rounded-2xl border border-sand-dark bg-sand p-4 text-center">
            <p className="text-sm text-forest-soft">No hi ha espècies en aquesta categoria.</p>
          </section>
        ) : null}

      </div>

      <Link
        href="/capture"
        className="fixed bottom-5 left-1/2 z-20 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 rounded-full bg-[#2F5D50] px-6 py-4 text-center text-sm font-semibold text-[#F4F1E8] shadow-[0_18px_34px_-18px_rgba(26,42,34,0.95)]"
      >
        Descobrir un animal
      </Link>

    </main>
  );
}
