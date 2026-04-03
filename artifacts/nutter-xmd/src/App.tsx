import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import DashboardLayout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/Admin";
import { setAuthTokenGetter } from "@/lib/api-client";

// ── QueryClient ──────────────────────────────────────────────────────────────
// staleTime: treat data as fresh for 30 s → no redundant refetch on every mount.
// retry: only retry once; default 3 hammers a slow Heroku dyno three times.
// gcTime: keep inactive cache for 5 min so back-navigation is instant.
// retryDelay: start at 2 s so a single cold-start doesn't queue 3 fast retries.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 1;
      },
      retryDelay: 2_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function MissingKeyScreen() {
  return (
    <div style={{ background: "#0a0a0a", color: "#00ff66", fontFamily: "monospace", padding: "2rem", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" style={{ width: 64, height: 64 }}>
        <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
        <rect x="3" y="3" width="26" height="26" rx="4" stroke="#00ff66" strokeWidth="1.5" fill="none"/>
        <line x1="3" y1="10.5" x2="29" y2="10.5" stroke="#00ff66" strokeWidth="1" opacity="0.5"/>
        <path d="M7.5 16.5 L12.5 19.5 L7.5 22.5" stroke="#00ff66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <line x1="14.5" y1="22.5" x2="23" y2="22.5" stroke="#00ff66" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <h1 style={{ color: "#ffffff", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>NUTTER-XMD</h1>
      <p style={{ color: "#ff4444", margin: 0, fontSize: "0.9rem" }}>Configuration error: VITE_CLERK_PUBLISHABLE_KEY is not set.</p>
      <p style={{ color: "#888", margin: 0, fontSize: "0.8rem" }}>Add it to your Render environment variables and redeploy.</p>
    </div>
  );
}

function AuthPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Cyberpunk grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0,255,102,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,102,0.03) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />
      {/* Corner glow accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageWrapper>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthPageWrapper>
  );
}

function SignUpPage() {
  return (
    <AuthPageWrapper>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthPageWrapper>
  );
}

// ── BearerTokenSyncer ─────────────────────────────────────────────────────────
// Wires Clerk's JWT into every outgoing API fetch as an Authorization: Bearer
// header. This is required when the frontend (Vercel) and backend (Heroku) are
// on different origins — session cookies cannot cross domains, but JWTs can.
function BearerTokenSyncer() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      appearance={{
        variables: {
          colorPrimary: "#00ff66",
          colorBackground: "#111111",
          colorText: "#ffffff",
          colorTextSecondary: "#aaaaaa",
          colorInputBackground: "#1a1a1a",
          colorInputText: "#ffffff",
          colorInputPlaceholder: "#555555",
          borderRadius: "0.5rem",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BearerTokenSyncer />
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />

          <Route path="/dashboard">
            <DashboardLayout>
              <ProtectedRoute component={Dashboard} />
            </DashboardLayout>
          </Route>

          <Route path="/admin" component={AdminDashboard} />

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  if (!clerkPubKey) {
    return <MissingKeyScreen />;
  }
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
