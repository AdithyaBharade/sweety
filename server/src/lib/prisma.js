const { PrismaClient } = require('@prisma/client');

// A single shared client for the whole process.
const prisma = new PrismaClient();

module.exports = prisma;
