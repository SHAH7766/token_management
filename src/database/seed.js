import pool from '../config/db.js';

const seedData = async () => {
  try {
    console.log('Seeding sample patients and doctors...');

    // Seed Patients
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

    // Seed Doctors
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

    console.log('Sample data seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error.message);
  } finally {
    pool.end();
  }
};

seedData();
