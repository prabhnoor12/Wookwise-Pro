import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all users with pagination and optional filtering
export async function getAllUsers(req, res) {
    try {
        const { page = 1, pageSize = 20, email, role } = req.query;
        const businessId = req.user.businessId;
        const where = {
            businessId,
            ...(email && { email: { contains: email, mode: 'insensitive' } }),
            ...(role && { role }),
        };
        const users = await prisma.user.findMany({
            where,
            skip: (Number(page) - 1) * Number(pageSize),
            take: Number(pageSize),
            orderBy: { createdAt: 'desc' },
            select: { id: true, email: true, role: true, createdAt: true, updatedAt: true }
        });
        const total = await prisma.user.count({ where });
        res.json({ data: users, page: Number(page), pageSize: Number(pageSize), total });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
}

// Get a single user by ID (include timezone)
export async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const user = await prisma.user.findUnique({
            where: { id: Number(id), businessId },
            select: { id: true, email: true, role: true, timezone: true, createdAt: true, updatedAt: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user', details: error.message });
    }
}

// Update user info (email, role, timezone)
export async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { email, role, timezone } = req.body;
        const businessId = req.user.businessId;
        const user = await prisma.user.findUnique({ where: { id: Number(id), businessId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Prevent duplicate email
        if (email && email !== user.email) {
            const exists = await prisma.user.findUnique({ where: { email, businessId } });
            if (exists) {
                return res.status(409).json({ error: 'Email already in use' });
            }
        }
        const updated = await prisma.user.update({
            where: { id: Number(id), businessId },
            data: {
                ...(email && { email }),
                ...(role && { role }),
                ...(timezone && { timezone }),
            },
            select: { id: true, email: true, role: true, timezone: true, updatedAt: true }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
}

// Delete a user (soft delete by setting deletedAt)
export async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const user = await prisma.user.findUnique({ where: { id: Number(id), businessId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await prisma.user.update({
            where: { id: Number(id), businessId },
            data: { deletedAt: new Date() }
        });
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
}

// Restore a soft-deleted user
export async function restoreUser(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const user = await prisma.user.findUnique({ where: { id: Number(id), businessId } });
        if (!user || !user.deletedAt) {
            return res.status(404).json({ error: 'User not found or not deleted' });
        }
        const restored = await prisma.user.update({
            where: { id: Number(id), businessId },
            data: { deletedAt: null }
        });
        res.json(restored);
    } catch (error) {
        res.status(500).json({ error: 'Failed to restore user', details: error.message });
    }
}

// Change user password (admin action)
export async function changeUserPassword(req, res) {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }
        const businessId = req.user.businessId;
        const user = await prisma.user.findUnique({ where: { id: Number(id), businessId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Hash password with bcryptjs
        const bcrypt = await import('bcryptjs');
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: Number(id), businessId },
            data: { password: hashed }
        });
        res.json({ message: 'Password updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change password', details: error.message });
    }
}

// Get all deleted users (for admin restore/audit)
export async function getDeletedUsers(req, res) {
    try {
        const { page = 1, pageSize = 20 } = req.query;
        const businessId = req.user.businessId;
        const users = await prisma.user.findMany({
            where: { deletedAt: { not: null }, businessId },
            skip: (Number(page) - 1) * Number(pageSize),
            take: Number(pageSize),
            orderBy: { deletedAt: 'desc' },
            select: { id: true, email: true, role: true, deletedAt: true }
        });
        const total = await prisma.user.count({ where: { deletedAt: { not: null }, businessId } });
        res.json({ data: users, page: Number(page), pageSize: Number(pageSize), total });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch deleted users', details: error.message });
    }
}

// Search users by email (partial match)
export async function searchUsersByEmail(req, res) {
    try {
        const { email } = req.query;
        if (!email || typeof email !== 'string' || email.length < 2) {
            return res.status(400).json({ error: 'Email query required' });
        }
        const businessId = req.user.businessId;
        const users = await prisma.user.findMany({
            where: {
                email: { contains: email, mode: 'insensitive' },
                deletedAt: null,
                businessId,
            },
            select: { id: true, email: true, role: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to search users', details: error.message });
    }
}

// Get user activity (last 10 bookings)
export async function getUserActivity(req, res) {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const bookings = await prisma.booking.findMany({
            where: { userId: Number(id), deletedAt: null, businessId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, date: true, status: true, serviceId: true, createdAt: true }
        });
        res.json({ bookings });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user activity', details: error.message });
    }
}
