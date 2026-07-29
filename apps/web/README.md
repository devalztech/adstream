# AdStream Web

The frontend for AdStream — Next.js 14 (App Router), TypeScript, Tailwind CSS. Talks to the existing `adstream-api` backend; see [`INTEGRATION_MAP.md`](./INTEGRATION_MAP.md) for the exact API contract this was built against.

## Stack

Next.js · React · TypeScript (strict) · Tailwind CSS · TanStack Query · React Hook Form · Zod · Recharts · Radix UI primitives (hand-assembled in the shadcn/ui style) · next-themes

## Getting started

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL to your backend
npm run dev
```

Opens on `http://localhost:3000`. The backend (`adstream-api`) must be running separately — see its own README.

## Structure

```
app/
├── (marketing)/       public site: landing, advertise, publishers, pricing, about, faq, contact
├── (auth)/             login, register, forgot/reset password, verify email
├── advertiser/          dashboard, campaigns, analytics, wallet, transactions, payments, notifications, settings
├── publisher/            dashboard, websites, ad-units, earnings, withdrawals, analytics, notifications, settings
└── admin/                  dashboard, users, campaign/website moderation, withdrawals, notifications, settings

components/
├── ui/           low-level primitives (button, input, dialog, select, tabs, ...)
├── layout/        page shells (DashboardLayout, AuthCard, PageHeader, RequireRole)
├── navigation/      sidebar, topbar, mobile drawer, notification bell, marketing nav/footer
├── charts/           ChartCard, RangeSelect
├── tables/             DataTable (pagination, loading, empty, error states built in)
├── shared/               StatusBadge, StatCard, EmptyState, ErrorState, ConfirmDialog, RejectDialog
├── campaigns/, publisher/, wallet/    domain-specific components

lib/
├── api/          one file per backend module (auth, campaigns, websites, payments, analytics, notifications, admin, ...)
├── auth/           AuthProvider, useAuth(), in-memory token store
├── validation/       zod schemas, mirroring the backend's validation rules
├── constants/          nav config, targeting option lists
└── money.ts, utils.ts

middleware.ts     documents why real auth checks live client-side, not here (see the file itself)
```

## Authentication model

- Access token: held in memory only (`lib/auth/token-store.ts`), never `localStorage`.
- Refresh token: an httpOnly cookie set by the backend — invisible to and unmanaged by this app directly.
- `lib/api/client.ts` handles 401 → single-flight refresh → retry automatically.
- Route protection (`components/layout/require-role.tsx`) is a UX layer only; the backend's own auth middleware is the actual security boundary. See `middleware.ts` for why Next middleware doesn't attempt real auth checks.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Backend base URL, no trailing slash. Must be set at **build** time — Next.js inlines `NEXT_PUBLIC_*` vars into the client bundle. |
| `NEXT_PUBLIC_SITE_URL` | no | Used for absolute URLs in `sitemap.xml`/`robots.txt`. |

## Deployment

Both Render and Koyeb work from the included `Dockerfile` (multi-stage, `next.config.js` uses `output: 'standalone'` for a minimal runtime image). `render.yaml` is included for Render's Blueprint deploy. Set `NEXT_PUBLIC_API_URL` as a **build-time** environment variable on whichever platform you use — a runtime-only env var won't reach the client bundle.

The backend's `CORS_ORIGIN` must be set to this app's deployed origin once you have one — see the backend's integration notes on why `CORS_ORIGIN=*` breaks credentialed requests.

## What's not built (and why)

See the "Gaps vs. the frontend spec" section at the end of `INTEGRATION_MAP.md` — every case where the original design spec assumed a backend capability that doesn't exist (file uploads, a fraud-detection page, cross-website ad-unit listing, a public stats endpoint, a contact-form endpoint) is documented there with what was built instead, rather than silently faked.
