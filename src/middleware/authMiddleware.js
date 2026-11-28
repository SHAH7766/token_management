import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { sendError } from '../utils/apiResponse.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Access denied. No token provided or invalid format.', 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback_secret';

    const decoded = jwt.verify(token, secret);

    const userResult = await pool.query(
      `SELECT user_id, full_name, email, phone, role, doctor_id, is_active
       FROM users WHERE user_id = $1`,
      [decoded.user_id]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 401, 'Token is invalid. User no longer exists.', 'USER_NOT_FOUND');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return sendError(res, 401, 'Access denied. Your account has been deactivated.', 'ACCOUNT_DEACTIVATED');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token has expired.', 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token.', 'INVALID_TOKEN');
    }
    return sendError(res, 401, 'Authentication failed.', error.message);
  }
};
