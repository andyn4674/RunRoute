import { useState } from "react";
import { useListRuns, useLogRun } from "@workspace/api-client-react";
import { Activity, Calendar, Clock, Map, TrendingUp, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function RunHistory() {
  const { data, isLoading, refetch } = useListRuns({ limit: 50 });
  const logRunMutation = useLogRun();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    routeId: "manual",
    trainingGoal: "general_fitness" as any,
    distanceMiles: 3.1,
    durationMinutes: 30,
    elevationGainFt: 100,
    temperatureF: 65,
    perceivedEffort: 5,
    notes: ""
  });

  const handleLogRun = () => {
    logRunMutation.mutate(
      { data: logForm },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          toast({ title: "Run Logged!", description: "Your activity has been saved." });
          refetch();
        },
        onError: (err: any) => {
          toast({ title: "Error logging run", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-8 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display uppercase tracking-wide text-foreground">Run History</h1>
          <p className="text-muted-foreground mt-2">Track your past efforts and analyze performance.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(255,69,0,0.2)]"
        >
          <Plus className="w-5 h-5" /> Log Manual Run
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-card animate-pulse rounded-xl border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.runs.map((run, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={run.id} 
              className="bg-card p-6 rounded-2xl border border-border shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="w-16 h-16 bg-muted rounded-full flex flex-col items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                  <span className="font-display text-xl leading-none">{format(new Date(run.completedAt), "dd")}</span>
                  <span className="text-xs font-bold uppercase">{format(new Date(run.completedAt), "MMM")}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wider text-foreground mb-1">{run.trainingGoal.replace('_', ' ')}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium">
                    <span className="flex items-center gap-1"><Map className="w-4 h-4" /> {run.distanceMiles} mi</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {run.durationMinutes} min</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> {run.elevationGainFt} ft</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-48 text-right flex flex-col justify-center border-t md:border-t-0 pt-4 md:pt-0 border-border">
                <div className="flex items-center justify-between md:justify-end gap-2 mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Effort</span>
                  <span className="font-display text-lg text-secondary">{run.perceivedEffort}/10</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${(run.perceivedEffort / 10) * 100}%` }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground text-left md:text-right italic">
                  {run.notes ? `"${run.notes}"` : ""}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Manual Log Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border w-full max-w-lg rounded-3xl p-8 shadow-2xl relative"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-display mb-6">Log Manual Run</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Distance (mi)</label>
                    <input type="number" step="0.1" value={logForm.distanceMiles} onChange={e => setLogForm(p => ({...p, distanceMiles: parseFloat(e.target.value)}))} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Duration (min)</label>
                    <input type="number" value={logForm.durationMinutes} onChange={e => setLogForm(p => ({...p, durationMinutes: parseInt(e.target.value, 10)}))} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:border-primary outline-none" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Goal / Type</label>
                  <select value={logForm.trainingGoal} onChange={e => setLogForm(p => ({...p, trainingGoal: e.target.value as any}))} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:border-primary outline-none">
                    <option value="general_fitness">General Fitness</option>
                    <option value="speed_workout">Speed Workout</option>
                    <option value="endurance">Endurance</option>
                    <option value="recovery">Recovery</option>
                  </select>
                </div>

                <div>
                  <label className="flex justify-between text-xs font-bold text-muted-foreground uppercase mb-2">
                    <span>Perceived Effort</span>
                    <span className="text-primary">{logForm.perceivedEffort}/10</span>
                  </label>
                  <input type="range" min="1" max="10" value={logForm.perceivedEffort} onChange={e => setLogForm(p => ({...p, perceivedEffort: parseInt(e.target.value, 10)}))} className="w-full accent-primary bg-muted rounded-full h-2 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Notes</label>
                  <textarea rows={3} value={logForm.notes} onChange={e => setLogForm(p => ({...p, notes: e.target.value}))} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:border-primary outline-none resize-none" placeholder="How did it feel?" />
                </div>
              </div>

              <button 
                onClick={handleLogRun}
                disabled={logRunMutation.isPending}
                className="w-full mt-8 py-4 bg-primary text-primary-foreground font-bold uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {logRunMutation.isPending ? "Saving..." : "Save Run"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
