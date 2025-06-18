import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';

const router = Router();

router.post('/booking/:bookingId/option', paymentController.setPaymentOption);
router.get('/booking/:bookingId/link', paymentController.getPaymentLink);
router.post('/booking/:bookingId/paid', paymentController.markBookingPaid);
router.get('/booking/:bookingId/status', paymentController.getPaymentStatus);
router.post('/booking/:bookingId/refund', paymentController.refundPayment);
router.get('/list', paymentController.listPayments);
router.post('/webhook', paymentController.paymentWebhook);
router.get('/summary', paymentController.getPaymentSummary);
router.put('/booking/:bookingId/amount', paymentController.updatePaymentAmount);
router.get('/export/csv', paymentController.exportPaymentsCSV);
router.get('/statuses', paymentController.getAllPaymentStatuses);
router.get('/client/:clientId/history', paymentController.getClientPaymentHistory);
router.get('/overdue', paymentController.getOverduePayments);

export default router;
