import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validate payment option helper
function isValidPaymentOption(option) {
  return ['PAY_LATER', 'ONLINE'].includes(option);
}

// Set payment option for a booking (manual/pay later or online), with status tracking and audit
export async function setPaymentOption(req, res) {
  try {
    const { bookingId } = req.params;
    const { paymentOption } = req.body;
    if (!isValidPaymentOption(paymentOption)) {
      return res.status(400).json({ error: 'Invalid payment option' });
    }
    const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) } });
    if (!booking || booking.deletedAt) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    // Prevent changing payment option if already paid
    if (booking.paymentStatus === 'PAID') {
      return res.status(400).json({ error: 'Cannot change payment option for a paid booking' });
    }
    const updated = await prisma.booking.update({
      where: { id: Number(bookingId) },
      data: {
        paymentOption,
        paymentStatus: paymentOption === 'PAY_LATER' ? 'PENDING' : 'UNPAID',
        paymentOptionSetAt: new Date(),
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('setPaymentOption error:', error);
    res.status(500).json({ error: 'Failed to set payment option', details: error.message });
  }
}

// Generate a payment link (Stripe/PayPal) for a booking (stub/demo), with payment status update
export async function getPaymentLink(req, res) {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { service: true, client: true },
    });
    if (!booking || booking.deletedAt) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const amount = booking.service?.price || 0;
    let paymentLink = null;
    let message = 'Pay at session (Pay Later option selected).';
    if (booking.paymentOption === 'ONLINE' && amount > 0) {
      // Demo: generate a fake payment link (replace with real integration)
      paymentLink = `https://pay.stripe.com/demo-link?amount=${amount}&booking=${bookingId}`;
      message = 'Use this link to pay online.';
      // Optionally, update payment status to "LINK_SENT"
      await prisma.booking.update({
        where: { id: Number(bookingId) },
        data: { paymentStatus: 'LINK_SENT' },
      });
    }
    res.json({
      paymentLink,
      message,
      paymentStatus: booking.paymentOption === 'ONLINE' && amount > 0 ? 'LINK_SENT' : 'PENDING',
      amount,
      currency: 'USD', // or fetch from service/business config
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate payment link', details: error.message });
  }
}

// Optionally: Mark booking as paid (manual admin action)
export async function markBookingPaid(req, res) {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) } });
    if (!booking || booking.deletedAt) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const updated = await prisma.booking.update({
      where: { id: Number(bookingId) },
      data: { paymentStatus: 'PAID' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark booking as paid', details: error.message });
  }
}

// Get payment status for a booking
export async function getPaymentStatus(req, res) {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      select: { id: true, paymentStatus: true, paymentOption: true, paymentDate: true, service: { select: { price: true } } },
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({
      bookingId: booking.id,
      paymentStatus: booking.paymentStatus,
      paymentOption: booking.paymentOption,
      paymentDate: booking.paymentDate,
      amount: booking.service?.price || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get payment status', details: error.message });
  }
}

// Refund a payment (stub/demo)
export async function refundPayment(req, res) {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) } });
    if (!booking || booking.deletedAt) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    // Demo: just update status
    const updated = await prisma.booking.update({
      where: { id: Number(bookingId) },
      data: { paymentStatus: 'REFUNDED' },
    });
    res.json({ message: 'Payment refunded (demo only)', booking: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refund payment', details: error.message });
  }
}

