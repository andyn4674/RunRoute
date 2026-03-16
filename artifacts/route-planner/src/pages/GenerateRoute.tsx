import { useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { MapComponent } from "@/components/map/MapComponent";
import { ScoreRadar } from "@/components/charts/ScoreRadar";
import { RouteChat } from "@/components/chat/RouteChat";
import { useGenerateRoutes } from "@workspace/api-client-react";
import type { RouteRequest } from "@workspace/api-client-react";
import { Mountain, Flame, Heart, Zap, Clock, Dumbbell, Navigation, Loader2, Info, Map, Play, Watch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRouteStore } from "@/context/RouteContext";

const GOALS = [
  { id: "endurance", label: "Endurance", icon: Clock },
  { id: "speed_workout", label: "Speed", icon: Zap },
  { id: "recovery", label: "Recovery", icon: Heart },
  { id: "mountain_hiking", label: "Elevation", icon: Mountain },
  { id: "heat_tolerance", label: "Heat Adapt", icon: Flame },
  { id: "general_fitness", label: "General", icon: Dumbbell },
];

export default function GenerateRoute() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const generateMutation = useGenerateRoutes();
  const { form, setForm, result, setResult, selectedRouteId, setSelectedRouteId, clearRoutes } = useRouteStore();

  const handleApplyParams = useCallback((params: Record<string, any>) => {
    const validGoals = ["mountain_hiking", "heat_tolerance", "recovery", "speed_workout", "endurance", "general_fitness"];
    const validTimes = ["morning", "afternoon", "evening", "night"];

    setForm(prev => {
      const updated = { ...prev };
      if (params.trainingGoal && validGoals.includes(params.trainingGoal)) {
        updated.trainingGoal = params.trainingGoal as any;
      }
      if (typeof params.distanceMiles === "number" && params.distanceMiles >= 0.5 && params.distanceMiles <= 30) {
        updated.distanceMiles = params.distanceMiles;
      }
      if (params.timeOfDay && validTimes.includes(params.timeOfDay)) {
        updated.timeOfDay = params.timeOfDay as any;
      }
      if (typeof params.preferShade === "boolean") updated.preferShade = params.preferShade;
      if (typeof params.avoidTraffic === "boolean") updated.avoidTraffic = params.avoidTraffic;
      if (typeof params.preferTrails === "boolean") updated.preferTrails = params.preferTrails;
      if (typeof params.temperatureF === "number") updated.temperatureF = params.temperatureF as any;
      if (typeof params.humidity === "number" && params.humidity >= 0 && params.humidity <= 100) {
        updated.humidity = params.humidity as any;
      }
      if (typeof params.windSpeedMph === "number" && params.windSpeedMph >= 0) {
        updated.windSpeedMph = params.windSpeedMph as any;
      }
      if (typeof params.uvIndex === "number" && params.uvIndex >= 0 && params.uvIndex <= 11) {
        updated.uvIndex = params.uvIndex as any;
      }
      return updated;
    });
    toast({ title: "Settings applied!", description: "Route parameters updated from AI recommendations." });
  }, [toast, setForm]);

  const handleGenerate = () => {
    if (!form.trainingGoal || !form.distanceMiles || !form.startLat || !form.startLng) {
      toast({ title: "Missing fields", description: "Please select a location and distance.", variant: "destructive" });
      return;
    }

    generateMutation.mutate(
      { data: form as RouteRequest },
      {
        onSuccess: (data) => {
          setResult(data);
          if (data.routes.length > 0) {
            setSelectedRouteId(data.routes[0].id);
          }
          toast({ title: "Routes generated!", description: `Found ${data.routes.length} options matching your criteria.` });
        },
        onError: (err: any) => {
          toast({ title: "Generation failed", description: err.message || "Something went wrong.", variant: "destructive" });
        }
      }
    );
  };

  const handleStartRun = (routeId: string) => {
    clearRoutes();
    setLocation(`/track/${routeId}`);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-20 lg:h-[calc(100vh-6rem)]">
      <div className="w-full lg:w-1/2 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <h2 className="text-2xl font-display mb-6 border-b border-border pb-4">1. Training Objective</h2>
          
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
            {GOALS.map((goal) => {
              const isSelected = form.trainingGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  onClick={() => setForm(prev => ({ ...prev, trainingGoal: goal.id as any }))}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-200 gap-1.5 sm:gap-2 min-h-[64px]",
                    isSelected 
                      ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(255,69,0,0.15)]" 
                      : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground hover:border-muted-foreground"
                  )}
                >
                  <goal.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", isSelected && "animate-pulse")} />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">{goal.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Target Distance</label>
                <span className="text-primary font-display">{form.distanceMiles} mi</span>
              </div>
              <input 
                type="range" 
                min="1" max="26.2" step="0.1" 
                value={form.distanceMiles}
                onChange={(e) => setForm(prev => ({ ...prev, distanceMiles: parseFloat(e.target.value) }))}
                className="w-full accent-primary bg-muted rounded-full h-2 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,69,0,0.8)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Time of Day</label>
                <select 
                  value={form.timeOfDay}
                  onChange={(e) => setForm(prev => ({ ...prev, timeOfDay: e.target.value as any }))}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 justify-end">
                <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors">
                  <input 
                    type="checkbox" 
                    checked={form.preferShade}
                    onChange={(e) => setForm(prev => ({ ...prev, preferShade: e.target.checked }))}
                    className="w-5 h-5 accent-primary rounded"
                  />
                  <span className="text-sm font-bold uppercase tracking-wider">Prefer Shade</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xl flex-1 flex flex-col min-h-[400px] sm:min-h-[500px]">
          <h2 className="text-xl sm:text-2xl font-display mb-2 flex items-center gap-2">
            <Navigation className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
            2. Start Location
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Tap on the map to set your starting point.</p>
          
          <div className="flex-1 min-h-[250px] sm:min-h-[300px] rounded-xl overflow-hidden border-2 border-border focus-within:border-primary transition-colors">
            <MapComponent 
              startLocation={form.startLat ? [form.startLat, form.startLng!] : null}
              onLocationSelect={(lat, lng) => setForm(prev => ({ ...prev, startLat: lat, startLng: lng }))}
              routes={result?.routes}
              selectedRouteId={selectedRouteId || undefined}
              className="h-full w-full"
            />
          </div>

          <button 
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full mt-4 sm:mt-6 py-3.5 sm:py-4 bg-primary text-primary-foreground font-display text-lg sm:text-xl tracking-wider uppercase rounded-xl hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,69,0,0.3)] disabled:opacity-50 flex justify-center items-center gap-3 min-h-[48px]"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> Analyzing Terrain...</>
            ) : (
              "Generate Routes"
            )}
          </button>
        </div>
      </div>

      <div className="w-full lg:w-1/2 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {!result && !generateMutation.isPending && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-border rounded-2xl bg-card/30"
            >
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <Map className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-display mb-2 text-foreground/50">Awaiting Orders</h3>
              <p className="text-muted-foreground max-w-sm">Configure your parameters on the left and hit generate to compute optimized routes.</p>
            </motion.div>
          )}

          {generateMutation.isPending && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-4"
            >
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-card animate-pulse rounded-2xl border border-border" />
              ))}
            </motion.div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="bg-gradient-to-br from-secondary/20 to-card border border-secondary/30 rounded-2xl p-6 flex items-center gap-6">
                <div className="bg-secondary/20 p-4 rounded-full text-secondary">
                  <Info className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">{result.weatherSummary.conditions} • {result.weatherSummary.temperatureF}°F</h4>
                  <p className="text-sm text-muted-foreground">{result.weatherSummary.recommendation}</p>
                </div>
              </div>

              {result.routes.map((route, idx) => {
                const isSelected = selectedRouteId === route.id;
                const colors = ['hsl(15, 100%, 55%)', 'hsl(180, 100%, 40%)', 'hsl(280, 100%, 60%)'];
                const color = colors[idx % colors.length];

                return (
                  <div 
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={cn(
                      "bg-card rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden",
                      isSelected ? "border-primary shadow-[0_0_30px_rgba(255,69,0,0.15)] ring-1 ring-primary" : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-display text-2xl" style={{ color }}>OPTION 0{idx + 1}</span>
                            <span className="px-3 py-1 bg-muted rounded-full text-xs font-bold uppercase tracking-widest text-foreground">
                              {route.overallScore} SCORE
                            </span>
                          </div>
                          <h3 className="text-xl font-bold">{route.name}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-display">{route.distanceMiles} <span className="text-lg text-muted-foreground">mi</span></div>
                          <div className="text-sm text-muted-foreground font-semibold">{route.elevationGainFt}ft gain</div>
                        </div>
                      </div>

                      <p className="text-muted-foreground text-sm mb-6 line-clamp-2">{route.description}</p>

                      <div className="grid grid-cols-2 gap-6 items-center">
                        <div className="h-[200px]">
                          <ScoreRadar score={route.scoreBreakdown} color={color} />
                        </div>
                        <div className="space-y-4">
                          {route.highlights.slice(0, 3).map((hl, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-foreground/80">{hl}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {isSelected && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-6 pt-6 border-t border-border"
                        >
                          <div className="flex flex-col sm:flex-row justify-end gap-3">
                            <Link 
                              href={`/route/${route.id}`}
                              className="px-5 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors uppercase tracking-wider text-sm text-center min-h-[48px] flex items-center justify-center"
                            >
                              Full Details
                            </Link>
                            <button 
                              className="px-5 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors uppercase tracking-wider text-sm flex items-center justify-center gap-2 min-h-[48px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast({ title: "Connect Device", description: "Pair a GPS watch or fitness tracker to sync this route." });
                              }}
                            >
                              <Watch className="w-4 h-4" /> Connect Device
                            </button>
                            <button 
                              className="px-6 py-3 text-primary-foreground font-bold rounded-xl transition-colors uppercase tracking-wider text-sm shadow-lg hover:shadow-xl flex items-center justify-center gap-2 min-h-[48px]"
                              style={{ backgroundColor: color }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRun(route.id);
                              }}
                            >
                              <Play className="w-4 h-4 fill-current" /> Start Run
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RouteChat onApplyParams={handleApplyParams} />
    </div>
  );
}
