const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./config/logger');
const { pool } = require('./db/pool');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const walletsRoutes = require('./modules/wallets/wallets.routes');
const campaignsRoutes = require('./modules/campaigns/campaigns.routes');
const publisherSitesRoutes = require('./modules/publisher-sites/publisher-sites.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const adServingRoutes = require('./modules/ad-serving/ad-serving.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const API_PREFIX = '/api/v1';

const app = express();

// Behind Render/Koyeb's proxy, trust the first hop so req.ip and rate
// limiting see the real client IP instead of the load balancer's.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.cors.origin,
    credentials: true,
  })
);
app.use(compression());

// Webhook signature verification (Paystack/Flutterwave) needs the exact
// raw request bytes, not a re-serialized JSON object — so these two paths
// get express.raw() BEFORE the global express.json() below runs. Express
// matches middleware by path prefix in registration order, so this must
// come first.
app.use(`${API_PREFIX}/payments/webhooks/paystack`, express.raw({ type: '*/*', limit: '1mb' }));
app.use(`${API_PREFIX}/payments/webhooks/flutterwave`, express.raw({ type: '*/*', limit: '1mb' }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

if (env.nodeEnv !== 'test') {
  app.use(
    morgan(env.nodeEnv === 'development' ? 'dev' : 'combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// Ad serving lives outside /api entirely — it's public, unauthenticated,
// and needs its own (much higher) rate limit than dashboard endpoints,
// plus a short URL for the embed script's fetch calls. CORS here is
// deliberately open (any origin) because publisher sites embedding ads
// can be on any domain — the dashboard's CORS allowlist above doesn't
// apply to this public surface.
app.use('/ad', cors({ origin: '*' }));
app.use(
  '/ad/embed.js',
  express.static(path.join(__dirname, 'public/embed.js'), {
    maxAge: '1h',
    setHeaders: (res) => res.setHeader('Content-Type', 'application/javascript; charset=utf-8'),
  })
);
app.use('/ad', adServingRoutes);

app.use('/api', generalLimiter);

// Liveness — is the process itself up? No DB dependency, so a slow/down
// database doesn't cause the orchestrator to kill and restart a
// perfectly healthy container (which would make an outage worse).
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: env.app.name, time: new Date().toISOString() });
});

// Readiness — is the process ready to serve real traffic, i.e. can it
// reach the database? Render/Koyeb can point traffic-routing checks
// here specifically if they support a separate readiness probe;
// otherwise /health above remains the safe default for basic uptime checks.
app.get('/health/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready', time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', error: 'database unreachable' });
  }
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/wallets`, walletsRoutes);
app.use(`${API_PREFIX}/campaigns`, campaignsRoutes);
app.use(`${API_PREFIX}/websites`, publisherSitesRoutes);
app.use(`${API_PREFIX}/payments`, paymentsRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
