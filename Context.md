# LifeOS — Context

**Purpose:** Living implementation state for agents and developers. Read this before writing code.

**Last updated:** 2026-10-01 (Phase 0 complete)

---

## Current Phase

Phase 1 — Design System + Application Shell

## Status

Phase 0 complete. Implementation of Phase 1 has **not** started.

## Completed

- SRS defined (`SRS.md`)
- SDD defined (`SDD.md`)
- Development plan defined (`DEVELOPMENT_PLAN.md`)
- Phase 0 — Project Initialization
  - `frontend/` React + TypeScript + Vite + React Router + Tailwind CSS
  - `backend/` Node.js + Express + TypeScript with Route → Controller → Service layering
  - `GET /api/health`
  - Vite `/api` proxy to the backend
  - `.gitignore`, `.env.example`, `README.md`
  - `private-storage/` placeholder (no user documents)

## Next Task

Phase 1 — Design System + Application Shell

Do not start Phase 1 until explicitly instructed.

---

## How to run (Phase 0)

Requires Node.js 22+ and npm.

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health: http://localhost:3001/api/health
- Frontend talks to the backend via `/api` (Vite proxy)

Copy env examples before first run:

- `frontend/.env.example` → `frontend/.env`
- `backend/.env.example` → `backend/.env`

Never commit `.env` files.

---

## Rules

- Read `SRS.md` before product decisions.
- Read `SDD.md` before architectural decisions.
- Read `DEVELOPMENT_PLAN.md` before phase work.
- Read `Context.md` before implementation.
- Work only on the current phase.
- Do not invent requirements.
- Do not implement future phases.
- Do not add unnecessary dependencies.
- Never commit secrets.
- Never use real personal documents.
- Keep the application runnable after each phase.
- Update this file when a phase starts, finishes, or changes next task.
- Commit to Git when a phase is stable (when implementation is in progress).

---

## Canonical product reminder

LifeOS is a unified personal life-administration system.

> Calendar tells you when. LifeOS tells you what, why, where, and what to do next.

Stack: React + TypeScript + Vite + React Router + Tailwind (frontend); Node.js + Express + TypeScript (backend); PostgreSQL + Prisma; optional Python/FastAPI AI after core works; private local file storage first.

Protected routes (Phase 1+): `/app/home`, `/app/vault`, `/app/commitments`, `/app/timeline`, `/app/inbox`.

AI is a suggestion layer. Core app must work if AI is unavailable. AI must not access the database.

---

## Implementation log

| Date | Note |
| --- | --- |
| 2026-10-01 | Planning documents created. No frontend, backend, database, or packages initialized. |
| 2026-10-01 | Phase 0 complete: runnable frontend and backend, health check, TypeScript/build verified. No Prisma, auth, product features, or AI. Next: Phase 1 (not started). |
