# Architecture

## Stack

Node.js + Express + PostgreSQL. No ORM (raw SQL via `pg`), no NestJS —
chosen deliberately over the originally-scoped Next.js/NestJS stack for
a lighter footprint that's easier to run and reason about from a
constrained development environment, and easier to deploy on Render
and Koyeb without a build-heavy toolchain.

## Module structure

Every feature is a self-contained vertical slice under `src/modules/`:

```
modules/<name>/
  <name>.routes.js       — Express router, wires validation + auth middleware
  <name>.controller.js   — HTTP layer: parses req, calls service, shapes response
  <name>.service.js       — business logic, the only layer that touches the DB
  <name>.schema.js        — zod validation schemas
```

A fact about one subject lives in one file — a campaign field goes in
`campaigns.service.js`, not wherever happens to be open. Controllers
never touch the database directly; services never touch `req`/`res`.
This is what makes each module replaceable without touching its
neighbors, and why the payments module could gain a third provider
(bank transfer, crypto) as one new file plus a registry entry, not a
refactor.

## Request flow

```
Router → [validate middleware] → [requireAuth] → [requireRole] → Controller → Service → DB
```

`validate()` (src/middleware/validate.js) runs a zod schema against
`req.body` or `req.query` and either populates the parsed/coerced data
back onto the request or throws a 400 with field-level errors —
controllers never see unvalidated input.

## Ownership enforcement pattern

Every module that has per-user resources (campaigns, websites,
wallets) follows the same shape: a `getOwned*` helper in the service
layer loads the resource and throws `403` if `resource.ownerId !==
requestingUserId`. This is the *only* place ownership is checked —
every read and write in that module routes through it, so there's one
line to audit per module, not one per endpoint.

## The wallet ledger

`wallets.service.recordTransaction()` is the single function every
other module calls to move money — deposits, withdrawals, campaign
spend, publisher earnings, refunds, admin adjustments. It:

1. Locks the wallet row (`SELECT ... FOR UPDATE`) inside a transaction
2. Computes the new balance and rejects if it would go negative
3. Inserts an append-only `transactions` row recording exactly what happened
4. Updates the cached `wallets.balance`

This means `wallets.balance` is always a materialized view of
`SUM(transactions.amount)` for that wallet — if they ever disagree,
`transactions` is the source of truth. The row lock is what makes this
safe under concurrent access (verified in `tests/integration/wallets.test.js`
with a 10-way concurrent-debit test).

## Ad-serving performance

`GET /ad/serve` is the single highest-traffic, latency-sensitive
endpoint in the system (every ad impression on every publisher page).
It's built differently from the dashboard endpoints on purpose:

- Lives outside `/api` entirely, with its own rate limiter and open CORS
- Ad unit lookups are cached in-process for 30s (`src/utils/cache.js`)
  rather than hitting Postgres on every request
- The campaign-matching query (`ad-serving.service.js: findMatchingAd`)
  is a single SQL statement — no N+1 lookups, no application-level
  filtering after the fact
- Impression recording and the campaign budget update happen in one
  transaction; the advertiser wallet debit happens after and is
  non-fatal if it fails (the campaign's `spent_amount` is the budget
  source of truth, the wallet debit is bookkeeping)

## Payment provider abstraction

`src/modules/payments/providers/` defines one contract
(`provider.interface.js`, documentation-only) that `paystack.provider.js`
and `flutterwave.provider.js` both implement: `initializeDeposit`,
`verifyDeposit`, `initiateTransfer`, `verifyWebhookSignature`. The
registry (`providers/index.js`) is the only place that maps a name to
an implementation — `payments.service.js` never imports a provider
directly. The two existing adapters also normalize a real difference
between providers (Paystack uses kobo, Flutterwave uses naira) at the
adapter boundary, so the rest of the app only ever deals in kobo.

## Notifications

`notifications.service.notify()` is the shared entry point every module
calls to tell a user something happened — it always writes a dashboard
row and optionally fires an email through `email.provider.js`. Email
sending is fire-and-forget: a slow or misconfigured SMTP server never
blocks or fails the operation that triggered the notification.

## Admin & audit

Every admin action (`src/modules/admin/`) is gated by
`requireRole('admin')` and writes to `audit_logs` via the shared
`src/utils/audit.js` helper — actor, action, entity, IP, and metadata.
Admin accounts are never self-registrable (see `auth.service.js:register`,
which only accepts `advertiser`/`publisher`); provisioning the first
admin is a manual database operation.

## What's intentionally NOT abstracted

- **No message queue.** Withdrawal processing, email sending, and
  webhook handling all run inline. At meaningful scale, these should
  move to a job queue (BullMQ + Redis was the original blueprint's
  suggestion) — the code is structured so that's a matter of wrapping
  existing service functions in queue jobs, not rewriting them.
- **No Redis.** The in-process cache (`src/utils/cache.js`) is
  explicitly a single-instance optimization; if AdStream ever runs
  multiple server instances behind a load balancer, this needs to
  become a real Redis cache (the module's own docstring says so).
- **No read replicas / sharding.** `src/db/pool.js` is a single
  connection pool. The migration and query layer don't assume this
  will always be true, but nothing here builds toward it either —
  that's a real scaling project, not a few-line change.
