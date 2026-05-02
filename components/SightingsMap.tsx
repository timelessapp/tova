"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type MapPoint = {
  id: string;
  speciesId: string | null;
  latitude: number;
  longitude: number;
  seenAt: string;
  locationName: string | null;
  commonName: string;
  scientificName: string | null;
  category: string | null;
  imageUrl: string | null;
};

type SightingsMapProps = {
  points: MapPoint[];
  initialCenter: [number, number];
};

const categoryEmoji: Record<string, string> = {
  mammal: "🐾",
  bird: "🪶",
  reptile: "🦎",
  amphibian: "🐸",
  insect: "🪲",
  fish: "🐟",
  other: "❓",
};

function buildMarkerIcon(point: MapPoint) {
  const emoji = categoryEmoji[point.category ?? "other"] ?? "❓";
  const content = point.imageUrl
    ? `<img src="${point.imageUrl}" alt="${point.commonName}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;"/>`
    : `<span style="font-size:22px;line-height:1;">${emoji}</span>`;

  return L.divIcon({
    className: "",
    html: `<div style="width:52px;height:52px;border-radius:9999px;border:3px solid #6d866f;background:#f7f3e8;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(45,63,50,.3);overflow:hidden;">${content}</div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -24],
  });
}

function formatSeenAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function SightingsMap({ points, initialCenter }: SightingsMapProps) {
  return (
    <MapContainer center={initialCenter} zoom={6} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />

      {points.map((point) => (
        <Marker key={point.id} position={[point.latitude, point.longitude]} icon={buildMarkerIcon(point)}>
          <Popup>
            <div className="w-52 overflow-hidden rounded-lg border border-sand-dark bg-sand">
              {point.imageUrl ? (
                <img
                  src={point.imageUrl}
                  alt={point.commonName}
                  className="h-24 w-full object-cover"
                />
              ) : null}
              <div className="p-3">
                <p className="text-sm font-semibold text-forest-dark">{point.commonName}</p>
                <p className="truncate text-xs italic text-forest-soft">
                  {point.scientificName ?? "Sin nombre cientifico"}
                </p>
                <p className="mt-2 text-xs text-forest-soft">{formatSeenAt(point.seenAt)}</p>
                <p className="truncate text-xs text-forest-soft">📍 {point.locationName ?? "Ubicacion guardada"}</p>
                {point.speciesId ? (
                  <a
                    href={`/species/${point.speciesId}`}
                    className="mt-2 inline-flex rounded-full border border-sand-dark bg-white px-2.5 py-1 text-[11px] font-medium text-forest"
                  >
                    Ver ficha
                  </a>
                ) : null}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
