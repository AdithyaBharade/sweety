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

  it('protects routes that need a login', async () => {
    const res = await request(app).get('/api/readings');
    expect(res.status).toBe(401);
  });
});
