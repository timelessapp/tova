"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  achievementKeyToLabel,
  buildReachedAchievementKeys,
  type AchievementKey,
} from "@/lib/achievements";
import type { Species, SpeciesCategory } from "@/lib/types";
import DiscoveryModal from "@/components/DiscoveryModal";

type SpeciesOption = Pick<
  Species,
  "id" | "common_name" | "scientific_name" | "category" | "image_url"
>;

interface IdentifySuggestion {
  common_name: string;
  scientific_name: string;
  confidence: number;
}

interface IdentifyApiResponse {
  suggestions?: IdentifySuggestion[];
  error?: string;
}

const BARCELONA_COORDS = {
  latitude: 41.3874,
  longitude: 2.1686,
};

async function uploadSightingPhoto(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
  dataUrl: string,
): Promise<{ publicUrl: string | null; errorMessage: string | null }> {
  if (!supabase) {
    return { publicUrl: null, errorMessage: "Cliente de Supabase no disponible." };
  }

  try {
    const fetchResponse = await fetch(dataUrl);
    const blob = await fetchResponse.blob();
    const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("sighting-photos")
      .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });

    if (uploadError) {
      return {
        publicUrl: null,
        errorMessage: `No se pudo subir la foto (${uploadError.message}).`,
      };
    }

    const { data: urlData } = supabase.storage.from("sighting-photos").getPublicUrl(path);

    if (!urlData?.publicUrl) {
      return {
        publicUrl: null,
        errorMessage: "La foto se subio, pero no se pudo obtener la URL publica.",
      };
    }

    return { publicUrl: urlData.publicUrl, errorMessage: null };
  } catch {
    return { publicUrl: null, errorMessage: "Error inesperado al procesar la imagen." };
  }
}

