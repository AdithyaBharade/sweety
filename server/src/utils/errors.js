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

module.exports = { AppError, badRequest, unauthorized, notFound, conflict };
