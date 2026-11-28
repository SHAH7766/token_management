import express from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  changePassword
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication, login, registration, and profile management
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new receptionist or doctor account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - password
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Sarah Jenkins
 *               email:
 *                 type: string
 *                 example: receptionist2@clinic.com
 *               phone:
 *                 type: string
 *                 example: "03009998888"
 *               password:
 *                 type: string
 *                 example: "Password123!"
 *               role:
 *                 type: string
 *                 enum: [RECEPTIONIST, DOCTOR]
 *                 default: RECEPTIONIST
 *               doctor_id:
 *                 type: integer
 *                 description: Required if role is DOCTOR (links user to doctor profile)
 *                 example: 2
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or missing required fields
 *       403:
 *         description: Forbidden role assignment (e.g. attempting to register as ADMIN)
 *       409:
 *         description: Email or phone already registered
 */
router.post('/register', registerUser);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login to get JWT access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@clinic.com
 *               password:
 *                 type: string
 *                 example: Admin123!
 *     responses:
 *       200:
 *         description: Login successful with JWT token
 *       401:
 *         description: Invalid credentials or account deactivated
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get currently authenticated user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized or invalid token
 */
router.get('/me', authenticateToken, getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   patch:
 *     summary: Change current user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: Admin123!
 *               newPassword:
 *                 type: string
 *                 example: NewSecurePass123!
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Incorrect current password or validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/change-password', authenticateToken, changePassword);

export default router;
