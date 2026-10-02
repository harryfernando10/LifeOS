# LifeOS — Context

**Purpose:** Living implementation state for agents and developers. Read this before writing code.

**Last updated:** 2026-10-02 (Phase 1 complete)

---

## Current Phase

Phase 2 — Database + Backend Foundation

## Status

Phase 1 complete. Design system, auth UI screens, and protected application shell are in place. Real authentication is not wired yet (Phase 3).

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
- Phase 1 — Design System + Application Shell
  - Visual tokens (cool slate/teal palette), Syne + Figtree typography
  - UI primitives: `Button`, `Input`, `PageHeader`
  - Login (`/login`) and Register (`/register`) screens as UI only
  - Placeholder client session via `sessionStorage` (not real auth)
  - Protected shell with nav: Home, Vault, Commitments, Timeline, Inbox
  - Routes: `/app/home`, `/app/vault`, `/app/commitments`, `/app/timeline`, `/app/inbox`
  - Calm empty-state placeholders (no fake Action Center data)

## Next Task

Phase 2 — Database + Backend Foundation

Do not start Phase 2 until explicitly instructed.

---

## How to run

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

**Phase 1 UI note:** Sign in / Create account only set a local placeholder session so the `/app/*` shell is reachable. Passwords are not verified or stored. Replace in Phase 3.

---

## Important files (Phase 1)

- `frontend/src/index.css` — design tokens and canvas atmosphere
- `frontend/src/auth/AuthContext.tsx` — placeholder session (Phase 3 will replace)
- `frontend/src/auth/ProtectedRoute.tsx` — redirects unauthenticated users to `/login`
- `frontend/src/components/layout/AppShell.tsx` — app chrome + navigation
- `frontend/src/components/ui/*` — Button, Input, PageHeader
- `frontend/src/pages/*` — Login, Register, Home, Vault, Commitments, Timeline, Inbox
- `frontend/src/App.tsx` — route map
- `frontend/index.html` — font loading

## API / database changes

None in Phase 1. Backend still only exposes `GET /api/health`.

## Tests / checks performed

- Frontend `tsc -b` and `vite build` — pass
- Backend `tsc --noEmit` and `tsc` build — pass
- Backend health `GET /api/health` — `{ status: "ok", service: "lifeos-backend" }`
- Vite proxy `/api/health` — ok
- SPA routes return HTTP 200: `/login`, `/register`, `/app/home`, `/app/vault`, `/app/commitments`, `/app/timeline`, `/app/inbox`

## Git state

- Repository initialized locally on 2026-10-02
- Phase 0 commit: `chore: initialize LifeOS frontend and backend foundations`
- Phase 1 commit expected after this update
- No remote configured; do not push unless explicitly requested

## Known issues / blockers

- System `npm` may be missing from PATH in some agent shells; local `node_modules/.bin` tools still work when Node is available
- Placeholder auth is intentionally insecure for shell demos only — must not ship as real auth

## Architectural decisions

- Cool slate canvas + muted teal accent (avoid cream/terracotta and purple defaults)
- Client-side placeholder session until Phase 3 HTTP-only cookies
- Inbox route is a shell only; full Life Inbox remains post-MVP (Phase 14)

## Exact next phase

**Phase 2 — Database + Backend Foundation** (PostgreSQL + Prisma, layered backend readiness, health/readiness with DB connectivity)

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

Protected routes: `/app/home`, `/app/vault`, `/app/commitments`, `/app/timeline`, `/app/inbox`.

AI is a suggestion layer. Core app must work if AI is unavailable. AI must not access the database.

---

## Implementation log

| Date | Note |
| --- | --- |
| 2026-10-01 | Planning documents created. No frontend, backend, database, or packages initialized. |
| 2026-10-01 | Phase 0 complete: runnable frontend and backend, health check, TypeScript/build verified. No Prisma, auth, product features, or AI. Next: Phase 1 (not started). |
| 2026-10-02 | Git initialized; Phase 0 foundation committed. Phase 1 complete: design system, Login/Register UI, protected `/app/*` shell with empty placeholders. Next: Phase 2. |
