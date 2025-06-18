// Stripe configuration and initialization

import Stripe from 'stripe';

export const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_1234567890';
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_1234567890';

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-08-16',
});

// Helper to verify Stripe webhook signature
export function verifyStripeSignature(req) {
    const signature = req.headers['stripe-signature'];
    if (!signature) return null;
    try {
        return stripe.webhooks.constructEvent(
            req.rawBody,
            signature,
            stripeWebhookSecret
        );
    } catch (err) {
        return null;
    }
}

// Helper to create a Stripe customer
export async function createStripeCustomer({ email, name, metadata }) {
    return await stripe.customers.create({
        email,
        name,
        metadata,
    });
}

// Helper to create a Stripe payment intent
export async function createPaymentIntent({ amount, currency = 'usd', customerId, metadata }) {
    return await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        metadata,
    });
}

// Helper to retrieve a Stripe customer by ID
export async function getStripeCustomer(customerId) {
    return await stripe.customers.retrieve(customerId);
}

// Helper to create a Stripe product
export async function createStripeProduct({ name, description }) {
    return await stripe.products.create({
        name,
        description,
    });
}

// Helper to create a Stripe price for a product
export async function createStripePrice({ productId, unitAmount, currency = 'usd' }) {
    return await stripe.prices.create({
        product: productId,
        unit_amount: unitAmount,
        currency,
    });
}

export default stripe;
