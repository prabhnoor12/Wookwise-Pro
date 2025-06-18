import { prisma } from '../prisma/client.js';

// Create a new client
export async function createClient(data, businessId) {
    return await prisma.client.create({ data: { ...data, businessId, timezone: data.timezone || 'UTC' } });
}

// Get client by ID (scoped)
export async function getClientById(id, businessId) {
    // Optionally: throw if id or businessId is missing
    return await prisma.client.findUnique({ where: { id: Number(id), businessId } });
}

// Update client by ID (scoped)
export async function updateClient(id, data, businessId) {
    return await prisma.client.update({
        where: { id: Number(id), businessId },
        data: { ...data, ...(data.timezone && { timezone: data.timezone }) }
    });
}

// Soft delete client (scoped)
export async function softDeleteClient(id, reason = null, businessId) {
    // Optionally: check if already deleted
    return await prisma.client.update({
        where: { id: Number(id), businessId },
        data: { deletedAt: new Date(), deleteReason: reason }
    });
}

// Restore soft-deleted client (scoped)
export async function restoreClient(id, businessId) {
    return await prisma.client.update({
        where: { id: Number(id), businessId },
        data: { deletedAt: null, deleteReason: null }
    });
}

// Get all clients with optional filters and pagination (scoped)
export async function getAllClients({ businessId, page = 1, pageSize = 10, where = {}, orderBy = { createdAt: 'desc' } }) {
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const whereClause = { ...where, businessId };
    const clients = await prisma.client.findMany({
        where: whereClause,
        skip,
        take,
        orderBy
    });
    const total = await prisma.client.count({ where: whereClause });
    return { data: clients, page: Number(page), pageSize: Number(pageSize), total };
}

// Search clients by phone (scoped)
export async function searchClientsByPhone(phone, businessId) {
    return await prisma.client.findMany({
        where: {
            phone: { contains: phone, mode: 'insensitive' },
            deletedAt: null,
            businessId
        }
    });
}

// Bulk import clients (scoped)
export async function bulkImportClients(clients, businessId) {
    const results = [];
    for (const c of clients) {
        try {
            let client = await prisma.client.findFirst({
                where: {
                    businessId,
                    OR: [
                        { email: c.email.trim().toLowerCase() },
                        ...(c.phone ? [{ phone: c.phone.trim() }] : []),
                    ],
                },
            });
            if (!client) {
                client = await prisma.client.create({
                    data: {
                        name: c.name.trim(),
                        email: c.email.trim().toLowerCase(),
                        phone: c.phone ? c.phone.trim() : null,
                        businessId,
                    },
                });
                results.push({ ...client, status: 'created' });
            } else {
                results.push({ ...client, status: 'exists' });
            }
        } catch (err) {
            results.push({ ...c, status: 'error', error: err.message });
        }
    }
    return results;
}

// Get all bookings for a client (scoped)
export async function getClientBookings(clientId, businessId) {
    return await prisma.booking.findMany({
        where: { clientId: Number(clientId), deletedAt: null, businessId },
        orderBy: { date: 'desc' }
    });
}

// Get clients by businessId with pagination and filters
export async function getClientsByBusiness({ businessId, page = 1, pageSize = 10, where = {}, orderBy = { createdAt: 'desc' } }) {
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const whereClause = { ...where, businessId };
    const clients = await prisma.client.findMany({
        where: whereClause,
        skip,
        take,
        orderBy
    });
    const total = await prisma.client.count({ where: whereClause });
    return { data: clients, page: Number(page), pageSize: Number(pageSize), total };
}

// Merge duplicate clients by email or phone (keeps the first, merges bookings) (scoped)
export async function mergeDuplicateClients({ email, phone, businessId }) {
    const where = [];
    if (email) where.push({ email: email.trim().toLowerCase() });
    if (phone) where.push({ phone: phone.trim() });
    if (!where.length) return { merged: false, reason: 'No email or phone provided' };

    const duplicates = await prisma.client.findMany({
        where: { OR: where, businessId },
        orderBy: { createdAt: 'asc' }
    });
    if (duplicates.length < 2) return { merged: false, reason: 'No duplicates found' };

    const [primary, ...others] = duplicates;
    let mergedBookings = 0;
    for (const dup of others) {
        // Move bookings to primary
        const updated = await prisma.booking.updateMany({
            where: { clientId: dup.id, businessId },
            data: { clientId: primary.id }
        });
        mergedBookings += updated.count;
        // Soft delete duplicate client
        await prisma.client.update({
            where: { id: dup.id, businessId },
            data: { deletedAt: new Date(), deleteReason: 'Merged duplicate' }
        });
    }
    return { merged: true, primaryId: primary.id, mergedCount: others.length, mergedBookings };
}

// Restore all soft-deleted clients for a business
export async function bulkRestoreClients(businessId) {
    const result = await prisma.client.updateMany({
        where: { businessId, deletedAt: { not: null } },
        data: { deletedAt: null, deleteReason: null }
    });
    return result;
}
