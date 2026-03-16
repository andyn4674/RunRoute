import { useState, useEffect } from "react";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Shield, Thermometer, Mountain, User as UserIcon, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user: authUser, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetProfile();
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

  const isLoading = authLoading || profileLoading;

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-card rounded-3xl border border-border" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto pb-20">
        <div className="bg-card p-8 sm:p-12 rounded-2xl sm:rounded-3xl border border-border shadow-lg text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary/50 shadow-[0_0_20px_rgba(255,69,0,0.2)]">
            <UserIcon className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display uppercase tracking-wide text-foreground">Create Your Account</h1>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Log in to save your runs, track progress, and personalize your route preferences across sessions.
            </p>
          </div>
          <div className="space-y-3 text-left bg-background/50 p-4 rounded-xl border border-border/50">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">What you get:</p>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> Persistent run history across devices</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" /> Personalized route preferences</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> Lifetime stats tracking</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" /> AI coach tailored to your history</li>
            </ul>
          </div>
          <button
            onClick={login}
            className="w-full py-4 bg-primary text-primary-foreground font-bold uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all flex justify-center items-center gap-3 text-lg"
          >
            <LogIn className="w-5 h-5" /> Log In
          </button>
          <p className="text-xs text-muted-foreground">You can still use the app without an account — your data just won't persist.</p>
        </div>
      </div>
    );
  }

  const tolerances = [
    { value: "low", label: "Low" },
    { value: "moderate", label: "Moderate" },
    { value: "high", label: "High" }
  ];

  const displayName = authUser?.firstName
    ? `${authUser.firstName}${authUser.lastName ? " " + authUser.lastName : ""}`
    : profile?.nickname || "Athlete";

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-20">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-border pb-6 sm:pb-8">
        {authUser?.profileImageUrl ? (
          <img
            src={authUser.profileImageUrl}
            alt={displayName}
            className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-primary/50 shadow-[0_0_20px_rgba(255,69,0,0.2)] shrink-0 object-cover"
          />
        ) : (
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary/50 shadow-[0_0_20px_rgba(255,69,0,0.2)] text-primary shrink-0">
            <UserIcon className="w-8 h-8 sm:w-12 sm:h-12" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-4xl font-display uppercase tracking-wide text-foreground truncate">{displayName}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 font-semibold text-xs sm:text-base">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary shrink-0" /> Member since {profile ? new Date(profile.createdAt).getFullYear() : new Date().getFullYear()}
          </p>
        </div>
        <button
          onClick={logout}
          className="shrink-0 p-2.5 rounded-xl border border-border bg-background hover:border-destructive hover:text-destructive transition-colors"
          title="Log out"
        >
          <LogOut className="w-5 h-5" />
        </button>
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
                <p className="text-2xl sm:text-4xl font-display text-primary mb-1">{profile?.totalMilesRun ?? 0}</p>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Miles</p>
              </div>
              <div className="bg-background/50 p-3 sm:p-4 rounded-2xl border border-border/50 text-center">
                <p className="text-2xl sm:text-4xl font-display text-secondary mb-1">{profile?.totalRunsLogged ?? 0}</p>
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
