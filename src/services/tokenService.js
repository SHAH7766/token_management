import pool from '../config/db.js';

/**
 * Generates a new token for a patient under a doctor for today (or specified date).
 * Uses a transaction and row-level locking (FOR UPDATE) on doctor/date to prevent race conditions in concurrent requests.
 */
export const generateTokenService = async (patient_id, doctor_id, priority = 'NORMAL', remarks = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify patient exists
    const patientRes = await client.query('SELECT * FROM patients WHERE patient_id = $1', [patient_id]);
    if (patientRes.rows.length === 0) {
      const err = new Error('Patient not found');
      err.statusCode = 404;
      err.errorCode = 'PATIENT_NOT_FOUND';
      throw err;
    }

    // 2. Verify doctor exists and is active
    const doctorRes = await client.query('SELECT * FROM doctors WHERE doctor_id = $1', [doctor_id]);
    if (doctorRes.rows.length === 0) {
      const err = new Error('Doctor not found');
      err.statusCode = 404;
      err.errorCode = 'DOCTOR_NOT_FOUND';
      throw err;
    }

    const doctor = doctorRes.rows[0];
    if (!doctor.is_active) {
      const err = new Error('Cannot issue token for an inactive doctor');
      err.statusCode = 400;
      err.errorCode = 'DOCTOR_INACTIVE';
      throw err;
    }

    const today = new Date().toISOString().split('T')[0];

    // 3. Get max token number for this doctor on today's date with row locking (advisory lock or locking existing rows / table lock)
    // To safely handle concurrency without duplicate token numbers for the same doctor and date:
    await client.query(
      `SELECT 1 FROM doctors WHERE doctor_id = $1 FOR UPDATE`,
      [doctor_id]
    );

    const maxTokenRes = await client.query(
      `SELECT COALESCE(MAX(token_number), 0) AS max_num FROM tokens WHERE doctor_id = $1 AND token_date = $2`,
      [doctor_id, today]
    );

    const nextTokenNumber = maxTokenRes.rows[0].max_num + 1;

    // 4. Insert new token
    const insertTokenQuery = `
      INSERT INTO tokens (token_number, patient_id, doctor_id, token_date, status, priority, remarks)
      VALUES ($1, $2, $3, $4, 'WAITING', $5, $6)
      RETURNING *;
    `;
    const tokenValues = [nextTokenNumber, patient_id, doctor_id, today, priority, remarks];
    const tokenRes = await client.query(insertTokenQuery, tokenValues);
    const newToken = tokenRes.rows[0];

    // 5. Create initial TokenHistory record
    const insertHistoryQuery = `
      INSERT INTO token_history (token_id, old_status, new_status, remarks)
      VALUES ($1, NULL, 'WAITING', 'Token generated and issued.');
    `;
    await client.query(insertHistoryQuery, [newToken.token_id]);

    await client.query('COMMIT');

    // Return token with patient & doctor info
    return {
      ...newToken,
      patient: patientRes.rows[0],
      doctor: doctorRes.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Updates token status following business rules and valid transitions.
 */
export const updateTokenStatusService = async (token_id, new_status, remarks = null) => {
  const validStatuses = ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(new_status)) {
    const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    err.statusCode = 400;
    err.errorCode = 'INVALID_STATUS';
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current token
    const tokenRes = await client.query('SELECT * FROM tokens WHERE token_id = $1 FOR UPDATE', [token_id]);
    if (tokenRes.rows.length === 0) {
      const err = new Error('Token not found');
      err.statusCode = 404;
      err.errorCode = 'TOKEN_NOT_FOUND';
      throw err;
    }

    const token = tokenRes.rows[0];
    const old_status = token.status;

    // Business rule: Completed and Cancelled tokens cannot be reopened or changed
    if (old_status === 'COMPLETED' || old_status === 'CANCELLED') {
      const err = new Error(`Cannot change status of a token that is already ${old_status}`);
      err.statusCode = 400;
      err.errorCode = 'TOKEN_ALREADY_CLOSED';
      throw err;
    }

    // Business rule: Valid state transitions
    // WAITING → CALLED → IN_PROGRESS → COMPLETED
    // WAITING → CANCELLED
    // CALLED → CANCELLED
    const allowedTransitions = {
      WAITING: ['CALLED', 'CANCELLED'],
      CALLED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED']
    };

    if (!allowedTransitions[old_status] || !allowedTransitions[old_status].includes(new_status)) {
      const err = new Error(`Invalid status transition from ${old_status} to ${new_status}`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    // Update token status
    const updateRes = await client.query(
      `UPDATE tokens SET status = $1 WHERE token_id = $2 RETURNING *;`,
      [new_status, token_id]
    );
    const updatedToken = updateRes.rows[0];

    // Insert history record
    await client.query(
      `INSERT INTO token_history (token_id, old_status, new_status, remarks) VALUES ($1, $2, $3, $4);`,
      [token_id, old_status, new_status, remarks || `Status changed from ${old_status} to ${new_status}`]
    );

    await client.query('COMMIT');
    return updatedToken;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
