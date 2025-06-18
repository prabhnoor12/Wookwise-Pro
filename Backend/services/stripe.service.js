import { stripe } from '../config/stripe.config.js';

// Create a Stripe customer
export async function createCustomer({ email, name, metadata, timezone }) {
    return await stripe.customers.create({
        email,
        name,
        metadata: { ...metadata, timezone: timezone || 'UTC' },
    });
}

// Create a Stripe payment intent
export async function createPaymentIntent({ amount, currency = 'usd', customerId, metadata, timezone }) {
    return await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        metadata: { ...metadata, timezone: timezone || 'UTC' },
    });
}

// Retrieve a Stripe customer by ID
export async function getCustomer(customerId) {
    return await stripe.customers.retrieve(customerId);
}

// Create a Stripe product
export async function createProduct({ name, description }) {
    return await stripe.products.create({
        name,
        description,
    });
}

// Create a Stripe price for a product
export async function createPrice({ productId, unitAmount, currency = 'usd' }) {
    return await stripe.prices.create({
        product: productId,
        unit_amount: unitAmount,
        currency,
    });
}

// Retrieve a payment intent by ID
export async function getPaymentIntent(paymentIntentId) {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
}

// List all Stripe customers (with optional limit and pagination)
export async function listCustomers({ limit = 10, startingAfter } = {}) {
    return await stripe.customers.list({
        limit,
        starting_after: startingAfter,
    });
}

// Update a Stripe customer
export async function updateCustomer(customerId, updates) {
    return await stripe.customers.update(customerId, updates);
}

// Delete a Stripe customer
export async function deleteCustomer(customerId) {
    return await stripe.customers.del(customerId);
}

// Refund a payment
export async function refundPayment({ paymentIntentId, amount }) {
    return await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
    });
}

// Attach a payment method to a customer
export async function attachPaymentMethod({ customerId, paymentMethodId }) {
    return await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
}

// Set a default payment method for a customer
export async function setDefaultPaymentMethod({ customerId, paymentMethodId }) {
    return await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
    });
}

// Detach a payment method from a customer
export async function detachPaymentMethod(paymentMethodId) {
    return await stripe.paymentMethods.detach(paymentMethodId);
}

// Retrieve a Stripe subscription by ID
export async function getSubscription(subscriptionId) {
    return await stripe.subscriptions.retrieve(subscriptionId);
}

// Cancel a Stripe subscription
export async function cancelSubscription(subscriptionId) {
    return await stripe.subscriptions.del(subscriptionId);
}

// ...add more Stripe-related service functions as needed...
