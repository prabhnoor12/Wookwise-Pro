import express from 'express';
import {
  getAllBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  deleteBusiness
} from '../controllers/businessController.js';

const router = express.Router();

// Register business routes
// Optionally, add middleware for authentication/authorization here
router.get('/', getAllBusinesses);
router.get('/:id', getBusinessById);
router.post('/', createBusiness);
router.put('/:id', updateBusiness);
router.delete('/:id', deleteBusiness);

// console.log('[BusinessRoutes] Routes registered');

export default router;
