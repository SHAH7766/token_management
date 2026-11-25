import { sendError } from '../utils/apiResponse.js';

export const errorMiddleware = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  // PostgreSQL unique violation error code
  if (err.code === '23505') {
    return sendError(res, 409, 'Duplicate entry error: Record already exists.', 'DUPLICATE_RECORD');
  }

  // PostgreSQL foreign key violation error code
  if (err.code === '23503') {
    return sendError(res, 400, 'Foreign key violation: Referenced record does not exist.', 'FOREIGN_KEY_VIOLATION');
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return sendError(res, 422, 'Validation error: Check constraint violated.', 'CHECK_VIOLATION');
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  return sendError(res, statusCode, message, errorCode);
};
