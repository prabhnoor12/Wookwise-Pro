import { PrismaClient } from '@prisma/client';
import { Parser as CsvParser } from 'json2csv';

const prisma = new PrismaClient();

// List invoices with pagination and optional filtering
export async function getInvoices(req, res) {
    try {
        const { page = 1, pageSize = 10, clientId, status } = req.query;
        const businessId = req.user.businessId;
        const where = {
            businessId,
            ...(clientId && { clientId: Number(clientId) }),
            ...(status && { status }),
        };
        const invoices = await prisma.invoice.findMany({
            where,
            skip: (Number(page) - 1) * Number(pageSize),
            take: Number(pageSize),
            orderBy: { createdAt: 'desc' },
            include: { client: true, booking: true }
        });
        const total = await prisma.invoice.count({ where });
        res.json({ data: invoices, page: Number(page), pageSize: Number(pageSize), total });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices', details: error.message });
    }
}

// Create a new invoice
export async function createInvoice(req, res) {
    try {
        const { clientId, bookingId, amount, dueDate, status = 'PENDING', notes } = req.body;
        const businessId = req.user.businessId;
        if (!clientId || !bookingId || !amount || !dueDate) {
            return res.status(400).json({ error: 'clientId, bookingId, amount, and dueDate are required' });
        }
        const invoice = await prisma.invoice.create({
            data: {
                clientId: Number(clientId),
                bookingId: Number(bookingId),
                amount: Number(amount),
                dueDate: new Date(dueDate),
                status,
                notes: notes || null,
                businessId,
            }
        });
        res.status(201).json(invoice);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create invoice', details: error.message });
    }
}

// Get invoice by ID
export async function getInvoiceById(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const invoice = await prisma.invoice.findUnique({
            where: { id: Number(id), businessId },
            include: { client: true, booking: true }
        });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoice', details: error.message });
    }
}

// Update invoice
export async function updateInvoice(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const data = req.body;
        if (data.id) delete data.id;
        // Only update if invoice belongs to business
        const invoice = await prisma.invoice.update({
            where: { id: Number(id), businessId },
            data
        });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update invoice', details: error.message });
    }
}

// Delete invoice (soft delete)
export async function deleteInvoice(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        await prisma.invoice.update({
            where: { id: Number(id), businessId },
            data: { deletedAt: new Date() }
        });
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete invoice', details: error.message });
    }
}

// Restore a soft-deleted invoice
export async function restoreInvoice(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const invoice = await prisma.invoice.update({
            where: { id: Number(id), businessId },
            data: { deletedAt: null }
        });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: 'Failed to restore invoice', details: error.message });
    }
}

// Get all deleted invoices (for admin/audit)
export async function getDeletedInvoices(req, res) {
    try {
        const { page = 1, pageSize = 10 } = req.query;
        const businessId = req.user.businessId;
        const where = { deletedAt: { not: null }, businessId };
        const invoices = await prisma.invoice.findMany({
            where,
            skip: (Number(page) - 1) * Number(pageSize),
            take: Number(pageSize),
            orderBy: { deletedAt: 'desc' },
            include: { client: true, booking: true }
        });
        const total = await prisma.invoice.count({ where });
        res.json({ data: invoices, page: Number(page), pageSize: Number(pageSize), total });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch deleted invoices', details: error.message });
    }
}

// Search invoices by client name or email
export async function searchInvoices(req, res) {
    try {
        const { query } = req.query;
        const businessId = req.user.businessId;
        if (!query || typeof query !== 'string' || query.length < 2) {
            return res.status(400).json({ error: 'Query string required' });
        }
        const invoices = await prisma.invoice.findMany({
            where: {
                deletedAt: null,
                businessId,
                OR: [
                    { client: { name: { contains: query, mode: 'insensitive' } } },
                    { client: { email: { contains: query, mode: 'insensitive' } } }
                ]
            },
            include: { client: true, booking: true }
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to search invoices', details: error.message });
    }
}

// Export invoices as CSV
export async function exportInvoicesCsv(req, res) {
    try {
        const businessId = req.user.businessId;
        const invoices = await prisma.invoice.findMany({
            where: { deletedAt: null, businessId },
            include: { client: true, booking: true }
        });
        const fields = [
            'id', 'clientId', 'bookingId', 'amount', 'dueDate', 'status', 'notes', 'createdAt', 'updatedAt'
        ];
        const parser = new CsvParser({ fields });
        const csv = parser.parse(invoices);
        res.header('Content-Type', 'text/csv');
        res.attachment('invoices.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Failed to export invoices', details: error.message });
    }
}

// Mark invoice as paid
export async function markInvoicePaid(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const invoice = await prisma.invoice.update({
            where: { id: Number(id), businessId },
            data: { status: 'PAID', paidAt: new Date() }
        });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark invoice as paid', details: error.message });
    }
}

// Mark invoice as overdue
export async function markInvoiceOverdue(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const invoice = await prisma.invoice.update({
            where: { id: Number(id), businessId },
            data: { status: 'OVERDUE' }
        });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark invoice as overdue', details: error.message });
    }
}

// Get all invoices for a client
export async function getInvoicesByClient(req, res) {
    try {
        const { clientId } = req.params;
        const businessId = req.user.businessId;
        const invoices = await prisma.invoice.findMany({
            where: { clientId: Number(clientId), deletedAt: null, businessId },
            orderBy: { createdAt: 'desc' },
            include: { booking: true }
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch client invoices', details: error.message });
    }
}

// Get invoice stats (total, paid, overdue, pending)
export async function getInvoiceStats(req, res) {
    try {
        const businessId = req.user.businessId;
        const [total, paid, overdue, pending] = await Promise.all([
            prisma.invoice.count({ where: { deletedAt: null, businessId } }),
            prisma.invoice.count({ where: { deletedAt: null, status: 'PAID', businessId } }),
            prisma.invoice.count({ where: { deletedAt: null, status: 'OVERDUE', businessId } }),
            prisma.invoice.count({ where: { deletedAt: null, status: 'PENDING', businessId } })
        ]);
        res.json({ total, paid, overdue, pending });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoice stats', details: error.message });
    }
}

// Bulk mark invoices as paid
export async function bulkMarkPaid(req, res) {
    try {
        const { ids } = req.body;
        const businessId = req.user.businessId;
        if (!Array.isArray(ids) || !ids.length) {
            return res.status(400).json({ error: 'Array of invoice IDs required' });
        }
        const result = await prisma.invoice.updateMany({
            where: { id: { in: ids.map(Number) }, deletedAt: null, businessId },
            data: { status: 'PAID', paidAt: new Date() }
        });
        res.json({ updated: result.count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to bulk mark invoices as paid', details: error.message });
    }
}
