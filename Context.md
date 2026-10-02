# LifeOS — Context

**Purpose:** Living implementation state for agents and developers. Read this before writing code.

**Last updated:** 2026-10-02 (Phase 6 complete)

---

## Current Phase

Phase 6 — Document Versioning (complete)

## Status

Phase 6 complete. Vault documents support version history: replace uploads create a new current version, prior versions remain retrievable/downloadable by the owner, and ownership isolation is enforced. Phase 3 authentication and Phase 5 vault remain intact. No schema migration was required (Phase 4 DocumentVersion model reused).

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
- Phase 5 — Vault / Documents
  - Private local file storage behind `FileStorageService`
  - Document APIs with ownership enforcement
  - Functional Vault UI (upload/list/detail/download/delete/metadata update)
  - Baseline audit log entries for create/update/delete
  - Focused vault security/ownership tests
- Phase 6 — Document Versioning
  - List versions, upload replacement version, download specific version
  - `isCurrent` / `replacedAt` / monotonic `versionNumber` on DocumentVersion
  - Distinct storage keys per version under existing private storage layout
  - Vault UI: version history, current indicator, replace upload, per-version download
  - Focused versioning ownership/security tests

## Next Task

Phase 7 — Commitments

Do not start Phase 7 until explicitly instructed (unless continuing an assigned multi-phase batch).

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

Optional vault env:

- `PRIVATE_STORAGE_ROOT` (default `../private-storage` relative to backend cwd)
- `MAX_UPLOAD_BYTES` (default `10485760` = 10 MiB)

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
| File storage | `DocumentVersion` / `InboxItem` storage metadata fields only; uploads in Phase 5 |
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

---

## Phase 5 vault / documents decisions

| Decision | Choice |
| --- | --- |
| Storage | Private local filesystem via `FileStorageService` abstraction (not PostgreSQL BLOBs; not Express static) |
| Layout | `private-storage/{userId}/{documentId}/{versionId}` — storage key is relative; absolute paths never returned to clients |
| Versioning (Phase 5) | Upload creates Document + DocumentVersion `versionNumber=1`, `isCurrent=true`. Download uses current version only |
| Version history UI / replace | Implemented in Phase 6 |
| File types | PDF, JPEG, PNG, WEBP (magic-byte detection + extension/MIME hints) |
| Size limit | `MAX_UPLOAD_BYTES` env (default 10 MiB) |
| Upload stack | `multer` memory storage → validate → store file → Prisma transaction; orphan file cleanup on DB failure |
| Authorization | Every document query filters by `userId` from `req.authUser`; `assertOwnership` retained |
| Categories | Existing Prisma `DocumentCategory` enum (no duplicated taxonomy) |
| Audit | `DOCUMENT_CREATED`, `DOCUMENT_UPDATED`, `DOCUMENT_DELETED` |

### Document API endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/documents` | Yes | List current user's documents |
| GET | `/api/documents/:id` | Yes | Get one owned document (+ current version metadata) |
| POST | `/api/documents` | Yes | Multipart upload (`file` + metadata fields) |
| PATCH | `/api/documents/:id` | Yes | Update metadata |
| DELETE | `/api/documents/:id` | Yes | Delete document + versions + stored files |
| GET | `/api/documents/:id/download` | Yes | Download current version bytes (attachment) |

### Intentionally deferred (later phases)

- OCR / AI extraction / receipt intelligence
- Life Inbox processing
- Global search / Ctrl+K / Action Center / Timeline / notifications
- External cloud storage providers
- Document sharing / public URLs

---

## Phase 6 document versioning decisions

| Decision | Choice |
| --- | --- |
| Schema | Reused Phase 4 `DocumentVersion` (no new migration) |
| Current marker | Exactly one `isCurrent=true` after replace; previous current gets `replacedAt` |
| Version numbers | Monotonic integers per document (`versionNumber` unique with documentId) |
| Storage | Same `FileStorageService` layout; new versionId → new storage key (no overwrite) |
| Consistency | Store file first, then DB transaction; delete orphan file if DB fails |
| Authorization | Parent Document `userId` gate; version endpoints return 404 for non-owners |
| API surface | List / create / download-by-version only (no separate delete-version) |
| Audit | `DOCUMENT_VERSION_CREATED` |
| Response safety | Never expose `storageKey` or absolute paths |

### Version API endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/documents/:id/versions` | Yes | List versions (newest first) |
| POST | `/api/documents/:id/versions` | Yes | Multipart replace (`file`, optional `notes`) |
| GET | `/api/documents/:id/versions/:versionId/download` | Yes | Download a specific owned version |

### Frontend

