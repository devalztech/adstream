# AdStream Frontend — Backend Integration Map

This is the actual contract the frontend is built against, produced by
reading the real backend source (not assumed) at
`src/modules/*/*.{routes,schema,controller,service}.js` in the
adstream-api repo. Anything not listed here does not exist in the
backend — see "Gaps vs. the frontend spec" at the end.

## Response envelope (every endpoint)

```ts
type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  meta?: { total?: number; limit?: number; offset?: number; unreadCount?: number };
};
```

Errors: `{ success: false, message: string, details?: { field: string; message: string }[] }`
with an HTTP status of 400/401/403/404/409/429/500.

## Authentication mechanics — read this before building `useAuth()`

- **Access token**: returned in the JSON body (`data.accessToken`) on
  login/refresh. Short-lived (~15 min). Store in memory/React state
  only — never `localStorage` (XSS risk) and the backend gives no
  option to have it as a cookie.
- **Refresh token**: set as an **httpOnly cookie** (`adstream_refresh_token`),
  scoped to path `/api/v1/auth` only. The frontend **cannot read this
  cookie** and doesn't need to — the browser sends it automatically on
  requests to `/api/v1/auth/*` as long as `credentials: 'include'` is
  set on the fetch.
- **Implication**: `POST /auth/refresh` needs no body if called from a
  browser with cookies enabled — just `credentials: 'include'`.
- **CORS requirement**: the backend's `CORS_ORIGIN` env var must be set
  to the frontend's exact deployed origin (not `*`) for cookies to work
  cross-origin — `cors()` with `credentials: true` silently drops the
  `Access-Control-Allow-Origin` header when origin is `*`. **This must
  be set on the backend deployment once the frontend has a URL.**
- Every authenticated request needs `Authorization: Bearer <accessToken>`.
- On a 401 from any authenticated endpoint, the frontend's API client
  should attempt one `POST /auth/refresh`, and only redirect to
  `/login` if that also fails.

## Endpoints

### Auth (`/api/v1/auth`) — public

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/register` | `{fullName, email, password, role: 'advertiser'\|'publisher', companyName?}` | `{id, email, fullName, role}` |
| POST | `/login` | `{email, password}` | `{accessToken, user: {id,email,fullName,role}}` + sets refresh cookie |
| POST | `/refresh` | — (cookie) | same shape as login |
| POST | `/logout` | — (cookie) | `{}` |
| POST | `/verify-email` | `{token}` | `{}` |
| POST | `/forgot-password` | `{email}` | `{}` (always succeeds, no enumeration) |
| POST | `/reset-password` | `{token, newPassword}` | `{}` — revokes all sessions |

Admin role is **not** a registration option — there is no admin signup UI to build.

### Users (`/api/v1/users`) — auth required

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/me` | — | `{id, email, fullName, companyName, emailVerifiedAt, createdAt, role}` |
| PATCH | `/me` | `{fullName?, companyName?}` | updated profile |

