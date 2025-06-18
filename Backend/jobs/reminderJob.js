import { sendReminders } from '../services/reminder.service.js';
import { sendEmail } from '../services/email.service.js';

// Run booking reminders (to be called by a scheduler/cron)
export async function runBookingReminders({ dryRun = false, tenantId = null } = {}) {
    const start = Date.now();
    try {
        const count = await sendReminders(
            dryRun
                ? (...args) => {
                    // Dry run: log instead of sending email
                    console.log(`[DRY RUN] Would send reminder email:`, args);
                    return Promise.resolve(true);
                }
                : sendEmail,
            tenantId
        );
        const ms = Date.now() - start;
        console.log(`[REMINDER JOB] Tenant: ${tenantId || 'ALL'} | Sent ${count} booking reminders in ${ms}ms.${dryRun ? ' (dry run)' : ''}`);
        return count;
    } catch (err) {
        console.error(`[REMINDER JOB] Error:`, err?.stack || err);
        return 0;
    }
}

// Preview how many reminders would be sent (dry run, but returns count and details)
export async function previewBookingReminders({ tenantId = null, hoursAhead = 24 } = {}) {
    const { getUpcomingBookingsForReminder } = await import('../services/reminder.service.js');
    const bookings = await getUpcomingBookingsForReminder(hoursAhead, tenantId);
    return {
        count: bookings.length,
        bookings: bookings.map(b => ({
            bookingId: b.id,
            client: b.client?.name,
            email: b.client?.email,
            date: b.date,
            service: b.service?.name
        }))
    };
}

// Optionally, run if executed directly
if (import.meta && import.meta.url && process.argv[1] === new URL(import.meta.url).pathname) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const tenantArg = args.find(arg => arg.startsWith('--tenant='));
    const tenantId = tenantArg ? tenantArg.split('=')[1] : null;
    runBookingReminders({ dryRun, tenantId }).then(() => process.exit(0));
}
