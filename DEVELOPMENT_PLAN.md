# LifeOS — Development Plan

**Document type:** Phased implementation roadmap  
**Status:** Planning complete; implementation not started  
**Current phase:** Phase 0 — Project Initialization (not started)

Work one phase at a time. Do not implement this entire product in one task. Each phase must have a clear objective, modify only relevant areas, leave the application runnable, be tested, meet acceptance criteria, update `Context.md`, and be committed to Git when stable.

Read `SRS.md` before product decisions. Read `SDD.md` before architectural decisions. Read this file before phase work. Read `Context.md` before implementation.

Do not invent requirements. Do not implement future phases. Do not add unnecessary dependencies. Never commit secrets. Never use real personal documents.

---

## Development philosophy

- Build incrementally.
- Keep frontend, backend, and (later) AI service aligned with `SDD.md`.
- Prefer a runnable vertical slice over incomplete breadth.
- Tests match the phase: foundation phases prove tooling; feature phases prove behavior and ownership.

---

## Phase 0 — Project Initialization

**Objective:** Create a runnable empty project foundation with the canonical stack placeholders and planning files already in the repo.

**Scope:**

- Repository layout for `frontend/` and `backend/` per `SDD.md`
- Tooling for React + TypeScript + Vite (frontend) and Node.js + Express + TypeScript (backend)
- `.gitignore`, `.env.example` (no secrets), README sufficient to run empty apps
- Do **not** implement product features, Prisma schema of domain entities, auth, or AI

**Implementation areas:**

- Repo root, frontend scaffold, backend scaffold
- Environment example files only

**Dependencies:** None (first implementation phase). Planning documents must already exist.

**Tests:**

- Frontend and backend start without crash
- TypeScript compile/check succeeds for empty apps

**Acceptance criteria:**

- Canonical stack is initialized
- No application domain features
- `.env` is gitignored; `.env.example` exists
- Apps are runnable

**Suggested Git commit:** `chore: initialize LifeOS frontend and backend foundations`

---

## Phase 1 — Design System + Application Shell

**Objective:** Establish visual language and the application chrome (navigation + route shell) without domain CRUD.

**Scope:**

- Calm, minimal, professional, responsive UI tokens/components
- Login and Register screens as UI (wiring to real auth is Phase 3)
- Protected shell routes: `/app/home`, `/app/vault`, `/app/commitments`, `/app/timeline`, `/app/inbox`
- Placeholder pages for those areas — not overcrowded dashboards

**Implementation areas:**

- `frontend/` design system, layout, routing

**Dependencies:** Phase 0

**Tests:**

- Routes render
- Unsized/mobile layout does not break primary shell
- Placeholders are reachable

**Acceptance criteria:**

- UI matches UX principles in `SRS.md`
- Route map matches `SDD.md`
- No fake data pretending to be a live Action Center

**Suggested Git commit:** `feat: add LifeOS design system and application shell`

---

## Phase 2 — Database + Backend Foundation

**Objective:** Connect Express to PostgreSQL via Prisma with layered backend structure and a health/readiness path.

**Scope:**

- Prisma setup, initial migration for `User` (minimal) or empty baseline as needed for connectivity
- Backend folders: `config/`, `controllers/`, `middleware/`, `routes/`, `services/`, `validators/`, `types/`, `utils/`
- Config from environment variables
- Do not implement full domain model (that is Phase 4)

**Implementation areas:**

- `backend/` foundation, Prisma, PostgreSQL connection

**Dependencies:** Phase 0 (Phase 1 may proceed in parallel on frontend only, but backend work depends on Phase 0)

**Tests:**

- Database connection succeeds in development
- Health endpoint responds
- Layering is used (no business logic dumped in routes)

**Acceptance criteria:**

- PostgreSQL + Prisma work
- Backend structure matches `SDD.md`
- Secrets remain in env vars

**Suggested Git commit:** `feat: add PostgreSQL and Express backend foundation`

---

## Phase 3 — Authentication + Authorization

