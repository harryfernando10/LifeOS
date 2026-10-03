# LifeOS — Context

**Purpose:** Living implementation state for agents and developers. Read this before writing code.

**Last updated:** 2026-10-03 (Phase 14 complete)

---

## Current Phase

Phase 14 — AI Intelligence (complete)

## Status

Phase 14 is complete. The isolated FastAPI OCR/suggestion service, authenticated backend mediation, typed suggestion contract, Inbox review UI, and confirmed document/Purchase/Warranty workflows are implemented. Real Tesseract OCR 5.5.3 was verified using a process-local `TESSERACT_CMD` for a synthetic image and scanned PDF; text-based PDFs use direct extraction. The AI provider remains optional and unconfigured by default. No Phase 14 database migration was needed. Current branch: `master`; latest commit is the focused Phase 14 completion commit (`HEAD`); nothing was pushed.

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
- Phase 7 — Commitments
  - Subscription and RecurringPayment CRUD APIs with ownership enforcement
  - Action URLs stored and opened externally (not executed as integrations)
  - Commitments UI: list/empty/create/edit/detail for both commitment types
  - Focused commitment ownership/validation tests
- Phase 8 — Purchases & Warranties
  - Purchase CRUD APIs with ownership enforcement
  - Warranty upsert/delete nested under purchase (1:0..1)
  - Optional receipt link to owned Vault document (`receiptDocumentId`)
  - Commitments page Purchases tab + PurchasesPanel UI
  - Focused purchase/warranty ownership/validation tests
- Phase 9 — Renewals & Deadlines
  - Renewal and Deadline CRUD APIs with ownership enforcement
  - Optional `linkedDocumentId` to owned Vault documents
  - Action URLs stored and opened externally
  - `/app/renewals` UI with Renewals + Deadlines tabs
  - Focused renewal/deadline ownership/validation tests
- Phase 10 — Action Center
  - Derived aggregation service over owned domain records (no ActionItem table)
  - `GET /api/action-center` with overdue vs upcoming (30-day window)
  - Home `/app/home` consumes Action Center: loading/empty/error/list
  - Focused ownership, overdue/upcoming, multi-source, empty-state tests
- Phase 11 — Timeline
  - Derived chronological aggregation (no TimelineEvent table)
  - `GET /api/timeline` for authenticated user
  - `/app/timeline` UI: loading/empty/error/chronological list
  - Focused ownership, sort, multi-source, null-date, empty-state tests
- Phase 12 — Financial Commitments
  - Derived financial overview (no finance/ledger table)
  - `GET /api/financial-commitments` with 7/30/365 windows
  - Recurrence expansion for known billing intervals; CUSTOM = single stored next date
  - `/app/financial` UI: window tabs, per-currency totals, occurrence list
  - Focused auth, ownership, windows, boundaries, currencies, double-count tests
- Phase 13 — Search + Life Inbox
  - Authenticated deterministic search across owned documents/versions, subscriptions, recurring payments, purchases, warranties, deadlines, renewals, and inbox items
  - `/app/search` grouped results and links to existing entity area routes
  - Structured Inbox capture with private PDF/image uploads, list/detail/edit/filter/manual status triage/delete; optional owned Vault document association
  - One migration adds InboxItem → Document optional association; no duplicate Inbox model
  - No AI, OCR, extraction, or automated classification
- Phase 14 — AI Intelligence (complete)
  - Optional isolated FastAPI service; backend remains responsible for authentication, ownership, storage access, validation, and domain writes
  - Direct text extraction for text PDFs; OCR route for scanned PDFs and JPEG/PNG/WEBP images
  - Provider adapter is OpenAI-compatible and off unless explicitly configured; model output is structured and validated by both Python and Node
  - Inbox review presents extracted text and editable suggestions; document, Purchase, and optional explicitly dated Warranty saves require user confirmation through existing domain services
  - Extracted text and suggestions are transient; no Prisma schema change or migration
  - Unit/integration coverage passes with mocked provider/OCR; real Tesseract 5.5.3 verified against synthetic image, scanned PDF, and text PDF

## Next Task

Phase 15 — Command Center + Notifications

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

Optional AI service setup (AI remains off until configured):

