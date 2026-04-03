/**
 * Vercel Serverless Function — Express API Handler
 *
 * This file wraps the Express app so all /api/* routes work as
 * Vercel serverless functions. The WhatsApp bot's persistent
 * WebSocket connection (Baileys) is NOT started here — it requires
 * a persistent server. Use Replit Deployments for the full bot experience.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../artifacts/api-server/src/app";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
