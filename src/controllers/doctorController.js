import pool from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Register a new doctor
export const createDoctor = async (req, res, next) => {
  try {
    const { full_name, specialization, consultation_fee, phone } = req.body;

    if (!full_name || !specialization) {
      return sendError(res, 400, 'full_name and specialization are required fields.', 'VALIDATION_ERROR');
    }

    const query = `
      INSERT INTO doctors (full_name, specialization, consultation_fee, phone, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *;
    `;
    const values = [full_name, specialization, consultation_fee || 0.00, phone || null];
    const result = await pool.query(query, values);

    return sendSuccess(res, 201, 'Doctor registered successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get all doctors with optional specialization filter
export const getDoctors = async (req, res, next) => {
  try {
    const { specialization, is_active } = req.query;
    let query = 'SELECT * FROM doctors WHERE 1=1';
    const queryParams = [];

    if (specialization) {
      queryParams.push(`%${specialization}%`);
      query += ` AND specialization ILIKE $${queryParams.length}`;
    }

    if (is_active !== undefined) {
      queryParams.push(is_active === 'true');
      query += ` AND is_active = $${queryParams.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, queryParams);
    return sendSuccess(res, 200, 'Doctors retrieved successfully', result.rows);
  } catch (error) {
    next(error);
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM doctors WHERE doctor_id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Doctor not found', 'DOCTOR_NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Doctor retrieved successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update doctor
export const updateDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, specialization, consultation_fee, phone } = req.body;

    const checkQuery = 'SELECT * FROM doctors WHERE doctor_id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Doctor not found', 'DOCTOR_NOT_FOUND');
    }

    const existing = checkResult.rows[0];

    const updateQuery = `
      UPDATE doctors
      SET full_name = $1, specialization = $2, consultation_fee = $3, phone = $4
      WHERE doctor_id = $5
      RETURNING *;
    `;
    const values = [
      full_name || existing.full_name,
      specialization || existing.specialization,
      consultation_fee !== undefined ? consultation_fee : existing.consultation_fee,
      phone !== undefined ? phone : existing.phone,
      id
    ];

    const result = await pool.query(updateQuery, values);
    return sendSuccess(res, 200, 'Doctor updated successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Activate / Deactivate doctor status
export const updateDoctorStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return sendError(res, 400, 'is_active boolean field is required.', 'VALIDATION_ERROR');
    }

    const checkQuery = 'SELECT * FROM doctors WHERE doctor_id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Doctor not found', 'DOCTOR_NOT_FOUND');
    }

    const updateQuery = `
      UPDATE doctors
      SET is_active = $1
      WHERE doctor_id = $2
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [is_active, id]);

    return sendSuccess(res, 200, `Doctor status updated to ${is_active ? 'Active' : 'Inactive'}`, result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete doctor
export const deleteDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const checkQuery = 'SELECT * FROM doctors WHERE doctor_id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Doctor not found', 'DOCTOR_NOT_FOUND');
    }

    await pool.query('DELETE FROM doctors WHERE doctor_id = $1', [id]);
    return sendSuccess(res, 200, 'Doctor deleted successfully', null);
  } catch (error) {
    next(error);
  }
};
