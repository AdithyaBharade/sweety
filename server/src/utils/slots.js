// Keys match the Prisma `Slot` enum; labels are what the user sees.
const SLOT_LABELS = {
  MORNING_FASTING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
};

const SLOTS = Object.keys(SLOT_LABELS);
const MAX_READINGS_PER_DAY = 4;

module.exports = { SLOT_LABELS, SLOTS, MAX_READINGS_PER_DAY };
