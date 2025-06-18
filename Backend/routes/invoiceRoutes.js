import { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController.js';

const router = Router();

// List invoices with pagination/filter
router.get('/', invoiceController.getInvoices);
// Get deleted invoices
router.get('/deleted', invoiceController.getDeletedInvoices);
// Search invoices by client name/email
router.get('/search', invoiceController.searchInvoices);
// Export invoices as CSV
router.get('/export/csv', invoiceController.exportInvoicesCsv);
// Get invoice stats
router.get('/stats', invoiceController.getInvoiceStats);
// Get all invoices for a client
router.get('/client/:clientId', invoiceController.getInvoicesByClient);

// Create invoice
router.post('/', invoiceController.createInvoice);
// Bulk mark invoices as paid
router.post('/bulk-paid', invoiceController.bulkMarkPaid);

// Get invoice by ID
router.get('/:id', invoiceController.getInvoiceById);
// Update invoice
router.put('/:id', invoiceController.updateInvoice);
// Delete (soft) invoice
router.delete('/:id', invoiceController.deleteInvoice);
// Restore invoice
router.post('/:id/restore', invoiceController.restoreInvoice);
// Mark invoice as paid
router.post('/:id/paid', invoiceController.markInvoicePaid);
// Mark invoice as overdue
router.post('/:id/overdue', invoiceController.markInvoiceOverdue);

export default router;
