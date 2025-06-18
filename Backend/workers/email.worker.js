const { Worker } = require('bullmq');
const redis = require('../config/redis.config');

const emailWorker = new Worker('emailQueue', async (job) => {
  const { to, subject, body } = job.data;
  console.log(`📨 Sending email to ${to}: ${subject}`);

  // Replace this with real email logic (e.g. SendGrid)
}, {
  connection: redis,
});

emailWorker.on('completed', (job) => {
  console.log(`✅ Email job completed: ${job.id}`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email job failed: ${job.id}`, err);
});
