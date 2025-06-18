import { Router } from 'express';
import {
  sendTestEmail,
  sendClientConfirmation,
  sendOwnerNotification,
  sendClientCancellation,
  sendPaymentRequest,
  sendOwnerCancellation,
  sendClientReminder,
  sendOwnerReminder,
} from '../utils/email.js';

const router = Router();

// Test email route
router.post('/test', async (req, res) => {
  const { to } = req.body;
  try {
    await sendTestEmail(to);
    res.json({ message: 'Test email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

// Send booking confirmation to client
router.post('/client-confirm', async (req, res) => {
  try {
    await sendClientConfirmation(req.body);
    res.json({ message: 'Client confirmation email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send client confirmation', details: error.message });
  }
});

// Send booking notification to owner
router.post('/owner-notify', async (req, res) => {
  try {
    await sendOwnerNotification(req.body);
    res.json({ message: 'Owner notification email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send owner notification', details: error.message });
  }
});

// Send booking cancellation to client
router.post('/client-cancel', async (req, res) => {
  try {
    await sendClientCancellation(req.body);
    res.json({ message: 'Client cancellation email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send client cancellation', details: error.message });
  }
});

// Send payment request to client
router.post('/payment-request', async (req, res) => {
  try {
    await sendPaymentRequest(req.body);
    res.json({ message: 'Payment request email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send payment request', details: error.message });
  }
});

// Send booking cancellation to owner
router.post('/owner-cancel', async (req, res) => {
  try {
    await sendOwnerCancellation(req.body);
    res.json({ message: 'Owner cancellation email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send owner cancellation', details: error.message });
  }
});

// Send reminder to client
router.post('/client-reminder', async (req, res) => {
  try {
    await sendClientReminder(req.body);
    res.json({ message: 'Client reminder email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send client reminder', details: error.message });
  }
});

// Send reminder to owner
router.post('/owner-reminder', async (req, res) => {
  try {
    await sendOwnerReminder(req.body);
    res.json({ message: 'Owner reminder email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send owner reminder', details: error.message });
  }
});

export default router;
