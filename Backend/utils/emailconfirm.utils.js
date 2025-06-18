import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configure your email provider (example: SendGrid SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper: Generate a unique booking reference code
export function generateBookingRef(length = 8) {
  return crypto.randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}

// Helper: Format date and time for emails
export function formatDateTime(date, time, timezone = 'UTC') {
  try {
    const dt = new Date(`${date}T${time}:00Z`);
    return dt.toLocaleString('en-US', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return `${date} ${time}`;
  }
}

// Send booking confirmation to client (with booking reference and ICS calendar invite)
export async function sendClientConfirmation({
  to,
  clientName,
  serviceName,
  date,
  time,
  businessName,
  businessEmail,
  timezone = 'UTC',
  bookingRef,
  location,
  cancelUrl,
  rescheduleUrl,
}) {
  const formattedDateTime = formatDateTime(date, time, timezone);
  const ref = bookingRef || generateBookingRef();
  const subject = `Your booking is confirmed with ${businessName}`;
  const html = `
    <p>Hi ${clientName},</p>
    <p>Your booking for <strong>${serviceName}</strong> on <strong>${formattedDateTime}</strong> is confirmed.</p>
    <p>Booking Reference: <strong>${ref}</strong></p>
    ${location ? `<p>Location: ${location}</p>` : ''}
    <p>
      ${cancelUrl ? `<a href="${cancelUrl}">Cancel</a> | ` : ''}
      ${rescheduleUrl ? `<a href="${rescheduleUrl}">Reschedule</a>` : ''}
    </p>
    <p>Thank you for choosing ${businessName}!</p>
  `;
  // Attach ICS calendar invite
  const ics = generateICS({
    summary: `${serviceName} with ${businessName}`,
    description: `Booking Ref: ${ref}`,
    location,
    start: `${date}T${time}:00Z`,
    durationMinutes: 30,
    organizer: businessEmail || process.env.EMAIL_FROM,
    attendee: to,
  });
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@yourbusiness.com',
    to,
    subject,
    html,
    attachments: [
      {
        filename: 'booking.ics',
        content: ics,
        contentType: 'text/calendar',
      },
    ],
  });
}

// Send booking notification to business owner (with client contact and booking ref)
export async function sendOwnerNotification({
  to,
  clientName,
  clientEmail,
  clientPhone,
  serviceName,
  date,
  time,
  bookingRef,
  timezone = 'UTC',
  location,
}) {
  const formattedDateTime = formatDateTime(date, time, timezone);
  const ref = bookingRef || generateBookingRef();
  const subject = `New booking: ${serviceName} for ${clientName}`;
  const html = `
    <p>New booking received:</p>
    <ul>
      <li>Client: ${clientName}</li>
      <li>Email: ${clientEmail}</li>
      ${clientPhone ? `<li>Phone: ${clientPhone}</li>` : ''}
      <li>Service: ${serviceName}</li>
      <li>Date: ${formattedDateTime}</li>
      <li>Booking Reference: ${ref}</li>
      ${location ? `<li>Location: ${location}</li>` : ''}
    </ul>
  `;
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@yourbusiness.com',
    to,
    subject,
    html,
  });
}

// Send cancellation email to client
export async function sendClientCancellation({
  to,
  clientName,
  serviceName,
  date,
  time,
  businessName,
  bookingRef,
  reason,
  timezone = 'UTC',
}) {
  const formattedDateTime = formatDateTime(date, time, timezone);
  const subject = `Your booking with ${businessName} has been cancelled`;
  const html = `
    <p>Hi ${clientName},</p>
    <p>Your booking for <strong>${serviceName}</strong> on <strong>${formattedDateTime}</strong> has been cancelled.</p>
    <p>Booking Reference: <strong>${bookingRef}</strong></p>
    ${reason ? `<p>Reason: ${reason}</p>` : ''}
    <p>If you have questions, please contact us.</p>
  `;
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@yourbusiness.com',
    to,
    subject,
    html,
  });
}

