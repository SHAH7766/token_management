# Clinic Client Token Management REST API

A production-ready REST API backend for a clinic client token management system built with Node.js, Express, JavaScript (ES Modules), and Neon Serverless PostgreSQL (using native `pg` queries with connection pooling and transactions).

---

## Features

- **Patient Management**: Register, search, paginate, update, and delete patient records.
- **Doctor Management**: Register doctors, filter by specialization, activate/deactivate status, and manage consultation fees.
- **Queue Token Generation**: Issue daily sequential tokens per doctor with priority levels (`NORMAL`, `URGENT`, `VIP`).
- **Concurrency & Race-Condition Safety**: Uses PostgreSQL database transactions and row-level locking (`FOR UPDATE`) to ensure bulletproof, unique token numbering under heavy concurrent requests.
- **Token Status Workflow**: Enforces strict state transitions (`WAITING` → `CALLED` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`).
- **Token Audit History**: Automatically records every status change in an audit history table.
- **Interactive Swagger UI**: Fully documented OpenAPI 3.0 specification available at `/api-docs`.
- **Consistent Response Formats**: Standardized success and error response structures with appropriate HTTP status codes.

---

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: Neon Serverless PostgreSQL (`pg`)
- **Documentation**: Swagger UI & `swagger-jsdoc`
- **Utilities**: Dotenv, CORS, Nodemon

---

## Project Structure

```text
clinic-token-api/
│
├── src/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── patientController.js
│   │   ├── doctorController.js
│   │   └── tokenController.js
│   │
│   ├── services/
│   │   └── tokenService.js
│   │
│   ├── routes/
│   │   ├── patientRoutes.js
│   │   ├── doctorRoutes.js
│   │   └── tokenRoutes.js
│   │
│   ├── middleware/
│   │   ├── errorMiddleware.js
│   │   └── notFoundMiddleware.js
│   │
│   ├── utils/
│   │   └── apiResponse.js
│   │
│   ├── swagger/
│   │   └── swaggerConfig.js
│   │
│   ├── database/
│   │   ├── schema.sql
│   │   ├── initDb.js
│   │   └── seed.js
│   │
│   └── app.js
│
├── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Setup & Installation

### 1. Clone or Download the Repository
Ensure you have Node.js installed on your machine.

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@your-neon-host.neon.tech/neondb?sslmode=require
```

### 4. Initialize Database Schema
Run the initialization script to create tables and indexes in Neon PostgreSQL:
```bash
node src/database/initDb.js
```

### 5. Seed Sample Data (Optional)
Populate sample patients and doctors:
```bash
node src/database/seed.js
```

---

## Running the Application

### Development Mode (with Nodemon)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server will run on `http://localhost:5000`.

---

## API Documentation (Swagger UI)

Open your browser and navigate to:
👉 **`http://localhost:5000/api-docs`**

You can interactively test all endpoints (Patients, Doctors, Tokens, Token History) using **Try it out → Execute**.

---

## API Endpoints Reference

### Patients
- `POST /api/v1/patients` — Register a patient
- `GET /api/v1/patients` — Get all patients (search & pagination)
- `GET /api/v1/patients/:id` — Get patient by ID
- `PUT /api/v1/patients/:id` — Update patient
- `DELETE /api/v1/patients/:id` — Delete patient

### Doctors
- `POST /api/v1/doctors` — Register a doctor
- `GET /api/v1/doctors` — Get all doctors (filter by specialization)
- `GET /api/v1/doctors/:id` — Get doctor details
- `PUT /api/v1/doctors/:id` — Update doctor
- `PATCH /api/v1/doctors/:id/status` — Activate / deactivate doctor
- `GET /api/v1/doctors/:doctorId/queue` — Get doctor's daily queue

### Tokens
- `POST /api/v1/tokens` — Generate queue token
- `GET /api/v1/tokens` — Get all tokens (filters: doctor, patient, date, status)
- `GET /api/v1/tokens/:id` — Get token details
- `GET /api/v1/doctors/:doctorId/queue/next` — Get next waiting patient
- `PATCH /api/v1/tokens/:id/status` — Update token status
- `PATCH /api/v1/tokens/:id/cancel` — Cancel token
- `GET /api/v1/tokens/:id/history` — Retrieve token audit history

---

## License

ISC
