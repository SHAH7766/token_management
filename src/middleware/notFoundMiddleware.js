import { sendError } from '../utils/apiResponse.js';

export const notFoundMiddleware = (req, res, next) => {
  return sendError(res, 404, `Route not found: ${req.originalUrl}`, 'NOT_FOUND');
};
