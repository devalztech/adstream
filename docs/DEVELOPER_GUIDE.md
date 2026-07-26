# Developer Guide

## Adding a new module

Follow the shape every existing module uses (see `docs/ARCHITECTURE.md`
for why):

1. `src/modules/<name>/<name>.schema.js` — zod schemas for every request body/query you'll accept
2. `src/modules/<name>/<name>.service.js` — business logic, the only file that calls `query()`/`withTransaction()`
3. `src/modules/<name>/<name>.controller.js` — thin: parse `req`, call the service, call `sendSuccess()`
4. `src/modules/<name>/<name>.routes.js` — wire `validate()`, `requireAuth`, `requireRole()` per route
5. Mount it in `src/app.js`: `app.use(\`${API_PREFIX}/<name>\`, <name>Routes)`

If the module needs new tables, add a migration:
`src/db/migrations/0NN_<description>.sql`, numbered after the highest
existing file. Migrations run in filename order and are tracked in
`schema_migrations` — never edit a migration that's already been
applied anywhere; add a new one instead.

## Conventions

- **Money is always an integer** in the smallest currency unit (kobo
  for NGN), stored as `BIGINT`. Never use `FLOAT`/`NUMERIC` for
  amounts — see `wallets.service.js` for the pattern.
- **Ownership checks live in the service layer**, one helper per
  module (`getOwnedCampaign`, `getOwnedWebsite`, etc.), never
  duplicated per-route in the controller.
- **Controllers don't touch the database.** If a controller has a
  `require('../../db/pool')`, that logic belongs in the service.
- **Every route handler is wrapped in `asyncHandler()`** (`src/utils/asyncHandler.js`)
  so a rejected promise reaches the global error handler instead of
  crashing the process or hanging the request.
- **Throw `ApiError`, never a bare `Error`**, for anything that should
  produce a specific HTTP status (`ApiError.notFound()`, `.badRequest()`,
  etc. — see `src/utils/ApiError.js`). A bare `Error` becomes a 500.
- **Admin actions call `recordAudit()`** (`src/utils/audit.js`) after
  the mutation succeeds. Look at any function in `admin.service.js`
  for the pattern.
- **User-facing state changes call `notificationsService.notify()`**
  where relevant (approval/rejection, payment events) — don't add a
  new ad-hoc email-sending path.

## Local development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npm run migrate
npm run dev             # restarts on file changes (node --watch)
```

## Running tests

See `tests/README.md`. Short version: `npm test -- tests/unit` needs
no setup; the full suite (including integration tests) needs a
Postgres test database with migrations applied.

## Linting / formatting

No linter is currently wired into `package.json` — if you add one
(ESLint is the natural choice given the existing code has
`// eslint-disable-next-line` comments already anticipating it),
match the style already in the codebase: 2-space indent, single
quotes, semicolons, and the `// eslint-disable-next-line no-console`
pattern used in `src/config/logger.js` and `src/db/migrate.js` for
the few places `console` is used directly.
