import { prisma } from '../prisma/client.js';
import { formatInTimezone } from '../utils/date.utils.js';

// Send reminder for upcoming bookings (returns bookings needing reminders)
export async function getUpcomingBookingsForReminder(hoursAhead = 24, tenantId = null) {
    const now = new Date();
    const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    const where = {
        deletedAt: null,
        status: 'CONFIRMED',
        date: { gte: now, lte: future },
        reminderSent: false
    };
    if (tenantId) {
        where.businessId = tenantId;
    }
    return await prisma.booking.findMany({
        where,
        include: {
            client: { select: { id: true, name: true, email: true } },
            service: { select: { id: true, name: true } }
        }
    });
}

// Mark a booking as reminder sent
export async function markReminderSent(bookingId) {
    return await prisma.booking.update({
        where: { id: Number(bookingId) },
        data: { reminderSent: true }
    });
}

// Send reminders for all upcoming bookings (to be called by a scheduler/cron)
// Supports multi-tenancy and error handling
export async function sendReminders(sendEmailFn, tenantId = null, hoursAhead = 24) {
    const bookings = await getUpcomingBookingsForReminder(hoursAhead, tenantId);
    let sent = 0;
    for (const booking of bookings) {
        try {
            const timezone = booking.client?.timezone || 'UTC';
            await sendEmailFn({
                to: booking.client.email,
                clientName: booking.client.name,
                bookingDetails: `Service: ${booking.service.name}, Date: ${formatInTimezone(booking.date, timezone)}`
            });
            await markReminderSent(booking.id);
            sent++;
        } catch (err) {
            console.error(`[REMINDER] Failed to send reminder for booking ${booking.id}:`, err);
        }
    }
    return sent;
}

// Send reminders for overdue invoices (returns count)
export async function sendOverdueInvoiceReminders(sendEmailFn, tenantId = null) {
    // Optionally: allow custom email template or callback
    const where = {
        status: 'OVERDUE',
        reminderSent: false,
        deletedAt: null
    };
    if (tenantId) where.businessId = tenantId;
    const invoices = await prisma.invoice.findMany({
        where,
        include: {
            client: { select: { id: true, name: true, email: true } }
        }
    });
    let sent = 0;
    for (const invoice of invoices) {
        try {
            await sendEmailFn({
                to: invoice.client.email,
                clientName: invoice.client.name,
                subject: 'Invoice Overdue Reminder',
                text: `Dear ${invoice.client.name},\n\nYour invoice #${invoice.id} is overdue. Please make payment as soon as possible.`,
                html: `<p>Dear ${invoice.client.name},</p><p>Your invoice #${invoice.id} is overdue. Please make payment as soon as possible.</p>`
            });
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { reminderSent: true }
            });
            sent++;
        } catch (err) {
            console.error(`[REMINDER] Failed to send overdue invoice reminder for invoice ${invoice.id}:`, err);
        }
    }
    return sent;
}

// Utility: Reset reminders for testing or re-sending
export async function resetReminders({ beforeDate = new Date(), businessId = null } = {}) {
    const where = {
        reminderSent: true,
        date: { lt: beforeDate }
    };
    if (businessId) where.businessId = businessId;
    const result = await prisma.booking.updateMany({
        where,
        data: { reminderSent: false }
    });
    return result;
}
