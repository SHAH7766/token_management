-- =====================================================================
-- Clinic Token Management System Database Schema
-- =====================================================================

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS token_history CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- =====================================================================
-- 1. Patients Table
-- Stores information about clinic patients.
-- =====================================================================
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    date_of_birth DATE NULL,
    address TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 2. Doctors Table
-- Stores information about doctors, their specialization, and fee.
-- =====================================================================
CREATE TABLE doctors (
    doctor_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    consultation_fee NUMERIC(10, 2) DEFAULT 0.00,
    phone VARCHAR(20) UNIQUE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 3. Users Table (Authentication & RBAC)
-- Stores system users (ADMIN, RECEPTIONIST, DOCTOR)
-- =====================================================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'RECEPTIONIST'
        CHECK (role IN ('ADMIN', 'RECEPTIONIST', 'DOCTOR')),
    doctor_id INTEGER UNIQUE NULL REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 4. Tokens Table
-- Stores queue tokens issued to patients for specific doctors on specific dates.
-- =====================================================================
CREATE TABLE tokens (
    token_id SERIAL PRIMARY KEY,
    token_number INTEGER NOT NULL,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    token_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issue_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING'
        CHECK (status IN ('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('NORMAL', 'URGENT', 'VIP')),
    remarks TEXT NULL,

    -- Constraint: A token number must be unique per doctor per date
    CONSTRAINT unique_doctor_date_token UNIQUE (doctor_id, token_date, token_number)
);

-- =====================================================================
-- 5. TokenHistory Table
-- Tracks every status change for auditing and tracking history.
-- =====================================================================
CREATE TABLE token_history (
    history_id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL REFERENCES tokens(token_id) ON DELETE CASCADE,
    old_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL
        CHECK (new_status IN ('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT NULL
);

-- =====================================================================
-- Indexes for Performance Optimization
-- =====================================================================
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_full_name ON patients(full_name);

CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_is_active ON doctors(is_active);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_doctor_id ON users(doctor_id);

CREATE INDEX idx_tokens_doctor_date ON tokens(doctor_id, token_date);
CREATE INDEX idx_tokens_status ON tokens(status);
CREATE INDEX idx_tokens_patient ON tokens(patient_id);

CREATE INDEX idx_token_history_token_id ON token_history(token_id);
