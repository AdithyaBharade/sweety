/**
 * Creates a demo user with ~2 months of sample readings (this month + last month),
 * so every report has data straight away.
 *
 *   email:    demo@sweety.app
 *   password: demo1234
 *
 * Safe to run repeatedly: the demo user's readings are wiped and recreated.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { todayInTimeZone, toDbDate, fromDbDate } = require('../src/utils/dates');
const { SLOTS } = require('../src/utils/slots');

const prisma = new PrismaClient();

const DEMO = { name: 'Demo Patient', email: 'demo@sweety.app', password: 'demo1234' };

// Typical ranges per slot so the data looks realistic.
const SLOT_RANGES = {
  MORNING_FASTING: [80, 140],
  AFTER_BREAKFAST: [110, 220],
  AFTER_LUNCH: [120, 240],
  AFTER_DINNER: [115, 230],
};

// Small deterministic pseudo-random generator so the seed is the same every run.
let state = 42;
function rand() {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
}
const between = ([min, max]) => Math.round(min + rand() * (max - min));

async function main() {
  const passwordHash = await bcrypt.hash(DEMO.password, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO.email },
    update: { name: DEMO.name, passwordHash },
    create: { name: DEMO.name, email: DEMO.email, passwordHash },
  });

  await prisma.reading.deleteMany({ where: { userId: user.id } });

  const today = toDbDate(todayInTimeZone(process.env.APP_TIMEZONE || 'Asia/Kolkata'));
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));

  const data = [];
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const isToday = d.getTime() === today.getTime();
    for (const slot of SLOTS) {
      // Today only has the morning readings; other days skip a slot now and then.
      if (isToday && (slot === 'AFTER_LUNCH' || slot === 'AFTER_DINNER')) continue;
      if (!isToday && rand() < 0.12) continue;
      data.push({ userId: user.id, date: toDbDate(fromDbDate(d)), slot, value: between(SLOT_RANGES[slot]) });
    }
  }

  await prisma.reading.createMany({ data });
  console.log(`Seeded ${data.length} readings for ${DEMO.email} (password: ${DEMO.password})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
