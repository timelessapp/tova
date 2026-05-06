"use client";

import exifr from "exifr";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getLocalizedCommonName } from "@/lib/getLocalizedCommonName";
import { getLocalizedSpeciesText } from "@/lib/getLocalizedSpeciesText";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  achievementKeyToLabel,
  buildReachedAchievementKeys,
  type AchievementKey,
} from "@/lib/achievements";
import type { Species, SpeciesCategory } from "@/lib/types";
import { convertImageFileForApp } from "@/lib/imageConversion";
import DiscoveryModal from "@/components/DiscoveryModal";

const LocationPickerModal = dynamic(() => import("@/components/LocationPickerModal"), {
  ssr: false,
});

type SpeciesOption = Pick<
  Species,
  | "id"
  | "common_name"
  | "common_name_ca"
  | "scientific_name"
  | "description"
  | "description_ca"
  | "description_es"
  | "habitat"
  | "habitat_ca"
  | "habitat_es"
  | "curiosities"
  | "curiosities_ca"
  | "curiosities_es"
  | "category"
  | "image_url"
>;

interface IdentifySuggestion {
  common_name: string;
  scientific_name: string;
  confidence: number;
}

interface MissingCandidate {
  common_name: string;
  scientific_name: string | null;
  reason: string;
}

interface IdentifyApiResponse {
  status?: "identified" | "uncertain" | "missing_species";
  suggestion?: IdentifySuggestion | null;
  missingCandidate?: MissingCandidate | null;
  error?: string;
}

function canonicalScientificName(value: string): string {
  const cleaned = value.trim().toLowerCase().replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
  const [genus = "", species = ""] = cleaned.split(" ");

  if (!genus || !species) {
    return cleaned;
  }

  const pair = `${genus} ${species}`;

  if (pair === "helix aspersa") {
    return "cornu aspersum";
  }

  if (pair === "cornu aspersum") {
    return "cornu aspersum";
  }

  return pair;
}

type IdentificationResult =
  | { status: "identified"; suggestion: IdentifySuggestion }
  | { status: "uncertain" }
  | { status: "missing_species"; missingCandidate: MissingCandidate }
  | null;

type LocationSource = "photo-metadata" | "manual" | "current" | null;

async function uploadSightingPhoto(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
  dataUrl: string,
): Promise<{ publicUrl: string | null; errorMessage: string | null }> {
  if (!supabase) {
    return { publicUrl: null, errorMessage: "Client de Supabase no disponible." };
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
        errorMessage: `No s'ha pogut pujar la foto (${uploadError.message}).`,
      };
    }

    const { data: urlData } = supabase.storage.from("sighting-photos").getPublicUrl(path);

    if (!urlData?.publicUrl) {
      return {
        publicUrl: null,
        errorMessage: "La foto s'ha pujat, però no s'ha pogut obtenir la URL pública.",
      };
    }

    return { publicUrl: urlData.publicUrl, errorMessage: null };
  } catch {
    return { publicUrl: null, errorMessage: "Error inesperat en processar la imatge." };
  }
}

