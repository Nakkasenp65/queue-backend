import express from 'express';
import authController from './auth.controller.js';
import authMiddleware from '../../../middleware/auth.middleware.js';

const authRouter = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Employee login route. Authenticates against the central server and creates a local session.
 * @access  Public
 */
authRouter.post('/login', authController.loginController);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get the currently logged-in employee's data from their session token.
 * @access  Private (Requires valid auth_token)
 */
// Middleware จะทำงานก่อน controller เพื่อตรวจสอบ token
authRouter.get('/me', authMiddleware, authController.getMeController);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logs the employee out by clearing the session cookie.
 * @access  Private (Requires valid auth_token)
 */
authRouter.post('/logout', authMiddleware, authController.logoutController);

export default authRouter;
