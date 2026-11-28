import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Get all users (Admin only)
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, is_active } = req.query;
    let query = `
      SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.doctor_id, u.is_active, u.created_at, u.updated_at,
             d.full_name AS doctor_name
      FROM users u
      LEFT JOIN doctors d ON u.doctor_id = d.doctor_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND u.role = $${paramIndex++}`;
      params.push(role.toUpperCase());
    }

    if (is_active !== undefined) {
      query += ` AND u.is_active = $${paramIndex++}`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);
    return sendSuccess(res, 200, 'Users retrieved successfully', { users: result.rows });
  } catch (error) {
    next(error);
  }
};

// Get user by ID (Admin only)
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.doctor_id, u.is_active, u.created_at, u.updated_at,
             d.full_name AS doctor_name
       FROM users u
       LEFT JOIN doctors d ON u.doctor_id = d.doctor_id
       WHERE u.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    }

    return sendSuccess(res, 200, 'User retrieved successfully', { user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Create user (Admin only - can create ADMIN, RECEPTIONIST, DOCTOR)
export const createUser = async (req, res, next) => {
  try {
    const { full_name, email, phone, password, role, doctor_id } = req.body;

    if (!full_name || !email || !password || !role) {
      return sendError(res, 400, 'Full name, email, password, and role are required.', 'VALIDATION_ERROR');
    }

    const assignedRole = role.toUpperCase();
    if (!['ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(assignedRole)) {
      return sendError(res, 400, 'Invalid role. Allowed roles: ADMIN, RECEPTIONIST, DOCTOR.', 'INVALID_ROLE');
    }

    const emailCheck = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return sendError(res, 409, 'Email is already registered.', 'DUPLICATE_EMAIL');
    }

    if (phone) {
      const phoneCheck = await pool.query('SELECT user_id FROM users WHERE phone = $1', [phone]);
      if (phoneCheck.rows.length > 0) {
        return sendError(res, 409, 'Phone number is already registered.', 'DUPLICATE_PHONE');
      }
    }

    let linkedDoctorId = null;
    if (assignedRole === 'DOCTOR') {
      if (!doctor_id) {
        return sendError(res, 400, 'doctor_id is required for DOCTOR accounts.', 'MISSING_DOCTOR_ID');
      }
      const docCheck = await pool.query('SELECT doctor_id FROM doctors WHERE doctor_id = $1', [doctor_id]);
      if (docCheck.rows.length === 0) {
        return sendError(res, 404, 'Specified doctor record does not exist.', 'DOCTOR_NOT_FOUND');
      }
      const docLinkCheck = await pool.query('SELECT user_id FROM users WHERE doctor_id = $1', [doctor_id]);
      if (docLinkCheck.rows.length > 0) {
        return sendError(res, 'This doctor record is already linked to another user account.', 'DOCTOR_ALREADY_LINKED');
      }
      linkedDoctorId = doctor_id;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, doctor_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING user_id, full_name, email, phone, role, doctor_id, is_active, created_at`,
      [full_name, email, phone || null, password_hash, assignedRole, linkedDoctorId]
    );

    return sendSuccess(res, 201, 'User created successfully', { user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Update user (Admin only)
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, role, doctor_id, is_active } = req.body;

    const userCheck = await pool.query('SELECT user_id, role, doctor_id FROM users WHERE user_id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    }

    if (email) {
      const emailCheck = await pool.query('SELECT user_id FROM users WHERE email = $1 AND user_id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return sendError(res, 409, 'Email is already taken by another user.', 'DUPLICATE_EMAIL');
      }
    }

    if (phone) {
      const phoneCheck = await pool.query('SELECT user_id FROM users WHERE phone = $1 AND user_id != $2', [phone, id]);
      if (phoneCheck.rows.length > 0) {
        return sendError(res, 409, 'Phone number is already taken by another user.', 'DUPLICATE_PHONE');
      }
    }

    const assignedRole = role ? role.toUpperCase() : userCheck.rows[0].role;
    let linkedDoctorId = doctor_id !== undefined ? doctor_id : userCheck.rows[0].doctor_id;

    if (assignedRole === 'DOCTOR') {
      if (!linkedDoctorId) {
        return sendError(res, 400, 'doctor_id is required for DOCTOR accounts.', 'MISSING_DOCTOR_ID');
      }
      const docCheck = await pool.query('SELECT doctor_id FROM doctors WHERE doctor_id = $1', [linkedDoctorId]);
      if (docCheck.rows.length === 0) {
        return sendError(res, 404, 'Specified doctor record does not exist.', 'DOCTOR_NOT_FOUND');
      }
      const docLinkCheck = await pool.query('SELECT user_id FROM users WHERE doctor_id = $1 AND user_id != $2', [linkedDoctorId, id]);
      if (docLinkCheck.rows.length > 0) {
        return sendError(res, 'This doctor record is already linked to another user account.', 'DOCTOR_ALREADY_LINKED');
      }
    } else {
      linkedDoctorId = null;
    }

    const updateResult = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           role = COALESCE($4, role),
           doctor_id = $5,
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $7
       RETURNING user_id, full_name, email, phone, role, doctor_id, is_active, created_at, updated_at`,
      [
        full_name,
        email,
        phone,
        assignedRole,
        linkedDoctorId,
        is_active,
        id
      ]
    );

    return sendSuccess(res, 200, 'User updated successfully', { user: updateResult.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Update user status (Activate/Deactivate) (Admin only)
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined || typeof is_active !== 'boolean') {
      return sendError(res, 400, 'is_active boolean field is required.', 'VALIDATION_ERROR');
    }

    const result = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2
       RETURNING user_id, full_name, email, role, is_active`,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    }

    const statusText = is_active ? 'activated' : 'deactivated';
    return sendSuccess(res, 200, `User ${statusText} successfully`, { user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Delete user (Admin only)
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id, email', [id]);
    if (result.rows.length === 0) {
      return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    }

    return sendSuccess(res, 200, 'User deleted successfully', { user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
