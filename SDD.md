# LifeOS — Software Design Document (SDD)

**Document type:** System design direction  
**Status:** Canonical architecture baseline  
**Implementation status:** Not started  

This document describes the intended architecture. It does **not** treat schema fields, API paths, Docker layouts, or library versions as finalized unless they are stated as canonical constraints from the product specification.

Product behavior is defined in `SRS.md`. Build order is defined in `DEVELOPMENT_PLAN.md`.

---

## 1. System architecture

Canonical runtime shape:

```
React frontend
    ↓  REST API
Node.js / Express backend
    ↓
PostgreSQL
+
Private file storage

Optional (after core application works):
Backend  →  Python / FastAPI AI service
```

The backend is the only component that talks to PostgreSQL and private file storage.

The AI service, when introduced, is optional. The core application must continue functioning if the AI service is unavailable.

The AI service must **not** access the database. It returns structured suggestions to the backend. The backend validates suggestions before storage. Users Confirm / Edit / Reject AI output (`SRS.md`).

---

## 2. Technology stack

| Layer | Canonical choice |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| AI service | Python, FastAPI — introduced only after the core application works |
| Storage (initial) | Private local file storage |
| Storage (later) | Cloud object storage may be introduced |
| Notifications (initial) | In-app |
| Notifications (later) | Email may be added |

Package manager, exact Node/Python versions, and specific supporting libraries (session store, hash algorithm, test runner) are **not** finalized in this document. They will be chosen in the relevant implementation phases without violating `SRS.md`.

---

## 3. Repository structure

Intended direction (exact folder names may be refined in Phase 0, but the separation of concerns is required):

```
LifeOS/
  SRS.md
  SDD.md
  DEVELOPMENT_PLAN.md
  Context.md
  frontend/          # React + Vite + TypeScript
  backend/           # Node.js + Express + TypeScript
  ai-service/        # Python + FastAPI (created only when AI work starts)
  private-storage/   # local private files; not publicly served; not committed with user data
```

Backend internal layout (canonical):

```
config/
controllers/
middleware/
routes/
services/
validators/
types/
utils/
```

Prisma schema and migrations live with the backend (exact path chosen in Phase 2).

Frontend internal layout is not fully finalized. It must support:

- public auth routes (Login, Register)
- protected `/app/*` shell
- areas: Home, Vault, Commitments, Timeline, Inbox

Do not put large amounts of business logic in Express route handlers. Use:

**Route → Controller → Service → Database / external service**

---

## 4. Frontend architecture

### 4.1 Application areas

| Area | Purpose |
| --- | --- |
| Home | Action Center: “What needs my attention?” |
| Vault | Private document repository |
| Commitments | Subscriptions, recurring payments, memberships |
| Timeline | Chronological aggregation of life-admin events |
| Inbox | Dump zone for uncategorized files (full capability post-MVP) |

Authentication:

- Login
- Register

Protected application routes (canonical):

- `/app/home`
- `/app/vault`
- `/app/commitments`
- `/app/timeline`
- `/app/inbox`

Public auth routes will exist (exact paths such as `/login` and `/register` are not finalized here).

### 4.2 UI direction

The UI should be modern, minimal, professional, responsive, calm, classy, and visually consistent.

Do **not** create an overcrowded enterprise dashboard.

### 4.3 Client responsibilities

- Render views and collect user input.
- Call the REST API with credentials (HTTP-only cookies; frontend does not store session secrets in localStorage as a substitute for the cookie/session mechanism).
- Guard `/app/*` routes so unauthenticated users are redirected to login.
- Display Action Center, Timeline, search results, and financial overview from backend-provided data.
- Treat AI output as suggestions requiring Confirm / Edit / Reject when AI exists.

The frontend does not access PostgreSQL or the filesystem directly.

---

## 5. Backend architecture

### 5.1 Layering

| Layer | Responsibility |
| --- | --- |
| `routes/` | HTTP path mapping only |
| `controllers/` | Request/response shaping; call services |
| `services/` | Business rules, ownership checks orchestration, transactions |
| `validators/` | Input validation |
| `middleware/` | Auth, rate limiting, security headers, error handling |
| `config/` | Environment-backed configuration |
| `types/` | Shared TypeScript types |
| `utils/` | Pure helpers |

### 5.2 Expected capability areas (phased)

