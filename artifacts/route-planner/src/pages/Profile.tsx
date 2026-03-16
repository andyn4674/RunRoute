import { useState, useEffect } from "react";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Shield, Thermometer, Mountain, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();
  const updateMutation = useUpdateProfile();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    nickname: "",
    heatTolerance: "moderate" as any,
    elevationTolerance: "moderate" as any,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        nickname: profile.nickname || "",
        heatTolerance: profile.heatTolerance,
        elevationTolerance: profile.elevationTolerance,
      });
    }
  }, [profile]);

  const handleSave = () => {
    updateMutation.mutate(
      { data: form },
      {
        onSuccess: () => {
          toast({ title: "Profile Updated", description: "Your preferences have been saved." });
        },
        onError: (err: any) => {
          toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-card rounded-3xl border border-border" />;
  }

  const tolerances = [
    { value: "low", label: "Low" },
    { value: "moderate", label: "Moderate" },
    { value: "high", label: "High" }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-20">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-border pb-6 sm:pb-8">
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary/50 shadow-[0_0_20px_rgba(255,69,0,0.2)] text-primary shrink-0">
          <UserIcon className="w-8 h-8 sm:w-12 sm:h-12" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-4xl font-display uppercase tracking-wide text-foreground truncate">{profile?.nickname || "Athlete"}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 font-semibold text-xs sm:text-base">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary shrink-0" /> Pro Member since {profile ? new Date(profile.createdAt).getFullYear() : "2024"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div className="space-y-6 bg-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border shadow-lg">
          <h2 className="text-2xl font-display flex items-center gap-2 border-b border-border pb-4">
            <Settings className="text-primary w-6 h-6" /> Personalization Engine
          </h2>
          
          <div>
            <label className="block text-sm font-bold text-muted-foreground uppercase mb-2 tracking-wider">Athlete Alias</label>
            <input 
              type="text" 
              value={form.nickname}
              onChange={e => setForm(p => ({...p, nickname: e.target.value}))}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:border-primary outline-none text-foreground font-semibold" 
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase mb-3 tracking-wider">
              <Thermometer className="w-4 h-4 text-primary" /> Heat Tolerance
            </label>
            <div className="flex bg-background rounded-xl p-1 border border-border">
              {tolerances.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(p => ({...p, heatTolerance: t.value as any}))}
                  className={cn(
                    "flex-1 py-2.5 min-h-[44px] text-sm font-bold uppercase rounded-lg transition-colors flex items-center justify-center",
                    form.heatTolerance === t.value ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">Affects route generation during hot weather (prioritizes shade if low).</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase mb-3 tracking-wider">
              <Mountain className="w-4 h-4 text-secondary" /> Elevation Tolerance
            </label>
            <div className="flex bg-background rounded-xl p-1 border border-border">
              {tolerances.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(p => ({...p, elevationTolerance: t.value as any}))}
                  className={cn(
                    "flex-1 py-2.5 min-h-[44px] text-sm font-bold uppercase rounded-lg transition-colors flex items-center justify-center",
                    form.elevationTolerance === t.value ? "bg-secondary text-secondary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">Determines aggressive hill routing vs flat paths.</p>
          </div>

          <button 
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full mt-4 py-4 bg-primary text-primary-foreground font-bold uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" /> {updateMutation.isPending ? "Updating..." : "Update Parameters"}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-card to-card/50 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border shadow-lg">
            <h2 className="text-xl sm:text-2xl font-display mb-4 sm:mb-6 text-foreground">Lifetime Stats</h2>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-background/50 p-3 sm:p-4 rounded-2xl border border-border/50 text-center">
                <p className="text-2xl sm:text-4xl font-display text-primary mb-1">{profile?.totalMilesRun}</p>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Miles</p>
              </div>
              <div className="bg-background/50 p-3 sm:p-4 rounded-2xl border border-border/50 text-center">
                <p className="text-2xl sm:text-4xl font-display text-secondary mb-1">{profile?.totalRunsLogged}</p>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </div>
          
          <div className="bg-muted p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border border-dashed text-center">
            <h3 className="font-display text-xl text-foreground/50 mb-2">Connect Devices</h3>
            <p className="text-sm text-muted-foreground mb-4">Sync with Strava, Garmin, or Apple Health to automatically log runs.</p>
            <button className="px-6 py-3 bg-background border border-border text-foreground font-bold rounded-xl hover:border-primary transition-colors text-sm uppercase tracking-wider w-full">
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
