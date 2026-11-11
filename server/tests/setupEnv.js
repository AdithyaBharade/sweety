// Runs before every test file.
require('dotenv').config();

process.env.NODE_ENV = 'test';
// Always use a dedicated secret in tests, never the real one from .env.
process.env.JWT_SECRET = 'test-only-jwt-key-0123456789abcdef0123456789';
// Integration tests register many users from one IP.
process.env.AUTH_RATE_LIMIT = process.env.AUTH_RATE_LIMIT || '1000';

// Integration tests must never touch the development database,
// so DATABASE_URL is pointed at TEST_DATABASE_URL (or cleared if it is missing).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL || ''; // used by `prisma migrate deploy`
