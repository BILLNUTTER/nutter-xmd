import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListBots,
  useCreateBot,
  useDeleteBot,
  getListBotsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Plus,
  Trash2,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
  TerminalSquare,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    online: { label: "ONLINE", cls: "bg-primary/20 text-primary border-primary/30" },
    offline: { label: "OFFLINE", cls: "bg-muted/50 text-muted-foreground border-border" },
    connecting: { label: "CONNECTING", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    banned: { label: "BANNED", cls: "bg-destructive/20 text-destructive border-destructive/30" },
  };
  const s = map[status] ?? map.offline;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border font-mono flex items-center gap-1.5 ${s.cls}`}
    >
      {status === "online" && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
      {status === "connecting" && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
      {s.label}
    </span>
  );
}

export default function BotList() {
  const { data: bots, isLoading } = useListBots();
  const createBot = useCreateBot();
  const deleteBot = useDeleteBot();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", prefix: "!", description: "" });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createBot.mutate(
      { data: { name: form.name, prefix: form.prefix, description: form.description || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() });
          setShowCreate(false);
          setForm({ name: "", prefix: "!", description: "" });
          toast({ title: "Bot deployed", description: `${form.name} is ready for setup.` });
        },
        onError: () => {
          toast({ title: "Deploy failed", description: "Unable to create bot.", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteBot.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() });
          toast({ title: "Bot terminated", description: "Bot removed from system." });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to delete bot.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight glow-text">Bot Fleet</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor your WhatsApp bot instances.</p>
        </div>
        <Button
          data-testid="button-create-bot"
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Deploy Bot
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-lg bg-muted/30" />
          ))}
        </div>
      ) : !bots || bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <TerminalSquare className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-muted-foreground">No bots deployed</h2>
          <p className="text-muted-foreground/60 mt-1 mb-6">Start by deploying your first WhatsApp bot.</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Deploy First Bot
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Card
              key={bot.id}
              data-testid={`card-bot-${bot.id}`}
              className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-200 group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent group-hover:via-primary/60 transition-all" />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className={`w-5 h-5 ${bot.status === "online" ? "text-primary" : "text-muted-foreground"}`} />
                    <CardTitle className="text-base font-mono">{bot.name}</CardTitle>
                  </div>
                  <StatusBadge status={bot.status} />
                </div>
                {bot.description && (
                  <p className="text-xs text-muted-foreground mt-1">{bot.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  {bot.status === "online" ? (
                    <Wifi className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5" />
                  )}
                  {bot.phoneNumber ? bot.phoneNumber : "Not connected"}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span className="px-1.5 py-0.5 bg-secondary rounded text-foreground">prefix: {bot.prefix}</span>
                  {!bot.isActive && (
                    <span className="px-1.5 py-0.5 bg-destructive/20 rounded text-destructive border border-destructive/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Suspended
                    </span>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-border/50 hover:border-primary/50 hover:bg-primary/5"
                    data-testid={`button-settings-bot-${bot.id}`}
                    onClick={() => setLocation(`/dashboard/bots/${bot.id}`)}
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Configure
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/30"
                    data-testid={`button-delete-bot-${bot.id}`}
                    onClick={() => setDeleteId(bot.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Bot Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono glow-text">Deploy New Bot</DialogTitle>
            <DialogDescription>Configure a new WhatsApp bot instance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bot-name">Bot Name</Label>
              <Input
                id="bot-name"
                data-testid="input-bot-name"
                placeholder="e.g. MainBot, Assistant-01"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bot-prefix">Command Prefix</Label>
              <Input
                id="bot-prefix"
                data-testid="input-bot-prefix"
                placeholder="!"
                maxLength={5}
                value={form.prefix}
                onChange={(e) => setForm((p) => ({ ...p, prefix: e.target.value }))}
                className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50 w-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bot-desc">Description (optional)</Label>
              <Input
                id="bot-desc"
                data-testid="input-bot-description"
                placeholder="What does this bot do?"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-secondary/50 border-border/50 focus:border-primary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              data-testid="button-submit-create-bot"
              onClick={handleCreate}
              disabled={createBot.isPending || !form.name.trim()}
            >
              {createBot.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Bot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the bot and all its commands. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-bot"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && handleDelete(deleteId)}
            >
              {deleteBot.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
