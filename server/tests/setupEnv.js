// Runs before every test file.
require('dotenv').config();

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Integration tests must never touch the development database,
// so DATABASE_URL is pointed at TEST_DATABASE_URL (or cleared if it is missing).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL || ''; // used by `prisma migrate deploy`
