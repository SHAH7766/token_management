import pool from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Create a new patient
export const createPatient = async (req, res, next) => {
  try {
    const { full_name, phone, gender, date_of_birth, address } = req.body;

    if (!full_name || !phone || !gender) {
      return sendError(res, 400, 'full_name, phone, and gender are required fields.', 'VALIDATION_ERROR');
    }

    const query = `
      INSERT INTO patients (full_name, phone, gender, date_of_birth, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [full_name, phone, gender, date_of_birth || null, address || null];
    const result = await pool.query(query, values);

    return sendSuccess(res, 201, 'Patient created successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get all patients with search & pagination
export const getPatients = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = 'SELECT * FROM patients';
    let countQuery = 'SELECT COUNT(*) FROM patients';
    const queryParams = [];
    const countParams = [];

    if (search) {
      query += ' WHERE full_name ILIKE $1 OR phone ILIKE $1';
      countQuery += ' WHERE full_name ILIKE $1 OR phone ILIKE $1';
      queryParams.push(`%${search}%`);
      countParams.push(`%${search}%`);

      query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      queryParams.push(parseInt(limit, 10), offset);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      queryParams.push(parseInt(limit, 10), offset);
    }

    const [patientsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const totalRecords = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / parseInt(limit, 10));

    return sendSuccess(res, 200, 'Patients retrieved successfully', {
      patients: patientsResult.rows,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: parseInt(page, 10),
        limit: parseInt(limit, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get patient by ID
export const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM patients WHERE patient_id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Patient not found', 'PATIENT_NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Patient retrieved successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update patient
export const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, phone, gender, date_of_birth, address } = req.body;

    const checkQuery = 'SELECT * FROM patients WHERE patient_id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Patient not found', 'PATIENT_NOT_FOUND');
    }

    const existing = checkResult.rows[0];

    const updateQuery = `
      UPDATE patients
      SET full_name = $1, phone = $2, gender = $3, date_of_birth = $4, address = $5
      WHERE patient_id = $6
      RETURNING *;
    `;
    const values = [
      full_name || existing.full_name,
      phone || existing.phone,
      gender || existing.gender,
      date_of_birth !== undefined ? date_of_birth : existing.date_of_birth,
      address !== undefined ? address : existing.address,
      id
    ];

    const result = await pool.query(updateQuery, values);
    return sendSuccess(res, 200, 'Patient updated successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete patient
export const deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const checkQuery = 'SELECT * FROM patients WHERE patient_id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 404, 'Patient not found', 'PATIENT_NOT_FOUND');
    }

    await pool.query('DELETE FROM patients WHERE patient_id = $1', [id]);
    return sendSuccess(res, 200, 'Patient deleted successfully', null);
  } catch (error) {
    next(error);
  }
};
