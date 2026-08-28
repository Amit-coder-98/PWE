# Prabodhan Bag Production Operations

A mobile-first production order and customer relationship application for non-technical factory teams. It uses real API data only: there are no seeded orders, shared demo credentials, browser business data, or in-memory database fallback.

## Stack

- React, TypeScript, Vite, and Tailwind CSS
- FastAPI and Pydantic
- MongoDB Atlas database `prabodhan_bag_test`
- Private Cloudflare R2 artwork storage
- Vercel frontend, API, and authenticated daily cleanup job

## Implemented operations

- Secure Super Admin bootstrap and Admin-managed staff accounts
- Argon2 password hashing, forced first-login password change, HttpOnly sessions, refresh rotation, CSRF checks, throttling, and backend role permissions
- Real customer and order creation, search, filters, empty states, optimistic version checks, and append-only activity history
- Parallel workflow gates: Material to Cutting and Design to Plate; Cutting plus Plate unlock Printing
- Printing to Stitching to Packing to D.C. to Billing
- Payment plus Dispatch unlock Delivery; optional Return and Refund stages
- Clear role-specific forms and consequence-specific Yes/Cancel confirmation dialogs
- Immutable artwork versions, direct private R2 upload, server-side validation, customer approval links, and staff-assisted decisions
- Thirty-day artwork retention after delivery completion or cancellation
- Responsive phone navigation and desktop sidebar

## Required local configuration

Copy `backend/.env.example` to `backend/.env` and replace every placeholder. Never commit this file.

Required values:

```text
MONGODB_URL=mongodb+srv://...
MONGODB_DATABASE=prabodhan_bag_test
JWT_SECRET=<at least 32 random characters>
FRONTEND_ORIGINS=http://localhost:5173
COOKIE_SECURE=false
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=prabodhan-bag-designs-test
CRON_SECRET=<a different long random value>
```

Use a dedicated empty Atlas test database and a private R2 test bucket. The application never deletes unknown Atlas databases or falls back to temporary records.

## Install and run

Backend, from the project root in PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Frontend, in a second terminal from the project root:

```powershell
npm install
$env:VITE_API_URL="http://127.0.0.1:8000"
npm run dev
```

Open `http://localhost:5173`. If Atlas is unavailable, the application intentionally shows a friendly retry screen instead of using mock data.

## Bootstrap the first Super Admin

With `backend/.env` configured and the Atlas `users` collection empty:

```powershell
cd backend
.venv\Scripts\python -m app.bootstrap_admin
```

The command prompts locally for name, email, and password. It refuses to run if any user already exists. After signing in, create each employee under **Team & Access**; employees receive temporary passwords and must change them on first login.

## Verification

```powershell
npm run lint
npm run build
cd backend
.venv\Scripts\python -m pytest -q
```

## Vercel preview deployment

Import the GitHub repository and set the project root to this directory. Add the backend environment variables above in Vercel, with these production adjustments:

```text
APP_ENV=production
FRONTEND_ORIGINS=https://<preview-or-production-domain>
COOKIE_SECURE=true
```

Keep `VITE_API_URL` unset so React uses the same-origin `/api` route. `api/index.py` exposes FastAPI, while `vercel.json` routes API requests before the React fallback and invokes `GET /api/cron/cleanup` daily. Vercel sends `CRON_SECRET` as the cleanup endpoint's Bearer authorization value.

Deploy a feature branch first. Configure separate Atlas and R2 test resources for Preview, run the practical workflow, and merge to `main` only after approval.

## Image-storage rule

Atlas stores only artwork metadata, review decisions, token hashes, and audit history. The actual JPG, PNG, or WebP object is private in R2. View and upload URLs expire; R2 credentials remain server-side. R2 lifecycle rules should cover only abandoned uploads, while the authenticated cleanup endpoint handles the business retention rule.

Automated WhatsApp or email delivery is intentionally out of scope. Staff copy the seven-day review link and send it manually.
