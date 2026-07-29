# AdStream

> Connect Advertisers. Empower Publishers.

A full-stack advertising marketplace: advertisers create and fund campaigns, publishers register websites and earn from ad placements, and an admin panel moderates both sides. This is a monorepo containing both halves.

```
adstream/
├── apps/
│   ├── api/     Node.js + Express + PostgreSQL backend — REST API, ad-serving engine, payments
│   └── web/     Next.js 14 + TypeScript frontend — marketing site + advertiser/publisher/admin dashboards
├── package.json  npm workspaces root
└── README.md     you are here
```

Each app has its own detailed README:

- [`apps/api/README.md`](apps/api/README.md) — backend setup, API reference, deployment
- [`apps/web/README.md`](apps/web/README.md) — frontend setup, environment variables, deployment
- [`apps/web/INTEGRATION_MAP.md`](apps/web/INTEGRATION_MAP.md) — the exact API contract the frontend was built against, including known gaps between the original design spec and what the backend actually supports

## Quick start (both apps locally)

```bash
npm install   # installs both workspaces from the root

# Terminal 1 — backend
cp apps/api/.env.example apps/api/.env.local
# edit apps/api/.env.local: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
npm run migrate
npm run dev:api          # http://localhost:4000

# Terminal 2 — frontend
cp apps/web/.env.example apps/web/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000 (the default already matches)
npm run dev:web           # http://localhost:3000
```

## Why one repo, two apps

The backend and frontend are deployed as **separate services** — this monorepo is for keeping them versioned and reviewed together, not for running them as one process. `apps/web` talks to `apps/api` over HTTP via `NEXT_PUBLIC_API_URL`, exactly as it would if they lived in separate repos.

## Deployment

Both apps are container-first (each has its own `Dockerfile` and `render.yaml`) and deploy as two independent Render or Koyeb services from this one repo:

1. **Backend** (`apps/api`): point a Render/Koyeb service at this repo with the Docker build context set to `apps/api`. See `apps/api/docs/DEPLOYMENT.md`.
2. **Frontend** (`apps/web`): a second service, build context `apps/web`, with `NEXT_PUBLIC_API_URL` set to the backend's deployed URL at **build** time.
3. Once the frontend has a real URL, set the backend's `CORS_ORIGIN` to that exact origin — required for the httpOnly refresh-token cookie to work cross-origin. Details in `apps/web/INTEGRATION_MAP.md`.

## Development order this was built in

1. Backend, phase by phase, following its own 13-phase build plan (architecture → auth → wallets → campaigns → publisher sites → payments → ad-serving → analytics → notifications → admin → optimization → testing → documentation).
2. Frontend, starting from a source-verified integration map of the finished backend (not assumptions), then foundation → design system → marketing site → auth → advertiser dashboard → publisher dashboard → admin dashboard.

Every gap between what a design spec assumed and what the backend actually exposes is documented rather than papered over with fake data — see the "Gaps" sections in `apps/web/INTEGRATION_MAP.md`.
