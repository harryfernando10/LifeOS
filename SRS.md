# LifeOS — Software Requirements Specification (SRS)

**Document type:** Product requirements  
**Status:** Canonical planning baseline  
**Implementation status:** Not started  

This document is the product authority for LifeOS. Architectural decisions belong in `SDD.md`. Phase sequencing belongs in `DEVELOPMENT_PLAN.md`. Current work state belongs in `Context.md`.

---

## 1. Product vision

LifeOS is a unified personal life-administration system.

**Core principle:**

> Calendar tells you when. LifeOS tells you what, why, where, and what to do next.

The product brings together personal administrative information that is normally scattered across files, emails, calendars, websites, and apps. It is a private system of record for documents, commitments, renewals, warranties, deadlines, and the actions they imply.

LifeOS does not replace a calendar, bank, cloud drive, or chatbot. It organizes administrative life so the user can see what needs attention and how to act.

---

## 2. Problem statement

Personal administration is fragmented:

- Identity and legal documents live in folders, photos, email attachments, and government portals.
- Subscriptions, memberships, and recurring bills are billed by many vendors with different renewal dates.
- Warranties are forgotten because receipts are disconnected from products.
- Deadlines (applications, submissions, appointments) sit in notes, calendars, and messages.
- Expiry dates for passports, licences, insurance, and certifications are easy to miss.
- Taking action usually means finding the right portal URL after the reminder has already fired.

Users need one private place that answers:

- What needs my attention?
- What is this document, and is it current?
- What am I paying for, and when?
- What expires, and how do I renew it?
- What did I buy, and is it still under warranty?
- What is due, and where do I go to act?

---

## 3. Target users

**Primary user:** an individual managing their own administrative life (documents, subscriptions, bills, warranties, renewals, and deadlines).

**Initial deployment assumption:** single-user-per-account ownership. Family or shared vaults are out of MVP and post-MVP until explicitly planned.

**Non-users (initially):** households as first-class shared entities, organizations, and enterprise teams.

---

## 4. Product areas

### 4.1 Home / Action Center

The primary dashboard answers: **“What needs my attention?”**

It aggregates:

- overdue items
- upcoming deadlines
- document expirations
- renewals
- subscription renewals
- recurring payments
- warranty expirations
- important actions

### 4.2 Vault

A private repository for personal documents, including (examples, not a closed list):

- passport, PAN, Aadhaar, driving licence, college ID
- certificates
- insurance documents
- agreements
- invoices and receipts
- other personal documents

Documents have structured metadata and version history.

### 4.3 Commitments

Manage:

- subscriptions
- recurring payments
- memberships

Examples: Netflix, Spotify, YouTube Premium, Google One, iCloud, gym, electricity, internet, mobile, rent, insurance, EMI.

### 4.4 Renewals

Manage lifecycle-based items:

- passport, driving licence, insurance, domain, certifications, memberships, licences

### 4.5 Warranties

Connect: **Purchase → Receipt → Product → Warranty → Expiry**

### 4.6 Deadlines

Examples: college applications, scholarship applications, project submissions, appointments, document submissions, internship applications.

### 4.7 Life Timeline

A chronological view aggregating:

- deadlines
- renewals
- subscriptions
- recurring payments
- warranties
- document expirations

### 4.8 Financial commitments

Show expected recurring commitments over:

- next 7 days
- next 30 days
- next 365 days

This is **not** a budgeting, investment, or financial-advice application.

### 4.9 Life Inbox

Users can dump PDFs, receipts, invoices, screenshots, notices, and scanned documents.

Initially these are manually reviewed and categorized. Later, AI may suggest classifications and extracted information.

### 4.10 Document intelligence (post-MVP)

Optional AI/OCR can extract structured information from documents. AI output is a **suggestion**. The user must Confirm / Edit / Reject.

Example: insurance PDF → provider, policy number, start date, expiry date.

### 4.11 Receipt intelligence (post-MVP)

Potential workflow: Receipt → OCR → extracted purchase information → user confirmation → Purchase → Warranty.

### 4.12 Document versioning

Documents must support current version, previous versions, version number, upload date, and replacement history.

### 4.13 Action URLs

Records may contain external URLs for the relevant official action (renew passport, manage subscription, pay bill, renew insurance, renew domain).

LifeOS must **not** pretend to perform an external action unless an actual integration exists.

### 4.14 Global command center

`Ctrl+K` / `Cmd+K`.

Examples:

- show everything expiring in the next 30 days
- how much recurring money is due this month?
- find my laptop invoice
- what needs attention this week?
- show active subscriptions

MVP may use deterministic commands/search. Natural-language AI can be added later.

### 4.15 Search

Search across documents, purchases, subscriptions, warranties, deadlines, renewals, recurring payments, and notes/metadata.

### 4.16 Notifications

Reminders for deadlines, renewals, subscription payments, recurring payments, warranties, and document expiry.

Initial implementation: in-app notifications. Email can be added later.

---

## 5. Functional requirements

IDs are stable for planning and acceptance. Priority: **MVP** unless marked **Post-MVP**.