// Send payment request email with payment link
export async function sendPaymentRequest({
  to,
  clientName,
  serviceName,
  amount,
  paymentLink,
  businessName,
  bookingRef,
  currency = 'USD',
}) {
  const subject = `Payment request for your booking with ${businessName}`;
  const html = `
    <p>Hi ${clientName},</p>
    <p>Please complete payment for your <strong>${serviceName}</strong> booking.</p>
    <p>Amount: <strong>${amount} ${currency}</strong></p>
    <p>Booking Reference: <strong>${bookingRef}</strong></p>
    <p><a href="${paymentLink}">Pay Now</a></p>
    <p>Thank you!</p>
  `;
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@yourbusiness.com',
    to,
    subject,
    html,
  });
}

// Send generic email utility
export async function sendEmail({ to, subject, html, attachments }) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@yourbusiness.com',
    to,
    subject,
    html,
    ...(attachments && { attachments }),
  });
}

// Helper: Generate a simple ICS calendar invite string
function generateICS({ summary, description, location, start, durationMinutes, organizer, attendee }) {
  const dtStart = start.replace(/[-:]/g, '').replace('T', 'T').replace('Z', 'Z');
  const dtEnd = new Date(new Date(start).getTime() + durationMinutes * 60000)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', 'T')
    .replace('Z', 'Z');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YourBusiness//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `ORGANIZER;CN=Business:${organizer}`,
    `ATTENDEE;CN=Client:${attendee}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

// Log email sending (for debugging/audit)
transporter.use('stream', (mail, callback) => {
  console.log(`[EMAIL] Sending to: ${mail.message.getEnvelope().to.join(', ')} | Subject: ${mail.message.getHeader('subject')}`);
  callback();
});

// Optionally: send test email
export async function sendTestEmail(to) {
  return sendEmail({
    to,
    subject: 'Test Email from Booking System',
    html: '<p>This is a test email. If you received this, email sending is working!</p>',
  });
}

// Helper: Generate a reminder email template
export function reminderEmailTemplate(clientName, serviceName, date, time, businessName) {
  return `
    <p>Hi ${clientName},</p>
    <p>This is a reminder for your upcoming <strong>${serviceName}</strong> booking on <strong>${date}</strong> at <strong>${time}</strong> with ${businessName}.</p>
    <p>We look forward to seeing you!</p>
  `;
}

// Helper: Generate an owner reminder email template
export function ownerReminderEmailTemplate(ownerName, clientName, serviceName, date, time) {
  return `
    <p>Hi ${ownerName},</p>
    <p>This is a reminder that <strong>${clientName}</strong> has a booking for <strong>${serviceName}</strong> on <strong>${date}</strong> at <strong>${time}</strong>.</p>
  `;
}

// Send reminder email to client
export async function sendClientReminder({
  to,
  clientName,
  serviceName,
  date,
  time,
  businessName,
}) {
  const subject = `Reminder: Your upcoming booking with ${businessName}`;
  const html = reminderEmailTemplate(clientName, serviceName, date, time, businessName);
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@yourbusiness.com',
    to,
    subject,
    html,
  });
}

// Send reminder email to owner
export async function sendOwnerReminder({
  to,
  ownerName,
  clientName,
  serviceName,
  date,
  time,
}) {
  const subject = `Reminder: Upcoming booking for ${clientName}`;
  const html = ownerReminderEmailTemplate(ownerName, clientName, serviceName, date, time);
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@yourbusiness.com',
    to,
    subject,
    html,
  });
}

// Send cancellation email to owner
export async function sendOwnerCancellation({
  to,
  ownerName,
  clientName,
  serviceName,
  date,
  time,
  bookingRef,
  reason,
}) {
  const subject = `Booking cancelled: ${serviceName} for ${clientName}`;
  const html = `
    <p>Hi ${ownerName},</p>
    <p>The following booking has been cancelled:</p>
    <ul>
      <li>Client: ${clientName}</li>
      <li>Service: ${serviceName}</li>
      <li>Date: ${date}</li>
      <li>Time: ${time}</li>
      <li>Booking Reference: ${bookingRef}</li>
      ${reason ? `<li>Reason: ${reason}</li>` : ''}
    </ul>
  `;
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@yourbusiness.com',
    to,
    subject,
    html,
  });
}
