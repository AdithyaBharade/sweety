const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { signToken, requireAuth } = require('../middleware/auth');
const { validateRegisterInput, validateLoginInput } = require('../utils/validation');
const { conflict, unauthorized, notFound } = require('../utils/errors');

const router = express.Router();
const SALT_ROUNDS = 10;

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

router.post('/register', async (req, res) => {
  const { name, email, password } = validateRegisterInput(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('An account with this email already exists.', 'email');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = validateLoginInput(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for "no such user" and "wrong password" so emails can't be probed.
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw unauthorized('Invalid email or password.');

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw notFound('User not found.');
  res.json({ user: publicUser(user) });
});

module.exports = router;