### 5.1 Authentication and accounts

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-AUTH-01 | Users can register an account. | MVP |
| FR-AUTH-02 | Users can log in and log out. | MVP |
| FR-AUTH-03 | Sessions use a secure HTTP-only cookie/session mechanism. | MVP |
| FR-AUTH-04 | Passwords are stored hashed, never in plaintext. | MVP |
| FR-AUTH-05 | Unauthenticated users cannot access `/app/*` routes or protected APIs. | MVP |

### 5.2 Authorization and ownership

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-OWN-01 | Every protected resource verifies the authenticated user owns it. | MVP |
| FR-OWN-02 | Users cannot read, update, delete, or download another user’s records or files. | MVP |
| FR-OWN-03 | File access is only through authenticated backend endpoints that check ownership. | MVP |

### 5.3 Vault and documents

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-DOC-01 | Users can upload documents into a private vault. | MVP |
| FR-DOC-02 | Documents have structured metadata (type, identifiers, dates, notes, and related fields as designed). | MVP |
| FR-DOC-03 | Users can list, view, update metadata, and delete their documents. | MVP |
| FR-DOC-04 | File type validation and size limits apply on upload. | MVP |
| FR-DOC-05 | Files are stored in private local storage, not publicly served. | MVP |

### 5.4 Document versioning

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-VER-01 | A document has a current version and previous versions. | MVP |
| FR-VER-02 | Each version records version number, upload date, and replacement history. | MVP |
| FR-VER-03 | Users can replace a document with a new version without losing prior versions. | MVP |

### 5.5 Commitments

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-SUB-01 | Users can create, read, update, and delete subscriptions. | MVP |
| FR-PAY-01 | Users can create, read, update, and delete recurring payments. | MVP |
| FR-COM-01 | Memberships can be represented within commitments (subscription and/or recurring payment as appropriate). | MVP |
| FR-COM-02 | Commitment records may store an action URL for managing or paying externally. | MVP |

### 5.6 Purchases and warranties

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-PUR-01 | Users can record purchases. | MVP |
| FR-WAR-01 | A purchase may have an associated warranty with expiry. | MVP |
| FR-WAR-02 | Users can associate documents (e.g. receipts) with purchases/warranties. | MVP |

### 5.7 Renewals and deadlines

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-REN-01 | Users can create, read, update, and delete renewals with relevant dates and action URLs. | MVP |
| FR-DL-01 | Users can create, read, update, and delete deadlines. | MVP |

### 5.8 Action Center

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-AC-01 | Home/Action Center aggregates overdue items, upcoming deadlines, document expirations, renewals, subscription renewals, recurring payments, warranty expirations, and important actions for the current user. | MVP |

### 5.9 Timeline

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-TL-01 | Timeline presents a chronological view of deadlines, renewals, subscriptions, recurring payments, warranties, and document expirations. | MVP |

### 5.10 Financial commitments overview

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-FIN-01 | The system shows expected recurring commitments over the next 7, 30, and 365 days. | MVP |
| FR-FIN-02 | The system does not provide budgets, investment advice, or banking features. | MVP |

### 5.11 Search and action URLs

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-SRCH-01 | Users can search across documents, purchases, subscriptions, warranties, deadlines, renewals, recurring payments, and notes/metadata. | MVP |
| FR-URL-01 | Records may store external action URLs; the UI opens them as external destinations and does not fake completion of the action. | MVP |

### 5.12 Command center

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CMD-01 | A global command palette (`Ctrl+K` / `Cmd+K`) supports deterministic commands/search in the product roadmap. | Post-MVP (natural language later); deterministic search may reuse FR-SRCH-01 in MVP as specified in the development plan. |
| FR-CMD-02 | Natural-language interpretation of commands is optional and later. | Post-MVP |

Exact phase placement of the command palette UI is defined in `DEVELOPMENT_PLAN.md` (Phase 17). MVP search (Phase 13) is the functional baseline.

### 5.13 Life Inbox

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-INB-01 | Users can dump PDFs, receipts, invoices, screenshots, notices, and scanned documents into an inbox. | Post-MVP |
| FR-INB-02 | Inbox items are initially manually reviewed and categorized. | Post-MVP |

### 5.14 AI / OCR intelligence

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-AI-01 | Optional AI/OCR may extract structured fields from documents as suggestions. | Post-MVP |
| FR-AI-02 | Users must Confirm, Edit, or Reject AI suggestions before they become stored facts. | Post-MVP |
| FR-AI-03 | The core application continues to function if the AI service is unavailable. | Post-MVP |
| FR-AI-04 | Receipt intelligence may follow Receipt → OCR → confirmation → Purchase → Warranty. | Post-MVP |

### 5.15 Notifications

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-NOT-01 | In-app reminders for deadlines, renewals, subscription payments, recurring payments, warranties, and document expiry. | Post-MVP (initial notification implementation) |
| FR-NOT-02 | Email notifications are optional and later. | Post-MVP |

