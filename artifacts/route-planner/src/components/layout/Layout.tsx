import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Map, User, History, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/generate", label: "Plan", icon: Map },
  { path: "/history", label: "History", icon: History },
  { path: "/profile", label: "Profile", icon: User },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/abstract-topo.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <aside className="hidden md:flex flex-col w-72 border-r border-border bg-card/50 backdrop-blur-xl z-40 shrink-0 sticky top-0 h-screen">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-3 text-primary group">
            <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
              <Activity className="w-8 h-8" />
            </div>
            <span className="font-display text-3xl tracking-wider text-foreground group-hover:text-primary transition-colors duration-300">RunRoute</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 font-semibold text-lg relative overflow-hidden group",
                  isActive 
                    ? "text-primary shadow-[0_0_20px_rgba(255,69,0,0.1)] bg-primary/5" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNav"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                  />
                )}
                <item.icon className={cn("w-6 h-6 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                {item.label === "Home" ? "Dashboard" : item.label === "Plan" ? "Plan Route" : item.label === "History" ? "Run History" : item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-muted to-card p-6 rounded-2xl border border-border shadow-lg">
            <h4 className="font-display text-sm text-primary mb-2">Pro Tip</h4>
            <p className="text-sm text-muted-foreground">Adjust your heat tolerance in settings for better summer routes.</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative z-10 w-full overflow-y-auto md:h-screen">
        <div className="p-4 pb-24 md:pb-8 sm:p-8 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="flex items-stretch justify-around h-16">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 gap-0.5 relative transition-colors min-h-[48px]",
                  isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5", isActive && "scale-110")} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
