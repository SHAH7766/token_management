import express from 'express';
import {
  createToken,
  getTokens,
  getTokenById,
  getNextInQueue,
  updateTokenStatus,
  cancelToken,
  getTokenHistory
} from '../controllers/tokenController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tokens
 *   description: Queue token generation and management endpoints
 */

/**
 * @swagger
 * /api/v1/tokens:
 *   post:
 *     summary: Generate a new queue token for a patient & doctor (Admin, Receptionist)
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - doctor_id
 *             properties:
 *               patient_id:
 *                 type: integer
 *                 example: 1
 *               doctor_id:
 *                 type: integer
 *                 example: 1
 *               priority:
 *                 type: string
 *                 enum: [NORMAL, URGENT, VIP]
 *                 default: NORMAL
 *                 example: NORMAL
 *               remarks:
 *                 type: string
 *                 example: "Patient experiencing severe chest pain"
 *     responses:
 *       201:
 *         description: Token generated successfully
 *       400:
 *         description: Validation error or inactive doctor
 *       404:
 *         description: Patient or Doctor not found
 *   get:
 *     summary: Get all tokens with optional filters (Admin, Receptionist, Doctor - Doctors see only their own tokens)
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctor_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [WAITING, CALLED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Tokens retrieved successfully
 */
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'RECEPTIONIST'), createToken);
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'RECEPTIONIST', 'DOCTOR'), getTokens);

/**
 * @swagger
 * /api/v1/tokens/doctors/{doctorId}/queue/next:
 *   get:
 *     summary: Get the next waiting patient in doctor's queue (Admin, Receptionist, Doctor)
 *     tags: [Tokens, Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Next waiting patient retrieved successfully
 *       403:
 *         description: Forbidden (Doctor attempting to access another doctor's queue)
 *       404:
 *         description: Doctor not found
 */
router.get('/doctors/:doctorId/queue/next', authenticateToken, authorizeRoles('ADMIN', 'RECEPTIONIST', 'DOCTOR'), getNextInQueue);

/**
 * @swagger
 * /api/v1/tokens/{id}:
 *   get:
 *     summary: Get token details by ID (Admin, Receptionist, Doctor)
 *     tags: [Tokens]
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
 *         description: Token details retrieved successfully
 *       403:
 *         description: Forbidden (Doctor attempting to access another doctor's token)
 *       404:
 *         description: Token not found
 */
router.get('/:id', authenticateToken, authorizeRoles('ADMIN', 'RECEPTIONIST', 'DOCTOR'), getTokenById);

/**
 * @swagger
 * /api/v1/tokens/{id}/status:
 *   patch:
 *     summary: Update token status (Admin, Doctor - Doctors can only update their own queue tokens)
 *     tags: [Tokens]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [WAITING, CALLED, IN_PROGRESS, COMPLETED, CANCELLED]
 *                 example: CALLED
 *               remarks:
 *                 type: string
 *                 example: "Calling patient into consultation room 2"
 *     responses:
 *       200:
 *         description: Token status updated successfully
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Forbidden (Doctor attempting to update another doctor's token)
 *       404:
 *         description: Token not found
 */
router.patch('/:id/status', authenticateToken, authorizeRoles('ADMIN', 'DOCTOR'), updateTokenStatus);

/**
 * @swagger
 * /api/v1/tokens/{id}/cancel:
 *   patch:
 *     summary: Cancel a token (Admin, Receptionist)
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: "Patient left before consultation"
 *     responses:
 *       200:
 *         description: Token cancelled successfully
 *       400:
 *         description: Token already closed
 *       403:
 *         description: Forbidden (Doctors cannot cancel tokens)
 *       404:
 *         description: Token not found
 */
router.patch('/:id/cancel', authenticateToken, authorizeRoles('ADMIN', 'RECEPTIONIST'), cancelToken);

/**
 * @swagger
 * /api/v1/tokens/{id}/history:
 *   get:
 *     summary: Retrieve status change history for a token (Admin, Receptionist, Doctor)
 *     tags: [Tokens]
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
 *         description: Token history retrieved successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Token not found
 */
router.get('/:id/history', authenticateToken, authorizeRoles('ADMIN', 'RECEPTIONIST', 'DOCTOR'), getTokenHistory);

export default router;
