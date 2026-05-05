"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationPickerModalProps = {
  isOpen: boolean;
  initialCenter: Coordinates;
  onClose: () => void;
  onSave: (coords: Coordinates) => void;
};

type CenterTrackerProps = {
  onCenterChange: (coords: Coordinates) => void;
};

function CenterTracker({ onCenterChange }: CenterTrackerProps) {
  useMapEvents({
    move(event) {
      const center = event.target.getCenter();
      onCenterChange({ latitude: center.lat, longitude: center.lng });
    },
    moveend(event) {
      const center = event.target.getCenter();
      onCenterChange({ latitude: center.lat, longitude: center.lng });
    },
  });

  return null;
}

export default function LocationPickerModal({
  isOpen,
  initialCenter,
  onClose,
  onSave,
}: LocationPickerModalProps) {
  const [center, setCenter] = useState<Coordinates>(initialCenter);

  useEffect(() => {
    if (isOpen) {
      setCenter(initialCenter);
    }
  }, [isOpen, initialCenter]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Editar ubicació"
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-sand-dark bg-sand p-4 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-soft">Editar ubicació</p>
        <p className="mt-1 text-sm text-forest">Pots ajustar el punt exacte on vas veure l'animal.</p>

        <div className="relative mt-3 h-72 overflow-hidden rounded-2xl border border-sand-dark">
          <MapContainer
            center={[center.latitude, center.longitude]}
            zoom={16}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CenterTracker onCenterChange={setCenter} />
          </MapContainer>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="-translate-y-4 text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]">📍</div>
          </div>
        </div>

        <p className="mt-3 text-xs text-forest-soft">
          Lat: {center.latitude.toFixed(6)} | Lng: {center.longitude.toFixed(6)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-sand-dark bg-white px-4 py-2.5 text-sm font-semibold text-forest"
          >
            Cancel·lar
          </button>
          <button
            type="button"
            onClick={() => onSave(center)}
            className="rounded-full bg-[#2F5D50] px-4 py-2.5 text-sm font-semibold text-[#F4F1E8]"
          >
            Guardar ubicació
          </button>
        </div>
      </div>
    </div>
  );
}
