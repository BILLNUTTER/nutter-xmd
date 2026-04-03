import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botCommandsTable = pgTable("bot_commands", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull(),
  command: text("command").notNull(),
  description: text("description"),
  response: text("response").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBotCommandSchema = createInsertSchema(botCommandsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBotCommand = z.infer<typeof insertBotCommandSchema>;
export type BotCommand = typeof botCommandsTable.$inferSelect;
