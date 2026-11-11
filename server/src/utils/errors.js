/**
 * An error that is safe to show to the user.
 * `field` tells the client which form input the message belongs to.
 */
class AppError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const badRequest = (message, field) => new AppError(400, message, field);
const unauthorized = (message = 'Please log in to continue.') => new AppError(401, message);
const notFound = (message = 'Not found.') => new AppError(404, message);
const conflict = (message, field) => new AppError(409, message, field);

/** Largest value a Postgres INTEGER (and Prisma `Int`) can hold. */
const MAX_INT = 2147483647;

/** Prisma error codes we turn into friendly errors. */
const PRISMA_UNIQUE_VIOLATION = 'P2002';
const PRISMA_RECORD_NOT_FOUND = 'P2025';

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  notFound,
  conflict,
  MAX_INT,
  PRISMA_UNIQUE_VIOLATION,
  PRISMA_RECORD_NOT_FOUND,
};
