# LifeOS

Unified personal life-administration system.

> Calendar tells you when. LifeOS tells you what, why, where, and what to do next.

Planning documents: `SRS.md`, `SDD.md`, `DEVELOPMENT_PLAN.md`, `Context.md`.

## Current status

Phase 3 — Authentication + Authorization complete. Register, login, logout, and protected `/app/*` routes use real HTTP-only session cookies against PostgreSQL. No domain CRUD yet (Phase 4+).

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

Open `/register` to create an account, then use `/app/*`. Sign out clears the server session.

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

## Notes

- Do not commit `.env` files.
- Do not store real personal documents in `private-storage/`.
- Do not add Phase 4+ features until that phase is the current task.
