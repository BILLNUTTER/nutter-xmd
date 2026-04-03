import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, botsTable, botCommandsTable } from "@workspace/db";
import {
  CreateBotBody,
  UpdateBotBody,
  GetBotParams,
  UpdateBotParams,
  DeleteBotParams,
  GetBotQRParams,
  DisconnectBotParams,
  ListBotCommandsParams,
  CreateBotCommandParams,
  CreateBotCommandBody,
  UpdateBotCommandParams,
  UpdateBotCommandBody,
  DeleteBotCommandParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};

router.get("/bots", requireAuth, async (req: any, res): Promise<void> => {
  const bots = await db
    .select()
    .from(botsTable)
    .where(eq(botsTable.userId, req.userId))
    .orderBy(botsTable.createdAt);
  res.json(bots);
});

router.post("/bots", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = CreateBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bot] = await db
    .insert(botsTable)
    .values({
      ...parsed.data,
      userId: req.userId,
      status: "offline",
    })
    .returning();

  res.status(201).json(bot);
});

router.get("/bots/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bot] = await db
    .select()
    .from(botsTable)
    .where(and(eq(botsTable.id, params.data.id), eq(botsTable.userId, req.userId)));

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  res.json(bot);
});

router.patch("/bots/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bot] = await db
    .update(botsTable)
    .set(parsed.data)
    .where(and(eq(botsTable.id, params.data.id), eq(botsTable.userId, req.userId)))
    .returning();

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  res.json(bot);
});

router.delete("/bots/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = DeleteBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(botCommandsTable)
    .where(eq(botCommandsTable.botId, params.data.id));

  const [bot] = await db
    .delete(botsTable)
    .where(and(eq(botsTable.id, params.data.id), eq(botsTable.userId, req.userId)))
    .returning();

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/bots/:id/qr", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetBotQRParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bot] = await db
    .select()
    .from(botsTable)
    .where(and(eq(botsTable.id, params.data.id), eq(botsTable.userId, req.userId)));

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  if (bot.status === "online") {
    res.json({ status: "connected", qrCode: null });
    return;
  }

  await db
    .update(botsTable)
    .set({ status: "connecting" })
    .where(eq(botsTable.id, params.data.id));

  res.json({
    status: "pending",
    qrCode: null,
  });
});

router.post("/bots/:id/disconnect", requireAuth, async (req: any, res): Promise<void> => {
  const params = DisconnectBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bot] = await db
    .update(botsTable)
    .set({ status: "offline", phoneNumber: null, sessionData: null })
    .where(and(eq(botsTable.id, params.data.id), eq(botsTable.userId, req.userId)))
    .returning();

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  res.json(bot);
});

router.get("/bots/:id/commands", requireAuth, async (req: any, res): Promise<void> => {
  const params = ListBotCommandsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bot] = await db
    .select()
    .from(botsTable)
    .where(and(eq(botsTable.id, params.data.id), eq(botsTable.userId, req.userId)));

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const commands = await db
    .select()
    .from(botCommandsTable)
    .where(eq(botCommandsTable.botId, params.data.id))
    .orderBy(botCommandsTable.createdAt);

  res.json(commands);
});

router.post("/bots/:id/commands", requireAuth, async (req: any, res): Promise<void> => {
  const params = CreateBotCommandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateBotCommandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bot] = await db
    .select()
    .from(botsTable)
    .where(and(eq(botsTable.id, params.data.id), eq(botsTable.userId, req.userId)));

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const [command] = await db
    .insert(botCommandsTable)
    .values({
      botId: params.data.id,
      command: parsed.data.command,
      description: parsed.data.description ?? null,
      response: parsed.data.response,
      isEnabled: parsed.data.isEnabled ?? true,
    })
    .returning();

  res.status(201).json(command);
});

router.patch("/bots/:id/commands/:commandId", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateBotCommandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBotCommandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bot] = await db
    .select()
    .from(botsTable)
    .where(and(eq(botsTable.id, params.data.id), eq(botsTable.userId, req.userId)));

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const [command] = await db
    .update(botCommandsTable)
    .set(parsed.data)
    .where(and(eq(botCommandsTable.id, params.data.commandId), eq(botCommandsTable.botId, params.data.id)))
    .returning();

  if (!command) {
    res.status(404).json({ error: "Command not found" });
    return;
  }

  res.json(command);
});

router.delete("/bots/:id/commands/:commandId", requireAuth, async (req: any, res): Promise<void> => {
  const params = DeleteBotCommandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bot] = await db
    .select()
    .from(botsTable)
    .where(and(eq(botsTable.id, params.data.id), eq(botsTable.userId, req.userId)));

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const [command] = await db
    .delete(botCommandsTable)
    .where(and(eq(botCommandsTable.id, params.data.commandId), eq(botCommandsTable.botId, params.data.id)))
    .returning();

  if (!command) {
    res.status(404).json({ error: "Command not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/dashboard/stats", requireAuth, async (req: any, res): Promise<void> => {
  const bots = await db
    .select()
    .from(botsTable)
    .where(eq(botsTable.userId, req.userId));

  const totalBots = bots.length;
  const activeBots = bots.filter((b) => b.isActive).length;
  const onlineBots = bots.filter((b) => b.status === "online").length;

  const botIds = bots.map((b) => b.id);
  let totalCommands = 0;
  if (botIds.length > 0) {
    const commandRows = await db
      .select({ count: count() })
      .from(botCommandsTable)
      .where(
        botIds.length === 1
          ? eq(botCommandsTable.botId, botIds[0])
          : eq(botCommandsTable.botId, botIds[0])
      );
    totalCommands = commandRows[0]?.count ?? 0;
  }

  res.json({ totalBots, activeBots, onlineBots, totalCommands });
});

export default router;
