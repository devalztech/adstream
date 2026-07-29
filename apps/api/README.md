# AdStream

> Connect Advertisers. Empower Publishers.

A production-shaped advertisement marketplace: advertisers create and
fund campaigns, publishers register websites and earn from ad
placements, and an admin panel moderates both sides. Built with
Node.js, Express, and PostgreSQL — no ORM, no heavyweight framework —
deployable to Render or Koyeb from the same Docker image.

## What's here

Every module from the original architecture plan is implemented:

- **Auth & authorization** — registration, login, rotating refresh
  tokens, email verification, password reset, account lockout,
  role-based access control (advertiser / publisher / admin, strictly
  separated)
- **Wallets** — a ledger-safe balance system (row-locked, append-only
  transaction log) that every money-moving feature routes through
- **Payments** — Paystack and Flutterwave, behind one provider
  abstraction; deposits, withdrawals, and signed webhooks
- **Campaigns** — full CRUD, budgets, targeting, creatives, lifecycle
  (draft → pending approval → active/rejected, pause/resume/archive/duplicate)
- **Publisher websites & ad units** — domain registration with live
  ownership verification, per-format ad placements, generated embed codes
- **Ad-serving engine** — a real matching algorithm (targeting, budget,
  format compatibility), a lightweight async embed script, impression/
  click/conversion tracking, basic fraud flagging
- **Analytics** — CTR/CPM/CPC/CPA, daily breakdowns, top campaigns/sites,
  computed on demand from the tracking data
- **Notifications** — in-app + email (any SMTP provider), triggered
  from auth, payments, and admin actions
- **Admin panel** — campaign/website moderation, withdrawal processing,
  user management, platform overview, fully audited
- **Tests** — unit tests for validation/crypto logic, integration tests
  covering auth, the wallet ledger under concurrency, campaign
  ownership isolation, and the ad-serving flow end to end

## Documentation

| Doc | Covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Module structure, the wallet ledger, ad-serving performance, payment abstraction |
| [`docs/API.md`](docs/API.md) | Every endpoint, by module |
| [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | Every environment variable |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Render and Koyeb, step by step |
| [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) | Conventions, how to add a module |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | PR checklist, review expectations |
| [`tests/README.md`](tests/README.md) | Running the test suite |

## Quick start

```bash
npm install
cp .env.example .env   # set DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET at minimum
npm run migrate
npm run dev
```

The API starts on `http://localhost:4000`. Check `GET /health`.

Generate JWT secrets with `openssl rand -hex 64`. Full variable
reference in `docs/ENVIRONMENT.md`.

## Project structure

```
src/
├── config/          env loading, logger
├── db/               connection pool, migrations (000-014), migration runner
├── middleware/        auth, RBAC, validation, rate limiting, error handling
├── modules/            one folder per feature — routes → controller → service → schema
│   ├── auth/ users/ wallets/ payments/
│   ├── campaigns/ publisher-sites/ ad-serving/ analytics/
│   ├── notifications/ admin/
├── public/embed.js     the publisher-facing ad-serving script
├── utils/               ApiError, cache, audit log, token/password helpers
├── app.js                Express app assembly
└── server.js              entry point, graceful shutdown
tests/
├── unit/                  no database required
└── integration/            full request-flow tests against a real Postgres instance
docs/                        see table above
```

See `docs/ARCHITECTURE.md` for why it's organized this way.

## Deployment

`render.yaml` and `Dockerfile` support both Render and Koyeb from the
same source — see `docs/DEPLOYMENT.md` for the full walkthrough,
including webhook registration and provisioning the first admin
account (admin signup is intentionally not self-service).
