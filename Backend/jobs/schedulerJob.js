// Scheduler job to run all periodic background jobs

import { runAllJobs } from './index.js';
import { generateRecurringInvoices } from './recurringInvoiceJob.js';
import { runBookingReminders } from './reminderJob.js';

// Run all scheduled jobs (can be called by a cron or manually)
export async function runSchedulerJobs({ dryRun = false, tenantId = null } = {}) {
    let results = {};
    try {
        results.runAllJobs = await runAllJobs();
        results.recurringInvoices = await generateRecurringInvoices({ dryRun, tenantId });
        results.bookingReminders = await runBookingReminders({ dryRun, tenantId });
        console.log('[SCHEDULER JOB] All scheduled jobs executed.', results);
        return results;
    } catch (err) {
        console.error('[SCHEDULER JOB] Error running scheduled jobs:', err);
        return { error: err.message };
    }
}

// Preview all jobs (dry run, returns what would be done)
export async function previewSchedulerJobs({ tenantId = null } = {}) {
    const { previewRecurringInvoices } = await import('./recurringInvoiceJob.js');
    const { previewBookingReminders } = await import('./reminderJob.js');
    const recurring = await previewRecurringInvoices({ tenantId });
    const reminders = await previewBookingReminders({ tenantId });
    return {
        recurringInvoices: recurring,
        bookingReminders: reminders
    };
}

// Optionally, run if executed directly
if (import.meta && import.meta.url && process.argv[1] === new URL(import.meta.url).pathname) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const tenantArg = args.find(arg => arg.startsWith('--tenant='));
    const tenantId = tenantArg ? tenantArg.split('=')[1] : null;
    runSchedulerJobs({ dryRun, tenantId }).then(() => process.exit(0));
}
