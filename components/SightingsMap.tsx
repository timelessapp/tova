"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  seenAt: string;
  locationName: string | null;
  commonName: string;
  imageUrl: string | null;
};

type SightingsMapProps = {
  points: MapPoint[];
  initialCenter: [number, number];
};

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.map((point) => (
        <Marker key={point.id} position={[point.latitude, point.longitude]} icon={markerIcon}>
          <Popup>
            <div className="w-44">
              {point.imageUrl ? (
                <img
                  src={point.imageUrl}
                  alt={point.commonName}
                  className="mb-2 h-24 w-full rounded-md object-cover"
                />
              ) : null}
              <p className="text-sm font-semibold text-[#223127]">{point.commonName}</p>
              <p className="text-xs text-[#4f6256]">{formatSeenAt(point.seenAt)}</p>
              {point.locationName ? <p className="text-xs text-[#4f6256]">{point.locationName}</p> : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
