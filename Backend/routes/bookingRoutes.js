import { Router } from 'express';
import * as bookingController from '../controllers/bookingController.js';

const router = Router();

// Bookings CRU
router.get('/', bookingController.getAllBookings);
router.post('/', bookingController.createBooking);
router.get('/:id', bookingController.getBookingById);
router.put('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.deleteBooking);

// Restore soft-deleted booking
router.post('/:id/restore', bookingController.restoreBooking);

// Get bookings by user
router.get('/user/:userId', bookingController.getBookingsByUser);

// Get upcoming bookings by user
router.get('/user/:userId/upcoming', bookingController.getUpcomingBookingsByUser);

// Cancel a booking (set status to 'cancelled')
router.post('/:id/cancel', bookingController.cancelBooking);

// Get available time slots
router.get('/available-slots', bookingController.getAvailableTimeSlots);

export default router;
