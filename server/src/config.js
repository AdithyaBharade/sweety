require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';

/**
 * The JWT secret protects every account, so the app refuses to start without a strong one
 * in every environment (not just production - NODE_ENV is often left unset on real servers).
 */
function readJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  const problems = [];
  if (!secret) problems.push('is not set');
  else {
    if (secret.length < 32) problems.push('is shorter than 32 characters');
    if (/change-me|dev-only|secret$/i.test(secret)) problems.push('looks like a placeholder');
  }
  if (problems.length) {
    throw new Error(
      `JWT_SECRET ${problems.join(' and ')}. Generate one with: openssl rand -hex 32`
    );
  }
  return secret;
}

const config = {
  env,
  isTest,
  isProduction: env === 'production',
  port: Number(process.env.PORT) || 4000,
  jwtSecret: readJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  // Number of reverse proxies in front of the API (e.g. 1 on Render/Heroku/behind nginx).
  // Needed so rate limiting sees the real client IP instead of the proxy's.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  // Login/register attempts allowed per IP per 15 minutes.
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT) || 20,
};

module.exports = config;
