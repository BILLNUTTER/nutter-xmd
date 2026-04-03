# NUTTER-XMD — WhatsApp Bot Management SaaS

## Overview

Full-stack WhatsApp bot management platform. Users can sign up/login via Clerk, deploy and configure WhatsApp bots, set custom commands and auto-replies, and connect bots via QR code. Admins can access a hidden control panel to manage all bots platform-wide.

pnpm workspace monorepo using TypeScript.

## Architecture

- **Frontend**: React + Vite (artifact: `nutter-xmd`, previewPath: `/`)
- **API**: Node.js + Express 5 (artifact: `api-server`)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (frontend + API)
- **Codegen**: Orval from OpenAPI spec

## Pages

- `/` — Landing page (public)
- `/sign-in`, `/sign-up` — Clerk auth pages
- `/dashboard` — Overview with stats (protected)
- `/dashboard/bots` — Bot fleet list, create/delete bots (protected)
- `/dashboard/bots/:id` — Bot detail: QR connect, settings, commands CRUD (protected)
- `/admin?admin=nutterx=true` — Hidden admin panel (admin login required)

## Admin Access

- URL: `/admin?admin=nutterx=true`
- Username: `nutterx`
- Key: `nutterx2025!` (stored in `ADMIN_KEY` env var)
- Token stored in `localStorage["admin_token"]`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Design**: Dark cyberpunk theme, neon green primary (`#00ff66`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## DB Schema

- `bots` — id, userId (Clerk), name, description, prefix, status, phoneNumber, isActive, autoReply, autoReplyMessage, createdAt, updatedAt
- `bot_commands` — id, botId, command, description, response, isEnabled, createdAt, updatedAt

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
