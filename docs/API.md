# API Reference

Base URL: `https://<your-deployment>/api/v1` (dashboard/authenticated endpoints)
Ad-serving base: `https://<your-deployment>/ad` (public, unauthenticated, outside `/api`)

Every JSON response follows: `{ success: boolean, message: string, data: any, meta?: object }`.
Validation errors return `400` with `details: [{ field, message }]`.

Money fields (budgets, bids, wallet amounts) are always integers in the
smallest currency unit — kobo for NGN — never floats.

## Auth (`/api/v1/auth`) — public

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/register` | `fullName, email, password, role (advertiser\|publisher), companyName?` | Admin accounts cannot self-register |
| POST | `/login` | `email, password` | Returns `accessToken` in body, refresh token in an httpOnly cookie |
| POST | `/refresh` | — (reads cookie) | Rotates the refresh token |
| POST | `/logout` | — | Revokes the current session |
| POST | `/verify-email` | `token` | |
| POST | `/forgot-password` | `email` | Always returns success, even for unknown emails (no enumeration) |
| POST | `/reset-password` | `token, newPassword` | Revokes all existing sessions on success |

Rate limited to 10 requests / 15 min per IP on register/login/forgot/reset.

## Users (`/api/v1/users`) — requires auth

| Method | Path | Notes |
|---|---|---|
| GET | `/me` | Own profile only |
| PATCH | `/me` | `fullName?, companyName?` |

## Wallets (`/api/v1/wallets`) — requires auth

| Method | Path | Notes |
|---|---|---|
| GET | `/me` | Balance + currency |
| GET | `/me/transactions` | `?limit=&offset=`, newest first |

## Payments (`/api/v1/payments`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/deposit` | any role | `amount, provider (paystack\|flutterwave)` → returns checkout URL |
| GET | `/deposit/verify` | any role | `?reference=&provider=` |
| POST | `/withdraw` | publisher only | `amount, provider, destination: {accountNumber, accountName, bankCode}` |
| GET | `/withdrawals` | publisher only | Own withdrawal history |
| POST | `/webhooks/paystack` | none (signature-verified) | Called by Paystack |
| POST | `/webhooks/flutterwave` | none (signature-verified) | Called by Flutterwave |

## Campaigns (`/api/v1/campaigns`) — advertiser only

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Create as draft; requires ≥1 creative |
| GET | `/` | `?status=&limit=&offset=` |
| GET | `/:id` | Includes creatives |
| PATCH | `/:id` | Draft-only |
| POST | `/:id/submit` | draft → pending_approval |
| POST | `/:id/pause` | active → paused |
| POST | `/:id/resume` | paused → active |
| POST | `/:id/archive` | completed/rejected/paused/draft → archived |
| POST | `/:id/duplicate` | Clones campaign + creatives as new draft |
| POST | `/:id/creatives` | Add a creative |
| DELETE | `/:id/creatives/:creativeId` | Remove a creative |

## Websites & Ad Units (`/api/v1/websites`) — publisher only

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Register a domain, returns a verification token |
| GET | `/` | `?status=&limit=&offset=` |
| GET | `/:id` | Includes ad units |
| PATCH | `/:id` | |
| POST | `/:id/verify` | Live fetch-based ownership check (meta_tag/file_upload); dns_txt needs admin review |
| POST | `/:id/ad-units` | Website must be verified/approved first |
| GET | `/:id/ad-units` | Includes ready-to-paste `embedCode` |
| POST | `/:id/ad-units/:adUnitId/pause` | |
| POST | `/:id/ad-units/:adUnitId/resume` | |
| DELETE | `/:id/ad-units/:adUnitId` | |

## Ad Serving (`/ad`) — public, no auth, outside `/api`

| Method | Path | Notes |
|---|---|---|
| GET | `/serve?unit=<embedKey>&country=&device=&os=` | Returns a matched creative + `impressionId`, or `204` if nothing matches |
| GET | `/embed.js` | The static embed script publishers load |
| GET | `/click?imp=<impressionId>` | Records the click, 302-redirects to the campaign's destination URL |
| POST | `/conversions` | `clickId, value?, metadata?` — called from the advertiser's own site |

## Analytics (`/api/v1/analytics`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/advertiser/overview` | advertiser | `?range=today\|7d\|30d\|90d\|year` |
| GET | `/campaigns/:id` | advertiser | Daily breakdown + top countries/devices |
| GET | `/publisher/overview` | publisher | |
| GET | `/websites/:id` | publisher | Daily earnings breakdown |

## Notifications (`/api/v1/notifications`) — requires auth

| Method | Path | Notes |
|---|---|---|
| GET | `/` | `?unreadOnly=&limit=&offset=`, includes `meta.unreadCount` |
| POST | `/:id/read` | |
| POST | `/read-all` | |

## Admin (`/api/v1/admin`) — admin only

| Method | Path | Notes |
|---|---|---|
| GET | `/overview` | Platform-wide stats |
| GET | `/campaigns/pending` | Defaults to `pending_approval` |
| POST | `/campaigns/:id/approve` | |
| POST | `/campaigns/:id/reject` | `reason` required |
| GET | `/websites/pending` | Defaults to `verified` (awaiting approval) |
| POST | `/websites/:id/approve` | |
| POST | `/websites/:id/reject` | `reason` required |
| POST | `/websites/:id/suspend` | `reason` required; also pauses all its ad units |
| GET | `/withdrawals/pending` | |
| POST | `/withdrawals/:id/process` | Triggers the actual provider transfer |
| GET | `/users` | `?role=&search=&limit=&offset=` |
| POST | `/users/:id/suspend` | `reason?` |
| POST | `/users/:id/reactivate` | |
| POST | `/users/:id/wallet/adjust` | `amount, reason` — manual correction, fully audited |

Every admin mutation writes an `audit_logs` row (actor, action, entity, IP, metadata).

## Health checks (no auth, outside `/api`)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness — process is up, no DB dependency |
| GET | `/health/ready` | Readiness — DB is reachable; `503` if not |
