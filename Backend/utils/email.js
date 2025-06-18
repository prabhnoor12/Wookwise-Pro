import nodemailer from 'nodemailer';
import { formatInTimezone } from '../utils/date.utils.js';

// Centralized transporter creation for reuse
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// Generic send email utility (supports text/html/attachments)
export async function sendEmail({ to, subject, text, html, attachments }) {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
    attachments,
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw error;
  }
}

// Sends a cancellation email to a client.
export async function sendClientCancellation(to, subject, text) {
  return sendEmail({ to, subject, text });
}

// Sends a booking confirmation email to a client (with optional timezone/date)
export async function sendBookingConfirmation(to, subject, text, date = null, timezone = 'UTC', html = null) {
  let formattedText = text;
  let formattedHtml = html;
  if (date) {
    const dateStr = formatInTimezone(date, timezone);
    formattedText += `\n\nDate: ${dateStr}`;
    if (formattedHtml) {
      formattedHtml += `<br/><strong>Date:</strong> ${dateStr}`;
    }
  }
  return sendEmail({ to, subject, text: formattedText, html: formattedHtml });
}

// Sends a password reset email to a client.
export async function sendPasswordReset(to, resetLink) {
  const subject = 'Password Reset Request';
  const text = `You requested a password reset. Click the link to reset your password: ${resetLink}`;
  return sendEmail({ to, subject, text });
}

// Sends a client confirmation email (alias for sendBookingConfirmation).
export async function sendClientConfirmation(to, subject, text, date = null, timezone = 'UTC') {
  return sendBookingConfirmation(to, subject, text, date, timezone);
}

// Sends a notification email to the owner.
export async function sendOwnerNotification(to, subject, text) {
  return sendEmail({ to, subject, text });
}

// Sends a payment request email to a client.
export async function sendPaymentRequest(to, subject, text) {
  return sendEmail({ to, subject, text });
}

// Sends a test email to verify email sending functionality.
export async function sendTestEmail(to) {
  const subject = 'Test Email';
  const text = 'This is a test email from your SaaS app.';
  return sendEmail({ to, subject, text });
}

// Sends a generic email with HTML content.
export async function sendHtmlEmail(to, subject, html) {
  return sendEmail({ to, subject, html });
}

// Utility to verify transporter configuration.
export async function verifyTransporter() {
  const transporter = getTransporter();
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    return false;
  }
}

// Example template function for booking confirmation
export function bookingConfirmationTemplate(clientName, service, date, time, timezone = 'UTC') {
  const dateStr = date ? formatInTimezone(date, timezone, "yyyy-MM-dd HH:mm") : `${date} at ${time}`;
  return `
    Hi ${clientName},

    Your booking for ${service} is confirmed on ${dateStr}.

    Thank you for choosing us!
  `;
}

// Example template function for cancellation
export function cancellationTemplate(clientName, service, date, time, timezone = 'UTC') {
  const dateStr = date ? formatInTimezone(date, timezone, "yyyy-MM-dd HH:mm") : `${date} at ${time}`;
  return `
    Hi ${clientName},

    Your booking for ${service} on ${dateStr} has been cancelled.

    If you have any questions, please contact us.

    Regards,
    The Team
  `;
}

// Example template function for password reset
export function passwordResetTemplate(clientName, resetLink) {
  return `
    Hi ${clientName},

    You requested a password reset. Please click the link below to reset your password:
    ${resetLink}

    If you did not request this, please ignore this email.

    Regards,
    The Team
  `;
}

// Sends a reminder email to a client.
export async function sendClientReminder(to, subject, text) {
  return sendEmail({ to, subject, text });
}

// Sends a reminder email to the owner.
export async function sendOwnerReminder(to, subject, text) {
  return sendEmail({ to, subject, text });
}

// Sends a cancellation email to the owner.
export async function sendOwnerCancellation(to, subject, text) {
  return sendEmail({ to, subject, text });
}