### 5.16 Audit

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-AUD-01 | Significant actions are recorded in an audit log. | MVP baseline direction; depth grows with security hardening. |

---

## 6. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-01 | Frontend is React, TypeScript, Vite, React Router, and Tailwind CSS. |
| NFR-02 | Backend is Node.js, Express, and TypeScript. |
| NFR-03 | Database is PostgreSQL with Prisma ORM. |
| NFR-04 | Optional AI service is Python/FastAPI, introduced only after the core application works. |
| NFR-05 | UI is modern, minimal, professional, responsive, calm, classy, and visually consistent. It is not an overcrowded enterprise dashboard. |
| NFR-06 | The application remains runnable after each development phase. |
| NFR-07 | Secrets exist only in environment variables. `.env` is never committed. `.env.example` is provided. |
| NFR-08 | Real personal documents are never used during development. |
| NFR-09 | Initial file storage is private and local; cloud object storage may come later. |
| NFR-10 | Core LifeOS works without the AI service. |
| NFR-11 | Input validation, rate limiting, security headers, and secure error handling are part of the security baseline. |
| NFR-12 | Development is incremental: one phase at a time, with tests and acceptance criteria. |

---

## 7. MVP

MVP includes:

- project foundation
- authentication
- authorization
- PostgreSQL
- Prisma
- document vault
- private file storage
- document metadata
- document versioning
- subscriptions
- recurring payments
- purchases
- warranties
- renewals
- deadlines
- Action Center
- Timeline
- financial commitments overview
- global search
- action URLs
- security baseline

MVP does **not** require Life Inbox, OCR, AI extraction, receipt intelligence, natural-language Ctrl+K, notifications/email, advanced search, cloud storage, integrations, or family/shared vault.

---

## 8. Post-MVP features

- Life Inbox
- OCR
- AI document extraction
- receipt intelligence
- AI categorization
- natural-language Ctrl+K
- notifications/email
- advanced search
- cloud storage
- integrations
- family/shared vault

---

## 9. Security requirements

Security is a first-class requirement.

| ID | Requirement |
| --- | --- |
| SEC-01 | Secure authentication. |
| SEC-02 | Password hashing. |
| SEC-03 | HTTP-only authentication cookies/session mechanism. |
| SEC-04 | Authorization and ownership checks on every protected resource. |
| SEC-05 | Protected frontend routes and protected APIs. |
| SEC-06 | Private file storage; files are not publicly accessible. |
| SEC-07 | File type validation and file size limits. |
| SEC-08 | Input validation. |
| SEC-09 | Rate limiting. |
| SEC-10 | Security headers. |
| SEC-11 | Audit logging. |
| SEC-12 | Secure error handling (no secret leakage). |
| SEC-13 | Secrets only through environment variables. |
| SEC-14 | `.env` must never be committed; `.env.example` must be provided. |
| SEC-15 | Never use real personal documents during development. |
| SEC-16 | The AI service must not directly access the database. |
| SEC-17 | AI returns structured suggestions to the backend; the backend validates them before storage. |

---

## 10. UX principles

- Primary question on Home: “What needs my attention?”
- Modern, minimal, professional, responsive, calm, classy, visually consistent.
- Do not create an overcrowded enterprise dashboard.
- Action URLs are honest: they open the official destination; LifeOS does not fake the action.
- AI, when present, is a suggestion layer with explicit Confirm / Edit / Reject.
- Protected application areas: Home, Vault, Commitments, Timeline, Inbox.
- Authentication screens: Login, Register.
- Protected routes: `/app/home`, `/app/vault`, `/app/commitments`, `/app/timeline`, `/app/inbox`.

Inbox UI may exist as a route shell before Life Inbox is fully implemented; full inbox capability is post-MVP per Section 8 and `DEVELOPMENT_PLAN.md`.

---

## 11. Acceptance criteria (product-level)

The product is acceptably specified when:

1. A user can register, log in, and access only their own data.
2. A user can store versioned documents in a private vault with metadata.
3. A user can manage subscriptions, recurring payments, purchases, warranties, renewals, and deadlines.
4. Action Center answers what needs attention from those records.
5. Timeline shows those events chronologically.
6. Financial overview shows recurring commitments for 7 / 30 / 365 days without becoming a budgeting app.
7. Search finds records across the listed entity types.
8. Action URLs open external destinations without pretending LifeOS completed the action.
9. Files are never publicly accessible; ownership is always checked.
10. The system remains usable without AI.
11. Scope boundaries in Section 12 are not violated.

Phase-level acceptance criteria are in `DEVELOPMENT_PLAN.md`.

---

## 12. Scope boundaries

LifeOS is **not** initially:

- a banking application
- a budgeting application
- an investment platform
- a tax platform
- a password manager
- a cloud drive replacement
- a full email client
- a calendar replacement
- a social network
- simply an AI chatbot

AI is an intelligence layer over the administrative system.

Do not add unrelated features merely because they sound interesting. Do not invent requirements beyond this SRS and the paired `SDD.md` / `DEVELOPMENT_PLAN.md`.
