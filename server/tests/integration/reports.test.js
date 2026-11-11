const { prisma, describeDb, resetDb, registerUser } = require('./helpers');

describeDb('Reports API', () => {
  let patient;

  beforeAll(async () => {
    await resetDb();
    patient = await registerUser();

    const readings = [
      // Previous month (September 2025)
      { date: '2025-09-01', slot: 'MORNING_FASTING', value: 90 },
      { date: '2025-09-30', slot: 'AFTER_DINNER', value: 210 },
      // This month, before the selected date
      { date: '2025-10-01', slot: 'AFTER_LUNCH', value: 150 },
      // Selected date
      { date: '2025-10-15', slot: 'AFTER_LUNCH', value: 180 },
      { date: '2025-10-15', slot: 'MORNING_FASTING', value: 100 },
      { date: '2025-10-15', slot: 'AFTER_BREAKFAST', value: 120 },
      // After the selected date - must be excluded from month-to-date
      { date: '2025-10-20', slot: 'AFTER_LUNCH', value: 400 },
    ];
    for (const r of readings) await patient.post('/api/readings', r);
  });
  afterAll(() => prisma.$disconnect());

  it('returns daily, month-to-date and previous-month reports', async () => {
    const res = await patient.get('/api/reports?date=2025-10-15');
    expect(res.status).toBe(200);

    expect(res.body.daily).toMatchObject({
      range: { from: '2025-10-15', to: '2025-10-15' },
      count: 3,
      highest: 180,
      lowest: 100,
      average: 133.3, // (100 + 120 + 180) / 3 = 133.33...
    });
    // Daily readings are listed in slot order
    expect(res.body.daily.readings.map((r) => r.slotLabel)).toEqual([
      'Morning (fasting)',
      'After breakfast',
      'After lunch',
    ]);

    expect(res.body.monthToDate).toMatchObject({
      range: { from: '2025-10-01', to: '2025-10-15' },
      count: 4,
      highest: 180,
      lowest: 100,
      average: 137.5,
    });

    expect(res.body.previousMonth).toMatchObject({
      range: { from: '2025-09-01', to: '2025-09-30' },
      count: 2,
      highest: 210,
      lowest: 90,
      average: 150,
    });
  });

  it('returns an empty report (nulls, count 0) for a day without readings', async () => {
    const res = await patient.get('/api/reports?date=2025-10-14');
    expect(res.body.daily).toMatchObject({ count: 0, highest: null, lowest: null, average: null });
    expect(res.body.daily.readings).toEqual([]);
  });
});
