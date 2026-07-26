const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { pool } = require('./db/pool');

const server = app.listen(env.port, () => {
  logger.info(`${env.app.name} API listening on port ${env.port}`, { env: env.nodeEnv });
});

/**
 * Graceful shutdown: stop accepting new connections, let in-flight
 * requests finish, then close the DB pool. Render/Koyeb send SIGTERM
 * on redeploy/scale-down — handling it avoids dropped requests.
 */
function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await pool.end();
    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force-exit if graceful shutdown hangs.
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason?.message || reason });
});
