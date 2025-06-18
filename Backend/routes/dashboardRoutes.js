import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';

const router = Router();

router.get('/summary', dashboardController.getDashboardSummary);
router.get('/booking/:id', dashboardController.getBookingDetails);
router.post('/booking/:id/cancel', dashboardController.cancelBooking);
router.put('/booking/:id', dashboardController.updateBooking);
router.post('/booking/:id/complete', dashboardController.completeBooking);
router.get('/trends', dashboardController.getBookingTrends);
router.get('/today-stats', dashboardController.getTodayStats);
router.get('/recent-activity', dashboardController.getRecentActivity);

export default router;
