import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  BufferJSON,
  initAuthCreds,
  type WASocket,
  type SignalDataTypeMap,
  type AuthenticationCreds,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db, botsTable, whatsappAuthTable } from "@workspace/db";
import { handleCommand } from "../commands/index";

// Messages older than this timestamp (set at module load) are ignored when the
// bot reconnects to avoid executing a backlog of stale commands.
const BOT_STARTED_AT = Date.now();

interface SessionEntry {
  socket: WASocket | null;
  qrCode: string | null;
  status: "offline" | "connecting" | "online";
  pairingCodeResolver: ((code: string) => void) | null;
}

const activeSessions = new Map<string, SessionEntry>();

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

async function getBotSettings(userId: string) {
  try {
    const [bot] = await db.select().from(botsTable).where(eq(botsTable.userId, userId)).limit(1);
    return {
      prefix: bot?.prefix ?? "!",
      mode: bot?.mode ?? "public",
      autoRead: bot?.autoRead ?? false,
      typingStatus: bot?.typingStatus ?? false,
      alwaysOnline: bot?.alwaysOnline ?? false,
      antiCall: bot?.antiCall ?? false,
      antiLink: bot?.antiLink ?? false,
      antiSticker: bot?.antiSticker ?? false,
      antiTag: bot?.antiTag ?? false,
      antiBadWord: bot?.antiBadWord ?? false,
      badWords: bot?.badWords ?? "",
      autoReply: bot?.autoReply ?? false,
      autoReplyMessage: bot?.autoReplyMessage ?? "",
      welcomeMessage: bot?.welcomeMessage ?? false,
      goodbyeMessage: bot?.goodbyeMessage ?? false,
      autoViewStatus: bot?.autoViewStatus ?? false,
      autoLikeStatus: bot?.autoLikeStatus ?? false,
    };
  } catch {
    return {
      prefix: "!", mode: "public", autoRead: false, typingStatus: false,
      alwaysOnline: false, antiCall: false, antiLink: false,
      antiSticker: false, antiTag: false, antiBadWord: false, badWords: "",
      autoReply: false, autoReplyMessage: "", welcomeMessage: false,
      goodbyeMessage: false, autoViewStatus: false, autoLikeStatus: false,
    };
  }
}

function jidFromPhone(phoneOrJid: string): string {
  const clean = phoneOrJid.split(":")[0].replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s]+|chat\.whatsapp\.com\/[^\s]+/i;

function containsLink(text: string): boolean {
  return LINK_REGEX.test(text);
}

function containsBadWord(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => w && lower.includes(w.toLowerCase()));
}

async function isBotAdmin(sock: WASocket, groupJid: string, botJid: string): Promise<boolean> {
  try {
    const { participants } = await sock.groupMetadata(groupJid);
    const botNum = botJid.split(":")[0].replace(/[^0-9]/g, "");
    const me = participants.find((p) => p.id.split(":")[0].replace(/[^0-9]/g, "") === botNum);
    return me?.admin === "admin" || me?.admin === "superadmin";
  } catch {
    return false;
  }
}

// ── Startup message ───────────────────────────────────────────────────────────

async function sendStartupMessage(sock: WASocket, userId: string, selfJid: string) {
  try {
    const { prefix } = await getBotSettings(userId);
    const msg =
      `*NUTTER-XMD* is now *online* 🟢\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *Prefix:* \`${prefix}\`\n` +
      `🔋 *Status:* Active & Ready\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `> *Quick commands:*\n` +
      `▸ \`${prefix}menu\` — Full command menu\n` +
      `▸ \`${prefix}ping\` — Check bot speed\n\n` +
      `_Powered by NUTTER-XMD_ ⚡`;
    await sock.sendMessage(selfJid, { text: msg });
  } catch {}
}

// ─── Database-backed auth state ───────────────────────────────────────────────

