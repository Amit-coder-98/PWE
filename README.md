# Prabodhan Bag Production Operations

Mobile-first production order and customer relationship management application for non-technical factory teams.

## Technology

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Server state: TanStack Query foundation
- Backend: FastAPI with JWT-style role sessions and Pydantic validation
- Database: MongoDB, with an in-memory fallback for local demonstrations
- Deployment: Vercel for the frontend and a Docker-compatible host for FastAPI

## Implemented first production slice

- Role-based login for 11 factory responsibilities
- Administrator dashboard and department-focused work queue
- Searchable order list with clear status and urgency labels
- Complete clickable order details page
- Parallel Material → Cutting and Design → Plate branches
- Printing dependency on both preparation branches
- Printing → Stitching → Packing → D.C. → Billing workflow
- Payment and Dispatch convergence before Delivery Confirmation
- Return and Refund exception states
- Plain-language “What should happen next?” guidance
- Confirmation before workflow changes
- Quantity progress, activity history, status propagation, and demo reset
- Mobile bottom navigation and desktop sidebar
- Backend role checks, workflow validation, audit events, and version conflict protection

The original HTML/CSS/JavaScript prototype is preserved under `legacy-demo/`.

## Demo users

All demo accounts use password `admin123`.

| Role | Email |
|---|---|
| Administrator | `admin@demo.com` |
| Order / CRM Manager | `order@demo.com` |
| Material Manager | `inventory@demo.com` |
| Designer | `designer@demo.com` |
| Cutting Manager | `cutting@demo.com` |
| Plate Operator | `plate@demo.com` |
| Printing Operator | `printing@demo.com` |
| Stitching Manager | `stitching@demo.com` |
| Packing & D.C. Manager | `packing@demo.com` |
| Accountant | `accountant@demo.com` |
| Dispatch Manager | `dispatch@demo.com` |

## Run the frontend

```bash
npm install
npm run dev
```

Without `VITE_API_URL`, the UI uses seeded browser data and localStorage. This mode is suitable for a client presentation and does not contact a live API.

## Run FastAPI

From the `backend` directory:

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload
```

Copy `.env.example` to `.env` and configure MongoDB. If `MONGODB_URL` is absent or unavailable, the API starts in `memory-demo` mode. Check `GET /api/health` to confirm the active database mode.

To connect the frontend, create a root `.env.local`:

```text
VITE_API_URL=http://127.0.0.1:8000
```

## Checks

```bash
npm run lint
npm run build
```

From `backend`:

```bash
.venv\Scripts\python -m pytest -q
```

## Vercel

Import the GitHub repository. Vercel detects Vite, runs `npm run build`, and serves `dist`. The included rewrite keeps React routes working when a page is refreshed directly.

Every push to `main` creates a production deployment. For safer changes, push a feature branch, review its Vercel preview, and merge it into `main` after approval.

## Current limitations

This is the first production-stack implementation slice. Demo authentication is intentionally not production security, Marathi translations are not yet migrated, and advanced customers, quotations, billing reports, file uploads, and notification delivery remain for the next slices.
