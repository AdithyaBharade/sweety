const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');
const { unauthorized, MAX_INT } = require('../utils/errors');

const ALGORITHM = 'HS256';
const EXPIRED = 'Your session has expired. Please log in again.';

/** `ver` is the user's tokenVersion; logging out bumps it, which revokes every older token. */
function signToken(user) {
  return jwt.sign({ sub: String(user.id), ver: user.tokenVersion ?? 0 }, config.jwtSecret, {
    algorithm: ALGORITHM,
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Requires `Authorization: Bearer <token>`, checks the user still exists and the token
 * has not been revoked, then sets req.userId and req.user.
 */
async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: [ALGORITHM] });
  } catch {
    throw unauthorized(EXPIRED);
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId < 1 || userId > MAX_INT) throw unauthorized(EXPIRED);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.tokenVersion !== payload.ver) throw unauthorized(EXPIRED);

  req.userId = user.id;
  req.user = user;
  return next();
}

module.exports = { signToken, requireAuth };
