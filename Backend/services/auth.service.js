import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client.js';

// Hash a password
export async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// Compare a plain password to a hash
export async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(payload, expiresIn = '1h') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// Generate JWT refresh token
export function generateRefreshToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn });
}

// Verify JWT token with error handling
export function verifyToken(token, opts = {}) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET, opts);
    } catch (err) {
        console.warn('[AUTH] Invalid token:', err.message);
        return null;
    }
}

// Verify refresh token
export function verifyRefreshToken(token, opts = {}) {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, opts);
    } catch (err) {
        console.warn('[AUTH] Invalid refresh token:', err.message);
        return null;
    }
}

// Find user by email
export async function findUserByEmail(email) {
    return await prisma.user.findUnique({ where: { email } });
}

// Create a new user
export async function createUser({ email, password, ...rest }) {
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
        data: { email, password: hashedPassword, ...rest }
    });
    console.log('[AUTH] Created user:', user.id);
    return user;
}

// Update user password
export async function updateUserPassword(userId, newPassword) {
    const hashed = await hashPassword(newPassword);
    const user = await prisma.user.update({
        where: { id: userId },
        data: { password: hashed }
    });
    console.log('[AUTH] Updated password for user:', userId);
    return user;
}

// Update user email
export async function updateUserEmail(userId, newEmail) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail }
    });
    console.log('[AUTH] Updated email for user:', userId);
    return user;
}

// Find user by ID
export async function findUserById(id) {
    return await prisma.user.findUnique({ where: { id: Number(id) } });
}

// Soft delete user
export async function softDeleteUser(id) {
    const user = await prisma.user.update({
        where: { id: Number(id) },
        data: { deletedAt: new Date() }
    });
    console.log('[AUTH] Soft deleted user:', id);
    return user;
}

// Restore soft-deleted user
export async function restoreUser(id) {
    const user = await prisma.user.update({
        where: { id: Number(id) },
        data: { deletedAt: null }
    });
    console.log('[AUTH] Restored user:', id);
    return user;
}

// Check if user has a specific role
export function userHasRole(user, ...roles) {
    return user && roles.includes(user.role);
}

// Check if user is soft-deleted
export function isUserDeleted(user) {
    return !!user?.deletedAt;
}

// Get all roles for a user (if roles is an array)
export function getUserRoles(user) {
    if (!user) return [];
    if (Array.isArray(user.roles)) return user.roles;
    if (user.role) return [user.role];
    return [];
}

// ...existing code...