### Wallets (`/api/v1/wallets`) — auth required

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/me` | — | `{id, balance, currency, createdAt}` — balance is an integer, smallest unit (kobo) |
| GET | `/me/transactions` | `?limit&offset` | array of `{id, type, amount, balanceAfter, reference, status, description, createdAt}` |

`type` ∈ `deposit, withdrawal, campaign_spend, publisher_earning, refund, adjustment`.
Never divide/format money client-side beyond display — the integer from the API is authoritative; only divide by 100 for display (e.g. kobo → naira).

### Payments (`/api/v1/payments`)

| Method | Path | Auth | Body/Query | Returns |
|---|---|---|---|---|
| POST | `/deposit` | any role | `{amount, provider: 'paystack'\|'flutterwave'}` | `{authorizationUrl, reference}` — redirect user here |
| GET | `/deposit/verify` | any role | `?reference=&provider=` | `{status: 'success'\|'pending'\|'failed'}` |
| POST | `/withdraw` | publisher only | `{amount, provider, destination: {accountNumber, accountName, bankCode}}` | withdrawal request row |
| GET | `/withdrawals` | publisher only | `?limit&offset` | array of withdrawal requests |

Webhook endpoints exist but are provider-to-server only — no frontend involvement.

### Campaigns (`/api/v1/campaigns`) — advertiser only (403 for publisher/admin)

| Method | Path | Body/Query | Notes |
|---|---|---|---|
| POST | `/` | see schema below | Creates as `draft` |
| GET | `/` | `?status=&limit=&offset=` | `status` ∈ draft/pending_approval/active/paused/completed/rejected/archived |
| GET | `/:id` | — | includes `creatives[]` |
| PATCH | `/:id` | partial fields | draft-only — 400 otherwise |
| POST | `/:id/submit` | — | draft → pending_approval |
| POST | `/:id/pause` | — | active → paused only |
| POST | `/:id/resume` | — | paused → active only |
| POST | `/:id/archive` | — | from completed/rejected/paused/draft only |
| POST | `/:id/duplicate` | — | clones as new draft |
| POST | `/:id/creatives` | creative object | |
| DELETE | `/:id/creatives/:creativeId` | — | |

Create campaign body (all money fields are integers, smallest unit):
```ts
{
  name: string;              // 3-255 chars
  totalBudget: number;       // positive int
  dailyBudget?: number;      // must be <= totalBudget
  bidAmount: number;
  currency?: string;         // default 'NGN'
  startDate: string;         // ISO datetime
  endDate?: string;          // must be after startDate
  targetCountries?: string[]; // 2-letter codes
  targetDevices?: ('desktop'|'mobile'|'tablet')[];
  targetCategories?: string[];
  targetOs?: string[];
  frequencyCap?: number;
  destinationUrl: string;    // valid URL
  trackingParams?: Record<string,string>;
  creatives: Array<{
    type: 'banner'|'native'|'text'|'video';
    assetUrl?: string;       // required for banner/video
    width?: number; height?: number; fileSizeBytes?: number; mimeType?: string;
    headline?: string;       // required for text
    bodyText?: string;
  }>; // at least 1 required
}
```

### Websites & Ad Units (`/api/v1/websites`) — publisher only

| Method | Path | Body/Query | Notes |
|---|---|---|---|
| POST | `/` | `{name, domain, category?, language?, monthlyTrafficEstimate?, verificationMethod?}` | domain auto-normalized (strips protocol/www/path) |
| GET | `/` | `?status=&limit=&offset=` | status ∈ pending/verified/approved/rejected/suspended |
| GET | `/:id` | — | includes `adUnits[]` |
| PATCH | `/:id` | `{name?, category?, language?, monthlyTrafficEstimate?}` | |
| POST | `/:id/verify` | — | live check — backend fetches the domain and checks for the token; `dns_txt` method returns 400 explaining it needs manual admin review |
| POST | `/:id/ad-units` | `{name, format, width?, height?}` | website must be verified/approved first |
| GET | `/:id/ad-units` | — | each item includes ready-to-paste `embedCode` string |
| POST | `/:id/ad-units/:adUnitId/pause` | — | |
| POST | `/:id/ad-units/:adUnitId/resume` | — | |
| DELETE | `/:id/ad-units/:adUnitId` | — | |

`format` ∈ `banner, rectangle, leaderboard, sidebar, native, responsive, square, sticky`.
`verificationMethod` ∈ `meta_tag, dns_txt, file_upload` — only present `meta_tag`/`file_upload` as "instant" options in the UI; `dns_txt` is explicitly a manual/slow path.

### Analytics (`/api/v1/analytics`)

| Method | Path | Auth | Query | Returns |
|---|---|---|---|---|
| GET | `/advertiser/overview` | advertiser | `?range=today\|7d\|30d\|90d\|year` | impressions, clicks, conversions, spend, ctr, cpm, cpc, conversionRate, cpa, activeCampaigns, topCampaigns[] |
| GET | `/campaigns/:id` | advertiser | `?range=` | same metrics + `daily[]`, `topCountries[]`, `topDevices[]` |
| GET | `/publisher/overview` | publisher | `?range=` | impressions, clicks, earnings, activeSites, topSites[] |
| GET | `/websites/:id` | publisher | `?range=` | impressions, clicks, earnings, `daily[]` |

All derived metrics (ctr, cpm, cpc, cpa) are computed server-side — never recompute them client-side from raw counts; just display what's returned.

### Notifications (`/api/v1/notifications`) — auth required

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/` | `?unreadOnly=&limit=&offset=` | array + `meta.unreadCount` |
| POST | `/:id/read` | — | |
| POST | `/read-all` | — | |

