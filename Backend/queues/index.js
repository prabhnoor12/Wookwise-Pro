// Simple job queue setup using BullMQ (Redis required)

import { Queue, Worker } from 'bullmq';

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASS || undefined,
};

// Example: Email queue
export const emailQueue = new Queue('email', { connection });

// Example: Invoice queue
export const invoiceQueue = new Queue('invoice', { connection });

// Utility: log queue events
function logWorkerEvents(worker, label = '') {
    worker.on('completed', job => {
        console.log(`[QUEUE] ${label} job completed:`, job.id);
    });
    worker.on('failed', (job, err) => {
        console.error(`[QUEUE] ${label} job failed:`, job?.id, err);
    });
}

// Utility: gracefully close a queue or worker
export async function closeQueueResource(resource) {
    if (resource && typeof resource.close === 'function') {
        await resource.close();
        console.log('[QUEUE] Resource closed');
    }
}

// Example: Worker for processing email jobs
export function startEmailWorker(processFn, opts = {}) {
    const worker = new Worker('email', processFn, { connection, ...opts });
    logWorkerEvents(worker, 'email');
    return worker;
}

// Example: Worker for processing invoice jobs
export function startInvoiceWorker(processFn, opts = {}) {
    const worker = new Worker('invoice', processFn, { connection, ...opts });
    logWorkerEvents(worker, 'invoice');
    return worker;
}

// Add bulk jobs to a queue
export async function addBulkJobs(queue, jobs, jobOptions = {}) {
    const added = await queue.addBulk(
        jobs.map(data => ({
            name: data.name || 'job',
            data: data.data || data,
            opts: jobOptions
        }))
    );
    console.log(`[QUEUE] Added bulk jobs to ${queue.name}:`, added.map(j => j.id));
    return added;
}

// Pause and resume any queue
export async function pauseQueue(queue) {
    await queue.pause();
    console.log(`[QUEUE] Paused: ${queue.name}`);
}
export async function resumeQueue(queue) {
    await queue.resume();
    console.log(`[QUEUE] Resumed: ${queue.name}`);
}

// Optionally: export connection for reuse
export { connection };

// Example usage (for CLI/testing):
// startEmailWorker(async job => { /* send email logic */ });
// startInvoiceWorker(async job => { /* invoice logic */ });