```bash
cd ai-service
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

Copy `ai-service/.env.example` to `ai-service/.env` and set a shared random `AI_SERVICE_TOKEN` in both AI service and backend environments. Set `AI_SERVICE_URL=http://127.0.0.1:8000` in the backend. For AI suggestions only, configure `AI_PROVIDER=openai_compatible`, `AI_API_KEY`, and `AI_MODEL` inside the AI service. Tesseract OCR executable must also be installed locally (or configured with `TESSERACT_CMD`). Do not commit any `.env` files.

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

## Phase 7 commitments decisions

| Decision | Choice |
| --- | --- |
| Models | Reused Phase 4 `Subscription` + `RecurringPayment` (no new migration) |
| Memberships | Represented as subscription and/or recurring payment rows (FR-COM-01) |
| Action URLs | Optional http(s) URLs; UI opens in new tab; never treated as payment integration |
| Money | Decimal strings with up to 2 places; default currency `INR` |
| Status | `ACTIVE` / `PAUSED` / `CANCELLED` via existing `CommitmentStatus` |
| Authorization | All queries filter by `req.authUser.id`; non-owners get 404 |
| API surface | Separate `/subscriptions` and `/recurring-payments` CRUD |
| Deferred | Action Center aggregation, reminders, auto-renewal, financial 7/30/365 overview |

### Commitment API endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET/POST | `/api/subscriptions` | Yes | List / create |
| GET/PATCH/DELETE | `/api/subscriptions/:id` | Yes | Read / update / delete |
| GET/POST | `/api/recurring-payments` | Yes | List / create |
| GET/PATCH/DELETE | `/api/recurring-payments/:id` | Yes | Read / update / delete |

### Frontend

- `/app/commitments` functional UI with Subscriptions and Recurring payments tabs
- Create/edit forms, detail panel, external action URL link, delete

---

## Phase 8 purchases & warranties decisions

| Decision | Choice |
| --- | --- |
| Models | Reused Phase 4 `Purchase` + `Warranty` (no new migration) |
| Warranty cardinality | At most one warranty per purchase (`purchaseId` unique); upsert via PUT |
| Receipt link | Optional `receiptDocumentId` → owned Vault Document; unique per document |
| Receipt validation | Document must belong to same user; foreign/unknown ids rejected |
| Authorization | All purchase queries filter by `req.authUser.id`; warranty gated through owned purchase; non-owners get 404 |
| Money | Decimal strings with up to 2 places; default currency `INR` |
| Expiry | Warranty `endsOn` required; `startsOn` optional; startsOn cannot be after endsOn |
| Audit | `PURCHASE_*`, `WARRANTY_*` actions |
| Deferred | OCR, receipt intelligence, AI extraction, Action Center warranty aggregation, shopping marketplace |

### Purchase / warranty API endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET/POST | `/api/purchases` | Yes | List / create |
| GET/PATCH/DELETE | `/api/purchases/:id` | Yes | Read / update / delete (cascade deletes warranty) |
| PUT | `/api/purchases/:id/warranty` | Yes | Create or update warranty for purchase |
| DELETE | `/api/purchases/:id/warranty` | Yes | Remove warranty; returns updated purchase |

### Frontend

- `/app/commitments` adds a Purchases tab
- `PurchasesPanel`: list/empty/create/edit/detail, warranty form, receipt document selector from Vault

### Intentionally deferred

- OCR / receipt intelligence (Phase 16)
- Action Center / Timeline warranty expiry surfaces (Phases 10–11)
- Multiple warranties per purchase
- Shopping / marketplace / expense accounting features

---

## Phase 9 renewals & deadlines decisions

| Decision | Choice |
| --- | --- |
| Models | Reused Phase 4 `Renewal` + `Deadline` (no new migration) |
| Renewal kinds | User data via `RenewalKind` enum (passport, licence, insurance, domain, etc.) — not hardcoded product modules |
| Document link | Optional `linkedDocumentId` → owned Vault Document (not unique; SetNull on document delete) |
| Document validation | Document must belong to same user; foreign/unknown ids rejected |
| Authorization | All queries filter by `req.authUser.id`; non-owners get 404 |
| Action URLs | Optional http/https URLs stored; opened externally in UI |
| Defaults | Renewal status `UPCOMING`, kind `OTHER`; Deadline status `OPEN` |
| Audit | `RENEWAL_*`, `DEADLINE_*` actions |
| Deferred | Action Center / Timeline aggregation (Phases 10–11), reminders |

