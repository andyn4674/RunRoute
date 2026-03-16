import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { RouteRequest, RouteResponse } from "@workspace/api-client-react";

interface RouteState {
  form: Partial<RouteRequest>;
  result: RouteResponse | null;
  selectedRouteId: string | null;
  setForm: (updater: (prev: Partial<RouteRequest>) => Partial<RouteRequest>) => void;
  setResult: (result: RouteResponse | null) => void;
  appendRoutes: (newResult: RouteResponse) => void;
  setSelectedRouteId: (id: string | null) => void;
  clearRoutes: () => void;
}

const defaultForm: Partial<RouteRequest> = {
  trainingGoal: "general_fitness" as any,
  distanceMinMiles: 2,
  distanceMaxMiles: 5,
  startLat: 37.7749,
  startLng: -122.4194,
  timeOfDay: "morning" as any,
  preferShade: true,
  avoidTraffic: true,
  routeType: "loop" as any,
};

const RouteContext = createContext<RouteState | null>(null);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [form, setFormState] = useState<Partial<RouteRequest>>(defaultForm);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const setForm = useCallback((updater: (prev: Partial<RouteRequest>) => Partial<RouteRequest>) => {
    setFormState(updater);
  }, []);

  const appendRoutes = useCallback((newResult: RouteResponse) => {
    setResult(prev => {
      if (!prev) return newResult;
      return {
        ...prev,
        routes: [...prev.routes, ...newResult.routes],
      };
    });
  }, []);

  const clearRoutes = useCallback(() => {
    setResult(null);
    setSelectedRouteId(null);
  }, []);

  return (
    <RouteContext.Provider value={{ form, result, selectedRouteId, setForm, setResult, appendRoutes, setSelectedRouteId, clearRoutes }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRouteStore() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error("useRouteStore must be used within RouteProvider");
  return ctx;
}
