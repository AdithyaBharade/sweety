const request = require('supertest');
const { app, prisma, describeDb, resetDb } = require('./helpers');

describeDb('Auth API', () => {
  beforeAll(resetDb);
  afterAll(() => prisma.$disconnect());

  const creds = { name: 'Asha', email: 'asha@test.dev', password: 'secret123' };

  it('registers a user and stores a bcrypt hash, never the plain password', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: expect.any(Number), name: 'Asha', email: 'asha@test.dev' });

    const stored = await prisma.user.findUnique({ where: { email: creds.email } });
    expect(stored.passwordHash).not.toBe(creds.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt prefix
  });

  it('rejects a duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('An account with this email already exists.');
  });

  it('logs in with the right password (email is case-insensitive)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ASHA@test.dev', password: creds.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('returns 409, not 500, when the same email signs up twice at the same moment', async () => {
    const body = { name: 'Race', email: 'race@test.dev', password: 'secret123' };
    const results = await Promise.all([1, 2, 3].map(() => request(app).post('/api/auth/register').send(body)));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
  });

  it('logout revokes the token on the server', async () => {
    const login = await request(app).post('/api/auth/login').send(creds);
    const auth = { Authorization: `Bearer ${login.body.token}` };
    expect((await request(app).get('/api/auth/me').set(auth)).status).toBe(200);

    expect((await request(app).post('/api/auth/logout').set(auth)).status).toBe(204);
    expect((await request(app).get('/api/auth/me').set(auth)).status).toBe(401);

    // Logging in again issues a fresh token that works.
    const again = await request(app).post('/api/auth/login').send(creds);
    expect((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${again.body.token}` })).status).toBe(200);
  });

  it("rejects a deleted user's token", async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Gone', email: 'gone@test.dev', password: 'secret123' });
    await prisma.user.delete({ where: { id: res.body.user.id } });
    const me = await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${res.body.token}` });
    expect(me.status).toBe(401);
  });

  it('protects routes that need a login', async () => {
    const res = await request(app).get('/api/readings');
    expect(res.status).toBe(401);
  });
});
