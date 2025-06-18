// Job scheduler/runner entrypoint

import { markOverdueInvoices, sendUnpaidInvoiceReminders } from '../workers/invoice.worker.js';
import { sendReminders } from '../services/reminder.service.js';
import { sendEmail } from '../services/email.service.js';

// Example: Run all scheduled jobs (to be called by a cron or manually)
export async function runAllJobs({ dryRun = false, tenantId = null } = {}) {
    const results = {};
    try {
        results.markOverdueInvoices = await markOverdueInvoices({ dryRun, tenantId });
        results.sendUnpaidInvoiceReminders = await sendUnpaidInvoiceReminders(
            dryRun
                ? (...args) => {
                    console.log('[DRY RUN] Would send unpaid invoice reminder:', args);
                    return Promise.resolve(true);
                }
                : sendEmail,
            tenantId
        );
        results.sendReminders = await sendReminders(
            dryRun
                ? (...args) => {
                    console.log('[DRY RUN] Would send reminder email:', args);
                    return Promise.resolve(true);
                }
                : sendEmail,
            tenantId
        );
        console.log('[JOBS] All scheduled jobs executed.', results);
        return results;
    } catch (err) {
        console.error('[JOBS] Error running scheduled jobs:', err);
        return { error: err.message };
    }
}

// Utility: run a specific job by name
export async function runJobByName(name, opts = {}) {
    switch (name) {
        case 'markOverdueInvoices':
            return await markOverdueInvoices(opts);
        case 'sendUnpaidInvoiceReminders':
            return await sendUnpaidInvoiceReminders(sendEmail, opts.tenantId);
        case 'sendReminders':
            return await sendReminders(sendEmail, opts.tenantId);
        default:
            throw new Error(`Unknown job: ${name}`);
    }
}

// Utility: schedule jobs at intervals (simple in-memory, for dev/testing)
const scheduledJobs = [];
export function scheduleJob(name, intervalMs, opts = {}) {
    const handle = setInterval(() => {
        runJobByName(name, opts)
            .then(result => console.log(`[JOBS] Scheduled job "${name}" result:`, result))
            .catch(err => console.error(`[JOBS] Scheduled job "${name}" error:`, err));
    }, intervalMs);
    scheduledJobs.push({ name, handle });
    console.log(`[JOBS] Scheduled job "${name}" every ${intervalMs / 1000}s`);
    return handle;
}
export function clearScheduledJobs() {
    for (const job of scheduledJobs) clearInterval(job.handle);
    scheduledJobs.length = 0;
    console.log('[JOBS] Cleared all scheduled jobs');
}

// Optionally, run jobs if this file is executed directly
if (import.meta && import.meta.url && process.argv[1] === new URL(import.meta.url).pathname) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const tenantArg = args.find(arg => arg.startsWith('--tenant='));
    const tenantId = tenantArg ? tenantArg.split('=')[1] : null;
    runAllJobs({ dryRun, tenantId }).then(() => process.exit(0));
}