### Renewal / deadline API endpoints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET/POST | `/api/renewals` | Yes | List / create |
| GET/PATCH/DELETE | `/api/renewals/:id` | Yes | Read / update / delete |
| GET/POST | `/api/deadlines` | Yes | List / create |
| GET/PATCH/DELETE | `/api/deadlines/:id` | Yes | Read / update / delete |

### Frontend

- `/app/renewals` with Renewals + Deadlines tabs
- List/empty/create/edit/detail; optional Vault document selector; external action URL links
- Nav item "Renewals" in AppShell

### Intentionally deferred

- Action Center aggregation of overdue renewals/deadlines (Phase 10)
- Timeline chronological view (Phase 11)
- In-app reminders / notifications (Phase 15+)

---

## Phase 10 Action Center decisions

| Decision | Choice |
| --- | --- |
| Persistence | **Derived** aggregation — no `ActionItem` table (SDD: Action Center is a derived view) |
| Endpoint | `GET /api/action-center` (auth required) |
| Urgency | `overdue` (date before today UTC) vs `upcoming` (today through window end) |
| Window | **30 days** upcoming horizon (specs leave windows unfinalized; smallest practical choice) |
| Sources | OPEN deadlines; UPCOMING/DUE renewals; ACTIVE/EXPIRED documents with `expiresOn`; ACTIVE subscriptions with `nextBillingOn`; ACTIVE recurring payments with `nextDueOn`; warranties by `endsOn` |
| Exclusions | COMPLETED/CANCELLED deadlines/renewals; PAUSED/CANCELLED commitments; ARCHIVED documents; records beyond the 30-day window; null due dates |
| Sort | Overdue first, then due date ascending, then title |
| Navigation | `href` to existing shell routes (`/app/renewals`, `/app/vault`, `/app/commitments`); optional external `actionUrl` |
| Authorization | Every underlying query filters by `req.authUser.id` |
| Deferred | Timeline (Phase 11), notifications/reminders, importance scoring, financial 7/30/365 overview (Phase 12), caching |

### Action Center API

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/action-center` | Yes | Unified attention list for current user |

### Frontend

- `/app/home` loads Action Center (loading / empty / error / calm list)
- Shows urgency, source type, title, detail, due date, Open link, optional external action URL

### Intentionally deferred

- Financial 7/30/365 commitment overview (Phase 12)
- Notifications / push / email (Phase 15+)
- Search / Ctrl+K (Phase 13)
- Configurable attention windows / importance scores

---

## Phase 11 Timeline decisions

| Decision | Choice |
| --- | --- |
| Persistence | **Derived** aggregation — no `TimelineEvent` table (SDD: Timeline is a derived view) |
| Endpoint | `GET /api/timeline` (auth required) |
| Window | **Past 365 + next 365 days** (specs leave ranges unfinalized; sensible default, documented here) |
| Sources (FR-TL-01) | Deadlines (`dueOn`); renewals (`dueOn`); ACTIVE/EXPIRED documents with `expiresOn`; subscriptions with `nextBillingOn`; recurring payments with `nextDueOn`; warranties by `endsOn` |
| Exclusions | ARCHIVED documents; records outside the ±365-day window; null optional dates (`nextBillingOn`, `nextDueOn`, `expiresOn`) |
| Status scope | Broader than Action Center: deadlines/renewals of any status (including COMPLETED) appear as historical/scheduled events; commitments included whenever a date is set |
| Sort | Chronological ascending by date, then type, then title |
| Temporal labels | `past` / `today` / `upcoming` relative to UTC start-of-day |
| Date handling | `@db.Date` fields serialized as `YYYY-MM-DD` via UTC ISO slice; no invented times |
| Recurrence | **No expansion** — one entry per stored `nextBillingOn` / `nextDueOn` (algorithm deferred; not a calendar product) |
| Navigation | `href` to existing shell routes; optional external `actionUrl` when present |
| Authorization | Every underlying query filters by `req.authUser.id` |
| UI filters | None in this phase (All/Past/Upcoming tabs deferred; specs do not require them yet) |
| Deferred | Configurable ranges, recurrence expansion, purchase/document-upload events, Phase 12 financial windows |

### Timeline API

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/timeline` | Yes | Chronological event list for current user |