- Vault detail panel: version history list, current badge, upload new version, per-version download
- Existing current-version download retained

### Intentionally deferred

- OCR / AI / search / sharing / Action Center / Timeline / notifications
- Deleting individual historical versions (document delete removes all)

---

## Important files

### Backend (Phase 3–6)

- `backend/prisma/schema.prisma` — auth + full core domain model (unchanged in Phases 5–6)
- `backend/prisma/migrations/20261002083250_init/` — Phase 2
- `backend/prisma/migrations/20261002090909_auth_sessions/` — Phase 3
- `backend/prisma/migrations/20261002092710_core_domain_model/` — Phase 4
- `backend/src/services/fileStorageService.ts` — private storage abstraction
- `backend/src/services/documentService.ts` — vault + versioning domain logic
- `backend/src/controllers/documentController.ts` / `routes/documentRoutes.ts`
- `backend/src/middleware/documentUpload.ts` — multer upload limits
- `backend/src/utils/fileValidation.ts` — magic bytes / filename safety
- `backend/src/documents/documents.test.ts` — Phase 5 tests
- `backend/src/documents/versions.test.ts` — Phase 6 tests
- Auth stack unchanged: `authService`, `requireAuth`, `assertOwnership`, auth routes

### Frontend

- `frontend/src/api/documents.ts` — document + version API client
- `frontend/src/pages/VaultPage.tsx` — Vault UI with version history
- `frontend/src/api/client.ts` — FormData-aware requests

## API endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Creates user + session cookie; 201 |
| POST | `/api/auth/login` | No | Sets session cookie; uniform 401 on bad credentials |
| POST | `/api/auth/logout` | Optional | Invalidates session; 204 |
| GET | `/api/auth/me` | Yes | Safe user profile |
| GET | `/api/health` | No | Liveness (Phase 2) |
| GET | `/api/ready` | No | DB readiness (Phase 2) |
| GET | `/api/documents` | Yes | List documents |
| GET | `/api/documents/:id` | Yes | Get document |
| POST | `/api/documents` | Yes | Upload/create |
| PATCH | `/api/documents/:id` | Yes | Update metadata |
| DELETE | `/api/documents/:id` | Yes | Delete |
| GET | `/api/documents/:id/download` | Yes | Download current file |
| GET | `/api/documents/:id/versions` | Yes | List versions |
| POST | `/api/documents/:id/versions` | Yes | Upload new version |
| GET | `/api/documents/:id/versions/:versionId/download` | Yes | Download specific version |

## Tests / checks performed

- `npx prisma validate` — pass
- `npx prisma migrate status` — 3 migrations, up to date (no Phase 6 migration)
- Backend `npm run typecheck` / `npm run build` — pass
- Backend `npm test` — 30 pass (9 Phase 3 auth + 6 Phase 4 model + 9 Phase 5 vault + 6 Phase 6 versions)
- Frontend `npm run typecheck` / `npm run build` — pass
- `git diff --check` — run at commit time

## Git state

- Phase 0: `chore: initialize LifeOS frontend and backend foundations`
- Phase 1: `feat: complete phase 1 - design system and application shell`
- Phase 2: `feat: complete phase 2 - database foundation`
- Phase 3: `feat: complete phase 3 - authentication and authorization`
- Phase 4: `feat: complete phase 4 - core LifeOS data model`
- Phase 5: `feat: complete phase 5 - vault and documents`
- Phase 6 commit expected: `feat: complete phase 6 - document versioning`
- No remote configured; do not push unless explicitly requested

## Known issues / blockers

- Prisma may log expected unique-constraint errors for duplicate registration / duplicate warranty tests (handled)
- CSRF tokens not yet implemented (SameSite=Lax baseline; Phase 19)
- No email verification / password reset (intentionally deferred)

## Architectural decisions

- Cool slate canvas + muted teal accent (Phase 1)
- HTTP-only cookie sessions stored in PostgreSQL (Phase 3)
- Explicit relational domain model without LifeItem inheritance (Phase 4)
- Private filesystem storage behind a replaceable service abstraction (Phase 5)
- Version replace reuses DocumentVersion + private storage; no second storage system (Phase 6)
- Inbox route remains a shell only until Phase 14

## Exact next phase

**Phase 7 — Commitments** (subscriptions, recurring payments, memberships, action URLs)

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
| 2026-10-02 | Phase 5 complete: private vault upload/list/metadata/download/delete with ownership-checked storage. Next: Phase 6 — Document Versioning. |
| 2026-10-02 | Phase 6 complete: document version history, replace upload, per-version download, ownership tests. Next: Phase 7 — Commitments. |
