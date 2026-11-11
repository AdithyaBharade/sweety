// HTTP-level behaviour that never reaches the database.
const request = require('supertest');
const { createApp } = require('../../src/app');

const app = createApp();

describe('app hardening', () => {
  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('returns 400 (not 500) for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Request body must be valid JSON.');
  });

  it('returns 413 (not 500) for an oversized body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
    expect(res.body.error).toBe('Request body is too large.');
  });

  it.each([
    ['no header', undefined],
    ['wrong scheme', 'Basic abc'],
    ['garbage token', 'Bearer not.a.jwt'],
  ])('rejects %s with 401', async (_name, header) => {
    const req = request(app).get('/api/readings');
    if (header) req.set('Authorization', header);
    expect((await req).status).toBe(401);
  });

  it('rejects a token signed with another secret or algorithm', async () => {
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ sub: '1', ver: 0 }, 'change-me-to-a-long-random-string');
    const none = jwt.sign({ sub: '1', ver: 0 }, null, { algorithm: 'none' });
    for (const token of [forged, none]) {
      const res = await request(app).get('/api/readings').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    }
  });
});
