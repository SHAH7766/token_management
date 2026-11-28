import express from 'express';
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
  deleteDoctor
} from '../controllers/doctorController.js';
import { getDoctorQueue } from '../controllers/tokenController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Doctor management and queue endpoints
 */

/**
 * @swagger
 * /api/v1/doctors:
 *   post:
 *     summary: Register a new doctor (Admin only)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - specialization
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Dr. John Smith
 *               specialization:
 *                 type: string
 *                 example: Cardiologist
 *               consultation_fee:
 *                 type: number
 *                 example: 1500.00
 *               phone:
 *                 type: string
 *                 example: "03219876543"
 *     responses:
 *       201:
 *         description: Doctor registered successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     summary: Get all doctors with optional filters (Admin, Receptionist, Doctor)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter by specialization (partial match)
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of doctors retrieved successfully
 */
router.post('/', authenticateToken, authorizeRoles('ADMIN'), createDoctor);
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'RECEPTIONIST', 'DOCTOR'), getDoctors);

/**
 * @swagger
 * /api/v1/doctors/{id}:
 *   get:
 *     summary: Get doctor by ID (Admin, Receptionist, Doctor)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Doctor retrieved successfully
 *       404:
 *         description: Doctor not found
 *   put:
 *     summary: Update doctor details (Admin only)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
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
 *               specialization:
 *                 type: string
 *               consultation_fee:
 *                 type: number
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Doctor updated successfully
 *       404:
 *         description: Doctor not found
 *   delete:
 *     summary: Delete a doctor (Admin only)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Doctor deleted successfully
 *       404:
 *         description: Doctor not found
 */
router.get('/:id', authenticateToken, authorizeRoles('ADMIN', 'RECEPTIONIST', 'DOCTOR'), getDoctorById);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN'), updateDoctor);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), deleteDoctor);

/**
 * @swagger
 * /api/v1/doctors/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a doctor (Admin only)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Doctor status updated successfully
 *       404:
 *         description: Doctor not found
 */
router.patch('/:id/status', authenticateToken, authorizeRoles('ADMIN'), updateDoctorStatus);

/**
 * @swagger
 * /api/v1/doctors/{doctorId}/queue:
 *   get:
 *     summary: Get a doctor's daily queue (Admin, Receptionist, Doctor - Doctors can only view their own queue)
 *     tags: [Doctors, Tokens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Queue date (YYYY-MM-DD), defaults to today
 *     responses:
 *       200:
 *         description: Doctor's daily queue retrieved successfully
 *       403:
 *         description: Forbidden (Doctor attempting to access another doctor's queue)
 *       404:
 *         description: Doctor not found
 */
router.get('/:doctorId/queue', authenticateToken, authorizeRoles('ADMIN', 'RECEPTIONIST', 'DOCTOR'), getDoctorQueue);

export default router;