export default function CapturePage() {
  const DEFAULT_LOCATION_CENTER = { latitude: 40.4168, longitude: -3.7038 };
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [speciesMessage, setSpeciesMessage] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>("");
  const [preparingImage, setPreparingImage] = useState(false);
  const [identifyLoading, setIdentifyLoading] = useState(false);
  const [identifyMessage, setIdentifyMessage] = useState<string | null>(null);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult>(null);
  const [speciesPreviewFailed, setSpeciesPreviewFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>("");
  const [capturedLocation, setCapturedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const { language: profileLanguage } = useProfileLanguage();
  const [lastDiscoveryMode, setLastDiscoveryMode] = useState<"new" | "repeat" | null>(null);
  const suggestionsRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [discoveryModal, setDiscoveryModal] = useState<{
    mode: "new" | "repeat";
    commonName: string;
    scientificName?: string | null;
    description?: string | null;
    category?: SpeciesCategory | null;
    imageUrl?: string | null;
    achievement?: string;
  } | null>(null);

  useEffect(() => {
    const loadSpecies = async () => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setLoadingSpecies(false);
        setSpeciesMessage("No s'ha pogut carregar el catàleg d'espècies.");

        return;
      }

      const { data, error } = await supabase
        .from("species")
        .select(
          "id, common_name, common_name_ca, scientific_name, description, description_ca, description_es, habitat, habitat_ca, habitat_es, curiosities, curiosities_ca, curiosities_es, category, image_url",
        )
        .eq("is_active", true)
        .order("common_name", { ascending: true });

      if (error || !data) {
        setLoadingSpecies(false);
        setSpeciesMessage("No s'ha pogut carregar el catàleg d'espècies.");

        return;
      }

      setSpeciesOptions(data);
      setLoadingSpecies(false);

      if (data.length === 0) {
        setSpeciesMessage("Encara no hi ha espècies disponibles per descobrir.");
      }
    };

    loadSpecies();
  }, []);

  const selectedSpecies = useMemo(
    () => speciesOptions.find((species) => species.id === selectedSpeciesId) ?? null,
    [selectedSpeciesId, speciesOptions],
  );

  const selectedSpeciesCommonName = useMemo(
    () =>
      selectedSpecies
        ? getLocalizedCommonName(selectedSpecies, profileLanguage)
        : null,
    [profileLanguage, selectedSpecies],
  );

  const locationEditorInitialCenter = useMemo(
    () => capturedLocation ?? DEFAULT_LOCATION_CENTER,
    [capturedLocation],
  );

  const resetIdentification = () => {
    setIdentificationResult(null);
    setSpeciesPreviewFailed(false);
    setSelectedSpeciesId("");
    setSaveMessage(null);
    setSaved(false);
  };

  const resetPhotoFlow = () => {
    setPhotoDataUrl(null);
    setPhotoName("");
    setIdentifyMessage(null);
    setCapturedLocation(null);
    setLocationName(null);
    setLocationSource(null);
    setLocationPickerOpen(false);
    setLocationMessage(null);
    resetIdentification();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setPhotoDataUrl(null);
      setPhotoName("");
      setIdentifyMessage("Selecciona una foto abans d'identificar.");
      resetIdentification();

      return;
    }

    const reader = new FileReader();
    setPreparingImage(true);

    setCapturedLocation(null);
    setLocationName(null);
    setLocationSource(null);
    setLocationMessage(null);

    try {
      const gps = await exifr.gps(file);
      if (
        gps &&
        typeof gps.latitude === "number" &&
        typeof gps.longitude === "number"
      ) {
        setCapturedLocation({
          latitude: gps.latitude,
          longitude: gps.longitude,
        });
        setLocationName("Ubicació detectada");
        setLocationSource("photo-metadata");
        setLocationMessage("Ubicació detectada a les metadades de la foto.");
      }
    } catch {
      setCapturedLocation(null);
      setLocationName(null);
      setLocationSource(null);
      setLocationMessage(null);
    }

    try {
      const appReadyFile = await convertImageFileForApp(file);

      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : null;

        setPhotoDataUrl(result);
        setPhotoName(appReadyFile.name);
        setIdentifyMessage(null);
        resetIdentification();
        setPreparingImage(false);
      };

      reader.onerror = () => {
        setPhotoDataUrl(null);
        setPhotoName("");
        setIdentifyMessage("No hemos podido preparar esta imagen. Prueba con otra foto.");
        setPreparingImage(false);
      };

      reader.readAsDataURL(appReadyFile);
    } catch {
      setPhotoDataUrl(null);
      setPhotoName("");
      setIdentifyMessage("No hemos podido preparar esta imagen. Prueba con otra foto.");
      setPreparingImage(false);
    }
  };

  const handleIdentify = async () => {
    if (!photoDataUrl) {
      setIdentifyMessage("Has de pujar o capturar una foto abans d'identificar.");

      return;
    }

    if (speciesOptions.length === 0) {
      setIdentifyMessage("No hi ha espècies disponibles per identificar.");

      return;
    }

    setIdentifyLoading(true);
    setIdentifyMessage(null);
    resetIdentification();

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const accessToken = sessionData.session?.access_token ?? null;

      const response = await fetch("/api/identify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
        setIdentifyMessage(payload.error ?? "Error en identificar la imatge.");
        setIdentifyLoading(false);

        return;
      }

      if (payload.status === "missing_species" && payload.missingCandidate) {
        setIdentificationResult({
          status: "missing_species",
          missingCandidate: payload.missingCandidate,
        });
        setIdentifyMessage(null);
        setTimeout(() => {
          suggestionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);

        return;
      }

      if (payload.status !== "identified" || !payload.suggestion) {
        setIdentificationResult({ status: "uncertain" });
        setIdentifyMessage(null);
        setTimeout(() => {
          suggestionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);

        return;
      }

      const normalizedScientific = canonicalScientificName(payload.suggestion.scientific_name);
      const normalizedCommon = payload.suggestion.common_name.trim().toLowerCase();
      const matchedSpecies = speciesOptions.find((species) => {
        const scientificMatches =
          canonicalScientificName(species.scientific_name ?? "") === normalizedScientific;
        const commonMatches =
          species.common_name.trim().toLowerCase() === normalizedCommon ||
          species.common_name_ca?.trim().toLowerCase() === normalizedCommon;

        return scientificMatches || commonMatches;
      });

      if (!matchedSpecies) {
        setIdentifyMessage("No hem pogut vincular el suggeriment amb una espècie activa de l'app.");
        return;
      }

      setIdentificationResult({ status: "identified", suggestion: payload.suggestion });
      setSpeciesPreviewFailed(false);
      setSelectedSpeciesId(matchedSpecies.id);
      setTimeout(() => {
        suggestionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch {
      setIdentifyMessage("No s'ha pogut connectar amb el servei d'identificació.");
    } finally {
      setIdentifyLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setSaveMessage("Has d'entrar per desar albiraments.");

      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setSaveMessage("No s'ha pogut connectar amb Supabase per desar.");

      return;
    }

    if (!selectedSpecies) {
      setSaveMessage("Selecciona una espècie abans de desar.");

      return;
    }

    if (!photoDataUrl) {
      setSaveMessage("Has de tenir una foto vàlida per desar l'albirament.");

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
      setSaveMessage(uploadErrorMessage ?? "No s'ha pogut pujar la foto de l'albirament.");

      return;
    }

    const { error: insertError } = await supabase.from("sightings").insert({
      user_id: user.id,
      species_id: selectedSpecies.id,
      custom_name: selectedSpeciesCommonName ?? selectedSpecies.common_name,
      photo_url: uploadedPhotoUrl,
      location_name: capturedLocation ? locationName ?? "Ubicació guardada" : null,
      latitude: capturedLocation?.latitude ?? null,
      longitude: capturedLocation?.longitude ?? null,
      seen_at: new Date().toISOString(),
      notes: "Desat des de captura.",
    });

    if (insertError) {
      setSaved(false);
      setSaveMessage("No s'ha pogut desar l'albirament. Torna-ho a provar.");

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
            commonName: selectedSpeciesCommonName ?? selectedSpecies.common_name,
            scientificName: selectedSpecies.scientific_name,
            description: getLocalizedSpeciesText(selectedSpecies, profileLanguage).description,
            category: selectedSpecies.category as SpeciesCategory,
            imageUrl: selectedSpecies.image_url,
            achievement:
              discoveryMode === "new" && firstAchievement
                ? `Trofeu desbloquejat: ${firstAchievement}`
                : undefined,
          });

          return;
        }
      }
    }

    setDiscoveryModal({
      mode: lastDiscoveryMode === discoveryMode ? lastDiscoveryMode : discoveryMode,
      commonName: selectedSpeciesCommonName ?? selectedSpecies.common_name,
      scientificName: selectedSpecies.scientific_name,
      description: getLocalizedSpeciesText(selectedSpecies, profileLanguage).description,
      category: selectedSpecies.category as SpeciesCategory,
      imageUrl: selectedSpecies.image_url,
    });
  };

  const handleOpenLocationEditor = () => {
    setLocationPickerOpen(true);
  };

  const handleSaveEditedLocation = (payload: {
    coords: { latitude: number; longitude: number };
    locationName: string;
    source: "manual" | "current";
  }) => {
    setCapturedLocation(payload.coords);
    setLocationSource(payload.source);
    setLocationName(payload.locationName);
    setLocationMessage("Ubicació desada.");
    setLocationPickerOpen(false);
  };

  const handleRejectSuggestion = () => {
    resetIdentification();
    setIdentifyMessage("Gràcies. Ho pots tornar a provar amb una altra foto.");
  };

  const handlePickAnotherPhoto = () => {
    resetPhotoFlow();
    requestAnimationFrame(() => {
      fileInputRef.current?.click();
    });
  };

  return (
    <main className="min-h-screen bg-sand px-5 py-6 text-forest-dark sm:px-8">
      {discoveryModal ? (
        <DiscoveryModal
          mode={discoveryModal.mode}
          commonName={discoveryModal.commonName}
          scientificName={discoveryModal.scientificName}
          description={discoveryModal.description}
          category={discoveryModal.category}
          imageUrl={discoveryModal.imageUrl}
          achievement={discoveryModal.achievement}
          onClose={() => {
            setDiscoveryModal(null);
            router.push("/collection");
          }}
        />
      ) : null}

      <LocationPickerModal
        isOpen={locationPickerOpen}
        initialCenter={locationEditorInitialCenter}
        initialLocationName={locationName}
        onClose={() => setLocationPickerOpen(false)}
        onSave={handleSaveEditedLocation}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Captura</h1>
          <Link
            href="/collection"
            className="rounded-full border border-sand-dark bg-sand px-3 py-1.5 text-xs font-medium text-forest"
          >
            La meva col·lecció
          </Link>
        </header>

        <section className="rounded-3xl border border-sand-dark bg-white p-4 sm:p-6">
          <div className="flex h-[320px] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#c7d2bf] bg-gradient-to-b from-[#eff4e9] to-[#f7f8f2]">
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="Previsualització de l'albirament" className="h-full w-full object-cover" />
            ) : (
              <div className="px-4 text-center">
                <p className="text-6xl">📸</p>
                <p className="mt-4 text-sm text-[#53675b]">
                  Puja o captura una foto per descobrir quin animal és.
                </p>
              </div>
            )}
          </div>

          <label
            htmlFor="sighting-photo"
            className="mt-5 block text-xs font-semibold uppercase tracking-wide text-forest-soft"
          >
            Foto de l'albirament
          </label>
          <input
            id="sighting-photo"
            name="sighting-photo"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelection}
            className="mt-2 block w-full rounded-xl border border-sand-dark bg-white px-3 py-2 text-sm text-forest-dark file:mr-3 file:rounded-full file:border-0 file:bg-sand-dark file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-forest"
          />

          {identificationResult?.status !== "identified" ? (
            <div className="mt-5 rounded-2xl border border-[#d8cdb5] bg-[#f1eadb] p-4 shadow-[0_10px_22px_-16px_rgba(47,93,80,0.35)]">
              <div className="mb-3 h-1 w-16 rounded-full bg-[#2F5D50]" />
              <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
                Descobreix quin animal és
              </p>
              <p className="mt-1 text-sm text-forest">
                Analitza la foto i et mostrarem una espècie només quan el resultat sigui fiable.
              </p>

              <button
                type="button"
                onClick={handleIdentify}
                disabled={preparingImage || identifyLoading || loadingSpecies || !photoDataUrl || speciesOptions.length === 0}
                className="mt-4 w-full rounded-full bg-[#2F5D50] px-5 py-3.5 text-sm font-semibold text-[#F4F1E8] shadow-[0_14px_24px_-16px_rgba(26,42,34,0.95)] transition hover:bg-[#264d42] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {preparingImage
                  ? "Preparant imatge..."
                  : identifyLoading
                    ? "Analitzant imatge..."
                    : "Descobrir animal"}
              </button>

              <p className="mt-3 text-xs text-forest-soft">
                Només mostrem resultats quan estem bastant segurs.
              </p>
            </div>
          ) : null}

          {speciesMessage ? (
            <p className="mt-3 rounded-xl border border-sand-dark bg-sand px-3 py-2 text-sm text-forest-soft">
              {speciesMessage}
            </p>
          ) : null}

          {identifyMessage && identificationResult?.status !== "uncertain" ? (
            <p className="mt-3 rounded-xl border border-sand-dark bg-sand px-3 py-2 text-sm text-forest-soft">
              {identifyMessage}
            </p>
          ) : null}
        </section>

        {!loading && !user ? (
          <p className="rounded-xl border border-sand-dark bg-sand px-4 py-3 text-sm text-forest-soft">
            Inicia sessió amb magic link per poder desar sightings.
          </p>
        ) : null}

        {identificationResult?.status === "identified" && selectedSpecies ? (
          <section ref={suggestionsRef} className="rounded-3xl border border-sand-dark bg-sand p-5">
            <article className="mt-4 rounded-2xl border border-[#6f9279] bg-[#edf5ea] px-4 py-4">
              <p className="text-lg font-semibold text-forest-dark">✨ Nou descobriment</p>
              <p className="mt-1 text-sm font-medium text-forest-soft">Creiem que és:</p>
              <p className="mt-1 text-xs text-forest-soft">
                Només mostrem resultats quan estem bastant segurs.
              </p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sand-dark">
                    {!speciesPreviewFailed && (selectedSpecies.image_url ?? photoDataUrl) ? (
                      <img
                        src={selectedSpecies.image_url ?? photoDataUrl ?? undefined}
                        alt={selectedSpeciesCommonName ?? identificationResult.suggestion.common_name}
                        className="h-full w-full object-cover"
                        onError={() => setSpeciesPreviewFailed(true)}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-2xl">🐾</span>
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-forest-dark">
                      {selectedSpeciesCommonName ?? identificationResult.suggestion.common_name}
                    </p>
                    <p className="text-sm italic text-forest-soft">
                      {identificationResult.suggestion.scientific_name}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-[#b7c9b7] bg-white px-2 py-0.5 text-[11px] font-semibold text-forest">
                  {Math.round(identificationResult.suggestion.confidence * 100)}%
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saved || loading || !selectedSpeciesId}
                  className="rounded-full bg-[#2F5D50] px-5 py-3 text-sm font-semibold text-[#F4F1E8] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saved ? "Desat" : "Guardar al meu àlbum"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenLocationEditor}
                  className="rounded-full border border-sand-dark bg-white px-5 py-3 text-sm font-semibold text-forest disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Canviar ubicacio / Cambiar ubicacion
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-[#cfe0d2] bg-white/70 px-3 py-2 text-sm text-forest-soft">
                {capturedLocation ? (
                  <>
                    <p className="font-medium text-forest-dark">
                      📍 {locationName ?? "Ubicació guardada"}
                    </p>
                  </>
                ) : (
                  <p>
                    La foto no inclou ubicació. La pots afegir abans de desar.
                  </p>
                )}
                {locationMessage ? (
                  <p className="mt-1 text-xs text-forest-soft">{locationMessage}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleRejectSuggestion}
                className="mt-3 w-full rounded-full border border-sand-dark bg-white px-5 py-3 text-sm font-semibold text-forest"
              >
                No és aquesta espècie
              </button>

              {saveMessage ? (
                <p className="mt-3 rounded-xl border border-[#cfe0d2] bg-white/70 px-3 py-2 text-sm text-forest-soft">
                  {saveMessage}
                </p>
              ) : null}
            </article>
          </section>
        ) : null}

        {identificationResult?.status === "missing_species" ? (
          <section ref={suggestionsRef} className="rounded-3xl border border-sand-dark bg-sand p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
              Resultat
            </p>
            <div className="mt-4 rounded-2xl border border-sand-dark bg-white px-4 py-4">
              <p className="text-base font-medium text-forest-dark">
                Parece una especie que todavía no tenemos en TOVA.
              </p>
              <p className="mt-2 text-sm text-forest-soft">
                Gracias por ayudarnos a mejorar la colección. La revisaremos para añadirla pronto.
              </p>
              <button
                type="button"
                onClick={handlePickAnotherPhoto}
                className="mt-4 w-full rounded-full bg-[#2F5D50] px-5 py-3 text-sm font-semibold text-[#F4F1E8]"
              >
                Intentar con otra foto
              </button>
            </div>
          </section>
        ) : null}

        {identificationResult?.status === "uncertain" ? (
          <section ref={suggestionsRef} className="rounded-3xl border border-sand-dark bg-sand p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
              Resultat
            </p>
            <div className="mt-4 rounded-2xl border border-sand-dark bg-white px-4 py-4">
              <p className="text-base font-medium text-forest-dark">
                La imatge no permet reconèixer exactament l’animal.
              </p>
              <p className="mt-2 text-sm text-forest-soft">Torna-ho a intentar amb una foto nova.</p>
              <button
                type="button"
                onClick={handlePickAnotherPhoto}
                className="mt-4 w-full rounded-full bg-[#2F5D50] px-5 py-3 text-sm font-semibold text-[#F4F1E8]"
              >
                Triar una altra foto
              </button>
              <p className="mt-2 text-xs text-forest-soft">
                S'obrirà el selector del dispositiu per fer una foto nova o carregar una imatge.
              </p>
            </div>
          </section>
        ) : null}

      </div>
    </main>
  );
}
