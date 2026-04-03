import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import path from "path";
import { mkdirSync, existsSync } from "fs";
import { eq } from "drizzle-orm";
import { db, botsTable } from "@workspace/db";

const SESSIONS_DIR = path.join(process.cwd(), "sessions");

if (!existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

interface SessionEntry {
  socket: WASocket | null;
  qrCode: string | null;
  status: "offline" | "connecting" | "online";
  pairingCodeResolver: ((code: string) => void) | null;
}

const activeSessions = new Map<string, SessionEntry>();

function getSessionDir(userId: string) {
  const dir = path.join(SESSIONS_DIR, userId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getOrCreateEntry(userId: string): SessionEntry {
  if (!activeSessions.has(userId)) {
    activeSessions.set(userId, {
      socket: null,
      qrCode: null,
      status: "offline",
      pairingCodeResolver: null,
    });
  }
  return activeSessions.get(userId)!;
}

async function getBotPrefix(userId: string): Promise<string> {
  try {
    const [bot] = await db.select().from(botsTable).where(eq(botsTable.userId, userId)).limit(1);
    return bot?.prefix ?? "!";
  } catch {
    return "!";
  }
}

function jidFromPhone(phoneOrJid: string): string {
  const clean = phoneOrJid.split(":")[0].replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

async function sendStartupMessage(sock: WASocket, userId: string, selfJid: string) {
  try {
    const prefix = await getBotPrefix(userId);

    const msg =
      `*NUTTER-XMD* is now *online* 🟢\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *Prefix:* \`${prefix}\`\n` +
      `🔋 *Status:* Active & Ready\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `> *Quick commands:*\n` +
      `▸ \`${prefix}ping\` — Check bot speed\n` +
      `▸ \`${prefix}test\` — Run a system test\n\n` +
      `_Powered by NUTTER-XMD_ ⚡`;

    await sock.sendMessage(selfJid, { text: msg });
  } catch {
  }
}

async function handleCommand(
  sock: WASocket,
  userId: string,
  jid: string,
  text: string,
  prefix: string,
  sentAt: number
) {
  const lower = text.trim().toLowerCase();

  if (lower === `${prefix}ping`) {
    const latency = Date.now() - sentAt;
    await sock.sendMessage(jid, {
      text: `🏓 *Pong!*\n\nBot speed: *${latency}ms*\nStatus: Online ✅`,
    });
    return;
  }

  if (lower === `${prefix}test`) {
    const prefix_ = await getBotPrefix(userId);
    await sock.sendMessage(jid, {
      text:
        `✅ *NUTTER-XMD System Test*\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🔌 *Connection:* Stable\n` +
        `📡 *Server:* Online\n` +
        `🔑 *Prefix:* \`${prefix_}\`\n` +
        `⏱ *Uptime:* Active\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `_All systems operational_ ⚡`,
    });
    return;
  }
}

async function startSocket(
  userId: string,
  entry: SessionEntry,
  onStatusChange?: (status: "offline" | "connecting" | "online") => void
): Promise<WASocket> {
  const sessionDir = getSessionDir(userId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS("Chrome"),
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    logger: {
      level: "silent",
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      child: () => ({
        level: "silent",
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        child: () => ({} as any),
        fatal: () => {},
      }),
      fatal: () => {},
    } as any,
  });

  entry.socket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        entry.qrCode = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
      } catch {
        entry.qrCode = qr;
      }
      entry.status = "connecting";
      onStatusChange?.("connecting");
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      entry.status = "offline";
      entry.qrCode = null;
      entry.socket = null;
      onStatusChange?.("offline");

      if (shouldReconnect) {
        const newEntry = getOrCreateEntry(userId);
        await startSocket(userId, newEntry, onStatusChange);
      } else {
        activeSessions.delete(userId);
      }
    }

    if (connection === "open") {
      entry.status = "online";
      entry.qrCode = null;
      onStatusChange?.("online");

      // Update bot status in DB
      try {
        const selfId = sock.user?.id;
        await db
          .update(botsTable)
          .set({
            status: "online",
            phoneNumber: selfId ? jidFromPhone(selfId).replace("@s.whatsapp.net", "") : undefined,
          })
          .where(eq(botsTable.userId, userId));
      } catch {}

      // Send startup message to self
      if (sock.user?.id) {
        const selfJid = jidFromPhone(sock.user.id);
        setTimeout(() => sendStartupMessage(sock, userId, selfJid), 2000);
      }
    }
  });

  // Message handler — process commands
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;
      // Skip status broadcasts and empty JIDs
      if (!msg.key.remoteJid || msg.key.remoteJid === "status@broadcast") continue;

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (!body.trim()) continue;

      const prefix = await getBotPrefix(userId);

      if (!body.startsWith(prefix)) continue;

      const jid = msg.key.remoteJid;
      const sentAt = (msg.messageTimestamp as number) * 1000 || Date.now();

      await handleCommand(sock, userId, jid, body, prefix, sentAt);
    }
  });

  return sock;
}

export async function requestQRCode(
  userId: string
): Promise<{ qrCode: string | null; status: string }> {
  const entry = getOrCreateEntry(userId);

  if (entry.status === "online") {
    return { qrCode: null, status: "online" };
  }

  if (entry.status === "connecting" && entry.qrCode) {
    return { qrCode: entry.qrCode, status: "connecting" };
  }

  if (!entry.socket) {
    await startSocket(userId, entry);
    await new Promise((r) => setTimeout(r, 3000));
  }

  return {
    qrCode: entry.qrCode,
    status: entry.qrCode ? "connecting" : entry.status,
  };
}

export async function requestPairingCode(
  userId: string,
  phoneNumber: string
): Promise<string> {
  const entry = getOrCreateEntry(userId);

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  if (!cleanPhone || cleanPhone.length < 7) {
    throw new Error("Invalid phone number");
  }

  let sock = entry.socket;

  if (!sock || entry.status === "offline") {
    sock = await startSocket(userId, entry);
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (entry.status === "online") {
    throw new Error("Already connected");
  }

  const code = await sock!.requestPairingCode(cleanPhone);
  return code;
}

export async function disconnectSession(userId: string): Promise<void> {
  const entry = activeSessions.get(userId);
  if (entry?.socket) {
    try {
      await entry.socket.logout();
    } catch {}
    entry.socket = null;
    entry.status = "offline";
    entry.qrCode = null;
  }
  activeSessions.delete(userId);

  const sessionDir = getSessionDir(userId);
  if (existsSync(sessionDir)) {
    const { rm } = await import("fs/promises");
    await rm(sessionDir, { recursive: true, force: true });
  }
}

export function getSessionStatus(userId: string): "offline" | "connecting" | "online" {
  return activeSessions.get(userId)?.status ?? "offline";
}
