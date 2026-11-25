import express from 'express';
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient
} from '../controllers/patientController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Patient management endpoints
 */

/**
 * @swagger
 * /api/v1/patients:
 *   post:
 *     summary: Register a new patient
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - phone
 *               - gender
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Ali Ahmed
 *               phone:
 *                 type: string
 *                 example: "03001234567"
 *               gender:
 *                 type: string
 *                 example: Male
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-05-15"
 *               address:
 *                 type: string
 *                 example: "House 123, Street 4, City"
 *     responses:
 *       201:
 *         description: Patient created successfully
 *       400:
 *         description: Validation error or missing fields
 *       409:
 *         description: Duplicate phone number
 *   get:
 *     summary: Get all patients with optional search and pagination
 *     tags: [Patients]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or phone
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: List of patients retrieved successfully
 */
router.post('/', createPatient);
router.get('/', getPatients);

/**
 * @swagger
 * /api/v1/patients/{id}:
 *   get:
 *     summary: Get patient by ID
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient retrieved successfully
 *       404:
 *         description: Patient not found
 *   put:
 *     summary: Update patient details
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Patient updated successfully
 *       404:
 *         description: Patient not found
 *   delete:
 *     summary: Delete a patient
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Patient deleted successfully
 *       404:
 *         description: Patient not found
 */
router.get('/:id', getPatientById);
router.put('/:id', updatePatient);
router.delete('/:id', deletePatient);

export default router;
