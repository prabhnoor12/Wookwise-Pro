import { Router } from 'express';
import * as clientController from '../controllers/clientController.js';
import auditLogger from '../middleware/audilogger.middleware.js';
import rateLimiter from '../middleware/ratelimiter.middleware.js';

const router = Router();

// --- Apply middlewares globally to all client routes ---
router.use(rateLimiter);    // API Rate Limiting for all client routes
router.use(auditLogger);    // Audit Logging for all client routes
// ------------------------------------------------------

// List/search clients
router.get('/', clientController.getClients);
// Create client
router.post('/', clientController.createClient);
// Get client by ID
router.get('/:id', clientController.getClientById);
// Update client
router.put('/:id', clientController.updateClient);
// Soft delete client
router.delete('/:id', clientController.deleteClient);
// Restore client
router.post('/:id/restore', clientController.restoreClient);

// Additional routes
router.get('/deleted', clientController.getDeletedClients);
router.get('/search/phone', clientController.searchClientsByPhone);
router.post('/bulk-import', clientController.bulkImportClients);
router.get('/export/csv', clientController.exportClientsCsv);
router.get('/:id/bookings', clientController.getClientBookings);
router.post('/improved', clientController.improvedCreateClient);

export default router;
