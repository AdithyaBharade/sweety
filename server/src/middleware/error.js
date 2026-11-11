const { AppError } = require('../utils/errors');

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
}

// Friendly messages for errors raised by express.json() / body-parser.
const BODY_ERRORS = {
  'entity.parse.failed': 'Request body must be valid JSON.',
  'entity.too.large': 'Request body is too large.',
  'charset.unsupported': 'Request body uses an unsupported character set.',
  'encoding.unsupported': 'Request body uses an unsupported encoding.',
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, field: err.field });
  }
  // Client errors from middleware (body-parser, rate limiter...) keep their status.
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: BODY_ERRORS[err.type] || 'The request could not be processed.' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = { notFoundHandler, errorHandler };
