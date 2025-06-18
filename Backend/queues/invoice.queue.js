import { invoiceQueue, startInvoiceWorker, closeQueueResource } from './index.js';

// Add an invoice job to the queue, with optional job options
export async function addInvoiceJob(data, jobOptions = {}) {
    const job = await invoiceQueue.add('processInvoice', data, jobOptions);
    console.log('[INVOICE QUEUE] Added invoice job:', job.id, data);
    return job;
}

// Add bulk invoice jobs to the queue
export async function addBulkInvoiceJobs(jobs, jobOptions = {}) {
    const added = await invoiceQueue.addBulk(
        jobs.map(data => ({
            name: 'processInvoice',
            data,
            opts: jobOptions
        }))
    );
    console.log('[INVOICE QUEUE] Added bulk invoice jobs:', added.map(j => j.id));
    return added;
}

// Pause and resume the invoice queue
export async function pauseInvoiceQueue() {
    await invoiceQueue.pause();
    console.log('[INVOICE QUEUE] Paused');
}
export async function resumeInvoiceQueue() {
    await invoiceQueue.resume();
    console.log('[INVOICE QUEUE] Resumed');
}

// Example processor for invoice jobs
export async function processInvoiceJob(job) {
    // Implement invoice processing logic here
    // e.g., generate PDF, send email, update status, etc.
    console.log(`[INVOICE QUEUE] Processing invoice job:`, job.data);
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 100)); // simulate delay
}

// Start the invoice worker (call this in your app entrypoint if needed)
export function start(processor = processInvoiceJob) {
    const worker = startInvoiceWorker(async (job) => {
        try {
            await processor(job);
            console.log(`[INVOICE QUEUE] Job ${job.id} processed successfully.`);
        } catch (err) {
            console.error(`[INVOICE QUEUE] Job ${job.id} failed:`, err);
            throw err;
        }
    });
    return worker;
}

// Graceful shutdown utility
export async function shutdown(worker) {
    await closeQueueResource(worker);
    await closeQueueResource(invoiceQueue);
    console.log('[INVOICE QUEUE] Shutdown complete.');
}

// Optionally, auto-start worker if run directly (ESM style)
if (import.meta && import.meta.url && process.argv[1] === new URL(import.meta.url).pathname) {
    const worker = start();
    // Graceful shutdown on SIGINT/SIGTERM
    process.on('SIGINT', async () => {
        await shutdown(worker);
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        await shutdown(worker);
        process.exit(0);
    });
}