**Objective:** Secure register/login/logout with HTTP-only session cookies, password hashing, protected routes, and ownership-ready identity.

**Scope:**

- Register, login, logout
- Password hashing
- HTTP-only cookie/session mechanism
- Protected API middleware
- Frontend login/register wired to API; `/app/*` requires session
- Rate limiting and security headers at a baseline level (hardening continues in Phase 19)

**Implementation areas:**

- `backend/` auth services, middleware, validators
- `frontend/` auth pages and route guards

**Dependencies:** Phase 2 (and Phase 1 for UI)

**Tests:**

- Register/login/logout
- Reject invalid credentials
- Unauthenticated access to protected APIs fails
- Password not stored in plaintext
- Session cookie is HTTP-only

**Acceptance criteria:**

- `SRS.md` FR-AUTH-* and baseline SEC auth items are met
- No client-trusted user id for authorization

**Suggested Git commit:** `feat: add authentication and protected session authorization`

---

## Phase 4 — Core LifeOS Data Model

**Objective:** Introduce the minimum canonical entities and relations in Prisma without full feature UIs.

**Scope:**

Entities at minimum:

- User (exists)
- Document, DocumentVersion
- Subscription, RecurringPayment
- Purchase, Warranty
- Deadline, Renewal
- InboxItem, Notification, AuditLog

Relationships per `SDD.md`. Association of documents to purchases/warranties/renewals designed cleanly (no forced `LifeItem` inheritance).

**Implementation areas:**

- Prisma schema and migrations
- Types aligned with schema

**Dependencies:** Phase 3

**Tests:**

- Migrations apply
- Relations match ownership (`User` owns records)
- Purchase–Warranty relation exists

**Acceptance criteria:**

- Minimum entity set exists
- Schema does not invent out-of-scope products (banking, budgets, passwords)

**Suggested Git commit:** `feat: add core LifeOS Prisma data model`

---

## Phase 5 — Vault / Documents

**Objective:** Private document vault with metadata and authenticated, ownership-checked file access.

**Scope:**

- Upload, list, view metadata, update metadata, delete
- Private local storage layout: `private-storage/user-id/document-id/file`
- File type validation and size limits
- No public static serving of vault files

**Implementation areas:**

- Backend document services + storage
- Frontend Vault
- Audit log entries for significant document actions (baseline)

**Dependencies:** Phase 4

**Tests:**

- Owner can CRUD documents
- Non-owner cannot access
- Invalid type/size rejected
- Files not reachable without auth

**Acceptance criteria:**

- Vault matches `SRS.md` FR-DOC-* and SEC file rules
- Dummy/sample files only — never real personal documents

**Suggested Git commit:** `feat: add private document vault`

---

## Phase 6 — Document Versioning

**Objective:** Version history for vault documents.

**Scope:**

- Current version, previous versions
- Version number, upload date, replacement history
- Replace file without losing prior versions

**Implementation areas:**

- `DocumentVersion` services
- Vault UI for history/replace

**Dependencies:** Phase 5

**Tests:**

- Replace creates a new current version
- Prior versions remain retrievable by owner
- Non-owner cannot read versions

**Acceptance criteria:**

- FR-VER-* met

**Suggested Git commit:** `feat: add document versioning`

---

## Phase 7 — Commitments

**Objective:** Manage subscriptions, recurring payments, and memberships as commitments, including optional action URLs.

**Scope:**

- CRUD for Subscription and RecurringPayment
- Memberships represented within these records as appropriate
- Action URLs stored and opened externally; LifeOS does not fake payment/renewal

**Implementation areas:**

- Backend commitment services
- Frontend Commitments area

**Dependencies:** Phase 4 (Phase 5–6 preferred so documents can later link, but commitments do not require vault)

**Tests:**

- Owner CRUD
- Cross-user isolation
- Action URL is stored, not executed as an internal integration

**Acceptance criteria:**

- FR-SUB-*, FR-PAY-*, FR-COM-*, FR-URL-01 (for commitments) met

**Suggested Git commit:** `feat: add subscriptions and recurring payments`

