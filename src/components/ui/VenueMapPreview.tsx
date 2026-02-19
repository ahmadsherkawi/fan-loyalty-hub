import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface VenueMapPreviewProps {
  lat: number;
  lng: number;
  radiusMeters: number;
}

// Component to update map view when coordinates change
function MapUpdater({ lat, lng, radiusMeters }: VenueMapPreviewProps) {
  const map = useMap();
  
  useEffect(() => {
    // Calculate zoom level based on radius
    // Larger radius = lower zoom level
    const zoomForRadius = Math.max(
      12,
      Math.min(18, 16 - Math.log2(radiusMeters / 100))
    );
    map.setView([lat, lng], zoomForRadius);
  }, [map, lat, lng, radiusMeters]);
  
  return null;
}

export function VenueMapPreview({ lat, lng, radiusMeters }: VenueMapPreviewProps) {
  const position = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);
  
  // Calculate initial zoom based on radius
  const initialZoom = useMemo(() => {
    return Math.max(12, Math.min(18, 16 - Math.log2(radiusMeters / 100)));
  }, [radiusMeters]);

  return (
    <div className="h-48 w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={position}
        zoom={initialZoom}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater lat={lat} lng={lng} radiusMeters={radiusMeters} />
        <Marker position={position} />
        <Circle
          center={position}
          radius={radiusMeters}
          pathOptions={{
            color: 'hsl(142, 76%, 36%)',
            fillColor: 'hsl(142, 76%, 36%)',
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
      </MapContainer>
    </div>
  );
}