### Admin (`/api/v1/admin`) — admin only, no self-registration exists for this role

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/overview` | — | platform-wide stats |
| GET | `/campaigns/pending` | `?status=&limit=&offset=` | defaults to pending_approval |
| POST | `/campaigns/:id/approve` | — | |
| POST | `/campaigns/:id/reject` | `{reason}` | |
| GET | `/websites/pending` | `?status=&limit=&offset=` | defaults to verified (awaiting approval) |
| POST | `/websites/:id/approve` | — | |
| POST | `/websites/:id/reject` | `{reason}` | |
| POST | `/websites/:id/suspend` | `{reason}` | also pauses its ad units |
| GET | `/withdrawals/pending` | `?limit=&offset=` | |
| POST | `/withdrawals/:id/process` | — | triggers real payout |
| GET | `/users` | `?role=&search=&limit=&offset=` | |
| POST | `/users/:id/suspend` | `{reason?}` | |
| POST | `/users/:id/reactivate` | — | |
| POST | `/users/:id/wallet/adjust` | `{amount, reason}` | manual correction |

### Ad serving (`/ad`, outside `/api`, public) — not a dashboard concern

`GET /ad/serve`, `GET /ad/click`, `GET /ad/embed.js`, `POST /ad/conversions`
— these are consumed by the embed script on publisher's own sites, not
by the AdStream dashboard frontend. The dashboard only needs to display
the `embedCode` string returned from the ad-units endpoints (a copy-paste
block), never call these itself.

## Gaps vs. the frontend spec — build the UI, wire nothing fake

- **No campaign edit after submission.** The spec's "Edit" action in
  campaign details only applies while `status === 'draft'`. Show Edit
  only in that state; other states are read-only + lifecycle actions.
- **No "estimated earnings" distinct from wallet balance for publishers.**
  The backend has one wallet balance + a transaction ledger + the
  analytics `earnings` figure (computed from impressions/clicks, not
  yet paid out). There's no separate "pending vs. available" split in
  the wallet itself — model the publisher earnings page around
  `analytics.earnings` (lifetime/period) vs. `wallet.balance` (actual
  withdrawable balance), and don't invent a third number.
- **No minimum withdrawal amount enforced by the backend.** Don't
  hardcode one in the UI as if it's a real rule — if a client-side
  sanity floor is wanted, label it clearly as a UI default, not a
  backend requirement.
- **No file upload endpoint.** `campaign_creatives.assetUrl` expects a
  URL string — there is no `/upload` endpoint in this backend. The
  campaign creation form's "banner image" step needs a manual "paste
  an image URL" field for now, clearly labeled as such. Do not build a
  fake upload button that silently does nothing.
- **No public platform-statistics endpoint** for the landing page. The
  admin overview endpoint requires admin auth. The landing page must
  not fabricate numbers; either omit the stats section or clearly mark
  it as illustrative.
- **No search on the notifications list**, only `unreadOnly` filtering.
- **`dns_txt` website verification** has no self-serve flow — the
  verify UI for that method should explain it needs manual review, not
  spin forever or silently fail.
- **No fraud-detection endpoint.** The spec's `/admin/fraud` page has
  nothing to back it — `clicks.is_suspicious` exists in the database
  but there's no API surface exposing a fraud queue. Not built; would
  need a new backend endpoint first.
- **No separate advertisers-only / publishers-only admin endpoints.**
  `/admin/users?role=advertiser` and `?role=publisher` cover this via
  one endpoint — the admin nav has one "Users" page with a role filter,
  not three separate pages.
- **No cross-website ad-units endpoint.** Ad units are scoped under
  `/websites/:id/ad-units` only — there's no `/ad-units` that lists
  everything across a publisher's sites in one call. The `/publisher/ad-units`
  page fetches each website's units and flattens them client-side
  (acceptable for a handful of sites; would need a real backend endpoint
  if publishers commonly have many sites).
