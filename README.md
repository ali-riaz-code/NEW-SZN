# NEW SZN

Agency performance dashboard for digital marketing agencies. See [NEW_SZN_Project_Scope.pdf](NEW_SZN_Project_Scope.pdf) for the product spec and [CLAUDE.md](CLAUDE.md) for engineering guidance.

## Monorepo layout

```
apps/
  web/        Next.js + TypeScript + Tailwind (UI, dashboards, auth pages)
  api/        Express + TypeScript (REST API, cron jobs, integrations)
packages/
  db/         Prisma schema + client (shared)
  types/      Shared TypeScript types (roles, currency, …)
docs/         Feature specs referenced by CLAUDE.md
```

A **separate Express service** (not Next.js route handlers) hosts the API because the product relies on background work that doesn't fit serverless: hourly Facebook ad sync, 4-hour anomaly detection, daily morning Slack DMs, and scheduled PDF reports.

## Getting started

```bash
npm install                 # installs all workspaces
cp .env.example .env        # then fill in real values
npm run prisma:generate     # generate the Prisma client
npm run dev                 # starts web (Next.js) + api (Express) together
```

| Command | What it does |
|---|---|
| `npm run dev` | Run web + api concurrently |
| `npm run build` | Generate Prisma client, build web and api |
| `npm run test` | Run workspace tests (none yet) |
| `npm run typecheck` | Type-check all workspaces |
| `npx prisma migrate dev` | Create/apply a migration (schema at `packages/db/prisma/schema.prisma`) |
| `npx prisma studio` | Inspect the DB locally |

## ⚠️ OneDrive note

This folder is under OneDrive. `node_modules/` is gitignored, but OneDrive may still try to sync it (slow, and can cause file-lock build errors). Consider excluding this folder from OneDrive sync, or move the project to a non-synced path (e.g. `C:\dev\new-szn`).

## Status

Greenfield scaffold. The data model is an empty Prisma init — models are added per feature. Integration and cron modules under `apps/api/src` are stubs marked `TODO`.