---

## Phase 8 — Purchases + Warranties

**Objective:** Record purchases and connect Purchase → (Receipt/Document) → Product/Warranty → Expiry.

**Scope:**

- Purchase CRUD
- Warranty associated with purchase
- Optional document association (receipt)
- Action URLs if relevant

**Implementation areas:**

- Backend purchase/warranty services
- Frontend surfaces (Commitments or dedicated views under existing areas — do not add unrelated apps)

**Dependencies:** Phase 4; Phase 5 if linking receipts

**Tests:**

- Warranty tied to purchase and owner
- Isolation tests
- Expiry stored and readable

**Acceptance criteria:**

- FR-PUR-* and FR-WAR-* met
- Not a shopping marketplace or finance advisor

**Suggested Git commit:** `feat: add purchases and warranties`

---

## Phase 9 — Renewals + Deadlines

**Objective:** Lifecycle renewals and deadline records with dates and action URLs.

**Scope:**

- Renewal CRUD (passport, licence, insurance, domain, certifications, memberships, licences — as user data, not hardcoded product modules)
- Deadline CRUD
- Optional document association

**Implementation areas:**

- Backend renewal/deadline services
- Frontend forms/lists within existing shell

**Dependencies:** Phase 4

**Tests:**

- Owner CRUD and isolation
- Dates drive later Action Center/Timeline (those UIs come next)

**Acceptance criteria:**

- FR-REN-* and FR-DL-* met

**Suggested Git commit:** `feat: add renewals and deadlines`

---

## Phase 10 — Action Center

**Objective:** Home dashboard aggregating what needs attention.

**Scope:**

- Backend aggregation of overdue items, upcoming deadlines, document expirations, renewals, subscription renewals, recurring payments, warranty expirations, and important actions
- Frontend `/app/home` consumes aggregation
- Calm, minimal presentation

**Implementation areas:**

- Action Center service + Home UI

**Dependencies:** Phases 5–9 (data sources)

**Tests:**

- Only the current user’s items appear
- Overdue vs upcoming distinction is correct for fixtures
- Empty state is usable

**Acceptance criteria:**

- FR-AC-01 met
- Not an overcrowded enterprise dashboard

**Suggested Git commit:** `feat: add Action Center dashboard`

---

## Phase 11 — Timeline

**Objective:** Chronological Life Timeline across admin events.

**Scope:**

- Aggregate deadlines, renewals, subscriptions, recurring payments, warranties, and document expirations
- Frontend `/app/timeline`

**Implementation areas:**

- Timeline service + Timeline UI

**Dependencies:** Phase 10 recommended; Phases 5–9 required

**Tests:**

- Order is chronological for fixtures
- User isolation
- Recurring occurrence rules documented in code comments or tests as implemented (algorithm chosen here if still open)

**Acceptance criteria:**

- FR-TL-01 met
- Not a calendar replacement (no full calendar product)

**Suggested Git commit:** `feat: add Life Timeline`

---

## Phase 12 — Financial Commitments

**Objective:** Show expected recurring commitments for next 7, 30, and 365 days.

**Scope:**

- Aggregation over subscriptions/recurring payments (and modeled recurring amounts)
- Display totals/lists for the three windows
- Explicitly not budgeting, investment, or advice

**Implementation areas:**

- Financial summary service + UI (Home and/or Commitments — keep minimal)

**Dependencies:** Phase 7; Timeline/Action Center may display the same numbers but this phase owns the 7/30/365 contract

**Tests:**

- Windows compute correctly for fixtures
- User isolation
- No budget categories or investment entities introduced

**Acceptance criteria:**

- FR-FIN-* met

**Suggested Git commit:** `feat: add financial commitments overview`

---

## Phase 13 — Search

**Objective:** Global search across documents, purchases, subscriptions, warranties, deadlines, renewals, recurring payments, and notes/metadata.

**Scope:**

- Deterministic search API scoped to the user
- Frontend search entry point (command palette UI is Phase 17; a simple search control is allowed)

**Implementation areas:**

