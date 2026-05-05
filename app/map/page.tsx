"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

type MapSightingRow = {
  id: string;
  species_id: string | null;
  seen_at: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  species: {
    common_name: string;
    scientific_name: string | null;
    category: string | null;
    image_url: string | null;
  } | null;
};

const SightingsMap = dynamic(() => import("@/components/SightingsMap"), {
  ssr: false,
});

function getLocationLabel(locationName: string | null) {
  return locationName ? locationName : "Ubicació desada";
}

export default function MapPage() {
  const { user, loading: authLoading } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [sightings, setSightings] = useState<MapSightingRow[]>([]);

  useEffect(() => {
    const loadSightings = async () => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setMessage("No hem trobat la configuració de Supabase.");
        setSightings([]);
        setLoading(false);

        return;
      }

      if (!user) {
        setSightings([]);
        setLoading(false);

        return;
      }

      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("sightings")
        .select(
          "id, species_id, seen_at, location_name, latitude, longitude, species:species_id(common_name, scientific_name, category, image_url)",
        )
        .eq("user_id", user.id)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("seen_at", { ascending: false });

      if (error) {
        setMessage("No hem pogut carregar els teus albiraments al mapa.");
        setSightings([]);
        setLoading(false);

        return;
      }

      setSightings((data ?? []) as MapSightingRow[]);
      setLoading(false);
    };

    if (!authLoading) {
      loadSightings();
    }
  }, [authLoading, user]);

  const mapPoints = useMemo(
    () =>
      sightings
        .filter(
          (item) =>
            typeof item.latitude === "number" &&
            typeof item.longitude === "number",
        )
        .map((item) => ({
          id: item.id,
          speciesId: item.species_id,
          latitude: item.latitude as number,
          longitude: item.longitude as number,
          seenAt: item.seen_at,
          locationName: item.location_name,
          commonName: item.species?.common_name ?? "Especie desconocida",
          scientificName: item.species?.scientific_name ?? null,
          category: item.species?.category ?? null,
          imageUrl: item.species?.image_url ?? null,
        })),
    [sightings],
  );

  const initialCenter = useMemo<[number, number]>(() => {
    if (mapPoints.length > 0) {
      return [mapPoints[0].latitude, mapPoints[0].longitude];
    }

    return [40.4168, -3.7038];
  }, [mapPoints]);

  return (
    <main className="min-h-screen bg-sand px-5 py-6 text-forest-dark sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-2xl border border-sand-dark bg-sand p-5 sm:p-6">
          <div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest-dark">
              Mapa de descobriments
            </h1>
            <p className="mt-2 text-sm text-forest-soft">
              Els animals que has trobat, situats al teu territori.
            </p>
          </div>
          <Link
            href="/collection"
            className="rounded-full border border-sand-dark bg-sand px-3 py-1.5 text-xs font-medium text-forest"
          >
            La meva col·lecció
          </Link>
        </header>

        {loading ? (
          <section className="rounded-3xl border border-sand-dark bg-sand p-6 text-center">
            <p className="text-sm text-forest-soft">Carregant mapa...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="rounded-3xl border border-sand-dark bg-sand p-6 text-center">
            <p className="text-sm text-forest-soft">{message}</p>
          </section>
        ) : null}

        {!loading && !user ? (
          <section className="rounded-3xl border border-sand-dark bg-sand p-6 text-center">
            <p className="text-sm text-forest-soft">Entra per veure els teus albiraments al mapa.</p>
          </section>
        ) : null}

        {!loading && user && mapPoints.length === 0 ? (
          <section className="rounded-2xl border border-sand-dark bg-sand p-6 text-center">
            <p className="text-sm text-forest-soft">Encara no tens descobriments amb ubicació.</p>
          </section>
        ) : null}

        {!loading && user && mapPoints.length > 0 ? (
          <section className="rounded-2xl border border-sand-dark bg-sand p-3 sm:p-4">
            <div className="h-[54vh] min-h-[330px] overflow-hidden rounded-xl border border-forest-soft/40 sm:h-[60vh]">
              <SightingsMap points={mapPoints} initialCenter={initialCenter} />
            </div>

            <div className="mt-4 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-forest-soft">
                Descobriments en aquest mapa
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {mapPoints.map((point) => (
                  <Link
                    key={`card-${point.id}`}
                    href={point.speciesId ? `/species/${point.speciesId}` : "/collection"}
                    className="flex items-center gap-3 rounded-xl border border-sand-dark bg-white px-3 py-2.5 transition hover:bg-sand"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-sand-dark bg-sand-dark">
                      {point.imageUrl ? (
                        <img
                          src={point.imageUrl}
                          alt={point.commonName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">🐾</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-forest-dark">{point.commonName}</p>
                      <p className="truncate text-xs text-forest-soft">📍 {getLocationLabel(point.locationName)}</p>
                    </div>

                    <p className="shrink-0 text-[11px] text-forest-soft">
                      {new Date(point.seenAt).toLocaleDateString("ca-ES", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
