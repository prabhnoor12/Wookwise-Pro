import { Queue, Worker } from 'bullmq';
import redis from '../config/redis.config.js';

const emailQueue = new Queue('emailQueue', {
  connection: redis,
});

// Add an email job to the queue, with optional job options
async function addEmailJob(data, jobOptions = {}) {
  const job = await emailQueue.add('sendEmail', data, jobOptions);
  console.log('[EMAIL QUEUE] Added email job:', job.id, data);
  return job;
}

// Add bulk email jobs to the queue
async function addBulkEmailJobs(jobs, jobOptions = {}) {
  const added = await emailQueue.addBulk(
    jobs.map(data => ({
      name: 'sendEmail',
      data,
      opts: jobOptions
    }))
  );
  console.log('[EMAIL QUEUE] Added bulk email jobs:', added.map(j => j.id));
  return added;
}

// Pause and resume the email queue
async function pauseEmailQueue() {
  await emailQueue.pause();
  console.log('[EMAIL QUEUE] Paused');
}
async function resumeEmailQueue() {
  await emailQueue.resume();
  console.log('[EMAIL QUEUE] Resumed');
}

// Register a processor for email jobs
function processEmailJob(processFn) {
  // Use a Worker for better separation
  const worker = new Worker('emailQueue', async job => {
    if (job.name === 'sendEmail') {
      return processFn(job);
    }
  }, { connection: redis });
  worker.on('completed', job => {
    console.log('[EMAIL QUEUE] Completed email job:', job.id);
  });
  worker.on('failed', (job, err) => {
    console.error('[EMAIL QUEUE] Failed email job:', job?.id, err);
  });
  return worker;
}

// Optionally: Start the email worker if run directly
if (import.meta && import.meta.url && process.argv[1] === new URL(import.meta.url).pathname) {
  processEmailJob(async (job) => {
    // Implement email sending logic here, e.g.:
    // await sendEmail(job.data);
    console.log('[EMAIL QUEUE] Processing email job:', job.data);
  });
}

export { emailQueue, addEmailJob, processEmailJob, addBulkEmailJobs, pauseEmailQueue, resumeEmailQueue };
