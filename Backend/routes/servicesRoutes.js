import { Router } from 'express';
import * as serviceController from '../controllers/serviceController.js';

const router = Router();

// Service CRUD
// POST and PUT accept: name, durationMinutes, price, category, description, active, buffer
router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);
router.post('/', serviceController.createService);
router.put('/:id', serviceController.updateService);
router.delete('/:id', serviceController.deleteService);
router.post('/:id/restore', serviceController.restoreService);
router.patch('/:id/archive', serviceController.setServiceArchived);

// Provider setup panel
router.post('/provider/availability', serviceController.setProviderAvailability);
router.post('/provider/breaks', serviceController.setProviderBreaks);
router.get('/provider/:providerId/setup-panel', serviceController.getProviderSetupPanel);

// Additional routes could be added here (e.g., service search, analytics, etc.)

export default router;
