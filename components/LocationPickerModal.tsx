"use client";

import { useEffect, useState } from "react";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationSavePayload = {
  coords: Coordinates;
  locationName: string;
  source: "manual" | "current";
};

type LocationPickerModalProps = {
  isOpen: boolean;
  initialCenter: Coordinates;
  initialLocationName?: string | null;
  onClose: () => void;
  onSave: (payload: LocationSavePayload) => void;
};

export default function LocationPickerModal({
  isOpen,
  initialCenter,
  initialLocationName,
  onClose,
  onSave,
}: LocationPickerModalProps) {
  const [center, setCenter] = useState<Coordinates>(initialCenter);
  const [place, setPlace] = useState("");
  const [country, setCountry] = useState("");
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCenter(initialCenter);
      setPlace("");
      setCountry("");
      setUsingCurrentLocation(false);
      setLocationStatus(null);
    }
  }, [isOpen, initialCenter]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Aquest dispositiu no permet obtenir la ubicació actual.");
      return;
    }

    setLocationStatus("Obtenint ubicació actual...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setUsingCurrentLocation(true);
        setLocationStatus("Ubicació actual aplicada.");
      },
      () => {
        setLocationStatus("No hem pogut obtenir la ubicació actual.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  const handleSaveLocation = () => {
    const trimmedPlace = place.trim();
    const trimmedCountry = country.trim();

    let locationName = "";
    let source: LocationSavePayload["source"] = "manual";

    if (trimmedPlace && trimmedCountry) {
      locationName = `${trimmedPlace}, ${trimmedCountry}`;
      source = "manual";
    } else if (trimmedPlace) {
      locationName = trimmedPlace;
      source = "manual";
    } else if (trimmedCountry) {
      locationName = trimmedCountry;
      source = "manual";
    } else if (usingCurrentLocation) {
      locationName = "Ubicació guardada";
      source = "current";
    } else {
      locationName = initialLocationName?.trim() || "Ubicació guardada / Ubicacion guardada";
    }

    onSave({
      coords: center,
      locationName,
      source,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1D332A]/70 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="On l'has vist?"
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-[#B59B6C] bg-[#F6E6C8] p-4 shadow-[0_28px_60px_-30px_rgba(0,0,0,0.65)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">
          On l'has vist? / Donde lo has visto?
        </p>
        <p className="mt-1 text-sm text-forest">
          Escriu una ubicació fàcil d'entendre i la guardarem amb la foto.
          <br />
          Escribe una ubicacion facil de entender y la guardaremos con la foto.
        </p>

        <div className="mt-3 rounded-xl border border-[#D9C097] bg-white/85 px-3 py-2 text-xs text-forest-soft">
          Coordenades internes: {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-forest-soft" htmlFor="location-place">
              Poblacio o lloc / Poblacion o lugar
            </label>
            <input
              id="location-place"
              type="text"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="Ex: Barcelona"
              className="mt-1 block w-full rounded-xl border border-sand-dark bg-white px-3 py-2 text-sm text-forest-dark"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-forest-soft" htmlFor="location-country">
              Pais / Pais
            </label>
            <input
              id="location-country"
              type="text"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Ex: Espanya / Espana"
              className="mt-1 block w-full rounded-xl border border-sand-dark bg-white px-3 py-2 text-sm text-forest-dark"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="mt-4 w-full rounded-full border border-sand-dark bg-white px-4 py-2.5 text-sm font-semibold text-forest"
        >
          Usar la meva ubicacio actual / Usar mi ubicacion actual
        </button>

        {locationStatus ? (
          <p className="mt-2 text-xs text-forest-soft">{locationStatus}</p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-sand-dark bg-white px-4 py-2.5 text-sm font-semibold text-forest"
          >
            Cancel lar / Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveLocation}
            className="rounded-full bg-[#2F5D50] px-4 py-2.5 text-sm font-semibold text-[#F4F1E8]"
          >
            Guardar ubicacio / Guardar ubicacion
          </button>
        </div>
      </div>
    </div>
  );
}
