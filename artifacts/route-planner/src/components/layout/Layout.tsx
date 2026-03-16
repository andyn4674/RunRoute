import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Map, User, History, Home, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/generate", label: "Plan Route", icon: Map },
  { path: "/history", label: "Run History", icon: History },
  { path: "/profile", label: "Profile", icon: User },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background relative overflow-hidden">
      {/* Background Texture */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/abstract-topo.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-xl z-50 sticky top-0">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Activity className="w-8 h-8" />
          <span className="font-display text-xl tracking-wider text-foreground">RunRoute</span>
        </Link>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-foreground p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-[73px] left-0 right-0 bg-card border-b border-border z-40 shadow-2xl"
          >
            <nav className="flex flex-col p-4 gap-2">
              {navItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold",
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
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
                {item.label}
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

      {/* Main Content */}
      <main className="flex-1 relative z-10 w-full overflow-y-auto h-screen">
        <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
