# LifeOS

A unified personal life-administration system.

> Calendar tells you when. LifeOS tells you what, why, where, and what to do next.

Personal admin work is usually scattered across folders, email, calendars, portals, and notes. LifeOS brings documents, commitments, purchases, warranties, renewals, and deadlines into one private system so you can see what needs attention and what to do next.

LifeOS is under active development and is built incrementally in phases. Phases 0–11 are complete. Additional functionality is planned.

---

## Implemented features

- **Authentication & authorization** — Register, login, and logout with HTTP-only session cookies, password hashing, protected routes, and ownership-scoped access.
- **Private document Vault** — Upload, list, view, update metadata, download, and delete personal documents stored in private local file storage (not publicly served).
- **Document versioning** — Replace documents with new versions, view version history, and download a specific version while preserving prior files.
- **Commitments** — Manage subscriptions and recurring payments, including stored action URLs opened externally.
- **Purchases & warranties** — Track purchases with optional receipt links to Vault documents and one warranty record per purchase.
- **Renewals & deadlines** — Track renewals and deadlines with optional linked documents and external action URLs.
- **Action Center** — Derived home view of overdue and upcoming items aggregated from existing owned records (no separate action-item store).
- **Timeline** — Derived chronological view of life-admin events across documents, commitments, purchases, warranties, renewals, and deadlines.

### Planned (not implemented yet)

Later phases may add financial commitment summaries, AI assistance, OCR, notifications, search, Life Inbox, keyboard command palette (Ctrl+K), and related capabilities. These are **not** part of the current system.

---

## Current progress

LifeOS is developed one phase at a time.

| Phase | Name | Status |
| --- | --- | --- |
| Phase 0 | Project Initialization | Complete |
| Phase 1 | Design System + Application Shell | Complete |
| Phase 2 | Database Foundation | Complete |
| Phase 3 | Authentication & Authorization | Complete |
| Phase 4 | Core LifeOS Data Model | Complete |
| Phase 5 | Vault / Documents | Complete |
| Phase 6 | Document Versioning | Complete |
| Phase 7 | Commitments | Complete |
| Phase 8 | Purchases & Warranties | Complete |
| Phase 9 | Renewals & Deadlines | Complete |
| Phase 10 | Action Center | Complete |
| Phase 11 | Timeline | Complete |
| Phase 12 | Financial Commitments | Planned |

Phase 12 has **not** started.

---

## Architecture

```
React + TypeScript + Vite + Tailwind frontend
        ↓
Node.js + Express + TypeScript backend
        ↓
PostgreSQL + Prisma
        ↓
Private local file storage
```

The backend is the only component that talks to PostgreSQL and private file storage. An AI service is planned for later phases and is **not** part of the implemented core system today.

---

## Tech stack

**In use**

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Node.js
- Express
- PostgreSQL
- Prisma
- Git / GitHub

**Planned later**

- Python / FastAPI AI service (optional; after core application work)

---

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL (local)

---

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd LifeOS
```

### 2. Create environment files

**Windows PowerShell**

```powershell
Copy-Item .env.example frontend\.env
Copy-Item backend\.env.example backend\.env
```

**macOS / Linux**

```bash
cp .env.example frontend/.env
cp backend/.env.example backend/.env
```

Root `.env.example` documents shared variables. Runtime config lives in:

- `frontend/.env` — frontend Vite settings (see `frontend/.env.example`)
- `backend/.env` — backend settings (see `backend/.env.example`)

### 3. Configure backend secrets

Edit `backend/.env` and set:

- `DATABASE_URL` — PostgreSQL connection string for your local database
- `SESSION_SECRET` — a unique secret, at least 32 characters

Do not commit real credentials. Placeholder values in example files are not production secrets.

Optional backend overrides (documented in `backend/.env.example`) include vault storage path and max upload size.

### 4. Install dependencies and apply migrations

```bash
cd backend
npm install
npx prisma migrate deploy
```

```bash
cd frontend
npm install
```

Do **not** reset the database as part of normal setup.

---

## Running the application

Use two terminals.

**Backend**

```bash
cd backend
npm install
npm run dev
```

- Backend: http://localhost:3001
- Health: http://localhost:3001/api/health
- Ready: http://localhost:3001/api/ready

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173

The Vite dev server proxies `/api` to the backend (cookies included).

Open `/register` to create an account, then use the authenticated `/app/*` routes (for example `/app/vault`, `/app/commitments`, `/app/renewals`, `/app/timeline`, `/app/home`).

---

## Database

From `backend/`:

```bash
npx prisma migrate deploy
```

Useful Prisma scripts from `backend/package.json`:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

Use `migrate deploy` for applying existing migrations. Do not reset the database unless you intentionally choose to wipe local data outside this guide.

---

## Verification

Run these checks from the repository after installing dependencies.

**Prisma validation**

```bash
cd backend
npx prisma validate
```

**Backend typecheck**

```bash
cd backend
npm run typecheck
```

**Backend build**

```bash
cd backend
npm run build
```

**Backend tests**

```bash
cd backend
npm test
```

**Frontend typecheck**

```bash
cd frontend
npm run typecheck
```

**Frontend build**

```bash
cd frontend
npm run build
```

---

## Security and privacy

- Never commit `.env` files.
- Never commit real personal documents.
- `private-storage/` is intentionally excluded from Git except `.gitkeep`.
- Vault files are not publicly served; access goes through authenticated API routes.
- Document access is ownership-checked.
- Use sample or test documents during development.

---

## Documentation

| Document | Purpose |
| --- | --- |
| `SRS.md` | Product requirements and product philosophy |
| `SDD.md` | System architecture and design direction |
| `DEVELOPMENT_PLAN.md` | Phased implementation roadmap |
| `Context.md` | Living implementation state for current work |

---

## Project status

**Implemented:** Phases 0–11 (foundation through Timeline).

**Planned:** Phase 12 (Financial Commitments) and later phases described in `DEVELOPMENT_PLAN.md`.

LifeOS is actively developed. The core life-admin loop for documents, commitments, purchases/warranties, renewals/deadlines, Action Center, and Timeline is in place; many product areas remain ahead.
