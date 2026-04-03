import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, botsTable, botCommandsTable } from "@workspace/db";
import {
  AdminLoginBody,
  AdminActivateBotParams,
  AdminDeactivateBotParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "nutterx";
const ADMIN_KEY = process.env.ADMIN_KEY || "nutterx2025!";
const ADMIN_TOKEN = `${ADMIN_USERNAME}:${ADMIN_KEY}:admin`;

const requireAdminAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

router.post("/admin/login", async (req: any, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.username !== ADMIN_USERNAME || parsed.data.key !== ADMIN_KEY) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.json({
    token: ADMIN_TOKEN,
    message: "Admin login successful",
  });
});

router.get("/admin/bots", requireAdminAuth, async (_req, res): Promise<void> => {
  const bots = await db
    .select()
    .from(botsTable)
    .orderBy(botsTable.createdAt);

  res.json(bots.map((b) => ({
    id: b.id,
    userId: b.userId,
    name: b.name,
    status: b.status,
    isActive: b.isActive,
    phoneNumber: b.phoneNumber,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  })));
});

router.post("/admin/bots/:id/activate", requireAdminAuth, async (req: any, res): Promise<void> => {
  const params = AdminActivateBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bot] = await db
    .update(botsTable)
    .set({ isActive: true })
    .where(eq(botsTable.id, params.data.id))
    .returning();

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  res.json({
    id: bot.id,
    userId: bot.userId,
    name: bot.name,
    status: bot.status,
    isActive: bot.isActive,
    phoneNumber: bot.phoneNumber,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  });
});

router.post("/admin/bots/:id/deactivate", requireAdminAuth, async (req: any, res): Promise<void> => {
  const params = AdminDeactivateBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [bot] = await db
    .update(botsTable)
    .set({ isActive: false })
    .where(eq(botsTable.id, params.data.id))
    .returning();

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  res.json({
    id: bot.id,
    userId: bot.userId,
    name: bot.name,
    status: bot.status,
    isActive: bot.isActive,
    phoneNumber: bot.phoneNumber,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  });
});

router.get("/admin/stats", requireAdminAuth, async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable);
  const totalBots = bots.length;
  const activeBots = bots.filter((b) => b.isActive).length;
  const onlineBots = bots.filter((b) => b.status === "online").length;

  const commandRows = await db.select({ count: count() }).from(botCommandsTable);
  const totalCommands = commandRows[0]?.count ?? 0;

  const uniqueUserIds = new Set(bots.map((b) => b.userId));
  const totalUsers = uniqueUserIds.size;

  res.json({ totalUsers, totalBots, activeBots, onlineBots, totalCommands });
});

export default router;
