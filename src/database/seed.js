import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

const seedData = async () => {
  try {
    console.log('Seeding sample patients, doctors, and users...');

    // 1. Seed Patients
    const patients = [
      ['Ali Ahmed', '03001234567', 'Male', '1990-05-15', 'House 12, Street 3, Lahore'],
      ['Ayesha Khan', '03219876543', 'Female', '1995-08-22', 'Sector F-7, Islamabad'],
      ['Muhammad Bilal', '03335557788', 'Male', '1985-12-10', 'Clifton Block 4, Karachi']
    ];

    for (const p of patients) {
      await pool.query(
        `INSERT INTO patients (full_name, phone, gender, date_of_birth, address)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (phone) DO NOTHING;`,
        p
      );
    }

    // 2. Seed Doctors
    const doctors = [
      ['Dr. John Smith', 'Cardiologist', 1500.00, '03111112222'],
      ['Dr. Sarah Johnson', 'Dermatologist', 1200.00, '03222223333'],
      ['Dr. Ahmed Raza', 'General Physician', 800.00, '03444445555']
    ];

    for (const d of doctors) {
      await pool.query(
        `INSERT INTO doctors (full_name, specialization, consultation_fee, phone, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (phone) DO NOTHING;`,
        d
      );
    }

    // Retrieve Dr. John Smith's doctor_id for linking user account
    const doctorResult = await pool.query(`SELECT doctor_id FROM doctors WHERE full_name = 'Dr. John Smith' LIMIT 1;`);
    const doctorId = doctorResult.rows[0]?.doctor_id || null;

    // 3. Seed Users (Admin, Receptionist, Doctor)
    const saltRounds = 12;
    const adminPasswordHash = await bcrypt.hash('Admin123!', saltRounds);
    const receptionistPasswordHash = await bcrypt.hash('Receptionist123!', saltRounds);
    const doctorPasswordHash = await bcrypt.hash('Doctor123!', saltRounds);

    const users = [
      ['System Administrator', 'admin@clinic.com', '03000000001', adminPasswordHash, 'ADMIN', null],
      ['Front Desk Receptionist', 'receptionist@clinic.com', '03000000002', receptionistPasswordHash, 'RECEPTIONIST', null],
      ['Dr. John Smith', 'doctor@clinic.com', '03000000003', doctorPasswordHash, 'DOCTOR', doctorId]
    ];

    for (const u of users) {
      await pool.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, doctor_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         ON CONFLICT (email) DO NOTHING;`,
        u
      );
    }

    console.log('Sample data and users seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error.message);
  } finally {
    pool.end();
  }
};

seedData();
