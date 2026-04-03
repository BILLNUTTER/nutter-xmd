import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TerminalSquare,
  Shield,
  Bot,
  Users,
  Activity,
  Zap,
  Command,
  LogOut,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const ADMIN_TOKEN_KEY = "admin_token";

type AdminBot = {
  id: number;
  userId: string;
  name: string;
  status: string;
  isActive: boolean;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminStats = {
  totalUsers: number;
  totalBots: number;
  activeBots: number;
  onlineBots: number;
  totalCommands: number;
};

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    online: { label: "ONLINE", cls: "bg-primary/20 text-primary border-primary/30" },
    offline: { label: "OFFLINE", cls: "bg-muted/50 text-muted-foreground border-border" },
    connecting: { label: "CONNECTING", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    banned: { label: "BANNED", cls: "bg-destructive/20 text-destructive border-destructive/30" },
  };
  const s = map[status] ?? map.offline;
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono flex items-center gap-1.5 ${s.cls}`}>
      {status === "online" && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
      {s.label}
    </span>
  );
}

function AdminDashboardContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => adminFetch<AdminStats>("/api/admin/stats"),
  });

  const { data: bots, isLoading: botsLoading } = useQuery<AdminBot[]>({
    queryKey: ["admin", "bots"],
    queryFn: () => adminFetch<AdminBot[]>("/api/admin/bots"),
  });

  const activateBot = useMutation({
    mutationFn: (id: number) => adminFetch<AdminBot>(`/api/admin/bots/${id}/activate`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bots"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast({ title: "Bot activated" });
    },
    onError: () => toast({ title: "Error activating bot", variant: "destructive" }),
  });

  const deactivateBot = useMutation({
    mutationFn: (id: number) => adminFetch<AdminBot>(`/api/admin/bots/${id}/deactivate`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bots"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast({ title: "Bot suspended" });
    },
    onError: () => toast({ title: "Error suspending bot", variant: "destructive" }),
  });

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.location.reload();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight glow-text">Admin Control</h1>
          </div>
          <p className="text-muted-foreground">Platform management and oversight.</p>
        </div>
        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          data-testid="button-admin-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-400" },
          { label: "Total Bots", value: stats?.totalBots, icon: Bot, color: "text-muted-foreground" },
          { label: "Active Bots", value: stats?.activeBots, icon: Activity, color: "text-blue-500" },
          { label: "Online Bots", value: stats?.onlineBots, icon: Zap, color: "text-primary", pulse: true },
          { label: "Commands", value: stats?.totalCommands, icon: Command, color: "text-purple-500" },
        ].map(({ label, value, icon: Icon, color, pulse }) => (
          <Card key={label} className="bg-card border-border/50 relative overflow-hidden group hover:border-primary/30 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/50 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color} ${pulse ? "animate-pulse" : ""}`} />
            </CardHeader>
            <CardContent className="pl-4">
              {statsLoading ? (
                <Skeleton className="h-8 w-12 bg-muted/50" />
              ) : (
                <div className="text-2xl font-bold font-mono">{value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Bots Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            All Bot Instances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {botsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 bg-muted/30" />)}
            </div>
          ) : !bots || bots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No bots on the platform yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs">
                    <th className="text-left py-2 px-3 font-mono">ID</th>
                    <th className="text-left py-2 px-3">Bot Name</th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">User</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Active</th>
                    <th className="text-right py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {bots.map((bot) => (
                    <tr
                      key={bot.id}
                      data-testid={`row-admin-bot-${bot.id}`}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono text-xs text-muted-foreground">#{bot.id}</td>
                      <td className="py-3 px-3 font-medium">{bot.name}</td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px] block">
                          {bot.userId.substring(0, 20)}...
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={bot.status} />
                      </td>
                      <td className="py-3 px-3">
                        {bot.isActive ? (
                          <span className="flex items-center gap-1 text-primary text-xs">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <XCircle className="w-3.5 h-3.5 text-destructive" /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {bot.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => deactivateBot.mutate(bot.id)}
                            disabled={deactivateBot.isPending}
                            data-testid={`button-deactivate-bot-${bot.id}`}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => activateBot.mutate(bot.id)}
                            disabled={activateBot.isPending}
                            data-testid={`button-activate-bot-${bot.id}`}
                          >
                            Activate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [form, setForm] = useState({ username: "", key: "" });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const isAdminMode = searchParams.get("admin") === "nutterx=true";

  if (!isAdminMode) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Card className="bg-card border-border w-full max-w-sm mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-muted-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground/60 mt-2">This page is not accessible.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogin = async () => {
    if (!form.username || !form.key) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, key: form.key }),
      });
      if (!res.ok) {
        toast({ title: "Invalid credentials", description: "Check your username and key.", variant: "destructive" });
        return;
      }
      const data = await res.json();
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      toast({ title: "Admin access granted" });
    } catch {
      toast({ title: "Login failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        <Card className="bg-card border-border w-full max-w-sm mx-4 relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TerminalSquare className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-mono glow-text">ADMIN ACCESS</CardTitle>
            <p className="text-xs text-muted-foreground">NUTTER-XMD Control Panel</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username">Username</Label>
              <Input
                id="admin-username"
                data-testid="input-admin-username"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                placeholder="admin"
                className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-key">Access Key</Label>
              <div className="relative">
                <Input
                  id="admin-key"
                  data-testid="input-admin-key"
                  type={showKey ? "text" : "password"}
                  value={form.key}
                  onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
                  placeholder="••••••••"
                  className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50 pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleLogin}
              disabled={loading || !form.username || !form.key}
              data-testid="button-admin-login"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Access Control Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">
        <AdminDashboardContent />
      </div>
    </div>
  );
}
