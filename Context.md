# LifeOS — Context

**Purpose:** Living implementation state for agents and developers. Read this before writing code.

**Last updated:** 2026-10-02 (Phase 4 complete)

---

## Current Phase

Phase 4 — Core LifeOS Data Model (complete)

## Status

Phase 4 complete. Canonical domain entities and relations exist in Prisma/PostgreSQL. No Vault CRUD, uploads, or feature UIs yet. Phase 3 authentication remains intact.

## Completed

- SRS defined (`SRS.md`)
- SDD defined (`SDD.md`)
- Development plan defined (`DEVELOPMENT_PLAN.md`)
- Phase 0 — Project Initialization
- Phase 1 — Design System + Application Shell
- Phase 2 — Database + Backend Foundation
- Phase 3 — Authentication + Authorization
- Phase 4 — Core LifeOS Data Model
  - Prisma entities: Document, DocumentVersion, Subscription, RecurringPayment, Purchase, Warranty, Deadline, Renewal, InboxItem, Notification, AuditLog
  - User ownership on all user-scoped domain tables
  - Purchase → Warranty (1:0..1)
  - Document → DocumentVersion (1:*)
  - Optional document links from Purchase (receipt), Renewal, Deadline
  - Migration `20261002092710_core_domain_model` (Phase 2/3 migrations preserved)

## Next Task

Phase 5 — Vault / Documents

Do not start Phase 5 until explicitly instructed.

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

---

## Phase 4 data model decisions

| Decision | Choice |
| --- | --- |
| Inheritance | Explicit tables per SDD; no `LifeItem` base table |
| Financial commitments | Derived from `Subscription` + `RecurringPayment` (no separate finance/ledger table) |
| Memberships | Represented as Subscription and/or RecurringPayment rows |
| Warranty cardinality | At most one Warranty per Purchase (`purchaseId` unique) |
| Document associations | Optional FKs: Purchase.receiptDocumentId; Renewal/Deadline.linkedDocumentId |
| File storage | `DocumentVersion` / `InboxItem` storage metadata fields only; no uploads in Phase 4 |
| Money | `Decimal(12,2)` with default currency `INR` |
| Ownership | Direct `userId` on all listed user-owned models; DocumentVersion owned via Document |
| Action Center / Timeline | Not stored entities — future derived queries |

### Entities introduced

- Document, DocumentVersion
- Subscription, RecurringPayment
- Purchase, Warranty
- Deadline, Renewal
- InboxItem, Notification, AuditLog

### Important enums

`DocumentCategory`, `DocumentStatus`, `BillingInterval`, `CommitmentStatus`, `DeadlineStatus`, `RenewalKind`, `RenewalStatus`, `InboxItemStatus`, `NotificationType`

### Migration

`20261002092710_core_domain_model`

### Intentionally deferred (later phases)

- Document upload / private file serving (Phase 5)
- Document versioning UX/replace flows (Phase 6)
- Commitment/Purchase/Renewal/Deadline CRUD APIs and UI (Phases 7–9)
- Action Center, Timeline, financial overview UI (Phases 10–12)
- Search, Inbox product, AI, notifications delivery, Docker (later)

---

## Important files

### Backend (Phase 3–4)

- `backend/prisma/schema.prisma` — auth + full core domain model
- `backend/prisma/migrations/20261002083250_init/` — Phase 2
- `backend/prisma/migrations/20261002090909_auth_sessions/` — Phase 3
- `backend/prisma/migrations/20261002092710_core_domain_model/` — Phase 4
- `backend/src/types/domain.ts` — ownership conventions / Prisma type re-exports
- `backend/src/domain/domainModel.test.ts` — relation/ownership model tests
- Auth stack unchanged: `authService`, `requireAuth`, `assertOwnership`, auth routes

### Frontend

- Unchanged in Phase 4 (shell + real auth from Phase 1/3)

## API endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Creates user + session cookie; 201 |
| POST | `/api/auth/login` | No | Sets session cookie; uniform 401 on bad credentials |
| POST | `/api/auth/logout` | Optional | Invalidates session; 204 |
| GET | `/api/auth/me` | Yes | Safe user profile |
| GET | `/api/health` | No | Liveness (Phase 2) |
| GET | `/api/ready` | No | DB readiness (Phase 2) |

No domain CRUD endpoints in Phase 4.

## Tests / checks performed

- `npx prisma validate` — pass
- `npx prisma migrate dev` (`core_domain_model`) — pass; DB synchronized
- `npx prisma migrate status` — 3 migrations, up to date
- `npx prisma generate` — pass
- Backend `npm run typecheck` / `npm run build` — pass
- Backend `npm test` — 15 pass (9 Phase 3 auth + 6 Phase 4 model)
- Frontend `npm run typecheck` / `npm run build` — pass
- `git diff --check` — run at commit time

## Git state

- Phase 0: `chore: initialize LifeOS frontend and backend foundations`
- Phase 1: `feat: complete phase 1 - design system and application shell`
- Phase 2: `feat: complete phase 2 - database foundation`
- Phase 3: `feat: complete phase 3 - authentication and authorization`
- Phase 4 commit expected: `feat: complete phase 4 - core LifeOS data model`
- No remote configured; do not push unless explicitly requested

## Known issues / blockers

- Prisma may log expected unique-constraint errors for duplicate registration / duplicate warranty tests (handled)
- CSRF tokens not yet implemented (SameSite=Lax baseline; Phase 19)
- No email verification / password reset (intentionally deferred)

## Architectural decisions

- Cool slate canvas + muted teal accent (Phase 1)
- HTTP-only cookie sessions stored in PostgreSQL (Phase 3)
- Explicit relational domain model without LifeItem inheritance (Phase 4)
- Inbox route remains a shell only until Phase 14

## Exact next phase

**Phase 5 — Vault / Documents** (private upload/list/metadata/delete with ownership-checked file access)

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
| 2026-10-02 | Phase 4 complete: core Prisma domain model + migration; no domain CRUD/UI. Next: Phase 5 — Vault / Documents. |
