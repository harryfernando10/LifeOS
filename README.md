# LifeOS

LifeOS is a private personal life-administration system for keeping important documents, commitments, purchases, renewals, deadlines, and follow-up actions together.

> Calendar tells you when. LifeOS tells you what, why, where, and what to do next.

It is a student-built software project and a private system of record. LifeOS is not a bank, cloud drive, password manager, calendar replacement, or email client.

## Features

- Account registration and login with bcrypt password hashes, signed HTTP-only session cookies, and user-scoped records.
- Private Vault for documents, metadata, download, deletion, and version history.
- Subscriptions, recurring payments, purchases, receipts, warranties, renewals, and deadlines.
- Home Action Center, chronological Timeline, and derived financial commitment summaries by currency.
- Authenticated search across supported records and a Life Inbox for uncategorized private files.
- Optional OCR and AI-assisted document review. Text is extracted locally; when an external provider is configured, extracted text is sent to that provider. Suggestions require user review and confirmation before they change LifeOS records.
- Command Center and in-app notifications for upcoming and overdue items.

## Architecture

```text
React + TypeScript + Vite frontend
              │ REST API, HTTP-only cookies
              ▼
Node.js + Express + TypeScript backend ─── PostgreSQL via Prisma
              │
              ├── private local file storage
              └── optional Python + FastAPI OCR/AI service
```

The backend owns authentication, authorization, database access, private files, and writes to domain records. The optional AI service has no database access. The core application works without AI.

## Technology

- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS
- Backend: Node.js 22+, Express, TypeScript, Prisma
- Database: PostgreSQL
- Optional AI service: Python, FastAPI, PyMuPDF, Pillow, pytesseract
- Tests: Node.js test runner, Python `unittest`

## Repository layout

```text
LifeOS/
  frontend/                 React application
  backend/                  Express API, Prisma schema/migrations, tests
  ai-service/               Optional OCR and structured suggestion service
  private-storage/          Local private files; user contents are ignored by Git
  SRS.md                    Product requirements
  SDD.md                    Architecture and design decisions
  DEVELOPMENT_PLAN.md       Consolidated phase status
  Context.md                Implementation and handoff state
```

## Requirements

- Node.js 22 or newer and npm
- PostgreSQL
- Optional AI/OCR: Python 3.10+; Tesseract OCR executable for image and scanned-PDF OCR
- Optional structured AI suggestions: credentials for a supported OpenAI-compatible provider

## Local setup

### 1. Configure environment files

From the repository root:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
Copy-Item ai-service/.env.example ai-service/.env
```

The AI environment file is only needed when running that service. Set `DATABASE_URL` to your PostgreSQL database and replace `SESSION_SECRET` with a randomly generated value of at least 32 characters. Configure the same generated `AI_SERVICE_TOKEN` in `backend/.env` and `ai-service/.env` only if enabling the optional service. The examples contain placeholders, not usable credentials.

Environment variable names are documented in the three service example files. The root `.env.example` is a quick reference. Never commit real `.env` files or provider credentials.

### 2. Install backend dependencies and apply migrations

```powershell
cd backend
npm install
npx prisma migrate deploy
npm run dev
```

The API listens on `http://localhost:3001`. Liveness and database readiness are available at `/api/health` and `/api/ready`.

### 3. Run the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, register an account, and use the authenticated `/app/*` areas. Vite proxies `/api` to the backend during development.

### Optional OCR and AI service

Install Python dependencies in `ai-service` and run FastAPI:

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

Set `AI_SERVICE_URL` and `AI_SERVICE_TOKEN` in the backend environment. OCR of image files and scanned PDFs requires the Tesseract executable to be installed separately and available on `PATH`; `TESSERACT_CMD` can point to a local executable. Text-based PDFs are extracted without OCR. The AI provider is disabled by default; structured suggestions require `AI_PROVIDER=openai_compatible`, `AI_API_KEY`, and `AI_MODEL` in the AI service environment. Configure `AI_API_BASE_URL` only for a trusted HTTPS provider (localhost is allowed for development).

Review the AI privacy implications before enabling an external provider: the extracted document text leaves the local service and is sent to that provider. Never use real sensitive documents for public demos or tests.

## Database and files

Prisma schema and committed migrations are under `backend/prisma`. Use `npx prisma migrate deploy` for an existing database. Do not reset a database with data you need. Vault and Inbox file bytes live under the ignored `private-storage/` directory by default; they are served only through authenticated, ownership-checked API routes. Back up the database and private file storage together using a secure process appropriate to your deployment.

## Verification

Run commands from each service directory:

```powershell
# backend
npm test
npm run typecheck
npm run build
npm run prisma:validate
npm run prisma:generate
npm run prisma:deploy

# frontend
npm run typecheck
npm run build

# AI service
python -m unittest -v
```

`prisma:deploy` applies pending migrations; use it only against the intended database. The frontend currently has no separate test script. Real OCR additionally requires the Tesseract executable.

## Docker and deployment

No Docker or cloud deployment configuration is included. Run the frontend, backend, PostgreSQL, and optional AI service separately as described above. A production deployment must provide environment secrets through its runtime configuration, use HTTPS, configure `FRONTEND_ORIGIN` and `DATABASE_URL` for that deployment, persist and protect private storage, and back up both database and files. Do not expose private storage as a static directory.

## Security and privacy

- User-scoped queries and ownership checks protect records and files; session cookies are HTTP-only, `SameSite=Lax`, and marked `Secure` in production. State-changing browser requests must match the configured frontend origin.
- Passwords are stored as bcrypt hashes. API errors omit stack traces and database details.
- Uploads are size-limited, checked against allowed extensions/MIME hints and file signatures, and stored under generated keys outside public assets.
- AI is optional. The backend authenticates to the AI service with a shared token and validates returned suggestions; user confirmation is required before saving.
- `.env` files, build outputs, dependency directories, caches, and private-storage contents are excluded from Git. This is not a substitute for reviewing the tracked files before publication.

## Limitations

- The application uses local private file storage; it does not provide managed cloud storage, replication, or automated backups.
- OCR quality depends on document quality and local Tesseract installation. AI suggestions may be incorrect and must be reviewed.
- External AI providers receive document text when configured and used.
- No email delivery, scheduled notification worker, password reset, email verification, MFA, or shared household accounts are included.
- Docker and automated cloud deployment are not included.

## Project status and roadmap

Phases 0–15 are implemented. Phase 16 is the final production-hardening and release phase; this project has no further planned development phase. The exact phase names and release record are in [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) and [Context.md](Context.md).

| Phase | Area | Status |
| --- | --- | --- |
| 0–11 | Foundation through Timeline | Complete |
| 12 | Financial Commitments | Complete |
| 13 | Search + Life Inbox | Complete |
| 14 | AI Intelligence | Complete |
| 15 | Command Center + Notifications | Complete |
| 16 | Production Hardening + Release | Final planned phase |

## Screenshots

Screenshots can be added here when synthetic demo data and a safe capture environment are available. Do not use real personal documents or account data.

## Project documents

- [SRS.md](SRS.md) — product requirements
- [SDD.md](SDD.md) — architecture and design direction
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) — implementation phases
- [Context.md](Context.md) — current implementation and release handoff
