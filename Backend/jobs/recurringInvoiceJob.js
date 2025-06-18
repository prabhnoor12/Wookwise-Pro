import { prisma } from '../prisma/client.js';

// Example: Generate recurring invoices for active subscriptions
export async function generateRecurringInvoices({ dryRun = false, tenantId = null } = {}) {
    const today = new Date();
    // Multi-tenant: filter by tenantId/businessId if provided
    const where = {
        status: 'ACTIVE',
        nextInvoiceDate: { lte: today },
    };
    if (tenantId) {
        where.businessId = tenantId;
    }

    const subscriptions = await prisma.subscription.findMany({
        where,
        include: { client: true }
    });

    let created = 0;
    let errors = 0;
    for (const sub of subscriptions) {
        try {
            if (dryRun) {
                console.log(`[DRY RUN] Would create invoice for subscription ${sub.id}, client ${sub.clientId}, amount ${sub.amount}`);
            } else {
                await prisma.invoice.create({
                    data: {
                        clientId: sub.clientId,
                        amount: sub.amount,
                        dueDate: sub.nextInvoiceDate,
                        status: 'PENDING',
                        subscriptionId: sub.id,
                        businessId: sub.businessId || null
                    }
                });
                // Update nextInvoiceDate (e.g., add 1 month)
                const next = new Date(sub.nextInvoiceDate);
                next.setMonth(next.getMonth() + 1);
                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: { nextInvoiceDate: next }
                });
            }
            created++;
        } catch (err) {
            errors++;
            console.error(`[RECURRING INVOICE JOB] Error processing subscription ${sub.id}:`, err);
        }
    }
    console.log(`[RECURRING INVOICE JOB] Tenant: ${tenantId || 'ALL'} | Created ${created} recurring invoices. Errors: ${errors}`);
    return { created, errors };
}

// Utility: preview upcoming recurring invoices without creating them
export async function previewRecurringInvoices({ tenantId = null } = {}) {
    const today = new Date();
    const where = {
        status: 'ACTIVE',
        nextInvoiceDate: { lte: today },
    };
    if (tenantId) {
        where.businessId = tenantId;
    }
    const subscriptions = await prisma.subscription.findMany({
        where,
        include: { client: true }
    });
    return subscriptions.map(sub => ({
        subscriptionId: sub.id,
        clientId: sub.clientId,
        clientName: sub.client?.name,
        amount: sub.amount,
        dueDate: sub.nextInvoiceDate,
        businessId: sub.businessId || null
    }));
}

// Optionally, run if executed directly
if (import.meta && import.meta.url && process.argv[1] === new URL(import.meta.url).pathname) {
    // Parse CLI args for dryRun and tenantId
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const tenantArg = args.find(arg => arg.startsWith('--tenant='));
    const tenantId = tenantArg ? tenantArg.split('=')[1] : null;
    generateRecurringInvoices({ dryRun, tenantId }).then(() => process.exit(0));
}
