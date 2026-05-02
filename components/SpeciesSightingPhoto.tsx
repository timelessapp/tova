"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

interface SpeciesSightingPhotoProps {
  speciesId: string;
}

export default function SpeciesSightingPhoto({ speciesId }: SpeciesSightingPhotoProps) {
  const { user, loading } = useCurrentUser();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);

  useEffect(() => {
    const loadPhoto = async () => {
      if (loading) {
        return;
      }

      if (!user) {
        setLoadingPhoto(false);
        setPhotoUrl(null);
        setMessage(null);

        return;
      }

      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setLoadingPhoto(false);
        setMessage("No se pudo cargar tu ultima foto ahora mismo.");

        return;
      }

      setLoadingPhoto(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("sightings")
        .select("photo_url, seen_at")
        .eq("user_id", user.id)
        .eq("species_id", speciesId)
        .not("photo_url", "is", null)
        .order("seen_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setPhotoUrl(null);
        setMessage("No se pudo cargar tu ultima foto ahora mismo.");
        setLoadingPhoto(false);

        return;
      }

      setPhotoUrl(data?.photo_url ?? null);
      setLoadingPhoto(false);
    };

    loadPhoto();
  }, [loading, speciesId, user]);

  if (loading || loadingPhoto) {
    return (
      <div className="mt-4 rounded-2xl border border-sand-dark bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
          Tu ultimo avistamiento
        </p>
        <p className="mt-2 text-sm text-forest-soft">Cargando foto...</p>
      </div>
    );
  }

  if (message) {
    return (
      <div className="mt-4 rounded-2xl border border-sand-dark bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
          Tu ultimo avistamiento
        </p>
        <p className="mt-2 text-sm text-forest-soft">{message}</p>
      </div>
    );
  }

  if (!photoUrl) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-sand-dark bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
        Tu ultimo avistamiento
      </p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-sand-dark bg-sand-dark">
        <div className="aspect-[4/5] w-full">
          <img
            src={photoUrl}
            alt="Tu foto del avistamiento"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
