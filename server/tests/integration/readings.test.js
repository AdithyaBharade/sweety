const { prisma, describeDb, resetDb, registerUser } = require('./helpers');
const { todayInTimeZone, toDbDate, fromDbDate } = require('../../src/utils/dates');
const config = require('../../src/config');

// A fixed date in the past so the tests don't depend on today's date.
const DAY = '2025-10-15';

describeDb('Readings API', () => {
  let patient;

  beforeAll(async () => {
    await resetDb();
    patient = await registerUser();
  });
  afterAll(() => prisma.$disconnect());

  it('creates a reading', async () => {
    const res = await patient.post('/api/readings', { date: DAY, slot: 'AFTER_LUNCH', value: 145 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      date: DAY,
      slot: 'AFTER_LUNCH',
      slotLabel: 'After lunch',
      value: 145,
    });
  });

  it('rejects a second reading in the same slot on the same day', async () => {
    const res = await patient.post('/api/readings', { date: DAY, slot: 'AFTER_LUNCH', value: 150 });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'You already have an After lunch reading for this date.',
      field: 'slot',
    });
  });

  it('rejects a 5th reading for a day', async () => {
    // Fill the day with all 4 slots
    const day = '2025-10-20';
    for (const slot of ['MORNING_FASTING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER']) {
      await patient.post('/api/readings', { date: day, slot, value: 120 });
    }
    const res = await patient.post('/api/readings', { date: day, slot: 'AFTER_DINNER', value: 120 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You can add only 4 readings per day.');
  });

  it('rejects a future date', async () => {
    const tomorrow = toDbDate(todayInTimeZone(config.timeZone));
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const res = await patient.post('/api/readings', {
      date: fromDbDate(tomorrow),
      slot: 'MORNING_FASTING',
      value: 100,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Date cannot be in the future.');
  });

  it.each([
    [undefined, 'Please enter a glucose value.'],
    [700, 'Value must be between 40 and 600 mg/dl.'],
  ])('validates the value (%p)', async (value, message) => {
    const res = await patient.post('/api/readings', { date: DAY, slot: 'AFTER_DINNER', value });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  it('edits a reading, and editing it into its own slot is not a duplicate', async () => {
    const created = await patient.post('/api/readings', {
      date: DAY,
      slot: 'MORNING_FASTING',
      value: 90,
    });
    const res = await patient.put(`/api/readings/${created.body.id}`, {
      date: DAY,
      slot: 'MORNING_FASTING',
      value: 95,
    });
    expect(res.status).toBe(200);
    expect(res.body.value).toBe(95);
  });

  it('does not let an edit move a reading into a slot that is already taken', async () => {
    const created = await patient.post('/api/readings', {
      date: DAY,
      slot: 'AFTER_BREAKFAST',
      value: 160,
    });
    const res = await patient.put(`/api/readings/${created.body.id}`, {
      date: DAY,
      slot: 'AFTER_LUNCH',
      value: 160,
    });
    expect(res.status).toBe(409);
  });

  it('lists readings with pagination, newest first', async () => {
    const res = await patient.get('/api/readings?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body).toMatchObject({ page: 1, limit: 2, total: 7, totalPages: 4 });
    expect(res.body.data[0].date).toBe('2025-10-20');
  });

  it('deletes a reading', async () => {
    const created = await patient.post('/api/readings', {
      date: '2025-09-01',
      slot: 'AFTER_DINNER',
      value: 200,
    });
    const del = await patient.del(`/api/readings/${created.body.id}`);
    expect(del.status).toBe(204);
    const again = await patient.del(`/api/readings/${created.body.id}`);
    expect(again.status).toBe(404);
  });

  it("never shows or changes another user's readings", async () => {
    const other = await registerUser();
    const mine = await patient.get('/api/readings?limit=1');
    const id = mine.body.data[0].id;

    expect((await other.get('/api/readings')).body.total).toBe(0);
    expect((await other.put(`/api/readings/${id}`, { date: DAY, slot: 'AFTER_DINNER', value: 100 })).status).toBe(404);
    expect((await other.del(`/api/readings/${id}`)).status).toBe(404);
  });
});
