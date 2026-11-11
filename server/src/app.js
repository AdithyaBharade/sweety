const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const authRoutes = require('./routes/auth');
const readingRoutes = require('./routes/readings');
const reportRoutes = require('./routes/reports');
const { notFoundHandler, errorHandler } = require('./middleware/error');

// The app is built separately from server.js so tests can use it with supertest
// without opening a real port.
function createApp() {
  const app = express();

  // Behind a proxy, req.ip must be the real client IP for rate limiting to work.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, allowedHeaders: ['Content-Type', 'Authorization', 'X-Timezone'] }));
  app.use(express.json({ limit: '10kb' }));
  if (!config.isTest) app.use(morgan(config.isProduction ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/readings', readingRoutes);
  app.use('/api/reports', reportRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
