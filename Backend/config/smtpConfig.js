export default {
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: process.env.EMAIL_FROM || 'no-reply@yourbusiness.com',
  secure: false, // set to true if using port 465
};
