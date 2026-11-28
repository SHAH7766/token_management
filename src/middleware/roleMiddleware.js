import { sendError } from '../utils/apiResponse.js';

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized. User not authenticated.', 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Forbidden. Access restricted to roles: ${allowedRoles.join(', ')}. Your role is ${req.user.role}.`,
        'FORBIDDEN'
      );
    }

    next();
  };
};
