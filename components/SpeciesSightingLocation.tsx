"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const LocationPickerModal = dynamic(() => import("@/components/LocationPickerModal"), {
  ssr: false,
});

interface SpeciesSightingLocationProps {
  speciesId: string;
  fallbackLocationName?: string;
}

type SightingLocation = {
  id: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
};

const DEFAULT_LOCATION_CENTER = {
  latitude: 40.4168,
  longitude: -3.7038,
};

function formatLocation(location: SightingLocation | null, fallbackLocationName?: string) {
  if (location?.location_name) {
    return location.location_name;
  }

  if (location?.latitude != null && location?.longitude != null) {
    return "Ubicació desada";
  }

  if (fallbackLocationName) {
    return fallbackLocationName;
  }

  return "Encara no hi ha albiraments desats.";
}

export default function SpeciesSightingLocation({
  speciesId,
  fallbackLocationName,
}: SpeciesSightingLocationProps) {
  const { user, loading } = useCurrentUser();
  const [location, setLocation] = useState<SightingLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadLocation = async () => {
      if (loading) {
        return;
      }

      if (!user) {
        setLocation(null);
        setLoadingLocation(false);

        return;
      }

      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setLocation(null);
        setLoadingLocation(false);

        return;
      }

      setLoadingLocation(true);

      const { data } = await supabase
        .from("sightings")
        .select("id, location_name, latitude, longitude, seen_at")
        .eq("user_id", user.id)
        .eq("species_id", speciesId)
        .order("seen_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLocation(
        data
          ? {
              id: data.id,
              location_name: data.location_name ?? null,
              latitude: data.latitude ?? null,
              longitude: data.longitude ?? null,
            }
          : null,
      );
      setLoadingLocation(false);
    };

    loadLocation();
  }, [loading, speciesId, user]);

  const locationEditorInitialCenter =
    location?.latitude != null && location.longitude != null
      ? { latitude: location.latitude, longitude: location.longitude }
      : DEFAULT_LOCATION_CENTER;

  const handleSaveEditedLocation = async (payload: {
    coords: { latitude: number; longitude: number };
    locationName: string;
    source: "manual" | "current" | "map";
  }) => {
    if (!user || !location) {
      setEditMessage("No hem pogut trobar cap albirament per actualitzar.");
      setLocationPickerOpen(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setEditMessage("No s'ha pogut connectar per desar la ubicació.");
      setLocationPickerOpen(false);
      return;
    }

    const { error } = await supabase
      .from("sightings")
      .update({
        location_name: payload.locationName,
        latitude: payload.coords.latitude,
        longitude: payload.coords.longitude,
      })
      .eq("id", location.id)
      .eq("user_id", user.id);

    if (error) {
      setEditMessage("No s'ha pogut actualitzar la ubicació.");
      setLocationPickerOpen(false);
      return;
    }

    setLocation({
      ...location,
      location_name: payload.locationName,
      latitude: payload.coords.latitude,
      longitude: payload.coords.longitude,
    });
    setEditMessage("Ubicació actualitzada.");
    setLocationPickerOpen(false);
  };

  return (
    <>
      <LocationPickerModal
        isOpen={locationPickerOpen}
        initialCenter={locationEditorInitialCenter}
        initialLocationName={location?.location_name ?? fallbackLocationName ?? null}
        onClose={() => setLocationPickerOpen(false)}
        onSave={handleSaveEditedLocation}
      />

      <div className="mt-4 rounded-2xl border border-sand-dark bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
          On es va veure
        </p>
        <p className="mt-1 text-sm text-forest-dark">
          {loading || loadingLocation
            ? "Carregant ubicació..."
            : formatLocation(location, fallbackLocationName)}
        </p>

        {!loading && user && location ? (
          <button
            type="button"
            onClick={() => setLocationPickerOpen(true)}
            className="mt-3 rounded-full border border-sand-dark bg-sand px-4 py-2 text-xs font-semibold text-forest"
          >
            Editar ubicació
          </button>
        ) : null}

        {editMessage ? (
          <p className="mt-2 text-xs text-forest-soft">{editMessage}</p>
        ) : null}
      </div>
    </>
  );
}