export default function CapturePage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [speciesMessage, setSpeciesMessage] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>("");
  const [identifyLoading, setIdentifyLoading] = useState(false);
  const [identifyMessage, setIdentifyMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<IdentifySuggestion[]>([]);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>("");
  const [lastDiscoveryMode, setLastDiscoveryMode] = useState<"new" | "repeat" | null>(null);
  const suggestionsRef = useRef<HTMLElement | null>(null);
  const [discoveryModal, setDiscoveryModal] = useState<{
    mode: "new" | "repeat";
    commonName: string;
    emoji: string;
    achievement?: string;
  } | null>(null);

  useEffect(() => {
    const loadSpecies = async () => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setLoadingSpecies(false);
        setSpeciesMessage("No se pudo cargar el catalogo de especies.");

        return;
      }

      const { data, error } = await supabase
        .from("species")
        .select("id, common_name, scientific_name, category, image_url")
        .eq("is_active", true)
        .order("common_name", { ascending: true });

      if (error || !data) {
        setLoadingSpecies(false);
        setSpeciesMessage("No se pudo cargar el catalogo de especies.");

        return;
      }

      setSpeciesOptions(data);
      setLoadingSpecies(false);

      if (data.length === 0) {
        setSpeciesMessage("Aun no hay especies disponibles para capturar.");
      }
    };

    loadSpecies();
  }, []);

  const selectedSpecies = useMemo(
    () => speciesOptions.find((species) => species.id === selectedSpeciesId) ?? null,
    [selectedSpeciesId, speciesOptions],
  );

  const handleImageSelection: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setPhotoDataUrl(null);
      setPhotoName("");
      setIdentifyMessage("Selecciona una foto antes de identificar.");

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;

      setPhotoDataUrl(result);
      setPhotoName(file.name);
      setIdentifyMessage(null);
      setSuggestions([]);
      setSelectedSpeciesId("");
      setSaveMessage(null);
      setSaved(false);
    };

    reader.onerror = () => {
      setPhotoDataUrl(null);
      setPhotoName("");
      setIdentifyMessage("No se pudo leer la imagen seleccionada.");
    };

    reader.readAsDataURL(file);
  };

  const handleIdentify = async () => {
    if (!photoDataUrl) {
      setIdentifyMessage("Debes subir o capturar una foto antes de identificar.");

      return;
    }

    if (speciesOptions.length === 0) {
      setIdentifyMessage("No hay especies disponibles para identificar.");

      return;
    }

    setIdentifyLoading(true);
    setIdentifyMessage(null);
    setSuggestions([]);
    setSelectedSpeciesId("");

    try {
      const response = await fetch("/api/identify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: photoDataUrl,
          speciesList: speciesOptions.map((species) => ({
            common_name: species.common_name,
            scientific_name: species.scientific_name ?? "",
            category: species.category,
          })),
        }),
      });

      const payload = (await response.json()) as IdentifyApiResponse;

      if (!response.ok) {
        setIdentifyMessage(payload.error ?? "Error al identificar la imagen.");
        setIdentifyLoading(false);

        return;
      }

      const apiSuggestions = payload.suggestions ?? [];

      if (apiSuggestions.length === 0) {
        setIdentifyMessage("La imagen no es clara o no contiene un animal identificable.");
        setIdentifyLoading(false);

        return;
      }

      setSuggestions(apiSuggestions.slice(0, 3));
      setIdentifyMessage("Elige la opción que mejor encaje con tu avistamiento.");
      setTimeout(() => {
        suggestionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch {
      setIdentifyMessage("No se pudo conectar con el servicio de identificacion.");
    } finally {
      setIdentifyLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setSaveMessage("Necesitas entrar para guardar avistamientos.");

      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setSaveMessage("No se pudo conectar con Supabase para guardar.");

      return;
    }

    if (!selectedSpecies) {
      setSaveMessage("Selecciona una especie antes de guardar.");

      return;
    }

    if (!photoDataUrl) {
      setSaveMessage("Debes tener una foto valida para guardar el avistamiento.");

      return;
    }

    const { data: priorSighting } = await supabase
      .from("sightings")
      .select("id")
      .eq("user_id", user.id)
      .eq("species_id", selectedSpecies.id)
      .limit(1)
      .maybeSingle();

    const discoveryMode: "new" | "repeat" = priorSighting ? "repeat" : "new";
    setLastDiscoveryMode(discoveryMode);

    setSaved(true);
    setSaveMessage(null);

    const { publicUrl: uploadedPhotoUrl, errorMessage: uploadErrorMessage } =
      await uploadSightingPhoto(supabase, user.id, photoDataUrl);

    if (!uploadedPhotoUrl) {
      setSaved(false);
      setSaveMessage(uploadErrorMessage ?? "No se pudo subir la foto del avistamiento.");

      return;
    }

    const { error: insertError } = await supabase.from("sightings").insert({
      user_id: user.id,
      species_id: selectedSpecies.id,
      custom_name: selectedSpecies.common_name,
      photo_url: uploadedPhotoUrl,
      location_name: "Barcelona",
      latitude: BARCELONA_COORDS.latitude,
      longitude: BARCELONA_COORDS.longitude,
      seen_at: new Date().toISOString(),
      notes: "Guardado desde captura.",
    });

    if (insertError) {
      setSaved(false);
      setSaveMessage("No se pudo guardar el avistamiento. Intentalo de nuevo.");

      return;
    }

    const { data: userSightings, error: userSightingsError } = await supabase
      .from("sightings")
      .select("species_id")
      .eq("user_id", user.id);

    if (!userSightingsError) {
      const distinctSpeciesIds = Array.from(
        new Set(
          (userSightings ?? [])
            .map((sighting) => sighting.species_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (distinctSpeciesIds.length > 0) {
        const { data: speciesRows, error: speciesRowsError } = await supabase
          .from("species")
          .select("id, category")
          .in("id", distinctSpeciesIds);

        if (!speciesRowsError && speciesRows) {
          const discoveredCategories = Array.from(
            new Set(
              speciesRows
                .map((row) => row.category)
                .filter((category): category is SpeciesCategory =>
                  ["mammal", "bird", "reptile", "amphibian", "insect", "fish", "other"].includes(
                    category,
                  ),
                ),
            ),
          );

          const reachedAchievementKeys = buildReachedAchievementKeys({
            distinctSpeciesCount: distinctSpeciesIds.length,
            discoveredCategories,
          });

          let firstAchievement: string | undefined;

          if (reachedAchievementKeys.length > 0) {
            const { data: existingAchievements, error: existingAchievementsError } = await supabase
              .from("user_achievements")
              .select("achievement_key")
              .eq("user_id", user.id);

            if (!existingAchievementsError) {
              const existingKeys = new Set(
                (existingAchievements ?? []).map((item) => item.achievement_key as AchievementKey),
              );

              const newlyUnlockedKeys = reachedAchievementKeys.filter((key) => !existingKeys.has(key));

              if (newlyUnlockedKeys.length > 0) {
                await supabase.from("user_achievements").upsert(
                  newlyUnlockedKeys.map((key) => ({
                    user_id: user.id,
                    achievement_key: key,
                    achievement_label: achievementKeyToLabel(key),
                    source: "capture",
                  })),
                  { onConflict: "user_id,achievement_key", ignoreDuplicates: true },
                );

                firstAchievement = achievementKeyToLabel(newlyUnlockedKeys[0]);
              }
            }
          }

          setDiscoveryModal({
            mode: discoveryMode,
            commonName: selectedSpecies.common_name,
            emoji: "🐾",
            achievement:
              discoveryMode === "new" && firstAchievement
                ? `Logro desbloqueado: ${firstAchievement}`
                : undefined,
          });

          return;
        }
      }
    }

    setDiscoveryModal({
      mode: lastDiscoveryMode === discoveryMode ? lastDiscoveryMode : discoveryMode,
      commonName: selectedSpecies.common_name,
      emoji: "🐾",
    });
  };

  return (
    <main className="min-h-screen bg-[#f7f6ef] px-5 py-6 text-[#253028] sm:px-8">
      {discoveryModal ? (
        <DiscoveryModal
          mode={discoveryModal.mode}
          commonName={discoveryModal.commonName}
          emoji={discoveryModal.emoji}
          achievement={discoveryModal.achievement}
          onClose={() => {
            setDiscoveryModal(null);
            router.push("/collection");
          }}
        />
      ) : null}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Captura</h1>
          <Link
            href="/collection"
            className="rounded-full border border-[#ced8c5] bg-[#f5f7ef] px-3 py-1.5 text-xs font-medium text-[#3c5646]"
          >
            Mi colección
          </Link>
        </header>

        <section className="rounded-3xl border border-[#d8e0ce] bg-white p-4 sm:p-6">
          <div className="flex h-[320px] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#c7d2bf] bg-gradient-to-b from-[#eff4e9] to-[#f7f8f2]">
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="Preview del avistamiento" className="h-full w-full object-cover" />
            ) : (
              <div className="px-4 text-center">
                <p className="text-6xl">📸</p>
                <p className="mt-4 text-sm text-[#53675b]">
                  Sube o captura una foto para identificar el animal con IA.
                </p>
              </div>
            )}
          </div>

          <label
            htmlFor="sighting-photo"
            className="mt-5 block text-xs font-semibold uppercase tracking-wide text-[#566c60]"
          >
            Foto del avistamiento
          </label>
          <input
            id="sighting-photo"
            name="sighting-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelection}
            className="mt-2 block w-full rounded-xl border border-[#cfd9c5] bg-white px-3 py-2 text-sm text-[#243128] file:mr-3 file:rounded-full file:border-0 file:bg-[#e8efe1] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#355442]"
          />
          {photoName ? <p className="mt-2 text-xs text-[#5f7267]">Foto seleccionada: {photoName}</p> : null}

          <button
            type="button"
            onClick={handleIdentify}
            disabled={identifyLoading || loadingSpecies || !photoDataUrl || speciesOptions.length === 0}
            className="mt-5 w-full rounded-full bg-[#3f684f] px-5 py-3 text-sm font-semibold text-[#f7f6ef] transition-colors hover:bg-[#345641] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {identifyLoading ? "Analizando imagen..." : "Identificar animal"}
          </button>

          {speciesMessage ? (
            <p className="mt-3 rounded-xl border border-[#d8e0ce] bg-[#fbfbf8] px-3 py-2 text-sm text-[#4b5f53]">
              {speciesMessage}
            </p>
          ) : null}

          {identifyMessage ? (
            <p className="mt-3 rounded-xl border border-[#d8e0ce] bg-[#fbfbf8] px-3 py-2 text-sm text-[#4b5f53]">
              {identifyMessage}
            </p>
          ) : null}
        </section>

        {!loading && !user ? (
          <p className="rounded-xl border border-[#d8e0ce] bg-[#fbfbf8] px-4 py-3 text-sm text-[#55695d]">
            Inicia sesion con magic link para poder guardar sightings.
          </p>
        ) : null}

        {suggestions.length > 0 ? (
          <section ref={suggestionsRef} className="rounded-3xl border border-[#d8e0ce] bg-[#fbfbf8] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5c7565]">
              Sugerencias IA
            </p>

            <div className="mt-4 grid gap-3">
              {suggestions.map((suggestion, index) => {
                const normalizedScientific = suggestion.scientific_name.trim().toLowerCase();
                const matchedSpecies = speciesOptions.find(
                  (species) =>
                    (species.scientific_name ?? "").trim().toLowerCase() === normalizedScientific,
                );
                const selected = matchedSpecies?.id === selectedSpeciesId;

                return (
                  <article
                    key={`${suggestion.common_name}-${suggestion.scientific_name}-${index}`}
                    className={`rounded-2xl border px-4 py-3 ${
                      selected
                        ? "border-[#6f9279] bg-[#edf5ea]"
                        : "border-[#d2dccf] bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#e8f0e1]">
                          {matchedSpecies?.image_url ? (
                            <img
                              src={matchedSpecies.image_url}
                              alt={suggestion.common_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-2xl">🐾</span>
                          )}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-[#243128]">{suggestion.common_name}</p>
                          <p className="text-sm italic text-[#5f7267]">{suggestion.scientific_name}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-[#c6d6c6] bg-[#f5faef] px-2.5 py-1 text-xs font-semibold text-[#3b5a49]">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!matchedSpecies) {
                          setSaveMessage(
                            "Esta sugerencia no coincide con una especie activa en la app.",
                          );

                          return;
                        }

                        setSelectedSpeciesId(matchedSpecies.id);
                        setSaveMessage(null);
                      }}
                      className="mt-3 w-full rounded-full border border-[#b7c8b7] bg-[#e8efe1] px-4 py-2 text-xs font-semibold text-[#355442]"
                    >
                      {selected ? "Seleccionada" : "Seleccionar"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {selectedSpecies ? (
          <section className="rounded-3xl border border-[#d8e0ce] bg-[#fbfbf8] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5c7565]">Especie elegida</p>
            <p className="mt-2 text-lg font-medium text-[#243128]">
              {"🐾"} {selectedSpecies.common_name}
            </p>
            <p className="mt-1 text-sm italic text-[#5f7267]">
              {selectedSpecies.scientific_name ?? "Sin nombre cientifico"}
            </p>

            <button
              type="button"
              onClick={handleSave}
              disabled={saved || loading || !selectedSpeciesId}
              className="mt-4 w-full rounded-full border border-[#b7c8b7] bg-[#e8efe1] px-5 py-3 text-sm font-semibold text-[#355442] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saved ? "Guardado" : "Guardar en mi colección"}
            </button>

            {saveMessage ? (
              <p className="mt-3 rounded-xl border border-[#d8e0ce] bg-white px-3 py-2 text-sm text-[#4b5f53]">
                {saveMessage}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
