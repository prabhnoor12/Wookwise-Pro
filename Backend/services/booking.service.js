import { prisma } from '../prisma/client.js';
import { formatInTimezone } from '../utils/date.utils.js';

// Create a new booking
export async function createBooking(data) {
    try {
        const booking = await prisma.booking.create({ data });
        // console.log('[BOOKING] Created booking:', booking.id);
        return booking;
    } catch (err) {
        console.error('[BOOKING] Error creating booking:', err);
        throw err;
    }
}

// Get booking by ID (optionally scoped by businessId)
export async function getBookingById(id, businessId = null) {
    try {
        if (businessId) {
            return await prisma.booking.findUnique({ where: { id: Number(id), businessId } });
        }
        return await prisma.booking.findUnique({ where: { id: Number(id) } });
    } catch (err) {
        console.error('[BOOKING] Error fetching booking by id:', err);
        throw err;
    }
}

// Update booking by ID
export async function updateBooking(id, data) {
    try {
        return await prisma.booking.update({
            where: { id: Number(id) },
            data
        });
    } catch (err) {
        console.error('[BOOKING] Error updating booking:', err);
        throw err;
    }
}

// Soft delete booking
export async function softDeleteBooking(id) {
    try {
        return await prisma.booking.update({
            where: { id: Number(id) },
            data: { deletedAt: new Date() }
        });
    } catch (err) {
        console.error('[BOOKING] Error soft deleting booking:', err);
        throw err;
    }
}

// Restore soft-deleted booking
export async function restoreBooking(id) {
    try {
        return await prisma.booking.update({
            where: { id: Number(id) },
            data: { deletedAt: null }
        });
    } catch (err) {
        console.error('[BOOKING] Error restoring booking:', err);
        throw err;
    }
}

// Get all bookings with optional filters and pagination, supports businessId
export async function getAllBookings({ page = 1, pageSize = 10, where = {}, orderBy = { createdAt: 'desc' }, businessId } = {}) {
    try {
        const skip = (Number(page) - 1) * Number(pageSize);
        const take = Number(pageSize);
        const whereClause = { ...where };
        if (businessId) whereClause.businessId = businessId;
        const bookings = await prisma.booking.findMany({
            where: whereClause,
            skip,
            take,
            orderBy
        });
        const total = await prisma.booking.count({ where: whereClause });
        return { data: bookings, page: Number(page), pageSize: Number(pageSize), total };
    } catch (err) {
        console.error('[BOOKING] Error fetching all bookings:', err);
        throw err;
    }
}

// Get bookings by user, supports businessId
export async function getBookingsByUser(userId, businessId = null) {
    try {
        const where = { userId: Number(userId), deletedAt: null };
        if (businessId) where.businessId = businessId;
        return await prisma.booking.findMany({
            where,
            orderBy: { date: 'asc' }
        });
    } catch (err) {
        console.error('[BOOKING] Error fetching bookings by user:', err);
        throw err;
    }
}

// Cancel a booking (sets status to 'CANCELLED')
export async function cancelBooking(id) {
    try {
        return await prisma.booking.update({
            where: { id: Number(id) },
            data: { status: 'CANCELLED' }
        });
    } catch (err) {
        console.error('[BOOKING] Error cancelling booking:', err);
        throw err;
    }
}

// Get upcoming bookings (optionally by user or business)
export async function getUpcomingBookings({ userId, businessId, from = new Date(), limit = 10 } = {}) {
    try {
        const where = {
            date: { gte: from },
            deletedAt: null
        };
        if (userId) where.userId = Number(userId);
        if (businessId) where.businessId = businessId;
        return await prisma.booking.findMany({
            where,
            orderBy: { date: 'asc' },
            take: limit
        });
    } catch (err) {
        console.error('[BOOKING] Error fetching upcoming bookings:', err);
        throw err;
    }
}

// Check for booking conflicts (overlapping bookings for a resource)
export async function hasBookingConflict({ resourceId, start, end, excludeBookingId = null }) {
    try {
        const where = {
            resourceId,
            deletedAt: null,
            OR: [
                {
                    start: { lt: end },
                    end: { gt: start }
                }
            ]
        };
        if (excludeBookingId) {
            where.id = { not: excludeBookingId };
        }
        const conflict = await prisma.booking.findFirst({ where });
        return !!conflict;
    } catch (err) {
        console.error('[BOOKING] Error checking booking conflict:', err);
        throw err;
    }
}

// Get bookings by status (e.g., 'CONFIRMED', 'CANCELLED', etc.)
export async function getBookingsByStatus(status, { businessId, userId, from, to } = {}) {
    try {
        const where = { status };
        if (businessId) where.businessId = businessId;
        if (userId) where.userId = Number(userId);
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = from;
            if (to) where.date.lte = to;
        }
        return await prisma.booking.findMany({
            where,
            orderBy: { date: 'asc' }
        });
    } catch (err) {
        console.error('[BOOKING] Error fetching bookings by status:', err);
        throw err;
    }
}

// Bulk soft delete bookings by user or business
export async function bulkSoftDeleteBookings({ userId, businessId }) {
    try {
        const where = {};
        if (userId) where.userId = Number(userId);
        if (businessId) where.businessId = businessId;
        const result = await prisma.booking.updateMany({
            where,
            data: { deletedAt: new Date() }
        });
        console.log(`[BOOKING] Bulk soft deleted bookings:`, result.count);
        return result;
    } catch (err) {
        console.error('[BOOKING] Error bulk soft deleting bookings:', err);
        throw err;
    }
}

// Restore all soft-deleted bookings for a user or business
export async function bulkRestoreBookings({ userId, businessId }) {
    try {
        const where = { deletedAt: { not: null } };
        if (userId) where.userId = Number(userId);
        if (businessId) where.businessId = businessId;
        const result = await prisma.booking.updateMany({
            where,
            data: { deletedAt: null }
        });
        console.log(`[BOOKING] Bulk restored bookings:`, result.count);
        return result;
    } catch (err) {
        console.error('[BOOKING] Error bulk restoring bookings:', err);
        throw err;
    }
}

// Add: Get bookings with flexible filters (advanced search)
export async function searchBookings({ filters = {}, page = 1, pageSize = 10, orderBy = { createdAt: 'desc' }, businessId } = {}) {
    try {
        const skip = (Number(page) - 1) * Number(pageSize);
        const take = Number(pageSize);
        const where = { ...filters };
        if (businessId) where.businessId = businessId;
        const bookings = await prisma.booking.findMany({
            where,
            skip,
            take,
            orderBy
        });
        const total = await prisma.booking.count({ where });
        return { data: bookings, page: Number(page), pageSize: Number(pageSize), total };
    } catch (err) {
        console.error('[BOOKING] Error searching bookings:', err);
        throw err;
    }
}

// Add: Get booking counts by status for dashboard/analytics
export async function getBookingStatusCounts({ businessId } = {}) {
    try {
        const where = { deletedAt: null };
        if (businessId) where.businessId = businessId;
        const statuses = ['CONFIRMED', 'CANCELLED', 'PENDING', 'COMPLETED'];
        const counts = {};
        for (const status of statuses) {
            counts[status] = await prisma.booking.count({ where: { ...where, status } });
        }
        counts.total = await prisma.booking.count({ where });
        return counts;
    } catch (err) {
        console.error('[BOOKING] Error getting booking status counts:', err);
        throw err;
    }
}

// Format booking date in a given timezone
export function formatBookingDate(booking, timezone = 'UTC') {
    return {
        ...booking,
        dateFormatted: formatInTimezone(booking.date, timezone)
    };
}
