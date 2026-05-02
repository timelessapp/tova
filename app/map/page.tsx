"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

type MapSightingRow = {
  id: string;
  seen_at: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  species: { common_name: string; image_url: string | null } | null;
};

const SightingsMap = dynamic(() => import("@/components/SightingsMap"), {
  ssr: false,
});

export default function MapPage() {
  const { user, loading: authLoading } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [sightings, setSightings] = useState<MapSightingRow[]>([]);

  useEffect(() => {
    const loadSightings = async () => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setMessage("No encontramos la configuracion de Supabase.");
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
        .select("id, seen_at, location_name, latitude, longitude, species:species_id(common_name, image_url)")
        .eq("user_id", user.id)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("seen_at", { ascending: false });

      if (error) {
        setMessage("No pudimos cargar tus avistamientos en el mapa.");
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
          latitude: item.latitude as number,
          longitude: item.longitude as number,
          seenAt: item.seen_at,
          locationName: item.location_name,
          commonName: item.species?.common_name ?? "Especie desconocida",
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
    <main className="min-h-screen bg-[#f7f6ef] px-5 py-6 text-[#243128] sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-3xl border border-[#d8e0ce] bg-[#fbfbf8] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5c7565]">
              Territorio personal
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#223127]">
              Mis recuerdos en el territorio
            </h1>
          </div>
          <Link
            href="/collection"
            className="rounded-full border border-[#ced8c5] bg-[#f5f7ef] px-3 py-1.5 text-xs font-medium text-[#3c5646]"
          >
            Mi colección
          </Link>
        </header>

        {loading ? (
          <section className="rounded-3xl border border-[#d5decb] bg-[#f1f5ea] p-6 text-center">
            <p className="text-sm text-[#55695d]">Cargando mapa...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="rounded-3xl border border-[#d5decb] bg-[#f1f5ea] p-6 text-center">
            <p className="text-sm text-[#55695d]">{message}</p>
          </section>
        ) : null}

        {!loading && !user ? (
          <section className="rounded-3xl border border-[#d5decb] bg-[#f1f5ea] p-6 text-center">
            <p className="text-sm text-[#55695d]">Entra para ver tus avistamientos en el mapa.</p>
          </section>
        ) : null}

        {!loading && user && mapPoints.length === 0 ? (
          <section className="rounded-3xl border border-[#d5decb] bg-[#f1f5ea] p-6 text-center">
            <p className="text-sm text-[#55695d]">Aun no tienes descubrimientos con ubicacion.</p>
          </section>
        ) : null}

        {!loading && user && mapPoints.length > 0 ? (
          <section className="rounded-3xl border border-[#d5decb] bg-[#f1f5ea] p-3 sm:p-4">
            <div className="h-[65vh] min-h-[360px] overflow-hidden rounded-2xl border border-[#cad7be]">
              <SightingsMap points={mapPoints} initialCenter={initialCenter} />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