### Frontend

- `/app/timeline` loads Timeline (loading / empty / error / chronological list)
- Nav item "Timeline" already present in AppShell (Phase 1); wired to functional page
- Shows temporal badge, type, status, title, detail, date, Open link, optional external action URL

### Intentionally deferred

- Configurable Timeline ranges / type filters
- Recurrence occurrence expansion on Timeline (financial expansion lives in Phase 12)
- Purchase dates / document upload events (not in FR-TL-01)
- Notifications / Search / Ctrl+K

---

## Phase 12 Financial Commitments decisions

| Decision | Choice |
| --- | --- |
| Persistence | **Derived** aggregation — no finance/ledger/budget table (SDD + FR-FIN-02) |
| Endpoint | `GET /api/financial-commitments` (auth required) |
| Windows (FR-FIN-01) | Next **7 / 30 / 365** days; inclusive UTC range `[today, today+N]` (same day-boundary style as Action Center’s 30-day window) |
| Sources | **ACTIVE** `Subscription` (`nextBillingOn`) + **ACTIVE** `RecurringPayment` (`nextDueOn`) only |
| Exclusions | PAUSED/CANCELLED commitments; null next due/billing date; purchases; warranties; one-time amounts |
| Recurrence | Known intervals (WEEKLY/MONTHLY/QUARTERLY/YEARLY) expand from stored next date through window end; overdue next dates advance forward into the window. **CUSTOM**: at most the single stored next date (no invented schedule) |
| Double-counting | One occurrence id per `{sourceType}:{sourceId}:{YYYY-MM-DD}`; subscriptions and recurring payments are separate sources never merged |
| Amount / currency | Amounts as `Decimal` strings (`toFixed(2)`); totals grouped **by currency** with **no FX conversion**; null amounts listed but excluded from numeric totals |
| Date handling | UTC start-of-day; `@db.Date` as `YYYY-MM-DD`; range end inclusive |
| Authorization | Every query filters by `req.authUser.id` |
| UI | Dedicated `/app/financial` route + AppShell nav (minimal overview; not budgeting) |
| Deferred | Budgets, investments, banking, FX conversion, Home embed of financial summary, editing amounts from this page |

