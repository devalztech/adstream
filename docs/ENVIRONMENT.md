# Environment Variables

All variables live in `.env` (copy from `.env.example`). Required
variables are validated at startup — the app refuses to boot with a
clear error message if any are missing (see `src/config/env.js`).

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `production` disables stack traces in error responses |
| `PORT` | no | `4000` | Render/Koyeb inject this automatically in production |
| `DATABASE_URL` | **yes** | — | Postgres connection string |
| `DATABASE_SSL` | no | `true` | Set `false` for local Postgres without SSL |
| `DB_POOL_MAX` | no | `10` | Max connections in the pool |
| `TEST_DATABASE_URL` | no | — | Only used by `npm test`; see `tests/README.md` |
| `JWT_ACCESS_SECRET` | **yes** | — | `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | **yes** | — | Must differ from the access secret |
| `JWT_ACCESS_EXPIRES_IN` | no | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | no | `30d` | |
| `CORS_ORIGIN` | no | `*` | Comma-separated allowlist; set explicitly in production |
| `FRONTEND_URL` | no | `http://localhost:3000` | Used to build links in emails (verify, reset, deposit callback) |
| `RATE_LIMIT_WINDOW_MS` | no | `900000` (15 min) | General API rate limit window |
| `RATE_LIMIT_MAX` | no | `300` | Requests per window per IP |
| `PAYSTACK_SECRET_KEY` | no* | — | Required only to use Paystack deposits/withdrawals |
| `FLUTTERWAVE_SECRET_KEY` | no* | — | Required only to use Flutterwave |
| `FLUTTERWAVE_WEBHOOK_HASH` | no* | — | Must match the value set in Flutterwave's dashboard |
| `SMTP_HOST` | no | — | Unset = emails are logged, not sent (safe default for dev) |
| `SMTP_PORT` | no | `587` | |
| `SMTP_SECURE` | no | `false` | `true` for port 465 |
| `SMTP_USER` / `SMTP_PASSWORD` | no | — | Omit for unauthenticated relays |
| `SMTP_FROM` | no | `AdStream <no-reply@adstream.example.com>` | |
| `LOG_LEVEL` | no | `info` | `error`, `warn`, `info`, or `debug` |

\* Not validated at startup — calling a deposit/withdrawal endpoint for
an unconfigured provider returns a clear `500` explaining which env
var is missing, rather than failing silently.