async function useDatabaseAuthState(userId: string) {
  const rows = await db
    .select()
    .from(whatsappAuthTable)
    .where(eq(whatsappAuthTable.userId, userId))
    .limit(1);

  const existing = rows[0];

  const creds: AuthenticationCreds = existing?.creds
    ? JSON.parse(existing.creds, BufferJSON.reviver)
    : initAuthCreds();

  const keysMap: Record<string, any> = existing?.keys
    ? JSON.parse(existing.keys, BufferJSON.reviver)
    : {};

  async function persistToDb() {
    const credsStr = JSON.stringify(creds, BufferJSON.replacer);
    const keysStr = JSON.stringify(keysMap, BufferJSON.replacer);
    await db
      .insert(whatsappAuthTable)
      .values({ userId, creds: credsStr, keys: keysStr })
      .onConflictDoUpdate({
        target: whatsappAuthTable.userId,
        set: { creds: credsStr, keys: keysStr },
      });
  }

  const keys = {
    get: async <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[]
    ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      for (const id of ids) {
        const val = keysMap[`${type}/${id}`];
        if (val !== undefined) result[id] = val;
      }
      return result;
    },
    set: async (data: {
      [T in keyof SignalDataTypeMap]?: { [id: string]: SignalDataTypeMap[T] | null };
    }) => {
      for (const type in data) {
        const entries = (data as any)[type];
        for (const id in entries) {
          const val = entries[id];
          const k = `${type}/${id}`;
          if (val != null) {
            keysMap[k] = val;
          } else {
            delete keysMap[k];
          }
        }
      }
      await persistToDb();
    },
  };

  return {
    state: { creds, keys },
    saveCreds: async () => {
      await persistToDb();
    },
  };
}

export async function clearDatabaseAuthState(userId: string) {
  await db
    .delete(whatsappAuthTable)
    .where(eq(whatsappAuthTable.userId, userId));
}

// ─── Socket lifecycle ─────────────────────────────────────────────────────────

