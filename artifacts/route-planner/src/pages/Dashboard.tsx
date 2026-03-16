import { Link } from "wouter";
import { motion } from "framer-motion";
import { Play, TrendingUp, MapPin, Target, Flame, ChevronRight, Activity } from "lucide-react";
import { useGetProfile, useListRuns } from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: profile, isLoading: profileLoading } = useGetProfile();
  const { data: runData, isLoading: runsLoading } = useListRuns({ limit: 3 });

  return (
    <div className="space-y-8 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border shadow-2xl bg-card"
      >
        <div className="absolute inset-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-runner.png`} 
            alt="Runner in city" 
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 to-transparent" />
        </div>
        
        <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col items-start max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/20 text-primary border border-primary/30 mb-4 sm:mb-6 backdrop-blur-md">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase">Ready to dominate</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display text-white mb-4 sm:mb-6 leading-tight">
            OWN YOUR <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">TRAINING.</span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-10 max-w-lg leading-relaxed">
            Generate personalized routes optimized for your current goals, local weather, and performance metrics.
          </p>
          <Link 
            href="/generate" 
            className="group relative inline-flex items-center justify-center gap-2 sm:gap-3 px-6 py-3 sm:px-8 sm:py-4 bg-primary text-primary-foreground rounded-xl font-bold text-base sm:text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,69,0,0.4)] min-h-[48px]"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <Play className="w-5 h-5 fill-current" />
            Plan Next Route
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-lg hover:border-primary/50 transition-colors"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 text-primary">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-xl sm:text-3xl font-display mb-1">{profileLoading ? "..." : profile?.totalMilesRun || 0}</h3>
          <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px] sm:text-sm">Total Miles</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-lg hover:border-secondary/50 transition-colors"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 text-secondary">
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-xl sm:text-3xl font-display mb-1">{profileLoading ? "..." : profile?.totalRunsLogged || 0}</h3>
          <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px] sm:text-sm">Runs</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-lg hover:border-accent/50 transition-colors"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/50 rounded-xl flex items-center justify-center mb-3 sm:mb-4 text-accent-foreground">
            <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-xl sm:text-3xl font-display mb-1">{profileLoading ? "..." : profile?.averagePaceMinsPerMile || '0.0'}</h3>
          <p className="text-muted-foreground font-medium uppercase tracking-wider text-[10px] sm:text-sm">Pace</p>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display">Recent Activity</h2>
          <Link href="/history" className="text-primary hover:text-primary-foreground flex items-center gap-1 font-semibold text-sm uppercase tracking-wider">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {runsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-card animate-pulse rounded-2xl border border-border" />
            ))}
          </div>
        ) : runData?.runs.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-display mb-2">No runs logged yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Complete a generated route to start building your history and personalization profile.</p>
            <Link href="/generate" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold inline-flex">
              Plan First Route
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {runData?.runs.map((run) => (
              <div key={run.id} className="bg-card p-6 rounded-2xl border border-border group hover:border-primary/30 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-muted text-foreground text-xs font-bold rounded-lg uppercase tracking-wider">
                    {run.trainingGoal.replace('_', ' ')}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {new Date(run.completedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="space-y-1 mb-4">
                  <h4 className="text-2xl font-display text-foreground group-hover:text-primary transition-colors">{run.distanceMiles} mi</h4>
                  <p className="text-muted-foreground font-medium">{run.durationMinutes} min • {run.elevationGainFt}ft gain</p>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${(run.perceivedEffort / 10) * 100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider text-right">
                  Effort: {run.perceivedEffort}/10
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
