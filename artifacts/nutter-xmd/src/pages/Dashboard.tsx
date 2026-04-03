import { useGetDashboardStats } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, Bot, Zap, Command, Plus, ServerCrash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const { data: stats, isLoading, isError, refetch } = useGetDashboardStats();

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="flex items-center gap-4">
            Failed to retrieve telemetry data from master node.
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry Connection</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight glow-text">System Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time telemetry for your bot infrastructure.</p>
        </div>
        <Link href="/dashboard/bots">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border">
            <Plus className="w-4 h-4 mr-2" />
            Deploy New Bot
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Instances" 
          value={stats?.totalBots} 
          icon={Bot} 
          isLoading={isLoading} 
        />
        <StatsCard 
          title="Active Instances" 
          value={stats?.activeBots} 
          icon={Activity} 
          isLoading={isLoading} 
          color="text-blue-500"
        />
        <StatsCard 
          title="Online / Connected" 
          value={stats?.onlineBots} 
          icon={Zap} 
          isLoading={isLoading} 
          color="text-primary"
          pulse
        />
        <StatsCard 
          title="Total Commands" 
          value={stats?.totalCommands} 
          icon={Command} 
          isLoading={isLoading} 
          color="text-purple-500"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Master Node</span>
                <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  OPERATIONAL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Database Cluster</span>
                <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  OPERATIONAL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">WhatsApp Gateway</span>
                <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  OPERATIONAL
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/bots">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5">
                <Bot className="w-6 h-6 text-muted-foreground" />
                <span>Manage Bots</span>
              </Button>
            </Link>
            <Link href="/dashboard/bots?create=true">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5">
                <Plus className="w-6 h-6 text-muted-foreground" />
                <span>New Bot</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  isLoading,
  color = "text-muted-foreground",
  pulse = false
}: { 
  title: string; 
  value?: number; 
  icon: any; 
  isLoading: boolean;
  color?: string;
  pulse?: boolean;
}) {
  return (
    <Card className="bg-card border-border/50 relative overflow-hidden group hover:border-primary/30 transition-colors">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/50 transition-colors" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color} ${pulse ? 'animate-pulse-glow' : ''}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16 bg-muted/50" />
        ) : (
          <div className="text-3xl font-bold font-mono text-foreground">
            {value !== undefined ? value : "-"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