// List all bookings with payment info (admin/reporting)
export async function listPayments(req, res) {
  try {
    const { page = 1, pageSize = 20, status, from, to } = req.query;
    const where = {
      ...(status && { paymentStatus: status }),
      ...(from && { paymentDate: { gte: new Date(from) } }),
      ...(to && { paymentDate: { lte: new Date(to) } }),
    };
    const payments = await prisma.booking.findMany({
      where,
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        paymentStatus: true,
        paymentOption: true,
        paymentDate: true,
        service: { select: { name: true, price: true } },
        client: { select: { name: true, email: true } },
      },
    });
    const total = await prisma.booking.count({ where });
    res.json({ data: payments, page: Number(page), pageSize: Number(pageSize), total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list payments', details: error.message });
  }
}

// Simulate webhook for payment provider (Stripe/PayPal demo)
export async function paymentWebhook(req, res) {
  try {
    const { bookingId, event } = req.body;
    if (!bookingId || !event) {
      return res.status(400).json({ error: 'bookingId and event are required' });
    }
    // Simulate payment succeeded
    if (event === 'payment_succeeded') {
      await prisma.booking.update({
        where: { id: Number(bookingId) },
        data: { paymentStatus: 'PAID', paymentDate: new Date() },
      });
      return res.json({ message: 'Payment marked as PAID' });
    }
    // Simulate payment failed
    if (event === 'payment_failed') {
      await prisma.booking.update({
        where: { id: Number(bookingId) },
        data: { paymentStatus: 'FAILED' },
      });
      return res.json({ message: 'Payment marked as FAILED' });
    }
    res.status(400).json({ error: 'Unknown event' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process webhook', details: error.message });
  }
}

// Get payment summary (totals, paid/unpaid, etc.)
export async function getPaymentSummary(req, res) {
  try {
    const total = await prisma.booking.aggregate({
      _sum: { paymentAmount: true },
      _count: { _all: true },
    });
    const paid = await prisma.booking.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { paymentAmount: true },
      _count: { _all: true },
    });
    const unpaid = await prisma.booking.aggregate({
      where: { paymentStatus: { in: ['UNPAID', 'PENDING', 'LINK_SENT'] } },
      _sum: { paymentAmount: true },
      _count: { _all: true },
    });
    res.json({
      totalBookings: total._count._all,
      totalAmount: total._sum.paymentAmount || 0,
      paidBookings: paid._count._all,
      paidAmount: paid._sum.paymentAmount || 0,
      unpaidBookings: unpaid._count._all,
      unpaidAmount: unpaid._sum.paymentAmount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get payment summary', details: error.message });
  }
}

// Update payment amount for a booking (admin correction)
export async function updatePaymentAmount(req, res) {
  try {
    const { bookingId } = req.params;
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) } });
    if (!booking || booking.deletedAt) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const updated = await prisma.booking.update({
      where: { id: Number(bookingId) },
      data: { paymentAmount: amount },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment amount', details: error.message });
  }
}

// Export payments as CSV (demo)
export async function exportPaymentsCSV(req, res) {
  try {
    const payments = await prisma.booking.findMany({
      where: {},
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        paymentStatus: true,
        paymentOption: true,
        paymentDate: true,
        paymentAmount: true,
        service: { select: { name: true } },
        client: { select: { name: true, email: true } },
      },
    });
    let csv = 'BookingID,Client,Email,Service,Amount,Status,Option,Date\n';
    for (const p of payments) {
      csv += [
        p.id,
        `"${p.client?.name || ''}"`,
        `"${p.client?.email || ''}"`,
        `"${p.service?.name || ''}"`,
        p.paymentAmount || '',
        p.paymentStatus || '',
        p.paymentOption || '',
        p.paymentDate ? new Date(p.paymentDate).toISOString() : ''
      ].join(',') + '\n';
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export payments', details: error.message });
  }
}

// Get all payment statuses for reporting
export async function getAllPaymentStatuses(req, res) {
  try {
    const statuses = await prisma.booking.groupBy({
      by: ['paymentStatus'],
      _count: { _all: true }
    });
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment statuses', details: error.message });
  }
}

// Get payment history for a client
export async function getClientPaymentHistory(req, res) {
  try {
    const { clientId } = req.params;
    const payments = await prisma.booking.findMany({
      where: { clientId: Number(clientId), deletedAt: null },
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        paymentStatus: true,
        paymentOption: true,
        paymentDate: true,
        paymentAmount: true,
        service: { select: { name: true, price: true } }
      }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client payment history', details: error.message });
  }
}

// Get overdue payments (for admin reminders)
export async function getOverduePayments(req, res) {
  try {
    const now = new Date();
    const overdue = await prisma.booking.findMany({
      where: {
        paymentStatus: 'OVERDUE',
        deletedAt: null,
        paymentDate: { lt: now }
      },
      orderBy: { paymentDate: 'asc' },
      select: {
        id: true,
        paymentAmount: true,
        paymentDate: true,
        client: { select: { name: true, email: true } },
        service: { select: { name: true } }
      }
    });
    res.json(overdue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overdue payments', details: error.message });
  }
}
