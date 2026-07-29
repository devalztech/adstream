# Contributing

## Before opening a PR

- Run `npm test -- tests/unit` at minimum; run the full suite if your
  change touches a module with integration tests (see `tests/README.md`
  for test-database setup).
- Syntax-check your changes: `node --check path/to/file.js` catches
  typos before they reach a runtime error.
- If you added a table or column, it's a new migration file — never
  edit one that could already be applied somewhere (see
  `docs/DEVELOPER_GUIDE.md`).
- If you added an endpoint, add it to `docs/API.md`.
- If you touched money-handling code (wallets, payments, campaign
  spend), explain the change in the PR description in terms of the
  ledger invariant: `wallets.balance` must always equal
  `SUM(transactions.amount)` for that wallet. If your change could
  ever violate that, it needs a different approach.

## Commit messages

Describe what changed and why, not just what: "Add DNS TXT verification
for websites" is more useful than "update publisher-sites.service.js".

## Code review expectations

- New modules follow the existing routes/controller/service/schema
  shape (`docs/DEVELOPER_GUIDE.md`) — a PR introducing a different
  pattern needs a reason in the description.
- Ownership and role checks are expected on any new per-user resource;
  a reviewer should be able to find the one `getOwned*` helper a new
  module uses, the same way every existing module has one.
- Security-sensitive changes (auth, payments, admin) get read closely
  for authorization gaps — the kind of bug that's easy to miss in a
  quick skim (see the withdrawal-role-check fix in payments.routes.js
  as an example of the class of issue to watch for: an endpoint that
  works correctly but is reachable by the wrong role).

## Reporting a bug

Include: the endpoint/module involved, the request that triggered it,
the actual vs. expected response, and — if it's data-related — whether
it's reproducible from a fresh migration or only on existing data.
