import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Handle generic webhook events (Stripe, PayPal, etc.)
export async function handleWebhook(req, res) {
    try {
        const event = req.body;
        if (!event || !event.type) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        // Example: Stripe payment succeeded
        if (event.type === 'payment_intent.succeeded') {
            const bookingId = event.data?.object?.metadata?.bookingId;
            if (bookingId) {
                await prisma.booking.update({
                    where: { id: Number(bookingId) },
                    data: { paymentStatus: 'PAID', paymentDate: new Date() }
                });
            }
        }

        // Example: Stripe payment failed
        if (event.type === 'payment_intent.payment_failed') {
            const bookingId = event.data?.object?.metadata?.bookingId;
            if (bookingId) {
                await prisma.booking.update({
                    where: { id: Number(bookingId) },
                    data: { paymentStatus: 'FAILED' }
                });
            }
        }

        // Add more event handlers as needed...

        res.status(200).json({ received: true });
    } catch (error) {
        res.status(500).json({ error: 'Webhook handler error', details: error.message });
    }
}

// Example: Webhook for booking status updates from external system
export async function bookingStatusWebhook(req, res) {
    try {
        const { bookingId, status } = req.body;
        if (!bookingId || !status) {
            return res.status(400).json({ error: 'bookingId and status required' });
        }
        await prisma.booking.update({
            where: { id: Number(bookingId) },
            data: { status }
        });
        res.json({ message: 'Booking status updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update booking status', details: error.message });
    }
}

// Webhook for invoice payment events (e.g., Stripe invoice.paid)
export async function invoicePaymentWebhook(req, res) {
    try {
        const event = req.body;
        if (!event || !event.type) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        // Example: Stripe invoice paid
        if (event.type === 'invoice.paid') {
            const invoiceId = event.data?.object?.metadata?.invoiceId;
            if (invoiceId) {
                await prisma.invoice.update({
                    where: { id: Number(invoiceId) },
                    data: { status: 'PAID', paidAt: new Date() }
                });
            }
        }

        // Example: Stripe invoice payment failed
        if (event.type === 'invoice.payment_failed') {
            const invoiceId = event.data?.object?.metadata?.invoiceId;
            if (invoiceId) {
                await prisma.invoice.update({
                    where: { id: Number(invoiceId) },
                    data: { status: 'FAILED' }
                });
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        res.status(500).json({ error: 'Invoice webhook handler error', details: error.message });
    }
}

// Webhook for client creation from external system
export async function externalClientCreatedWebhook(req, res) {
    try {
        const { name, email, phone } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'name and email required' });
        }
        // Prevent duplicate client
        let client = await prisma.client.findFirst({
            where: { email: email.trim().toLowerCase() }
        });
        if (!client) {
            client = await prisma.client.create({
                data: {
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone ? phone.trim() : null
                }
            });
        }
        res.json({ message: 'Client processed', client });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process client webhook', details: error.message });
    }
}

// Webhook for service updates from external system
export async function externalServiceUpdateWebhook(req, res) {
    try {
        const { serviceId, name, price, durationMinutes } = req.body;
        if (!serviceId || !name) {
            return res.status(400).json({ error: 'serviceId and name required' });
        }
        const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
        if (!service) {
            await prisma.service.create({
                data: {
                    id: Number(serviceId),
                    name,
                    price: price !== undefined ? Number(price) : null,
                    durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : null,
                    active: true
                }
            });
        } else {
            await prisma.service.update({
                where: { id: Number(serviceId) },
                data: {
                    name,
                    price: price !== undefined ? Number(price) : service.price,
                    durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : service.durationMinutes
                }
            });
        }
        res.json({ message: 'Service processed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process service webhook', details: error.message });
    }
}
