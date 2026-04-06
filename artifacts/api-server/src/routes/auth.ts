import { Router } from "express";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { requireAuth, signToken } from "../middlewares/jwtMiddleware.js";

const router = Router();

// ── DB SAFETY HELPERS ─────────────────────────────────────────────

async function safeDb<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.warn("⚠️ DB retry...");
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return safeDb(fn, retries - 1);
    }
    throw e;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("DB timeout")), ms)
    ),
  ]);
}

// ── REGISTER ─────────────────────────────────────────────────────

router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, email, password } = req.body ?? {};

  if (!username || !email || !password) {
    res.status(400).json({ error: "username, email and password are required." });
    return;
  }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    res.status(400).json({
      error: "Username must be 3-30 characters: letters, numbers or underscores only.",
    });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  try {
    const existing = await safeDb(() =>
      withTimeout(
        db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(
            or(
              eq(usersTable.username, username.toLowerCase()),
              eq(usersTable.email, email.toLowerCase())
            )
          )
          .limit(1)
      )
    );

    if (existing.length > 0) {
      res.status(409).json({ error: "Username or email is already taken." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await safeDb(() =>
      withTimeout(
        db
          .insert(usersTable)
          .values({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            passwordHash,
          })
          .returning({
            id: usersTable.id,
            username: usersTable.username,
            email: usersTable.email,
          })
      )
    );

    const user = result[0];

    const token = signToken({
      userId: String(user.id),
      username: user.username,
      email: user.email,
    });

    res.status(201).json({
      token,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error("[auth/register]", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ── LOGIN ────────────────────────────────────────────────────────

router.post("/auth/login", async (req, res): Promise<void> => {
  const { login, password } = req.body ?? {};

  if (!login || !password) {
    res.status(400).json({ error: "Email/username and password are required." });
    return;
  }

  try {
    const isEmail = login.includes("@");

    const result = await safeDb(() =>
      withTimeout(
        db
          .select()
          .from(usersTable)
          .where(
            isEmail
              ? eq(usersTable.email, login.toLowerCase())
              : eq(usersTable.username, login.toLowerCase())
          )
          .limit(1)
      )
    );

    const user = result[0];

    if (!user) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const token = signToken({
      userId: String(user.id),
      username: user.username,
      email: user.email,
    });

    res.json({
      token,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error("[auth/login]", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── ME ───────────────────────────────────────────────────────────

router.get("/auth/me", requireAuth, (req, res): void => {
  res.json({
    userId: req.userId,
    username: req.username,
    email: req.userEmail,
  });
});

export default router;
