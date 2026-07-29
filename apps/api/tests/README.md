# Tests

Two layers, matching how much of the stack each one needs:

- **`tests/unit/`** — pure logic, no database. Validation schemas, token
  generation, password hashing, the in-memory cache. Run anywhere,
  instantly, no setup.
- **`tests/integration/`** — full request → route → controller → service
  → database flow via `supertest` against the real Express app. These
  need a running PostgreSQL instance with migrations applied.

## Running the unit tests only

No setup needed:

```bash
npm test -- tests/unit
```

## Running the full suite (including integration tests)

1. Create a test database (separate from your dev database, so tests
   never touch real data):
   ```bash
   createdb adstream_test
   ```
2. Point the tests at it and run migrations:
   ```bash
   export TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/adstream_test
   DATABASE_URL=$TEST_DATABASE_URL npm run migrate
   ```
3. Run everything:
   ```bash
   npm test
   ```

If `TEST_DATABASE_URL` (or `DATABASE_URL`) isn't reachable, integration
test files detect this in a `beforeAll` hook and skip their tests
individually with a console warning — they won't fail the suite, so
`npm test` is always safe to run even before a test database exists.
Unit tests are unaffected either way.

## What's covered

- **Auth**: registration (including duplicate-email and invalid-role
  rejection), login, wrong-password handling, account lockout after 5
  failed attempts, protected-route access control.
- **Wallets**: deposit crediting, insufficient-balance rejection, and a
  concurrency test that fires 10 simultaneous debits against a balance
  that can only cover 5 of them — verifying the `FOR UPDATE` row lock in
  `wallets.service.recordTransaction` actually prevents an overdraft
  under a race, not just in the happy path.
- **Campaigns**: ownership isolation between advertisers, role
  enforcement (publishers can't touch the campaigns module), draft-only
  editing, and status-transition validation.
- **Ad serving**: end-to-end match → serve → impression-recorded →
  click → redirect flow, plus country-targeting inclusion/exclusion.

## What's not covered yet

Publisher website domain verification (the live-fetch check) isn't
integration-tested because it requires a real, reachable domain to
verify against — worth adding with a mocked `fetch` if this grows.
Payment provider flows (Paystack/Flutterwave) aren't tested against
their real APIs for the same reason; the provider adapters are simple
enough (thin HTTP wrappers) that the higher-value test is mocking
`getProvider()` in a `payments.service` unit test, which is a natural
next addition.
