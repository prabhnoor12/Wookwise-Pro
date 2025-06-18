// Worker for processing invoice-related background tasks

import { prisma } from '../prisma/client.js';

// Example: Mark overdue invoices (run by a scheduler/cron)
export async function markOverdueInvoices() {
    const now = new Date();
    const overdue = await prisma.invoice.updateMany({
        where: {
            status: 'PENDING',
            dueDate: { lt: now },
            deletedAt: null
        },
        data: { status: 'OVERDUE' }
    });
    console.log(`[INVOICE WORKER] Marked ${overdue.count} invoices as overdue.`);
    return overdue.count;
}

// Example: Send reminders for unpaid invoices (stub)
export async function sendUnpaidInvoiceReminders(sendEmailFn) {
    const invoices = await prisma.invoice.findMany({
        where: {
            status: { in: ['PENDING', 'OVERDUE'] },
            deletedAt: null
        },
        include: { client: true }
    });
    let sent = 0;
    for (const invoice of invoices) {
        if (invoice.client?.email) {
            await sendEmailFn({
                to: invoice.client.email,
                subject: 'Invoice Payment Reminder',
                html: `<p>Dear ${invoice.client.name},<br>Your invoice #${invoice.id} is ${invoice.status.toLowerCase()}. Please pay as soon as possible.</p>`
            });
            sent++;
        }
    }
    console.log(`[INVOICE WORKER] Sent ${sent} invoice reminders.`);
    return sent;
}

// Example: Main runner (for CLI/cron usage)
if (process.argv.includes('--mark-overdue')) {
    markOverdueInvoices().then(() => process.exit(0));
}
if (process.argv.includes('--send-reminders')) {
    // You must provide a real sendEmailFn implementation here
    sendUnpaidInvoiceReminders(() => Promise.resolve()).then(() => process.exit(0));
}
