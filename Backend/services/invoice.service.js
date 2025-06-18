import { prisma } from '../prisma/client.js';
import { formatInTimezone } from '../utils/date.utils.js';

// Create a new invoice
export async function createInvoice(data) {
    return await prisma.invoice.create({ data });
}

// Get invoice by ID (with formatted due date)
export async function getInvoiceById(id, businessId, timezone = 'UTC') {
    const invoice = await prisma.invoice.findUnique({ where: { id: Number(id), businessId } });
    if (!invoice) return null;
    return { ...invoice, dueDateFormatted: formatInTimezone(invoice.dueDate, timezone) };
}

// Update invoice by ID
export async function updateInvoice(id, data) {
    return await prisma.invoice.update({
        where: { id: Number(id) },
        data
    });
}

// Soft delete invoice
export async function softDeleteInvoice(id) {
    return await prisma.invoice.update({
        where: { id: Number(id) },
        data: { deletedAt: new Date() }
    });
}

// Restore soft-deleted invoice
export async function restoreInvoice(id) {
    return await prisma.invoice.update({
        where: { id: Number(id) },
        data: { deletedAt: null }
    });
}

// Get all invoices with optional filters and pagination
export async function getAllInvoices({ page = 1, pageSize = 10, where = {}, orderBy = { createdAt: 'desc' } }) {
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const invoices = await prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy
    });
    const total = await prisma.invoice.count({ where });
    return { data: invoices, page: Number(page), pageSize: Number(pageSize), total };
}

// Get all invoices for a client
export async function getInvoicesByClient(clientId) {
    return await prisma.invoice.findMany({
        where: { clientId: Number(clientId), deletedAt: null },
        orderBy: { createdAt: 'desc' }
    });
}

// Mark invoice as paid
export async function markInvoicePaid(id) {
    return await prisma.invoice.update({
        where: { id: Number(id) },
        data: { status: 'PAID', paidAt: new Date() }
    });
}

// Mark invoice as overdue
export async function markInvoiceOverdue(id) {
    return await prisma.invoice.update({
        where: { id: Number(id) },
        data: { status: 'OVERDUE' }
    });
}

// Get invoices by status (e.g., 'PAID', 'PENDING', 'OVERDUE'), with optional businessId/clientId
export async function getInvoicesByStatus(status, { businessId, clientId, page = 1, pageSize = 10 } = {}) {
    const where = { status };
    if (businessId) where.businessId = businessId;
    if (clientId) where.clientId = Number(clientId);
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const invoices = await prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
    });
    const total = await prisma.invoice.count({ where });
    return { data: invoices, page: Number(page), pageSize: Number(pageSize), total };
}

// Get invoice stats (total, paid, overdue, pending) for a business
export async function getInvoiceStats(businessId) {
    const where = { deletedAt: null, businessId };
    const [total, paid, overdue, pending] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.count({ where: { ...where, status: 'PAID' } }),
        prisma.invoice.count({ where: { ...where, status: 'OVERDUE' } }),
        prisma.invoice.count({ where: { ...where, status: 'PENDING' } }),
    ]);
    return { total, paid, overdue, pending };
}

// Bulk mark invoices as overdue by due date
export async function bulkMarkOverdueInvoices({ beforeDate = new Date() } = {}) {
    const result = await prisma.invoice.updateMany({
        where: {
            status: 'PENDING',
            dueDate: { lt: beforeDate },
            deletedAt: null
        },
        data: { status: 'OVERDUE' }
    });
    return result;
}

// Bulk soft delete invoices by client or business
export async function bulkSoftDeleteInvoices({ clientId, businessId }) {
    const where = {};
    if (clientId) where.clientId = Number(clientId);
    if (businessId) where.businessId = businessId;
    const result = await prisma.invoice.updateMany({
        where,
        data: { deletedAt: new Date() }
    });
    return result;
}

// Restore all soft-deleted invoices for a client or business
export async function bulkRestoreInvoices({ clientId, businessId }) {
    const where = { deletedAt: { not: null } };
    if (clientId) where.clientId = Number(clientId);
    if (businessId) where.businessId = businessId;
    const result = await prisma.invoice.updateMany({
        where,
        data: { deletedAt: null }
    });
    return result;
}

// ...add more invoice-related service functions as needed...
