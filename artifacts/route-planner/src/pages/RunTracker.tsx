import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { MapComponent } from "@/components/map/MapComponent";
import { useGetRoute } from "@workspace/api-client-react";
import { ArrowLeft, Play, Pause, Square, MapPin, Clock, Zap, Navigation, Watch, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type TrackingState = "ready" | "running" | "paused" | "finished";

interface TrackedPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RunTracker() {
  const { id } = useParams<{ id: string }>();
  const { data: route, isLoading } = useGetRoute(id || "");
  const { toast } = useToast();

  const [state, setState] = useState<TrackingState>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [trackedPoints, setTrackedPoints] = useState<TrackedPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [showDevicePanel, setShowDevicePanel] = useState(false);
  const [currentPace, setCurrentPace] = useState<string>("--:--");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Location Unavailable", description: "Your browser doesn't support geolocation.", variant: "destructive" });
      return;
    }

    setState("running");

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const point: TrackedPoint = { lat: latitude, lng: longitude, timestamp: Date.now() };

        setCurrentPosition([latitude, longitude]);
        setTrackedPoints((prev) => {
          const updated = [...prev, point];

          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const segmentKm = haversineDistance(last.lat, last.lng, latitude, longitude);
            const segmentMiles = segmentKm / 1.60934;

            if (segmentMiles > 0.001) {
              setDistanceMiles((d) => {
                const newDist = d + segmentMiles;

                const timeDiffSec = (point.timestamp - last.timestamp) / 1000;
                if (timeDiffSec > 0 && segmentMiles > 0.005) {
                  const paceMinPerMile = (timeDiffSec / 60) / segmentMiles;
                  if (paceMinPerMile > 3 && paceMinPerMile < 30) {
                    const mins = Math.floor(paceMinPerMile);
                    const secs = Math.round((paceMinPerMile - mins) * 60);
                    setCurrentPace(`${mins}:${String(secs).padStart(2, "0")}`);
                  }
                }
                return newDist;
              });
            }
          }

          return updated;
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({ title: "GPS Signal Lost", description: "Trying to reconnect...", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  }, [toast]);

  const pauseTracking = useCallback(() => {
    setState("paused");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const resumeTracking = useCallback(() => {
    setState("running");

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const point: TrackedPoint = { lat: latitude, lng: longitude, timestamp: Date.now() };

        setCurrentPosition([latitude, longitude]);
        setTrackedPoints((prev) => {
          const updated = [...prev, point];

          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const segmentKm = haversineDistance(last.lat, last.lng, latitude, longitude);
            const segmentMiles = segmentKm / 1.60934;

            if (segmentMiles > 0.001) {
              setDistanceMiles((d) => {
                const newDist = d + segmentMiles;
                const timeDiffSec = (point.timestamp - last.timestamp) / 1000;
                if (timeDiffSec > 0 && segmentMiles > 0.005) {
                  const paceMinPerMile = (timeDiffSec / 60) / segmentMiles;
                  if (paceMinPerMile > 3 && paceMinPerMile < 30) {
                    const mins = Math.floor(paceMinPerMile);
                    const secs = Math.round((paceMinPerMile - mins) * 60);
                    setCurrentPace(`${mins}:${String(secs).padStart(2, "0")}`);
                  }
                }
                return newDist;
              });
            }
          }

          return updated;
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  }, []);

  const stopTracking = useCallback(() => {
    setState("finished");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="text-center py-20">
        <h2 className="text-3xl font-display text-destructive mb-4">Route Not Found</h2>
        <Link href="/generate" className="text-primary hover:underline">Return to Route Generator</Link>
      </div>
    );
  }

  const progress = route.distanceMiles > 0 ? Math.min(100, (distanceMiles / route.distanceMiles) * 100) : 0;

  return (
    <div className="pb-20 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <Link href="/generate" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-wider text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to routes
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-display uppercase tracking-wide text-foreground">{route.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{route.distanceMiles} mi planned</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border",
            state === "running" ? "bg-green-500/20 text-green-400 border-green-500/30" :
            state === "paused" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
            state === "finished" ? "bg-primary/20 text-primary border-primary/30" :
            "bg-muted text-muted-foreground border-border"
          )}>
            {state === "ready" ? "Ready" : state === "running" ? "Tracking" : state === "paused" ? "Paused" : "Complete"}
          </span>
        </div>
      </div>

      <div className="h-[300px] sm:h-[400px] rounded-2xl overflow-hidden border border-border shadow-xl relative">
        <MapComponent
          startLocation={currentPosition || (route.waypoints.length > 0 ? [route.waypoints[0].lat, route.waypoints[0].lng] : null)}
          routes={[route]}
          selectedRouteId={route.id}
          className="h-full w-full"
        />
        {currentPosition && state === "running" && (
          <div className="absolute top-3 left-3 z-[1000] bg-green-500/90 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            GPS Active
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary mx-auto mb-1" />
          <p className="text-lg sm:text-2xl font-display">{formatTime(elapsed)}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">Time</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
          <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-secondary mx-auto mb-1" />
          <p className="text-lg sm:text-2xl font-display">{distanceMiles.toFixed(2)}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">Miles</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-lg sm:text-2xl font-display">{currentPace}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">Pace</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mx-auto mb-1" />
          <p className="text-lg sm:text-2xl font-display">{Math.round(progress)}%</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">Done</p>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 50 }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {state === "ready" && (
          <div className="flex gap-3">
            <button
              onClick={startTracking}
              className="flex-1 py-4 bg-primary text-primary-foreground font-display text-lg tracking-wider uppercase rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(255,69,0,0.3)] flex items-center justify-center gap-3 min-h-[56px]"
            >
              <Play className="w-6 h-6 fill-current" /> Start Run
            </button>
          </div>
        )}

        {state === "running" && (
          <div className="flex gap-3">
            <button
              onClick={pauseTracking}
              className="flex-1 py-4 bg-yellow-500 text-black font-display text-lg tracking-wider uppercase rounded-xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-3 min-h-[56px]"
            >
              <Pause className="w-6 h-6" /> Pause
            </button>
            <button
              onClick={stopTracking}
              className="py-4 px-6 bg-destructive text-destructive-foreground font-display text-lg tracking-wider uppercase rounded-xl hover:bg-destructive/90 transition-all flex items-center justify-center gap-3 min-h-[56px]"
            >
              <Square className="w-6 h-6 fill-current" /> Stop
            </button>
          </div>
        )}

        {state === "paused" && (
          <div className="flex gap-3">
            <button
              onClick={resumeTracking}
              className="flex-1 py-4 bg-primary text-primary-foreground font-display text-lg tracking-wider uppercase rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(255,69,0,0.3)] flex items-center justify-center gap-3 min-h-[56px]"
            >
              <Play className="w-6 h-6 fill-current" /> Resume
            </button>
            <button
              onClick={stopTracking}
              className="py-4 px-6 bg-destructive text-destructive-foreground font-display text-lg tracking-wider uppercase rounded-xl hover:bg-destructive/90 transition-all flex items-center justify-center gap-3 min-h-[56px]"
            >
              <Square className="w-6 h-6 fill-current" /> Finish
            </button>
          </div>
        )}

        {state === "finished" && (
          <div className="bg-card border border-primary/30 rounded-2xl p-6 text-center space-y-4">
            <h3 className="text-2xl font-display text-primary">Run Complete!</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-display">{formatTime(elapsed)}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Duration</p>
              </div>
              <div>
                <p className="text-2xl font-display">{distanceMiles.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Miles</p>
              </div>
              <div>
                <p className="text-2xl font-display">
                  {elapsed > 0 && distanceMiles > 0
                    ? `${Math.floor((elapsed / 60) / distanceMiles)}:${String(Math.round(((elapsed / 60) / distanceMiles - Math.floor((elapsed / 60) / distanceMiles)) * 60)).padStart(2, "0")}`
                    : "--:--"}
                </p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Avg Pace</p>
              </div>
            </div>
            <Link
              href="/history"
              className="inline-flex px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl uppercase tracking-wider text-sm min-h-[48px] items-center justify-center"
            >
              Save & View History
            </Link>
          </div>
        )}

        <button
          onClick={() => setShowDevicePanel(!showDevicePanel)}
          className="flex items-center justify-center gap-2 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold uppercase tracking-wider"
        >
          <Watch className="w-4 h-4" /> External Devices
          {showDevicePanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDevicePanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-5 space-y-4"
          >
            <h4 className="font-display text-lg">Connect a Device</h4>
            <p className="text-sm text-muted-foreground">Pair a GPS watch or fitness tracker to sync your run data in real-time.</p>
            <div className="grid grid-cols-2 gap-3">
              {["Garmin", "Apple Watch", "Fitbit", "Strava"].map((device) => (
                <button
                  key={device}
                  onClick={() => toast({ title: `${device}`, description: `${device} integration coming soon. Your current device is tracking this run.` })}
                  className="py-3 px-4 bg-muted border border-border rounded-xl text-sm font-bold hover:border-primary/50 transition-colors min-h-[48px]"
                >
                  {device}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