Authentication, users, documents, document versions, subscriptions, recurring payments, purchases, warranties, renewals, deadlines, inbox items, notifications, audit logs, Action Center aggregation, Timeline aggregation, financial commitment summaries, search, and (later) AI suggestion intake.

Exact module filenames are chosen during implementation phases.

---

## 6. Database architecture

PostgreSQL is the system of record for structured data. Prisma is the ORM.

A potential shared/generalized `LifeItem` concept **may** be considered, but inheritance must **not** be forced if relational modeling is cleaner. Prefer explicit tables and relations unless a later phase proves a generalization reduces complexity without obscuring ownership.

Exact columns, enums, indexes, and constraint names are **not** finalized. The following entities are the minimum design set.

### 6.1 Core entities (minimum)

- User
- Document
- DocumentVersion
- Subscription
- RecurringPayment
- Purchase
- Warranty
- Deadline
- Renewal
- InboxItem
- Notification
- AuditLog

### 6.2 Relationships (canonical)

```
User
  → Documents
  → Subscriptions
  → RecurringPayments
  → Purchases
  → Deadlines
  → Renewals
  → Notifications
  → InboxItems
  → AuditLogs

Purchase
  → Warranty

Document
  → DocumentVersion
```

Documents may be associated with other entities such as purchases, warranties, or renewals. The association mechanism (foreign keys, join tables, polymorphic link) is **not** finalized.

Every user-owned entity must be scoped by `User` so authorization can verify ownership.

---

## 7. Entity relationship notes

Logical ERD (conceptual, not a Prisma schema):

```
User 1──* Document 1──* DocumentVersion
User 1──* Subscription
User 1──* RecurringPayment
User 1──* Purchase 1──0..1 (or 1──*) Warranty
User 1──* Deadline
User 1──* Renewal
User 1──* InboxItem
User 1──* Notification
User 1──* AuditLog

Document *──? Purchase / Warranty / Renewal  (association TBD)
```

Warranty cardinality (one per purchase vs many) is **not** finalized. The product constraint is: Purchase connects to Warranty and expiry, and receipts/documents can be linked.

Financial commitments overview is a **query/aggregation** over recurring commitments (subscriptions and recurring payments, and other dated recurring amounts as modeled), not a separate budgeting ledger.

Action Center and Timeline are **derived views** over existing entities, not necessarily separate stored entity types. Materialized tables are optional and not decided.

---

## 8. Authentication architecture

Direction (canonical):

- Secure registration and login.
- Password hashing (algorithm chosen in Phase 3; never store plaintext).
- HTTP-only authentication cookies / session mechanism.
- Secrets only via environment variables.
- `.env` never committed; `.env.example` provided.

Session storage (server memory vs database vs other) is **not** finalized. CSRF strategy for cookie-based auth will be defined in Phase 3 / Phase 19 without weakening HTTP-only cookies.

Logout must invalidate the session/cookie.

---

## 9. Authorization

Every protected resource must verify ownership.

Rules:

- Authenticated identity comes from the session/cookie, not from a client-supplied user id as authority.
- Read/update/delete/download of records and files is limited to the owning user.
- Protected frontend routes (`/app/*`) require a valid session.
- Protected API routes require the same.
- Family/shared vault is out of scope until a later explicit phase; do not implement sharing now.

---

## 10. File storage

Initial conceptual structure:

```
private-storage/
  user-id/
    document-id/
      file
```

Constraints:

- Files must not be publicly accessible (no static public URL for vault files).
- Access goes through authenticated backend endpoints that verify ownership.
- File type validation and size limits on upload.
- Document versioning implies multiple files or versioned filenames under the document; exact naming is not finalized.
- Cloud object storage may replace or complement local storage later; the access pattern (authz-checked backend) remains.

Never store real personal documents in development.

---

## 11. API architecture

Style: REST over HTTP between the React frontend and the Express backend.

Conventions **not** fully finalized: URL prefix (`/api/v1` vs `/api`), pagination shape, error JSON envelope. They will be chosen in Phase 2 and kept consistent.

Expected resource families (illustrative, not a locked path list):

