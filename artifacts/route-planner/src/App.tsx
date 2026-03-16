import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { RouteProvider } from "@/context/RouteContext";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import GenerateRoute from "@/pages/GenerateRoute";
import RouteDetail from "@/pages/RouteDetail";
import RunHistory from "@/pages/RunHistory";
import Profile from "@/pages/Profile";
import RunTracker from "@/pages/RunTracker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/generate" component={GenerateRoute} />
        <Route path="/route/:id" component={RouteDetail} />
        <Route path="/track/:id" component={RunTracker} />
        <Route path="/history" component={RunHistory} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouteProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </RouteProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
