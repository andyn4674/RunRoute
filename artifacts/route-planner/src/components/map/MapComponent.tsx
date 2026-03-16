import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { GeneratedRoute } from '@workspace/api-client-react';

// Fix for default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom dot marker for waypoints
const createDotIcon = (color: string) => L.divIcon({
  className: 'custom-dot-marker',
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}80;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

interface MapComponentProps {
  startLocation: [number, number] | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  routes?: GeneratedRoute[];
  selectedRouteId?: string;
  className?: string;
}

const ROUTE_COLORS = ['#FF4500', '#00E5FF', '#A020F0']; // Primary, Secondary, Accent

function LocationMarker({ onSelect }: { onSelect?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onSelect) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export function MapComponent({ startLocation, onLocationSelect, routes = [], selectedRouteId, className = "h-[400px]" }: MapComponentProps) {
  const defaultCenter: [number, number] = [37.7749, -122.4194]; // San Francisco default

  return (
    <div className={`rounded-2xl overflow-hidden border border-border shadow-xl relative z-10 ${className}`}>
      <MapContainer 
        center={startLocation || defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {onLocationSelect && <LocationMarker onSelect={onLocationSelect} />}

        {startLocation && (
          <Marker position={startLocation} icon={createDotIcon('#FF4500')}>
            <Popup className="bg-card text-foreground font-sans">Start Location</Popup>
          </Marker>
        )}

        {routes.map((route, idx) => {
          const isSelected = selectedRouteId === route.id;
          const isFaded = selectedRouteId && !isSelected;
          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
          const positions: [number, number][] = route.waypoints.map(wp => [wp.lat, wp.lng]);

          return (
            <div key={route.id}>
              <Polyline
                positions={positions}
                pathOptions={{ 
                  color: color, 
                  weight: isSelected ? 6 : 4,
                  opacity: isFaded ? 0.3 : 0.9,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {isSelected && route.waypoints.map((wp, wIdx) => {
                // Show a small marker every few waypoints or at specific named points
                if (wIdx === 0 || wIdx === route.waypoints.length - 1 || wp.name) {
                  return (
                    <Marker key={wIdx} position={[wp.lat, wp.lng]} icon={createDotIcon(color)}>
                      {wp.name && <Popup>{wp.name}</Popup>}
                    </Marker>
                  );
                }
                return null;
              })}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
