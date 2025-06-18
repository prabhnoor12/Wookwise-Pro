import nodemailer from 'nodemailer';
import { formatInTimezone } from '../utils/date.utils.js';

// Configure transporter (use environment variables in production)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password'
    }
});

// Send a generic email
export async function sendEmail({ to, subject, text, html }) {
    const mailOptions = {
        from: process.env.SMTP_FROM || '"My SaaS App" <no-reply@example.com>',
        to,
        subject,
        text,
        html
    };
    return await transporter.sendMail(mailOptions);
}

// Send booking confirmation email to client (with timezone)
export async function sendBookingConfirmation({ to, clientName, bookingDetails, date, timezone = 'UTC' }) {
    const subject = 'Booking Confirmation';
    const dateStr = date ? formatInTimezone(date, timezone) : '';
    const text = `Hello ${clientName},\n\nYour booking is confirmed.\n\nDetails: ${bookingDetails}\nDate: ${dateStr}`;
    const html = `<p>Hello ${clientName},</p><p>Your booking is confirmed.</p><p>Details: ${bookingDetails}</p><p>Date: ${dateStr}</p>`;
    return await sendEmail({ to, subject, text, html });
}

// Send booking cancellation email to client
export async function sendBookingCancellation({ to, clientName, bookingDetails }) {
    const subject = 'Booking Cancelled';
    const text = `Hello ${clientName},\n\nYour booking has been cancelled.\n\nDetails: ${bookingDetails}`;
    const html = `<p>Hello ${clientName},</p><p>Your booking has been cancelled.</p><p>Details: ${bookingDetails}</p>`;
    return await sendEmail({ to, subject, text, html });
}

// Send payment request email to client
export async function sendPaymentRequest({ to, clientName, amount, paymentLink }) {
    const subject = 'Payment Request';
    const text = `Hello ${clientName},\n\nPlease complete your payment of $${amount} using the following link: ${paymentLink}`;
    const html = `<p>Hello ${clientName},</p><p>Please complete your payment of <b>$${amount}</b> using the following link:</p><p><a href="${paymentLink}">${paymentLink}</a></p>`;
    return await sendEmail({ to, subject, text, html });
}

// Send invoice email to client
export async function sendInvoiceEmail({ to, clientName, invoiceDetails, pdfBuffer }) {
    const subject = 'Your Invoice';
    const text = `Hello ${clientName},\n\nPlease find your invoice attached.\n\nDetails: ${invoiceDetails}`;
    const html = `<p>Hello ${clientName},</p><p>Please find your invoice attached.</p><p>Details: ${invoiceDetails}</p>`;
    const mailOptions = {
        from: process.env.SMTP_FROM || '"My SaaS App" <no-reply@example.com>',
        to,
        subject,
        text,
        html,
        attachments: pdfBuffer
            ? [{ filename: 'invoice.pdf', content: pdfBuffer }]
            : undefined
    };
    return await transporter.sendMail(mailOptions);
}

// Send reminder email to client
export async function sendReminderEmail({ to, clientName, reminderText }) {
    const subject = 'Reminder';
    const text = `Hello ${clientName},\n\n${reminderText}`;
    const html = `<p>Hello ${clientName},</p><p>${reminderText}</p>`;
    return await sendEmail({ to, subject, text, html });
}

// Send notification email to admin or staff
export async function sendAdminNotification({ to, subject, message }) {
    const text = message;
    const html = `<p>${message}</p>`;
    return await sendEmail({ to, subject, text, html });
}

// Send welcome email to new client
export async function sendWelcomeEmail({ to, clientName }) {
    const subject = 'Welcome to My SaaS App!';
    const text = `Hello ${clientName},\n\nWelcome to our platform. We're glad to have you!`;
    const html = `<p>Hello ${clientName},</p><p>Welcome to our platform. We're glad to have you!</p>`;
    return await sendEmail({ to, subject, text, html });
}

// Send password reset email to client
export async function sendPasswordResetEmail({ to, clientName, resetLink }) {
    const subject = 'Password Reset Request';
    const text = `Hello ${clientName},\n\nYou requested a password reset. Click the link below to reset your password:\n${resetLink}`;
    const html = `<p>Hello ${clientName},</p><p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`;
    return await sendEmail({ to, subject, text, html });
}

// ...add more email-related service functions as needed...
