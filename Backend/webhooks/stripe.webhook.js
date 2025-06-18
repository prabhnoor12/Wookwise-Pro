import express from 'express';
import { stripe, verifyStripeSignature } from '../config/stripe.config.js';
import { prisma } from '../prisma/client.js';

const router = express.Router();

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    let event;
    try {
        event = verifyStripeSignature(req);
        if (!event) {
            return res.status(400).send('Webhook Error: Invalid signature');
        }
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle Stripe event types
    switch (event.type) {
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            const bookingId = paymentIntent.metadata?.bookingId;
            if (bookingId) {
                await prisma.booking.update({
                    where: { id: Number(bookingId) },
                    data: { paymentStatus: 'PAID', paymentDate: new Date() }
                });
            }
            break;
        }
        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            const bookingId = paymentIntent.metadata?.bookingId;
            if (bookingId) {
                await prisma.booking.update({
                    where: { id: Number(bookingId) },
                    data: { paymentStatus: 'FAILED' }
                });
            }
            break;
        }
        case 'invoice.paid': {
            const invoice = event.data.object;
            const invoiceId = invoice.metadata?.invoiceId;
            if (invoiceId) {
                await prisma.invoice.update({
                    where: { id: Number(invoiceId) },
                    data: { status: 'PAID', paidAt: new Date() }
                });
            }
            break;
        }
        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const invoiceId = invoice.metadata?.invoiceId;
            if (invoiceId) {
                await prisma.invoice.update({
                    where: { id: Number(invoiceId) },
                    data: { status: 'FAILED' }
                });
            }
            break;
        }
        case 'customer.subscription.created': {
            const subscription = event.data.object;
            // TODO: Create a subscription record in your DB
            // await prisma.subscription.create({ data: { ... } });
            break;
        }
        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            // TODO: Update subscription status, plan, or period in your DB
            break;
        }
        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            // TODO: Mark subscription as canceled in your DB
            break;
        }
        case 'invoice.upcoming': {
            const invoice = event.data.object;
            // TODO: Notify user about upcoming invoice/payment
            break;
        }
        case 'usage_record.summary.created': {
            const summary = event.data.object;
            // TODO: Handle metered billing usage summary
            break;
        }
        default:
            // Unhandled event type
            break;
    }

    res.json({ received: true });
});

export default router;
