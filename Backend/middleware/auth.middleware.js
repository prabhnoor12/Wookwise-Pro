// Authentication and authorization middleware

import jwt from 'jsonwebtoken';

// Middleware to authenticate JWT token
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

// Middleware to check for admin role
export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

// Middleware to check for specific roles
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
}

// Middleware to check if user matches the requested resource (or is admin)
export function requireSelfOrAdmin(paramKey = 'id') {
    return (req, res, next) => {
        const userId = req.user?.userId || req.user?.id;
        const paramId = req.params[paramKey];
        if (req.user?.role === 'ADMIN' || String(userId) === String(paramId)) {
            return next();
        }
        return res.status(403).json({ message: 'Access denied' });
    };
}

// Middleware to log authentication attempts (for audit)
export function logAuthAttempt(req, res, next) {
    const user = req.user ? req.user.email || req.user.id : 'anonymous';
    console.log(`[AUTH] User: ${user}, Path: ${req.path}, Time: ${new Date().toISOString()}`);
    next();
}
