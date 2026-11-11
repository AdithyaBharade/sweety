const { execSync } = require('child_process');
const path = require('path');
const request = require('supertest');
const prisma = require('../../src/lib/prisma');
const { createApp } = require('../../src/app');

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

/** `describe` that is skipped (with a hint) when no test database is configured. */
const describeDb = hasTestDb ? describe : describe.skip;
if (!hasTestDb) {
  console.warn('TEST_DATABASE_URL is not set - skipping integration tests.');
}

/** Applies migrations to the test DB and empties all tables. */
async function resetDb() {
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '../..'),
    env: process.env,
    stdio: 'ignore',
  });
  await prisma.reading.deleteMany();
  await prisma.user.deleteMany();
}

const app = createApp();

/** Registers a fresh user and returns a supertest agent-like helper with auth set. */
async function registerUser(email = `user${Date.now()}${Math.random()}@test.dev`) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'secret123' });
  const auth = { Authorization: `Bearer ${res.body.token}` };
  return {
    user: res.body.user,
    token: res.body.token,
    get: (url) => request(app).get(url).set(auth),
    post: (url, body) => request(app).post(url).set(auth).send(body),
    put: (url, body) => request(app).put(url).set(auth).send(body),
    del: (url) => request(app).delete(url).set(auth),
  };
}

module.exports = { app, prisma, describeDb, resetDb, registerUser };