### Financial API

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/financial-commitments` | Yes | Three windows with totals + occurrence lists |

### Frontend

- `/app/financial` loads Financial commitments (loading / empty / error / window tabs + list)
- Nav item "Financial" in AppShell
- Shows per-currency totals, occurrence amount/due date, Open → Commitments, optional external action URL

### Intentionally deferred

- Budgets / investment / banking (explicitly out of scope — FR-FIN-02)
- Exchange-rate conversion
- Embedding financial summary on Home
- Search (Phase 13) / Inbox (Phase 14) / notifications

---

## Important files

### Backend (Phase 3–12)

- `backend/prisma/schema.prisma` — auth + full core domain model (unchanged in Phases 5–12)
- `backend/prisma/migrations/20261002083250_init/` — Phase 2
- `backend/prisma/migrations/20261002090909_auth_sessions/` — Phase 3
- `backend/prisma/migrations/20261002092710_core_domain_model/` — Phase 4
- `backend/src/services/fileStorageService.ts` — private storage abstraction
- `backend/src/services/documentService.ts` — vault + versioning domain logic
- `backend/src/services/subscriptionService.ts` / `recurringPaymentService.ts`
- `backend/src/services/purchaseService.ts` — purchases + warranties
- `backend/src/services/renewalService.ts` / `deadlineService.ts`
- `backend/src/services/actionCenterService.ts` — derived Action Center aggregation
- `backend/src/services/timelineService.ts` — derived Timeline aggregation
- `backend/src/services/financialCommitmentService.ts` — derived financial windows
- `backend/src/controllers/documentController.ts` / `routes/documentRoutes.ts`
- `backend/src/controllers/subscriptionController.ts` / `recurringPaymentController.ts`
- `backend/src/controllers/purchaseController.ts` / `routes/purchaseRoutes.ts`
- `backend/src/controllers/renewalController.ts` / `deadlineController.ts`
- `backend/src/controllers/actionCenterController.ts` / `routes/actionCenterRoutes.ts`
- `backend/src/controllers/timelineController.ts` / `routes/timelineRoutes.ts`
- `backend/src/controllers/financialCommitmentController.ts` / `routes/financialCommitmentRoutes.ts`
- `backend/src/routes/renewalDeadlineRoutes.ts`
- `backend/src/routes/commitmentRoutes.ts`
- `backend/src/validators/commitmentValidators.ts`
- `backend/src/validators/purchaseValidators.ts`
- `backend/src/validators/renewalDeadlineValidators.ts`
- `backend/src/documents/documents.test.ts` — Phase 5 tests
- `backend/src/documents/versions.test.ts` — Phase 6 tests
- `backend/src/commitments/commitments.test.ts` — Phase 7 tests
- `backend/src/purchases/purchases.test.ts` — Phase 8 tests
- `backend/src/renewals/renewalsDeadlines.test.ts` — Phase 9 tests
- `backend/src/actionCenter/actionCenter.test.ts` — Phase 10 tests
- `backend/src/timeline/timeline.test.ts` — Phase 11 tests
- `backend/src/financial/financialCommitments.test.ts` — Phase 12 tests
- Auth stack unchanged: `authService`, `requireAuth`, `assertOwnership`, auth routes

### Frontend

- `frontend/src/api/documents.ts` — document + version API client
- `frontend/src/pages/VaultPage.tsx` — Vault UI with version history
- `frontend/src/api/commitments.ts` — subscription + recurring payment client
- `frontend/src/api/purchases.ts` — purchase + warranty client
- `frontend/src/api/renewalsDeadlines.ts` — renewal + deadline client
- `frontend/src/api/actionCenter.ts` — Action Center client
- `frontend/src/api/timeline.ts` — Timeline client
- `frontend/src/api/financialCommitments.ts` — Financial commitments client
- `frontend/src/pages/CommitmentsPage.tsx` — Commitments UI (incl. Purchases tab)
- `frontend/src/components/PurchasesPanel.tsx` — Purchases/warranties UI
- `frontend/src/pages/RenewalsPage.tsx` — Renewals & Deadlines UI
- `frontend/src/pages/HomePage.tsx` — Action Center Home UI
- `frontend/src/pages/TimelinePage.tsx` — Timeline UI
- `frontend/src/pages/FinancialPage.tsx` — Financial commitments UI
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
| GET/POST | `/api/subscriptions` | Yes | Subscription list/create |
| GET/PATCH/DELETE | `/api/subscriptions/:id` | Yes | Subscription read/update/delete |
| GET/POST | `/api/recurring-payments` | Yes | Recurring payment list/create |
| GET/PATCH/DELETE | `/api/recurring-payments/:id` | Yes | Recurring payment read/update/delete |
| GET/POST | `/api/purchases` | Yes | Purchase list/create |
| GET/PATCH/DELETE | `/api/purchases/:id` | Yes | Purchase read/update/delete |
| PUT | `/api/purchases/:id/warranty` | Yes | Warranty upsert |
| DELETE | `/api/purchases/:id/warranty` | Yes | Warranty remove |
| GET/POST | `/api/renewals` | Yes | Renewal list/create |
| GET/PATCH/DELETE | `/api/renewals/:id` | Yes | Renewal read/update/delete |
| GET/POST | `/api/deadlines` | Yes | Deadline list/create |
| GET/PATCH/DELETE | `/api/deadlines/:id` | Yes | Deadline read/update/delete |
| GET | `/api/action-center` | Yes | Derived attention list |
| GET | `/api/timeline` | Yes | Derived chronological timeline |
| GET | `/api/financial-commitments` | Yes | Derived 7/30/365 financial windows |

## Tests / checks performed

- `npx prisma validate` — pass (no Phase 12 migration)
- `npx prisma migrate status` — Database schema is up to date (3 migrations)
- Backend `npm run typecheck` / `npm run build` — pass
- Backend `npm test` — 64 pass (Phases 3–12; 8 Phase 12 Financial tests)
- Frontend `npm run typecheck` / `npm run build` — pass
- `git diff --check` — pass

## Git state

- Phase 0: `chore: initialize LifeOS frontend and backend foundations`
- Phase 1: `feat: complete phase 1 - design system and application shell`
- Phase 2: `feat: complete phase 2 - database foundation`
- Phase 3: `feat: complete phase 3 - authentication and authorization`
- Phase 4: `feat: complete phase 4 - core LifeOS data model`
- Phase 5: `feat: complete phase 5 - vault and documents`
- Phase 6: `feat: complete phase 6 - document versioning`
- Phase 7: `feat: complete phase 7 - commitments`
- Phase 8: `feat: complete phase 8 - purchases and warranties`
- Phase 9: `feat: complete phase 9 - renewals and deadlines`
- Phase 10: `feat: complete phase 10 - action center`
- Phase 11: `feat: complete phase 11 - timeline`
- Phase 12 commit expected: `feat: complete phase 12 - financial commitments`
- Do not push unless explicitly requested

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
- Commitments are Subscription + RecurringPayment only — not an accounting system (Phase 7)
- Purchases reuse Phase 4 Purchase/Warranty; receipt links to existing Vault documents only — no OCR (Phase 8)
- Renewals/Deadlines reuse Phase 4 models; kinds are enum data, not product modules; no fake payment/renewal (Phase 9)
- Action Center is a derived query service over owned records — not a stored ActionItem entity; 30-day upcoming window (Phase 10)
- Timeline is a derived chronological query over owned FR-TL-01 sources — not a stored TimelineEvent entity; ±365-day default window; no recurrence expansion (Phase 11)
- Financial commitments overview is a derived 7/30/365 aggregation over ACTIVE subscriptions + recurring payments with interval expansion; not a budget/ledger; purchases excluded (Phase 12)
- Search returns deterministic grouped results from existing user-owned records; result links target existing feature routes because those features do not have entity-specific routes.
- Life Inbox uses the existing InboxItem table and statuses; documents are associated through an optional owned Vault-document foreign key. Raw file upload into Inbox is not implemented; upload a document to Vault then associate it.

## Exact next phase

**Phase 15 — Command Center + Notifications**

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

Protected routes: `/app/home`, `/app/vault`, `/app/commitments`, `/app/financial`, `/app/renewals`, `/app/timeline`, `/app/inbox`.

Phase 13 also adds `/app/search` inside the existing authenticated shell.

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
| 2026-10-02 | Phase 7 complete: subscriptions + recurring payments CRUD, action URLs, Commitments UI. Next: Phase 8 — Purchases & Warranties. |
| 2026-10-03 | Phase 8 complete: purchases + warranties CRUD, optional Vault receipt link, Commitments Purchases tab. Next: Phase 9 — Renewals & Deadlines. |
| 2026-10-03 | Phase 9 complete: renewals + deadlines CRUD, optional Vault document links, `/app/renewals` UI. Next: Phase 10 — Action Center. |
| 2026-10-03 | Phase 10 complete: derived Action Center on Home aggregating overdue/upcoming items. Next: Phase 11 — Timeline. |
| 2026-10-03 | Phase 11 complete: derived Timeline chronological view (±365 days). Next: Phase 12 — Financial Commitments. |
| 2026-10-03 | Phase 12 complete: derived financial 7/30/365 overview from ACTIVE subscriptions + recurring payments. Next: Phase 13 — Search. |
| 2026-10-03 | Phase 13 complete: ownership-scoped search and structured Life Inbox with manual triage and Vault association. Migration `20261003100000_inbox_document_link`; 67 backend tests pass. Next: Phase 14 — AI Intelligence. |
| 2026-10-03 | Phase 14 complete: optional FastAPI extraction/suggestion service, owner-scoped Node mediation, Inbox review and confirmation into existing Document/Purchase/Warranty workflows; no schema change. Backend 75/75 tests, AI service 11/11 tests, Prisma checks, backend/frontend typechecks and builds pass. Real Tesseract 5.5.3 verified on a synthetic image and scanned PDF; text PDF direct extraction also verified. AI provider remains optional/unconfigured. Next: Phase 15. |

---

## Phase 13 handoff (2026-10-03)

- **Status:** Complete; Phase 13 implementation committed locally.
- **Completed:** Global deterministic search with query validation, grouped typed results and existing-area navigation; structured Inbox create/list/filter/read/update/triage/delete; optional private PDF/JPEG/PNG/WEBP uploads using the existing storage service and upload limits; optional Vault document association validated against authenticated ownership; audit events for Inbox mutations; authenticated shell integration.
- **Remaining:** Entity-specific detail routes do not exist, so search navigation opens each entity's existing feature area. Search is SQL `contains` over current domain fields with bounded result counts; no external index or ranking.
- **Database:** Added optional `InboxItem.linkedDocumentId` relation to Document (`ON DELETE SET NULL`) and index. Migration `backend/prisma/migrations/20261003100000_inbox_document_link/migration.sql` applied to local database. Prisma client regenerated. No other schema changes.
- **API:** `GET /api/search?q=...`; `GET/POST /api/inbox` (POST accepts structured JSON or multipart file); `GET/PATCH/DELETE /api/inbox/:id`; `GET /api/inbox/:id/download`; `PATCH /api/inbox/:id/triage`. All require the existing session authentication.
- **Frontend:** Added `/app/search`, Search navigation entry, SearchPage, functional InboxPage. Both routes are nested beneath ProtectedRoute and AppShell.
- **Tests:** Added `backend/src/searchInbox/searchInbox.test.ts` covering authentication, validation, empty search, entity groups, ownership isolation, Inbox CRUD/triage/filter, document association ownership, and not-found behavior.
- **Verification:** `cd backend && npm run prisma:generate`, `npm run prisma:validate`, `npm run typecheck`, `npm run build`, `npm test`; `cd frontend && npm run typecheck`, `npm run build`. The complete backend suite passes 67/67 tests. Initial sandbox test invocation failed in Node `os.userInfo()`; the same test command outside the sandbox passed.
- **Files created:** `backend/prisma/migrations/20261003100000_inbox_document_link/migration.sql`; `backend/src/controllers/searchInboxController.ts`; `backend/src/routes/searchInboxRoutes.ts`; `backend/src/searchInbox/searchInbox.test.ts`; `backend/src/services/inboxService.ts`; `backend/src/services/searchService.ts`; `backend/src/validators/searchInboxValidators.ts`; `frontend/src/api/searchInbox.ts`; `frontend/src/pages/SearchPage.tsx`.
- **Files modified:** `Context.md`; `backend/prisma/schema.prisma`; `backend/src/routes/index.ts`; `frontend/src/App.tsx`; `frontend/src/components/layout/AppShell.tsx`; `frontend/src/pages/InboxPage.tsx`.
- **Architectural decisions:** Search composes existing Prisma models in one service; inbox reuses InboxItem and its status enum, adding only the needed Vault association; private attachments use the existing FileStorageService and validated PDF/image upload path; storage keys are never returned; all domain queries carry `userId` from the authenticated request; manual triage maps to existing statuses (`UNREVIEWED`, `CATEGORIZED`, `DISMISSED`).
- **Git:** Branch `master`; latest commit is this focused Phase 13 handoff commit (HEAD); working tree is clean after commit.
- **Next phase:** Phase 14 — AI Intelligence.

---

## Phase 14 handoff (2026-10-03)

- **Status:** COMPLETE.
- **Completed:** Optional FastAPI service; backend-authenticated processing for owned Inbox items and Vault documents; PDF text extraction before OCR fallback; image OCR path for JPEG/PNG/WEBP; structured document/receipt suggestion contract; backend revalidation; Inbox review/edit/reject UI; explicit Vault document confirmation; confirmed Purchase creation through existing Purchase API; optional Warranty upsert only when the user opts in and supplies/confirms an end date. AI failures, missing configuration, unsupported/corrupt files, empty text, provider failures, malformed responses, and OCR unavailability return explicit errors.
- **Remaining/blocker:** No Phase 14 implementation remains. No live AI provider or API key is configured; this is optional by design. AI provider behavior is verified using mocks. The local `TESSERACT_CMD` was set only in verification process environments; the machine-specific executable path is not in tracked source/configuration.
- **AI architecture:** React calls Express only. Express requires session authentication, retrieves files only after `userId` ownership filters, reads bytes using `FileStorageService`, and calls `AI_SERVICE_URL/v1/process` using the private shared `AI_SERVICE_TOKEN`. The FastAPI service has no database or storage access. Non-loopback AI-service and provider URLs require HTTPS. The configured OpenAI-compatible provider receives extracted text only; images and original files are processed by the local OCR service. Provider-specific HTTP/JSON handling is isolated in `ai-service/main.py`.
- **OCR architecture:** pypdf extracts text from text-based PDFs. Empty-text PDFs are rendered page-by-page with PyMuPDF and OCRed with Pillow + pytesseract; image files go directly to local OCR. Scanned PDFs are limited to 20 pages per request; images above 40 megapixels are rejected. Tesseract can be selected with `TESSERACT_CMD`. The original file remains unchanged in private storage. OCR output is transient and returned only to the owning user.
- **Provider expectations:** `AI_PROVIDER=none` is the default, so requests fail clearly with `AI_UNAVAILABLE`; no fake output is returned. The only adapter implemented is `openai_compatible`, requiring a configured key and model in the AI service. Tests use deterministic mocks; no API call or paid provider is required to run the core app. UI explains that content may be sent to the configured external provider.
- **Environment variables introduced:** Backend `AI_SERVICE_URL`, `AI_SERVICE_TOKEN`. AI service `AI_SERVICE_TOKEN`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_API_BASE_URL`, `TESSERACT_CMD`. Examples are in root/backend `.env.example` and `ai-service/.env.example`; no secret values are stored in tracked files.
- **Database/migrations:** None. Existing `Document`, `DocumentVersion`, `InboxItem`, `Purchase`, `Warranty`, and `AuditLog` are reused. Extracted text and suggestions are not persisted. Confirmation calls existing Document/Purchase/Warranty domain logic and audit logging.
- **API:** `POST /api/ai/inbox/:id/process`; `POST /api/ai/documents/:id/process`; `POST /api/ai/inbox/:id/confirm-document`. All require existing session auth. Purchase and Warranty confirmation use existing `POST /api/purchases` and `PUT /api/purchases/:id/warranty` endpoints.
- **Frontend:** `AIInboxReview` is integrated into the existing protected `/app/inbox` page. It exposes idle, processing, errors, extracted text, editable document/receipt suggestions, reject, confirmation, and optional warranty form. Existing Vault documents can be linked to Inbox and processed from that review. No new route was added.
- **Result contract:** `AIProcessResponse` contains `extractedText`, `textSource` (`pdf-text` or `ocr`), `externalProviderUsed`, and a discriminated `suggestion.kind` (`document` or `receipt`). Document values use the existing `DocumentCategory` enum and supported Document fields. Receipt values map to Purchase fields. Warranty values are optional and accepted only as suggestions; LifeOS never infers a warranty duration. Both service and Node reject malformed output.
- **Real OCR verification:** Tesseract reported version `5.5.3.20260724`. A synthetic PNG containing `LIFEOS OCR TEST 4829` returned exactly `LIFEOS OCR TEST 4829`. A synthetic image-based PDF followed the `ocr` path and returned `LIFEOS OCR TEST 4829`. A synthetic text PDF followed the `pdf-text` path and returned `SYNTHETIC TEXT PDF 7316`. Temporary fixtures were created outside the repository and removed automatically. `TESSERACT_CMD` was set only for these local commands; no machine-specific value was saved in project files.
- **Tests/results:** `backend/src/ai/ai.test.ts` adds 8 mocked integration tests covering auth, ownership, unavailable configuration, validated suggestions, malformed output, no mutation before confirmation, Vault/Purchase confirmation, explicit and absent warranty dates, and document ownership. `ai-service/test_main.py` has 11 unit tests covering text PDF, scanned PDF/image OCR paths with mocked OCR, missing Tesseract, OCR failure, unsupported/corrupt files, empty text, AI unavailable/provider failure, malformed suggestions, and service-token enforcement. `backend npm test`: 75/75 pass. Python `python -m unittest -v`: 11/11 pass (with local Tesseract path configured). Prisma validate/generate pass. Backend/frontend typechecks and builds pass. `git diff --check` passes.
- **Security/privacy:** No frontend API key; raw paths/storage keys are not returned; service token is shared only through environment variables; no AI-side database access; files remain private and are read only after owner checks; API calls are HTTPS outside loopback; provider sends extracted text only; user confirms before any domain writes; writes use existing validators, ownership checks, and audits; provider tests are mocked. Existing `.env` files and private-storage contents were not staged or inspected for values.
- **Git:** Branch `master`; latest commit is the focused `feat: complete phase 14 - ai intelligence` handoff commit (`HEAD`); nothing was pushed.
- **Next:** Phase 15 — Command Center + Notifications.
