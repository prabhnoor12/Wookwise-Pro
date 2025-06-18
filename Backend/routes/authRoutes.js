import express from 'express';
import {
    register,
    login,
    logout,
    improvedRegister,
    authenticate,
    me,
    refresh,
    changePassword,
    updateEmail,
    logoutAll
} from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/improved-register', improvedRegister);
router.post('/login', login);
router.post('/refresh', refresh);

// Protected routes
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);
router.post('/update-email', authenticate, updateEmail);

export default router;
