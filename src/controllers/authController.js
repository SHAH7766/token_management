import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Helper to generate JWT token
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      doctor_id: user.doctor_id
    },
    secret,
    { expiresIn }
  );
};

// Register User
export const registerUser = async (req, res, next) => {
  try {
    const { full_name, email, phone, password, role, doctor_id } = req.body;

    // Validation
    if (!full_name || !email || !password) {
      return sendError(res, 400, 'Full name, email, and password are required.', 'VALIDATION_ERROR');
    }

    // Restrict public registration from creating ADMIN accounts
    const assignedRole = role ? role.toUpperCase() : 'RECEPTIONIST';
    if (assignedRole === 'ADMIN') {
      return sendError(res, 403, 'Unauthorized role assignment. Cannot register as ADMIN publicly.', 'FORBIDDEN');
    }

    if (!['RECEPTIONIST', 'DOCTOR'].includes(assignedRole)) {
      return sendError(res, 400, 'Invalid role specified. Allowed roles: RECEPTIONIST, DOCTOR.', 'INVALID_ROLE');
    }

    // Check if email already exists
    const emailCheck = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return sendError(res, 409, 'Email is already registered.', 'DUPLICATE_EMAIL');
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const phoneCheck = await pool.query('SELECT user_id FROM users WHERE phone = $1', [phone]);
      if (phoneCheck.rows.length > 0) {
        return sendError(res, 409, 'Phone number is already registered.', 'DUPLICATE_PHONE');
      }
    }

    // If role is DOCTOR, doctor_id is required
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

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const newUserResult = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, doctor_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING user_id, full_name, email, phone, role, doctor_id, is_active, created_at`,
      [full_name, email, phone || null, password_hash, assignedRole, linkedDoctorId]
    );

    const user = newUserResult.rows[0];
    const token = generateToken(user);

    return sendSuccess(res, 201, 'User registered successfully', { user, token });
  } catch (error) {
    next(error);
  }
};

// Login User
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required.', 'VALIDATION_ERROR');
    }

    const userResult = await pool.query(
      `SELECT user_id, full_name, email, phone, password_hash, role, doctor_id, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return sendError(res, 401, 'Account is deactivated. Contact administrator.', 'ACCOUNT_DEACTIVATED');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return sendError(res, 401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    const { password_hash, ...userWithoutPassword } = user;
    const token = generateToken(user);

    return sendSuccess(res, 200, 'Login successful', {
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    next(error);
  }
};

// Get Current User (Me)
export const getCurrentUser = async (req, res, next) => {
  try {
    const { password_hash, ...userWithoutPassword } = req.user;
    return sendSuccess(res, 200, 'Current user retrieved successfully', { user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
};

// Change Password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.user_id;

    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current password and new password are required.', 'VALIDATION_ERROR');
    }

    if (newPassword.length < 6) {
      return sendError(res, 400, 'New password must be at least 6 characters long.', 'WEAK_PASSWORD');
    }

    const userResult = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return sendError(res, 400, 'Current password is incorrect.', 'INCORRECT_PASSWORD');
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    return sendSuccess(res, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};
