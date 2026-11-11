const express = require('express');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');
const config = require('../config');
const prisma = require('../lib/prisma');
const { signToken, requireAuth } = require('../middleware/auth');
const { validateRegisterInput, validateLoginInput } = require('../utils/validation');
const { AppError, conflict, unauthorized, PRISMA_UNIQUE_VIOLATION } = require('../utils/errors');

const router = express.Router();
const SALT_ROUNDS = 10;

// Compared against when the email is unknown, so "no such user" takes as long as
// "wrong password" and response times don't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

// Slows down password guessing: N attempts per IP per 15 minutes across login + register.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.authRateLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) =>
    next(new AppError(429, 'Too many attempts. Please wait a few minutes and try again.')),
});

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
const emailTaken = () => conflict('An account with this email already exists.', 'email');

router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = validateRegisterInput(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw emailTaken();

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  let user;
  try {
    user = await prisma.user.create({ data: { name, email, passwordHash } });
  } catch (err) {
    // Two sign-ups with the same email at the same moment: the unique index stops the second.
    if (err.code === PRISMA_UNIQUE_VIOLATION) throw emailTaken();
    throw err;
  }

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = validateLoginInput(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message (and roughly the same time) for "no such user" and "wrong password".
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Invalid email or password.');

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Revokes every token issued so far for this user (all devices).
router.post('/logout', requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.userId },
    data: { tokenVersion: { increment: 1 } },
  });
  res.status(204).end();
});

module.exports = router;