async function startSocket(
  userId: string,
  entry: SessionEntry,
  onStatusChange?: (status: "offline" | "connecting" | "online") => void
): Promise<WASocket> {
  const { state, saveCreds } = await useDatabaseAuthState(userId);
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

  // ── Connection state ──────────────────────────────────────────────────────
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
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;

      entry.status = "offline";
      entry.qrCode = null;
      entry.socket = null;
      onStatusChange?.("offline");

      if (loggedOut) {
        await clearDatabaseAuthState(userId);
        activeSessions.delete(userId);
      } else {
        const newEntry = getOrCreateEntry(userId);
        setTimeout(() => startSocket(userId, newEntry, onStatusChange), 3000);
      }
    }

    if (connection === "open") {
      entry.status = "online";
      entry.qrCode = null;
      onStatusChange?.("online");

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

      if (sock.user?.id) {
        const selfJid = jidFromPhone(sock.user.id);
        setTimeout(() => sendStartupMessage(sock, userId, selfJid), 2000);
      }
    }
  });

  // ── Incoming calls ────────────────────────────────────────────────────────
  sock.ev.on("call", async (calls) => {
    for (const call of calls) {
      const { antiCall } = await getBotSettings(userId);
      if (antiCall && call.status === "offer") {
        try {
          await sock.rejectCall(call.id, call.from);
          await sock.sendMessage(call.from, {
            text: "🚫 Calls are not allowed in this chat.",
          });
        } catch {}
      }
    }
  });

  // ── Group participant events (welcome / goodbye) ───────────────────────────
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    const settings = await getBotSettings(userId);
    const botJid = sock.user?.id ?? "";
    const botNum = botJid.split(":")[0].replace(/[^0-9]/g, "");

    for (const participant of participants) {
      // Never send welcome/goodbye for the bot itself
      if (participant.replace(/[^0-9]/g, "") === botNum) continue;

      if (action === "add" && settings.welcomeMessage) {
        let ppUrl: string | null = null;
        try {
          ppUrl = await sock.profilePictureUrl(participant, "image");
        } catch {}

        const caption =
          `🎉 *Welcome to the group!*\n\n` +
          `Hey @${participant.split("@")[0]}! 👋\n\n` +
          `We're so glad you're here. Please read the group rules,\n` +
          `be respectful, and enjoy your stay! 🌟\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `_Powered by NUTTER-XMD_ ⚡`;

        try {
          if (ppUrl) {
            await sock.sendMessage(id, {
              image: { url: ppUrl },
              caption,
              mentions: [participant],
            });
          } else {
            await sock.sendMessage(id, {
              text: caption,
              mentions: [participant],
            });
          }
        } catch {}
      }

      if ((action === "remove" || action === "leave") && settings.goodbyeMessage) {
        try {
          await sock.sendMessage(id, {
            text:
              `👋 *Goodbye!*\n\n` +
              `@${participant.split("@")[0]} has left the group.\n\n` +
              `Thanks for being part of us!\n` +
              `_— NUTTER-XMD_ ✨`,
            mentions: [participant],
          });
        } catch {}
      }
    }
  });

  // ── Messages ──────────────────────────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (!msg.key.remoteJid) continue;

      const jid = msg.key.remoteJid;
      const sentAt = (msg.messageTimestamp as number) * 1000 || Date.now();

      // ── Status broadcast (auto-view / auto-like) ──────────────────────────
      if (jid === "status@broadcast") {
        if (sentAt >= BOT_STARTED_AT - 15_000) {
          const settings = await getBotSettings(userId);
          if (settings.autoViewStatus) {
            try { await sock.readMessages([msg.key]); } catch {}
          }
          if (settings.autoLikeStatus && msg.key.participant) {
            try {
              // React with ❤️ to the status — sent to the status poster's JID
              await sock.sendMessage(msg.key.participant, {
                react: {
                  text: "❤️",
                  key: { ...msg.key, remoteJid: "status@broadcast" },
                },
              });
            } catch {}
          }
        }
        continue;
      }

      // ── Stale-message guard ───────────────────────────────────────────────
      if (sentAt < BOT_STARTED_AT - 15_000) continue;

      // ── Skip protocol noise ───────────────────────────────────────────────
      const m = msg.message;
      if (
        m.protocolMessage ||
        m.reactionMessage ||
        m.pollUpdateMessage ||
        m.keepInChatMessage
      ) continue;

      const settings = await getBotSettings(userId);
      const isGroup = jid.endsWith("@g.us");
      const botJid = sock.user?.id ?? "";
      const senderJid = msg.key.fromMe
        ? botJid
        : (msg.key.participant ?? msg.key.remoteJid ?? "");

      // Auto-read
      if (settings.autoRead) {
        try { await sock.readMessages([msg.key]); } catch {}
      }

      // Always online presence
      if (settings.alwaysOnline) {
        try { await sock.sendPresenceUpdate("available", jid); } catch {}
      }

      // ── Antisticker (must run before body extraction since stickers have no text) ──
      if (isGroup && !msg.key.fromMe && settings.antiSticker && m.stickerMessage) {
        const botIsAdmin = await isBotAdmin(sock, jid, botJid);
        if (botIsAdmin) {
          try { await sock.sendMessage(jid, { delete: msg.key }); } catch {}
          continue;
        }
      }

      // ── Body extraction — handles all WhatsApp message wrappers ──────────
      const body =
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.documentMessage?.caption ||
        m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
        m.viewOnceMessage?.message?.imageMessage?.caption ||
        m.viewOnceMessage?.message?.videoMessage?.caption ||
        m.viewOnceMessageV2?.message?.imageMessage?.caption ||
        m.viewOnceMessageV2?.message?.videoMessage?.caption ||
        m.ephemeralMessage?.message?.conversation ||
        m.ephemeralMessage?.message?.extendedTextMessage?.text ||
        m.buttonsResponseMessage?.selectedDisplayText ||
        m.listResponseMessage?.title ||
        m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
        m.templateButtonReplyMessage?.selectedDisplayText ||
        "";

      // ── Group moderation (antilink / antitag / antibadword) ───────────────
      if (isGroup && !msg.key.fromMe && body) {
        // Antilink — only acts when bot is admin
        if (settings.antiLink && containsLink(body)) {
          const botIsAdmin = await isBotAdmin(sock, jid, botJid);
          if (botIsAdmin) {
            try {
              await sock.sendMessage(jid, { delete: msg.key });
              await sock.sendMessage(jid, {
                text: "🔗 *Links are not allowed in this group.*",
              });
            } catch {}
            continue;
          }
        }

        // Antitag — delete mass-mention messages (>= 5 mentions), bot must be admin
        if (settings.antiTag) {
          const mentionedJids =
            m.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
          if (mentionedJids.length >= 5) {
            const botIsAdmin = await isBotAdmin(sock, jid, botJid);
            if (botIsAdmin) {
              try {
                await sock.sendMessage(jid, { delete: msg.key });
                await sock.sendMessage(jid, {
                  text: "🚫 *Mass tagging is not allowed in this group.*",
                });
              } catch {}
              continue;
            }
          }
        }

        // Antibadword — delete + kick, bot must be admin
        if (settings.antiBadWord && settings.badWords) {
          const wordsList = settings.badWords
            .split(",")
            .map((w) => w.trim())
            .filter(Boolean);
          if (wordsList.length > 0 && containsBadWord(body, wordsList)) {
            const botIsAdmin = await isBotAdmin(sock, jid, botJid);
            if (botIsAdmin) {
              try {
                await sock.sendMessage(jid, { delete: msg.key });
                await sock.sendMessage(jid, {
                  text: `⚠️ @${senderJid.split("@")[0]} was removed for using inappropriate language.`,
                  mentions: [senderJid],
                });
                await sock.groupParticipantsUpdate(jid, [senderJid], "remove");
              } catch {}
              continue;
            }
          }
        }
      }

      if (!body.trim()) continue;

      console.log(`[msg] jid=${jid} fromMe=${msg.key.fromMe} body="${body.slice(0, 80)}"`);

      // ── Typing / recording indicator when processing a command ────────────
      if (settings.typingStatus && body.startsWith(settings.prefix)) {
        try {
          await sock.sendPresenceUpdate("composing", jid);
        } catch {}
        setTimeout(async () => {
          try { await sock.sendPresenceUpdate("paused", jid); } catch {}
        }, 3000);
      }

      // ── Command dispatch ──────────────────────────────────────────────────
      if (body.startsWith(settings.prefix)) {
        await handleCommand(sock, userId, jid, body, settings.prefix, sentAt, msg, settings.mode);
        continue;
      }

      // ── Auto-reply chatbot (DMs only, not from bot itself) ────────────────
      if (settings.autoReply && !msg.key.fromMe && !isGroup) {
        const replyMsg =
          settings.autoReplyMessage || "I'm currently unavailable. Please try later.";
        try { await sock.sendMessage(jid, { text: replyMsg }); } catch {}
      }
    }
  });

  return sock;
}

// ─── Auto-reconnect on server startup ─────────────────────────────────────────

export async function reconnectAllSavedSessions() {
  try {
    const saved = await db.select().from(whatsappAuthTable);
    if (saved.length === 0) return;

    console.log(`[whatsapp] Auto-reconnecting ${saved.length} saved session(s)...`);

    for (const row of saved) {
      if (!row.creds) continue;

      const entry = getOrCreateEntry(row.userId);
      if (entry.socket) continue;

      startSocket(row.userId, entry).catch((err) => {
        console.error(`[whatsapp] Failed to reconnect session for ${row.userId}:`, err);
      });

      await new Promise((r) => setTimeout(r, 1500));
    }
  } catch (err) {
    console.error("[whatsapp] Auto-reconnect error:", err);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

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

  await clearDatabaseAuthState(userId);

  try {
    await db
      .update(botsTable)
      .set({ status: "offline", phoneNumber: null })
      .where(eq(botsTable.userId, userId));
  } catch {}
}

export function getSessionStatus(userId: string): "offline" | "connecting" | "online" {
  return activeSessions.get(userId)?.status ?? "offline";
}
