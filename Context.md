# LifeOS — Context

**Purpose:** Living implementation state for agents and developers. Read this before writing code.

**Last updated:** 2026-10-02 (Phase 3 complete)

---

## Current Phase

Phase 3 — Authentication + Authorization (complete)

## Status

Phase 3 complete. Real register/login/logout with HTTP-only session cookies, bcrypt password hashing, protected API middleware, and frontend wired to the backend. Phase 1 shell and Phase 2 database foundation preserved.

## Completed

- SRS defined (`SRS.md`)
- SDD defined (`SDD.md`)
- Development plan defined (`DEVELOPMENT_PLAN.md`)
- Phase 0 — Project Initialization
- Phase 1 — Design System + Application Shell
- Phase 2 — Database + Backend Foundation
  - PostgreSQL + Prisma, layered Express backend, `GET /api/health` and `GET /api/ready`
- Phase 3 — Authentication + Authorization
  - Register / login / logout / session restore
  - bcrypt password hashing (cost 12); never plaintext
  - HTTP-only signed session cookies + PostgreSQL `sessions` table
  - `requireAuth` middleware and `assertOwnership` helper for future resources
  - Frontend API client; Login/Register wired to backend; protected `/app/*` routes

## Next Task

Phase 4 — Core LifeOS Data Model

Do not start Phase 4 until explicitly instructed.

---

## How to run

Requires Node.js 22+, npm, and a local PostgreSQL database.

```bash
cd backend && npm install && npx prisma migrate deploy && npm run dev
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health: http://localhost:3001/api/health
- Ready: http://localhost:3001/api/ready
- Frontend talks to the backend via `/api` (Vite proxy)

Copy env examples before first run:

- `frontend/.env.example` → `frontend/.env`
- `backend/.env.example` → `backend/.env`

Required backend env: `DATABASE_URL`, `SESSION_SECRET` (min 32 characters). Never commit `.env` files.

---

## Authentication architecture (Phase 3 decision)

| Decision | Choice |
| --- | --- |
| Mechanism | Server-side sessions in PostgreSQL (`sessions` table) |
| Cookie | HTTP-only, `SameSite=Lax`, `Secure` in production, signed with `SESSION_SECRET` (HMAC-SHA256) |
| Password hashing | bcrypt, cost factor 12 |
| Password rules | 8–72 characters; email trimmed + lowercased |
| Identity on request | `req.authUser` (`id`, `email` only) — never trust client-supplied user ids |
| CSRF | Baseline: `SameSite=Lax` cookies for same-site SPA via Vite proxy; deeper CSRF hardening deferred to Phase 19 |
| Rate limiting | `express-rate-limit` on register/login (30 / 15 min) |
| Security headers | `helmet` on the API |
| Deferred | OAuth, email verification, password reset, MFA, social login |

Logout deletes the server session and clears the cookie.

## Important files (Phase 3)

### Backend

- `backend/prisma/schema.prisma` — `User.passwordHash`, `Session` model
- `backend/prisma/migrations/20261002090909_auth_sessions/` — auth migration (Phase 2 init preserved)
- `backend/src/services/authService.ts`, `sessionService.ts`
- `backend/src/controllers/authController.ts`
- `backend/src/middleware/requireAuth.ts`, `sessionHelpers.ts`, `authRateLimit.ts`
- `backend/src/validators/authValidators.ts`
- `backend/src/utils/password.ts`, `sessionCookie.ts`, `ownership.ts`
- `backend/src/routes/authRoutes.ts`
- `backend/src/auth/auth.test.ts`

### Frontend

- `frontend/src/api/client.ts`, `frontend/src/api/auth.ts`
- `frontend/src/auth/AuthContext.tsx` — real session restore via `/api/auth/me`
- `frontend/src/auth/ProtectedRoute.tsx`
- `frontend/src/pages/LoginPage.tsx`, `RegisterPage.tsx`
- `frontend/src/components/layout/AppShell.tsx` — logout calls API

## API endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Creates user + session cookie; 201 |
| POST | `/api/auth/login` | No | Sets session cookie; uniform 401 on bad credentials |
| POST | `/api/auth/logout` | Optional | Invalidates session; 204 |
| GET | `/api/auth/me` | Yes | Safe user profile |
| GET | `/api/health` | No | Liveness (Phase 2) |
| GET | `/api/ready` | No | DB readiness (Phase 2) |

Safe user JSON: `{ id, email, createdAt }` — never `passwordHash`.

## Database / schema changes

- `users.password_hash` (required)
- `sessions` table: `id`, `user_id`, `expires_at`, `created_at` with indexes and cascade delete

## Tests / checks performed

- `npx prisma validate` — pass
- `npx prisma migrate dev` (auth_sessions applied) — pass
- `npx prisma generate` — pass
- Backend `npm run typecheck` / `npm run build` — pass
- Backend `npm test` — 9 auth tests pass (register, duplicate, validation, hash storage, login success/fail, `/me`, unauthenticated reject, logout, no hash leakage)
- Frontend `npm run typecheck` / `npm run build` — pass
- `git diff --check` — run at commit time

## Git state

- Phase 0: `chore: initialize LifeOS frontend and backend foundations`
- Phase 1: `feat: complete phase 1 - design system and application shell`
- Phase 2: `feat: complete phase 2 - database foundation`
- Phase 3 commit expected: `feat: complete phase 3 - authentication and authorization`
- No remote configured; do not push unless explicitly requested

## Known issues / blockers

- Prisma may log an expected unique-constraint error when duplicate registration is rejected via `P2002` (handled; client receives 409)
- CSRF tokens not yet implemented (SameSite=Lax baseline; Phase 19)
- No email verification / password reset (intentionally deferred)

## Architectural decisions

- Cool slate canvas + muted teal accent (Phase 1)
- HTTP-only cookie sessions stored in PostgreSQL (not JWT, not localStorage secrets)
- Ownership helper ready for Phase 4+ domain resources; no domain CRUD yet
- Inbox route remains a shell only (Phase 14)

## Exact next phase

**Phase 4 — Core LifeOS Data Model** (Document, DocumentVersion, Subscription, RecurringPayment, Purchase, Warranty, Deadline, Renewal, InboxItem, Notification, AuditLog)

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
| 2026-10-02 | Phase 2 complete: PostgreSQL + Prisma, layered backend, health/ready. Next: Phase 3. |
| 2026-10-02 | Phase 3 complete: bcrypt + HTTP-only session cookies, auth APIs, frontend wired, ownership foundation. Next: Phase 4 — Core LifeOS Data Model. |