- Search service + frontend search UI

**Dependencies:** Phases 5–9

**Tests:**

- Finds owned records by known metadata
- Does not return other users’ records
- Empty query behavior is safe

**Acceptance criteria:**

- FR-SRCH-01 met
- Advanced search deferred

**Suggested Git commit:** `feat: add global search`

---

## Phase 14 — Life Inbox

**Objective:** Allow users to dump files into an inbox for later manual categorization.

**Scope:**

- InboxItem upload/list/review
- Manual categorize into vault/commitments/etc. as designed
- `/app/inbox` becomes functional
- No requirement for AI yet

**Implementation areas:**

- Inbox backend + Inbox UI
- Private storage for inbox files (same non-public rules)

**Dependencies:** Phase 5 (storage/authz patterns)

**Tests:**

- Dump and list
- Manual categorization
- Ownership and file access rules

**Acceptance criteria:**

- FR-INB-* met
- Still no OCR required

**Suggested Git commit:** `feat: add Life Inbox`

---

## Phase 15 — AI Document Intelligence

**Objective:** Optional Python/FastAPI service suggests structured fields from documents; users Confirm / Edit / Reject.

**Scope:**

- Introduce `ai-service/`
- Backend mediates all calls
- AI cannot access PostgreSQL
- Core app works if AI is down
- Example: insurance PDF → provider, policy number, start/expiry dates

**Implementation areas:**

- FastAPI service, backend client, suggestion UX

**Dependencies:** Phases 5–6, 14 recommended

**Tests:**

- Suggestion flow Confirm/Edit/Reject
- Backend validation rejects malformed suggestions
- App remains up when AI is stopped

**Acceptance criteria:**

- FR-AI-01, FR-AI-02, FR-AI-03, SEC-16, SEC-17 met

**Suggested Git commit:** `feat: add optional AI document intelligence`

---

## Phase 16 — Receipt Intelligence

**Objective:** Receipt → OCR → extracted purchase info → user confirmation → Purchase → Warranty.

**Scope:**

- Workflow only as specified; still suggestions, not silent writes
- Reuse AI service and vault/inbox inputs

**Implementation areas:**

- AI + backend workflow + frontend confirmation

**Dependencies:** Phase 15, Phase 8

**Tests:**

- Happy path with fixture receipt (synthetic)
- Reject path writes nothing unauthorized
- AI down: manual purchase/warranty still works

**Acceptance criteria:**

- FR-AI-04 met

**Suggested Git commit:** `feat: add receipt intelligence workflow`

---

## Phase 17 — Ctrl+K Command Center

**Objective:** Global command palette (`Ctrl+K` / `Cmd+K`) for deterministic commands/search; natural language optional later.

**Scope:**

- Palette UI
- Commands such as: expiring in 30 days; recurring money due this month; find invoice; attention this week; active subscriptions
- May call existing search and Action Center APIs
- Natural-language AI parsing is optional and not required in this phase

**Implementation areas:**

- Frontend command palette
- Thin backend command endpoints if needed

**Dependencies:** Phases 10–13

**Tests:**

- Shortcut opens palette
- Deterministic commands return user-scoped results
- Does not execute fake external actions

**Acceptance criteria:**

- Command center works without requiring AI
- Honest about integrations (none unless built)

**Suggested Git commit:** `feat: add global command center`

---

## Phase 18 — Notifications

**Objective:** In-app reminders for dates LifeOS already tracks.

**Scope:**

- Notification records and in-app UI
- Triggers for deadlines, renewals, subscription payments, recurring payments, warranties, document expiry
- Email later — out of this phase unless trivially sketched without a provider

**Implementation areas:**

- Notification service, scheduler decision, frontend indicators

**Dependencies:** Phases 5–9; Action Center useful but not a substitute

**Tests:**

- Notifications created for fixtures reaching threshold
- User isolation
- Read/dismiss behavior as implemented

**Acceptance criteria:**

- FR-NOT-01 met
- FR-NOT-02 (email) not required

