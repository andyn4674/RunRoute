import { useParams, Link } from "wouter";
import { useGetRoute } from "@workspace/api-client-react";
import { ElevationProfile } from "@/components/charts/ElevationProfile";
import { MapComponent } from "@/components/map/MapComponent";
import { ArrowLeft, AlertTriangle, CheckCircle2, Navigation, Mountain, Timer } from "lucide-react";

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  // If no ID or if the ID is just the route param without a real backend generated state,
  // we would fetch it. Since the API requires it to exist on the backend, we use the hook.
  const { data: route, isLoading, error } = useGetRoute(id || "");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="text-center py-20">
        <h2 className="text-3xl font-display text-destructive mb-4">Route Not Found</h2>
        <Link href="/generate" className="text-primary hover:underline">Return to Route Generator</Link>
      </div>
    );
  }

  return (
    <div className="pb-20 max-w-5xl mx-auto space-y-8">
      <Link href="/generate" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-wider text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to options
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-bold uppercase tracking-widest">
              SCORE: {route.overallScore}/100
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-display uppercase tracking-wide text-foreground">{route.name}</h1>
        </div>
        <div className="flex gap-4 sm:gap-6 text-right">
          <div>
            <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Distance</p>
            <p className="text-2xl sm:text-3xl font-display">{route.distanceMiles} <span className="text-base sm:text-lg">mi</span></p>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Est. Time</p>
            <p className="text-2xl sm:text-3xl font-display">{route.estimatedDurationMinutes} <span className="text-base sm:text-lg">min</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="h-[400px] rounded-2xl overflow-hidden border border-border shadow-xl">
            <MapComponent 
              startLocation={null} 
              routes={[route]} 
              selectedRouteId={route.id} 
              className="h-full w-full"
            />
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-display mb-6 flex items-center gap-2">
              <Mountain className="text-primary" /> Elevation Profile
            </h3>
            <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 px-4">
              <span>Gain: +{route.elevationGainFt}ft</span>
              <span>Loss: -{route.elevationLossFt}ft</span>
            </div>
            <ElevationProfile waypoints={route.waypoints} color="hsl(180, 100%, 40%)" />
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-display mb-4">Route Info</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">{route.description}</p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground font-bold uppercase tracking-wider">Surfaces</span>
                <div className="flex gap-2">
                  {Object.entries(route.surfaceBreakdown).map(([surface, pct]) => (
                    <span key={surface} className="text-xs bg-muted px-2 py-1 rounded">
                      {surface} ({pct}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {route.warnings.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-destructive mb-3 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle className="w-5 h-5" /> Advisories
              </h3>
              <ul className="space-y-2">
                {route.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-destructive/90 flex items-start gap-2">
                    <span className="mt-1">•</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2 uppercase tracking-wider">
              <CheckCircle2 className="w-5 h-5" /> Highlights
            </h3>
            <ul className="space-y-3">
              {route.highlights.map((h, i) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