- Auth (register, login, logout, session)
- Documents and document versions (including authenticated download)
- Subscriptions
- Recurring payments
- Purchases
- Warranties
- Renewals
- Deadlines
- Action Center summary
- Timeline events
- Financial commitments summary (7 / 30 / 365 days)
- Search
- Inbox items (when Inbox is built)
- Notifications (when notifications are built)
- AI suggestion endpoints (when AI is built) — backend-mediated only

The backend validates all writes. Clients cannot bypass ownership or validation.

---

## 12. Action Center architecture

Action Center is the Home dashboard. It answers “What needs my attention?”

It aggregates for the current user:

- overdue items
- upcoming deadlines
- document expirations
- renewals
- subscription renewals
- recurring payments
- warranty expirations
- important actions

**Design direction:** a backend aggregation service queries owned records and returns a unified attention list. Ranking, time windows, and grouping UI are not finalized; they must stay calm and minimal, not an overcrowded dashboard.

Action Center does not invent items that are not backed by stored records.

---

## 13. Timeline architecture

Life Timeline is a chronological view aggregating:

- deadlines
- renewals
- subscriptions
- recurring payments
- warranties
- document expirations

**Design direction:** a backend service produces a time-ordered event list from owned entities. Recurring items may appear as computed occurrences within a queried window; recurrence expansion rules are not finalized and will be defined in the Timeline / financial phases without turning LifeOS into a calendar replacement.

---

## 14. Search architecture

Search across:

- documents
- purchases
- subscriptions
- warranties
- deadlines
- renewals
- recurring payments
- notes/metadata

MVP search is **global** and may be deterministic (filters, ILIKE/full-text as chosen in Phase 13). Advanced search is post-MVP.

Search must be scoped to the authenticated user’s data.

The global command center (`Ctrl+K` / `Cmd+K`) may initially wrap deterministic commands/search. Natural-language AI commands are later and optional.

---

## 15. AI architecture

Introduced only after the core application works (Phases 15–16 in `DEVELOPMENT_PLAN.md`).

```
Frontend → Backend → Python/FastAPI AI service
                ↓
         validate suggestion
                ↓
         wait for user Confirm / Edit / Reject
                ↓
         persist to PostgreSQL
```

Rules:

- AI service has no direct database access.
- AI/OCR output is a suggestion, never an implicit write of truth.
- If the AI service is down, vault, commitments, and other core features still work.
- Document intelligence example: insurance PDF → provider, policy number, start date, expiry date.
- Receipt intelligence potential flow: Receipt → OCR → extracted purchase information → user confirmation → Purchase → Warranty.

Model choice, OCR engine, and deployment topology are **not** finalized.

---

## 16. Notification architecture

Reminders for:

- deadlines
- renewals
- subscription payments
- recurring payments
- warranties
- document expiry

Initial implementation: **in-app notifications**.

Email may be added later.

Scheduling (in-process vs job runner vs database poll) is **not** finalized. Notification records belong to a User. Delivery must not leak data across users.

---

## 17. Security architecture

First-class controls aligned with `SRS.md`:

- Secure authentication and password hashing
- HTTP-only cookie/session mechanism
- Authorization/ownership checks
- Protected routes
- Private file storage
- File type validation and size limits
- Input validation
- Rate limiting
- Security headers
- Audit logging
- Secure error handling
- Environment-only secrets; never commit `.env`
- Provide `.env.example`
- No real personal documents in development
- AI must not access the database; backend validates suggestions

AuditLog records security-relevant and significant data-changing actions. Exact event catalog is not finalized.

---

## 18. Docker / deployment direction

Phase 22 covers Docker and deployment.

Direction only:

- Containerize frontend, backend, and PostgreSQL for repeatable environments.
- AI service is an optional container, not required for core uptime.
- Private storage must remain non-public.
- Secrets injected via environment, not images.
- Hosting provider, CI vendor, and production domain are **not** finalized.

Do not create Docker files until Phase 22 unless a later explicit instruction changes that.

---

## 19. What is intentionally not finalized

To avoid pretending implementation is complete:

- Prisma field lists and enums
- REST path catalog and status-code matrix
- Session store and CSRF details
- Recurrence expansion algorithm
- Search engine (SQL vs dedicated index)
- File version naming scheme
- Document–entity association schema
- OCR/AI models
- Email provider
- Cloud object storage vendor
- Docker compose topology

These will be decided in their phases, remaining consistent with this SDD and `SRS.md`.
