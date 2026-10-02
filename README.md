# LifeOS

Unified personal life-administration system.

> Calendar tells you when. LifeOS tells you what, why, where, and what to do next.

Planning documents: `SRS.md`, `SDD.md`, `DEVELOPMENT_PLAN.md`, `Context.md`.

## Current status

Phase 1 — Design System + Application Shell complete. Login/Register UI and protected `/app/*` shell with calm placeholders. No database, real authentication, or product CRUD yet.

## Prerequisites

- Node.js 22+
- npm

## Setup

```bash
cp .env.example frontend/.env
cp backend/.env.example backend/.env
cd frontend && npm install
cd ../backend && npm install
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

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:5173  
The Vite dev server proxies `/api` to the backend.

Open `/login` or `/register`, then continue into the app shell. Sign-in is a UI placeholder until Phase 3.

## Checks

```bash
cd frontend && npm run typecheck && npm run build
cd ../backend && npm run typecheck && npm run build
```

## Notes

- Do not commit `.env` files.
- Do not store real personal documents in `private-storage/`.
- Do not add Phase 2+ features until that phase is the current task.
