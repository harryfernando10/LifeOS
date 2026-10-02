# LifeOS

Unified personal life-administration system.

> Calendar tells you when. LifeOS tells you what, why, where, and what to do next.

Planning documents: `SRS.md`, `SDD.md`, `DEVELOPMENT_PLAN.md`, `Context.md`.

## Current status

Phase 5 — Vault / Documents complete. Authenticated users can manage private documents in the Vault. Authentication (Phase 3) and the core data model (Phase 4) remain intact.

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL (local)

## Setup

```bash
cp .env.example frontend/.env
cp backend/.env.example backend/.env
```

Edit `backend/.env`: set `DATABASE_URL` and a unique `SESSION_SECRET` (min 32 characters).

```bash
cd frontend && npm install
cd ../backend && npm install
npx prisma migrate deploy
```

On Windows PowerShell, copy env files with `Copy-Item` instead of `cp`.

## Run

Terminal 1 — backend:

```bash
cd backend
npm run dev
```

Backend: http://localhost:3001
Health: http://localhost:3001/api/health
Ready: http://localhost:3001/api/ready

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:5173  
The Vite dev server proxies `/api` to the backend (cookies included).

Open `/register` to create an account, then use `/app/vault` to upload sample documents. Sign out clears the server session.

## Checks

```bash
cd backend && npx prisma validate && npm run typecheck && npm run build && npm test
cd ../frontend && npm run typecheck && npm run build
```

## Auth API (Phase 3)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` (authenticated)

## Documents API (Phase 5)

- `GET /api/documents`
- `GET /api/documents/:id`
- `POST /api/documents` (multipart: `file` + metadata)
- `PATCH /api/documents/:id`
- `DELETE /api/documents/:id`
- `GET /api/documents/:id/download`

Allowed upload types: PDF, JPEG, PNG, WEBP. Default max size: 10 MiB (`MAX_UPLOAD_BYTES`).

## Notes

- Do not commit `.env` files.
- Do not store real personal documents in `private-storage/`.
- Vault files are never publicly served; access is ownership-checked through the API.
- Do not add Phase 6+ features until that phase is the current task.
