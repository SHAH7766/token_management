import pool from '../config/db.js';
import { generateTokenService, updateTokenStatusService } from '../services/tokenService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Generate new token
export const createToken = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, priority, remarks } = req.body;

    if (!patient_id || !doctor_id) {
      return sendError(res, 400, 'patient_id and doctor_id are required fields.', 'VALIDATION_ERROR');
    }

    const newToken = await generateTokenService(patient_id, doctor_id, priority || 'NORMAL', remarks || null);
    return sendSuccess(res, 201, 'Token generated successfully', newToken);
  } catch (error) {
    next(error);
  }
};

// Get tokens with filters (doctor_id, patient_id, date, status)
export const getTokens = async (req, res, next) => {
  try {
    const { doctor_id, patient_id, date, status } = req.query;
    let query = `
      SELECT t.*,
             p.full_name AS patient_name, p.phone AS patient_phone,
             d.full_name AS doctor_name, d.specialization AS doctor_specialization
      FROM tokens t
      JOIN patients p ON t.patient_id = p.patient_id
      JOIN doctors d ON t.doctor_id = d.doctor_id
      WHERE 1=1
    `;
    const queryParams = [];

    if (doctor_id) {
      queryParams.push(doctor_id);
      query += ` AND t.doctor_id = $${queryParams.length}`;
    }

    if (patient_id) {
      queryParams.push(patient_id);
      query += ` AND t.patient_id = $${queryParams.length}`;
    }

    if (date) {
      queryParams.push(date);
      query += ` AND t.token_date = $${queryParams.length}`;
    }

    if (status) {
      queryParams.push(status);
      query += ` AND t.status = $${queryParams.length}`;
    }

    query += ' ORDER BY t.token_date DESC, t.token_number ASC';

    const result = await pool.query(query, queryParams);
    return sendSuccess(res, 200, 'Tokens retrieved successfully', result.rows);
  } catch (error) {
    next(error);
  }
};

// Get token by ID with patient & doctor details
export const getTokenById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT t.*,
             p.full_name AS patient_name, p.phone AS patient_phone, p.gender AS patient_gender,
             d.full_name AS doctor_name, d.specialization AS doctor_specialization, d.consultation_fee
      FROM tokens t
      JOIN patients p ON t.patient_id = p.patient_id
      JOIN doctors d ON t.doctor_id = d.doctor_id
      WHERE t.token_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Token not found', 'TOKEN_NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Token retrieved successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get doctor's daily queue (today or specified date)
export const getDoctorQueue = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Verify doctor exists
    const docCheck = await pool.query('SELECT * FROM doctors WHERE doctor_id = $1', [doctorId]);
    if (docCheck.rows.length === 0) {
      return sendError(res, 404, 'Doctor not found', 'DOCTOR_NOT_FOUND');
    }

    const query = `
      SELECT t.*,
             p.full_name AS patient_name, p.phone AS patient_phone, p.gender AS patient_gender
      FROM tokens t
      JOIN patients p ON t.patient_id = p.patient_id
      WHERE t.doctor_id = $1 AND t.token_date = $2
      ORDER BY
        CASE t.priority
          WHEN 'VIP' THEN 1
          WHEN 'URGENT' THEN 2
          ELSE 3
        END,
        t.token_number ASC;
    `;
    const result = await pool.query(query, [doctorId, targetDate]);

    return sendSuccess(res, 200, `Queue retrieved for doctor ID ${doctorId} on ${targetDate}`, {
      doctor: docCheck.rows[0],
      date: targetDate,
      queue: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Get the next waiting patient for a doctor
export const getNextInQueue = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const query = `
      SELECT t.*,
             p.full_name AS patient_name, p.phone AS patient_phone, p.gender AS patient_gender
      FROM tokens t
      JOIN patients p ON t.patient_id = p.patient_id
      WHERE t.doctor_id = $1 AND t.token_date = $2 AND t.status = 'WAITING'
      ORDER BY
        CASE t.priority
          WHEN 'VIP' THEN 1
          WHEN 'URGENT' THEN 2
          ELSE 3
        END,
        t.token_number ASC
      LIMIT 1;
    `;
    const result = await pool.query(query, [doctorId, today]);

    if (result.rows.length === 0) {
      return sendSuccess(res, 200, 'No waiting patients in queue', null);
    }

    return sendSuccess(res, 200, 'Next waiting patient retrieved', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update token status (e.g. WAITING -> CALLED -> IN_PROGRESS -> COMPLETED)
export const updateTokenStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) {
      return sendError(res, 400, 'status field is required.', 'VALIDATION_ERROR');
    }

    const updatedToken = await updateTokenStatusService(id, status, remarks);
    return sendSuccess(res, 200, `Token status updated to ${status} successfully`, updatedToken);
  } catch (error) {
    next(error);
  }
};

// Cancel token
export const cancelToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const updatedToken = await updateTokenStatusService(id, 'CANCELLED', remarks || 'Token cancelled by user/receptionist');
    return sendSuccess(res, 200, 'Token cancelled successfully', updatedToken);
  } catch (error) {
    next(error);
  }
};

// Retrieve token history
export const getTokenHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify token exists
    const tokenCheck = await pool.query('SELECT * FROM tokens WHERE token_id = $1', [id]);
    if (tokenCheck.rows.length === 0) {
      return sendError(res, 404, 'Token not found', 'TOKEN_NOT_FOUND');
    }

    const query = `
      SELECT * FROM token_history
      WHERE token_id = $1
      ORDER BY changed_at ASC;
    `;
    const result = await pool.query(query, [id]);

    return sendSuccess(res, 200, 'Token history retrieved successfully', {
      token: tokenCheck.rows[0],
      history: result.rows
    });
  } catch (error) {
    next(error);
  }
};
