import { Router } from 'express';
import * as userController from '../controllers/userController.js';

const router = Router();

// Get all users (with pagination/filter)
router.get('/', userController.getAllUsers);
// Get deleted users
router.get('/deleted', userController.getDeletedUsers);
// Search users by email
router.get('/search', userController.searchUsersByEmail);
// Get user activity (last 10 bookings)
router.get('/:id/activity', userController.getUserActivity);
// Get user by ID
router.get('/:id', userController.getUserById);
// Update user info
router.put('/:id', userController.updateUser);
// Change user password (admin)
router.post('/:id/change-password', userController.changeUserPassword);
// Delete user (soft)
router.delete('/:id', userController.deleteUser);
// Restore user
router.post('/:id/restore', userController.restoreUser);

export default router;
