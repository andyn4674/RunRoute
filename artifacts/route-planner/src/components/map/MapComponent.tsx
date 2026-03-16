import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Loader2 } from 'lucide-react';
import type { GeneratedRoute } from '@workspace/api-client-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createDotIcon = (color: string, size = 12) => L.divIcon({
  className: 'custom-dot-marker',
  html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}80;"></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2]
});

const startPinIcon = L.divIcon({
  className: 'start-pin-marker',
  html: `<div style="width: 16px; height: 16px; border-radius: 50%; background: #22C55E; border: 3px solid white; box-shadow: 0 0 12px rgba(34,197,94,0.6);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const createStopIcon = (index: number) => L.divIcon({
  className: 'stop-marker',
  html: `<div style="width: 24px; height: 24px; border-radius: 50%; background: #FF4500; border: 3px solid white; box-shadow: 0 0 12px rgba(255,69,0,0.6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; font-family: sans-serif;">${index + 1}</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `<div style="width: 18px; height: 18px; border-radius: 50%; background: #4285F4; border: 3px solid white; box-shadow: 0 0 12px rgba(66,133,244,0.6);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

interface Stop {
  lat: number;
  lng: number;
  name?: string;
}

interface MapComponentProps {
  startLocation: [number, number] | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  routes?: GeneratedRoute[];
  selectedRouteId?: string;
  className?: string;
  stops?: Stop[];
  addingStop?: boolean;
  onStopAdd?: (lat: number, lng: number) => void;
}

const ROUTE_COLORS = ['#FF4500', '#00E5FF', '#A020F0'];

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

function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1.2 });
    }
  }, [position, map]);
  return null;
}

export function MapComponent({ startLocation, onLocationSelect, routes = [], selectedRouteId, className = "h-[400px]", stops = [], addingStop, onStopAdd }: MapComponentProps) {
  const defaultCenter: [number, number] = [37.7749, -122.4194];
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setFlyTarget([latitude, longitude]);
        if (onLocationSelect) {
          onLocationSelect(latitude, longitude);
        }
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable. Try again.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Try again.");
            break;
          default:
            setLocationError("Unable to get location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [onLocationSelect]);

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
        
        {(onLocationSelect || onStopAdd) && (
          <LocationMarker onSelect={addingStop && onStopAdd ? onStopAdd : onLocationSelect} />
        )}
        <FlyToLocation position={flyTarget} />

        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup className="bg-card text-foreground font-sans">Your Location</Popup>
          </Marker>
        )}

        {startLocation && (
          <Marker position={startLocation} icon={startPinIcon}>
            <Popup className="bg-card text-foreground font-sans">Start Location</Popup>
          </Marker>
        )}

        {stops.map((stop, idx) => (
          <Marker key={`stop-${idx}`} position={[stop.lat, stop.lng]} icon={createStopIcon(idx)}>
            <Popup className="bg-card text-foreground font-sans">{stop.name || `Stop ${idx + 1}`}</Popup>
          </Marker>
        ))}

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
                  weight: isSelected ? 5 : 3,
                  opacity: isFaded ? 0.25 : 0.85,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {isSelected && route.waypoints.map((wp, wIdx) => {
                if (wIdx === 0 || wIdx === route.waypoints.length - 1) {
                  return (
                    <Marker key={wIdx} position={[wp.lat, wp.lng]} icon={createDotIcon(color, 14)}>
                      <Popup>{wIdx === 0 ? "Start / Finish" : "End"}</Popup>
                    </Marker>
                  );
                }
                if (wp.name) {
                  return (
                    <Marker key={wIdx} position={[wp.lat, wp.lng]} icon={createDotIcon(color)}>
                      <Popup>{wp.name}</Popup>
                    </Marker>
                  );
                }
                return null;
              })}
            </div>
          );
        })}
      </MapContainer>

      {onLocationSelect && (
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <button
            onClick={handleLocate}
            disabled={locating}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px]"
            title="Use my location"
          >
            {locating ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <Crosshair className="w-5 h-5 text-primary" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Locate Me</span>
          </button>
        </div>
      )}

      {addingStop && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg backdrop-blur-sm text-center">
          Tap the map to add a stop
        </div>
      )}

      {locationError && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-destructive/90 text-destructive-foreground text-xs font-medium px-3 py-2 rounded-lg backdrop-blur-sm">
          {locationError}
        </div>
      )}
    </div>
  );
}
