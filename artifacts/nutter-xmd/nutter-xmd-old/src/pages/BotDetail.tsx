import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetBot,
  useUpdateBot,
  useGetBotQR,
  useDisconnectBot,
  useListBotCommands,
  useCreateBotCommand,
  useUpdateBotCommand,
  useDeleteBotCommand,
  getGetBotQueryKey,
  getListBotCommandsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  Wifi,
  WifiOff,
  QrCode,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Save,
  Command,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    <span className={`text-xs px-2 py-0.5 rounded border font-mono flex items-center gap-1.5 ${s.cls}`}>
      {(status === "online" || status === "connecting") && (
        <span className={`w-1.5 h-1.5 rounded-full ${status === "online" ? "bg-primary" : "bg-yellow-400"} animate-pulse`} />
      )}
      {s.label}
    </span>
  );
}

export default function BotDetail() {
  const params = useParams<{ id: string }>();
  const botId = parseInt(params.id, 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bot, isLoading: botLoading } = useGetBot(botId, {
    query: { enabled: !isNaN(botId) },
  });
  const { data: qrData, isLoading: qrLoading, refetch: refetchQR } = useGetBotQR(botId, {
    query: { enabled: !isNaN(botId) },
  });
  const { data: commands, isLoading: commandsLoading } = useListBotCommands(botId, {
    query: { enabled: !isNaN(botId) },
  });

  const updateBot = useUpdateBot();
  const disconnectBot = useDisconnectBot();
  const createCommand = useCreateBotCommand();
  const updateCommand = useUpdateBotCommand();
  const deleteCommand = useDeleteBotCommand();

  const [settings, setSettings] = useState<{
    name: string;
    prefix: string;
    autoReply: boolean;
    autoReplyMessage: string;
  } | null>(null);

  const [showAddCommand, setShowAddCommand] = useState(false);
  const [cmdForm, setCmdForm] = useState({ command: "", description: "", response: "" });
  const [deleteCommandId, setDeleteCommandId] = useState<number | null>(null);
  const [editCommandId, setEditCommandId] = useState<number | null>(null);
  const [editCmdForm, setEditCmdForm] = useState({ command: "", description: "", response: "", isEnabled: true });

  const currentSettings = settings ?? (bot ? {
    name: bot.name,
    prefix: bot.prefix,
    autoReply: bot.autoReply,
    autoReplyMessage: bot.autoReplyMessage ?? "",
  } : null);

  const handleSaveSettings = () => {
    if (!currentSettings || !bot) return;
    updateBot.mutate(
      { id: bot.id, data: { name: currentSettings.name, prefix: currentSettings.prefix, autoReply: currentSettings.autoReply, autoReplyMessage: currentSettings.autoReplyMessage || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBotQueryKey(botId) });
          setSettings(null);
          toast({ title: "Settings saved" });
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  };

  const handleDisconnect = () => {
    disconnectBot.mutate(
      { id: botId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBotQueryKey(botId) });
          queryClient.invalidateQueries({ queryKey: getGetBotQRQueryKey(botId) });
          toast({ title: "Disconnected", description: "Bot is now offline." });
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  const handleAddCommand = () => {
    if (!cmdForm.command.trim() || !cmdForm.response.trim()) return;
    createCommand.mutate(
      { id: botId, data: { command: cmdForm.command, description: cmdForm.description || undefined, response: cmdForm.response } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBotCommandsQueryKey(botId) });
          setShowAddCommand(false);
          setCmdForm({ command: "", description: "", response: "" });
          toast({ title: "Command added" });
        },
        onError: () => toast({ title: "Failed to add command", variant: "destructive" }),
      }
    );
  };

  const handleToggleCommand = (commandId: number, currentEnabled: boolean) => {
    updateCommand.mutate(
      { id: botId, commandId, data: { isEnabled: !currentEnabled } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBotCommandsQueryKey(botId) }),
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  const handleDeleteCommand = (commandId: number) => {
    deleteCommand.mutate(
      { id: botId, commandId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBotCommandsQueryKey(botId) });
          toast({ title: "Command deleted" });
          setDeleteCommandId(null);
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  const openEditCommand = (cmd: any) => {
    setEditCommandId(cmd.id);
    setEditCmdForm({ command: cmd.command, description: cmd.description ?? "", response: cmd.response, isEnabled: cmd.isEnabled });
  };

  const handleEditCommand = () => {
    if (!editCommandId) return;
    updateCommand.mutate(
      { id: botId, commandId: editCommandId, data: { command: editCmdForm.command, description: editCmdForm.description || undefined, response: editCmdForm.response, isEnabled: editCmdForm.isEnabled } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBotCommandsQueryKey(botId) });
          setEditCommandId(null);
          toast({ title: "Command updated" });
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  };

  if (botLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-muted/30" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 bg-muted/30" />
          <Skeleton className="h-64 bg-muted/30" />
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Bot className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold text-muted-foreground">Bot not found</h2>
        <Button className="mt-4" variant="outline" onClick={() => setLocation("/dashboard/bots")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Fleet
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard/bots")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono glow-text">{bot.name}</h1>
            <StatusBadge status={bot.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{bot.description || "No description"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Connection Panel */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              WhatsApp Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bot.status === "online" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/30 rounded-md">
                  <Wifi className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">Connected</p>
                    <p className="text-xs text-muted-foreground">{bot.phoneNumber}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={handleDisconnect}
                  disabled={disconnectBot.isPending}
                  data-testid="button-disconnect-bot"
                >
                  {disconnectBot.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <WifiOff className="w-4 h-4 mr-2" />}
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Scan the QR code with WhatsApp to connect this bot instance.
                </p>
                <div className="flex items-center justify-center h-48 bg-secondary/30 border border-border/50 rounded-lg relative">
                  {qrLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  ) : qrData?.qrCode ? (
                    <img
                      src={`data:image/png;base64,${qrData.qrCode}`}
                      alt="WhatsApp QR Code"
                      className="w-40 h-40 object-contain"
                      data-testid="img-qr-code"
                    />
                  ) : (
                    <div className="text-center">
                      <QrCode className="w-12 h-12 text-muted-foreground/30 mb-2 mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        {qrData?.status === "connecting" ? "Generating QR code..." : "Click below to generate QR code"}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => refetchQR()}
                  disabled={qrLoading}
                  data-testid="button-generate-qr"
                >
                  {qrLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {qrData?.status === "connecting" ? "Refresh QR Code" : "Generate QR Code"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Panel */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Bot Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bot Name</Label>
              <Input
                data-testid="input-settings-name"
                value={currentSettings?.name ?? ""}
                onChange={(e) => setSettings((p) => ({ ...(p ?? { name: bot.name, prefix: bot.prefix, autoReply: bot.autoReply, autoReplyMessage: bot.autoReplyMessage ?? "" }), name: e.target.value }))}
                className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Command Prefix</Label>
              <Input
                data-testid="input-settings-prefix"
                value={currentSettings?.prefix ?? ""}
                maxLength={5}
                onChange={(e) => setSettings((p) => ({ ...(p ?? { name: bot.name, prefix: bot.prefix, autoReply: bot.autoReply, autoReplyMessage: bot.autoReplyMessage ?? "" }), prefix: e.target.value }))}
                className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50 w-24"
              />
            </div>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Reply</Label>
                <p className="text-xs text-muted-foreground">Reply to all incoming messages</p>
              </div>
              <Switch
                data-testid="switch-auto-reply"
                checked={currentSettings?.autoReply ?? false}
                onCheckedChange={(checked) => setSettings((p) => ({ ...(p ?? { name: bot.name, prefix: bot.prefix, autoReply: bot.autoReply, autoReplyMessage: bot.autoReplyMessage ?? "" }), autoReply: checked }))}
              />
            </div>
            {currentSettings?.autoReply && (
              <div className="space-y-2">
                <Label>Auto-Reply Message</Label>
                <Textarea
                  data-testid="textarea-auto-reply-message"
                  value={currentSettings?.autoReplyMessage ?? ""}
                  onChange={(e) => setSettings((p) => ({ ...(p ?? { name: bot.name, prefix: bot.prefix, autoReply: bot.autoReply, autoReplyMessage: bot.autoReplyMessage ?? "" }), autoReplyMessage: e.target.value }))}
                  placeholder="Hello! I'm an automated bot..."
                  className="bg-secondary/50 border-border/50 focus:border-primary/50"
                />
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleSaveSettings}
              disabled={updateBot.isPending}
              data-testid="button-save-settings"
            >
              {updateBot.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Commands Panel */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Command className="w-5 h-5 text-primary" />
              Commands
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddCommand(true)} data-testid="button-add-command">
              <Plus className="w-4 h-4 mr-2" />
              Add Command
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {commandsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 bg-muted/30" />)}
            </div>
          ) : !commands || commands.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Command className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No commands configured yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commands.map((cmd) => (
                <div
                  key={cmd.id}
                  data-testid={`row-command-${cmd.id}`}
                  className="flex items-center gap-3 p-3 bg-secondary/30 border border-border/30 rounded-md hover:border-border/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-primary">{bot.prefix}{cmd.command}</span>
                      {cmd.description && (
                        <span className="text-xs text-muted-foreground truncate">{cmd.description}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{cmd.response}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleCommand(cmd.id, cmd.isEnabled)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`button-toggle-command-${cmd.id}`}
                    >
                      {cmd.isEnabled ? (
                        <ToggleRight className="w-5 h-5 text-primary" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-primary/10"
                      onClick={() => openEditCommand(cmd)}
                      data-testid={`button-edit-command-${cmd.id}`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteCommandId(cmd.id)}
                      data-testid={`button-delete-command-${cmd.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Command Dialog */}
      <Dialog open={showAddCommand} onOpenChange={setShowAddCommand}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">Add Command</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Command (without prefix)</Label>
              <Input
                data-testid="input-command-trigger"
                placeholder="ping, help, info..."
                value={cmdForm.command}
                onChange={(e) => setCmdForm((p) => ({ ...p, command: e.target.value }))}
                className="font-mono bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                data-testid="input-command-description"
                placeholder="What this command does"
                value={cmdForm.description}
                onChange={(e) => setCmdForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Response</Label>
              <Textarea
                data-testid="textarea-command-response"
                placeholder="The message the bot will reply with..."
                value={cmdForm.response}
                onChange={(e) => setCmdForm((p) => ({ ...p, response: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddCommand(false)}>Cancel</Button>
            <Button
              data-testid="button-submit-add-command"
              onClick={handleAddCommand}
              disabled={createCommand.isPending || !cmdForm.command.trim() || !cmdForm.response.trim()}
            >
              {createCommand.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Command Dialog */}
      <Dialog open={editCommandId !== null} onOpenChange={() => setEditCommandId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">Edit Command</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Command</Label>
              <Input
                data-testid="input-edit-command-trigger"
                value={editCmdForm.command}
                onChange={(e) => setEditCmdForm((p) => ({ ...p, command: e.target.value }))}
                className="font-mono bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                data-testid="input-edit-command-description"
                value={editCmdForm.description}
                onChange={(e) => setEditCmdForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Response</Label>
              <Textarea
                data-testid="textarea-edit-command-response"
                value={editCmdForm.response}
                onChange={(e) => setEditCmdForm((p) => ({ ...p, response: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                data-testid="switch-edit-command-enabled"
                checked={editCmdForm.isEnabled}
                onCheckedChange={(c) => setEditCmdForm((p) => ({ ...p, isEnabled: c }))}
              />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditCommandId(null)}>Cancel</Button>
            <Button
              data-testid="button-submit-edit-command"
              onClick={handleEditCommand}
              disabled={updateCommand.isPending}
            >
              {updateCommand.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Command Confirm */}
      <AlertDialog open={deleteCommandId !== null} onOpenChange={() => setDeleteCommandId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Command?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this command from the bot.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-command"
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteCommandId !== null && handleDeleteCommand(deleteCommandId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