**Suggested Git commit:** `feat: add in-app notifications`

---

## Phase 19 — Security Hardening

**Objective:** Raise the security baseline to production-ready direction without changing product scope.

**Scope:**

- Review auth cookies, CSRF, rate limits, headers, error handling
- Audit logging completeness
- File validation review
- Ownership regression pass
- Confirm `.env` hygiene
- AI isolation re-check if AI exists

**Implementation areas:**

- Middleware, validators, audit, config

**Dependencies:** Core MVP features (through Phase 13); apply again after later phases if needed

**Tests:**

- Authz regression
- Rate limit behavior
- Error responses do not leak secrets
- File access unauthorized cases

**Acceptance criteria:**

- SEC-* items from `SRS.md` are satisfied at the current feature set

**Suggested Git commit:** `security: harden authentication, authorization, and file access`

---

## Phase 20 — Testing

**Objective:** Expand automated tests across critical user flows and ownership.

**Scope:**

- Auth, vault, commitments, purchases/warranties, renewals/deadlines
- Action Center, Timeline, financial windows, search
- Ownership isolation as a first-class suite
- Do not use real personal documents

**Implementation areas:**

- Frontend and backend test suites

**Dependencies:** Features under test must exist

**Tests:**

- This phase *is* the test expansion; define coverage targets during the phase without pretending a number is already mandated

**Acceptance criteria:**

- Critical flows have automated tests
- Suites run in development

**Suggested Git commit:** `test: expand LifeOS critical-path coverage`

---

## Phase 21 — UI Polish

**Objective:** Consistency, empty states, responsiveness, and calm visual quality.

**Scope:**

- Spacing, typography, empty/error states
- Responsive Home, Vault, Commitments, Timeline, Inbox
- No new product domains

**Implementation areas:**

- `frontend/`

**Dependencies:** Feature UIs exist

**Tests:**

- Key routes render in desktop and mobile widths
- No regressions to navigation/auth

**Acceptance criteria:**

- UX principles in `SRS.md` Section 10 are visibly met

**Suggested Git commit:** `feat: polish LifeOS UI consistency and empty states`

---

## Phase 22 — Docker + Deployment

**Objective:** Repeatable containers and a documented deployment direction.

**Scope:**

- Docker for frontend, backend, PostgreSQL
- Optional AI service container
- Env-based secrets
- Private storage not publicly published
- Hosting vendor not prescribed

**Implementation areas:**

- Docker files, compose, deployment notes

**Dependencies:** Application is feature-complete enough to run as services

**Tests:**

- Compose brings up core app + DB
- Core app runs with AI omitted

**Acceptance criteria:**

- Documented run path
- No secrets in images

**Suggested Git commit:** `chore: add Docker and deployment direction`

---

## Phase 23 — Documentation + GitHub

**Objective:** Project documentation for running, developing, and understanding LifeOS; GitHub presence as requested at that time.

**Scope:**

- Developer README: stack, phases, env, no real documents, no committed secrets
- Point to `SRS.md`, `SDD.md`, `DEVELOPMENT_PLAN.md`, `Context.md`
- GitHub repository/setup only when explicitly requested in that phase’s execution

**Implementation areas:**

- Docs; remote repository if instructed

**Dependencies:** Phase 22 recommended

**Tests:**

- Docs match actual scripts/paths

**Acceptance criteria:**

- A new developer can run the core app from documentation
- Planning files remain source of truth

**Suggested Git commit:** `docs: complete LifeOS developer documentation`

---

## Cross-phase rules

| Rule | Meaning |
| --- | --- |
| Runnable | Do not leave the app unable to start at phase end |
| Current phase only | No Phase N+1 features “while we’re here” |
| Context.md | Update status, completed work, and next task |
| Git | Commit when stable, after tests/acceptance |
| Secrets | Never commit `.env` |
| Data | Never use real personal documents |
| AI | Optional; core must work without it |
| Scope | LifeOS is not banking, budgeting, investment, tax, password manager, cloud drive, email client, calendar replacement, social network, or “just a chatbot” |
