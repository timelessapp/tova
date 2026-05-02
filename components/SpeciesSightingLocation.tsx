"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

interface SpeciesSightingLocationProps {
  speciesId: string;
  fallbackLocationName?: string;
}

type SightingLocation = {
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
};

function formatLocation(location: SightingLocation | null, fallbackLocationName?: string) {
  if (location?.location_name) {
    return location.location_name;
  }

  if (location?.latitude != null && location?.longitude != null) {
    return "Ubicacion guardada";
  }

  if (fallbackLocationName) {
    return fallbackLocationName;
  }

  return "Aun sin avistamientos guardados.";
}

export default function SpeciesSightingLocation({
  speciesId,
  fallbackLocationName,
}: SpeciesSightingLocationProps) {
  const { user, loading } = useCurrentUser();
  const [location, setLocation] = useState<SightingLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

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
        .select("location_name, latitude, longitude, seen_at")
        .eq("user_id", user.id)
        .eq("species_id", speciesId)
        .order("seen_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLocation(
        data
          ? {
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

  return (
    <div className="mt-4 rounded-2xl border border-sand-dark bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
        Donde se vio
      </p>
      <p className="mt-1 text-sm text-forest-dark">
        {loading || loadingLocation
          ? "Cargando ubicacion..."
          : formatLocation(location, fallbackLocationName)}
      </p>
    </div>
  );
}