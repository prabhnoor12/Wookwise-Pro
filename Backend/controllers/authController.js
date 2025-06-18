import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client'; // Adjust path as needed

const prisma = new PrismaClient(); // <-- Add this if not present

// In-memory refresh token store (for demo; use DB/Redis in production)
const refreshTokens = new Set();

// Issue JWT and refresh token
function issueTokens(user) {
    const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    refreshTokens.add(refreshToken);
    return { token, refreshToken };
}

// Register a new user
export const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        const businessId = req.user?.businessId || req.body.businessId; // get from JWT or body
        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email, businessId } });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: { email, password: hashedPassword, businessId }
        });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        // Unique constraint violation (PostgreSQL)
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'Email already in use' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Authenticate middleware (JWT)
export const authenticate = (req, res, next) => {
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
};

// Login user (with refresh token)
export const login = async (req, res) => {
    try {
        const { email, password, businessId } = req.body;
        const user = await prisma.user.findUnique({ where: { email, businessId } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const { token, refreshToken } = issueTokens(user);
        res.json({ token, refreshToken });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Refresh JWT token
export const refresh = (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return res.status(401).json({ message: 'Invalid refresh token' });
    }
    try {
        const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const token = jwt.sign(
            { userId: payload.userId },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ token });
    } catch (err) {
        console.error('Refresh token error:', err);
        res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
};

// Logout user (for JWT, client just deletes token)
export const logout = (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

// Logout everywhere (revoke all refresh tokens for demo)
export const logoutAll = (req, res) => {
    refreshTokens.clear();
    res.json({ message: 'Logged out everywhere' });
};

// Change password (protected)
export const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const businessId = req.user.businessId;
        const { oldPassword, newPassword } = req.body;
        if (!newPassword || !isStrongPassword(newPassword)) {
            return res.status(400).json({ message: 'New password is too weak' });
        }
        const user = await prisma.user.findUnique({ where: { id: userId, businessId } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Old password incorrect' });
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: userId, businessId }, data: { password: hashed } });
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update user email (protected)
export const updateEmail = async (req, res) => {
    try {
        const userId = req.user.userId;
        const businessId = req.user.businessId;
        const { newEmail } = req.body;
        if (!isValidEmail(newEmail)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        const exists = await prisma.user.findUnique({ where: { email: newEmail, businessId } });
        if (exists) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        await prisma.user.update({ where: { id: userId, businessId }, data: { email: newEmail } });
        res.json({ message: 'Email updated successfully' });
    } catch (err) {
        console.error('Update email error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

// Helper: Validate email format
function isValidEmail(email) {
    // Simple regex for demonstration
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper: Validate password strength
function isStrongPassword(password) {
    // At least 8 chars, one letter, one number
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
}

//// Improved Register: validates email and password strength
export const improvedRegister = async (req, res) => {
    try {
        const { email, password, businessId } = req.body;

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Validate password strength
        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters, include a letter and a number.' });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email, businessId } });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: { email, password: hashedPassword, businessId }
        });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'Email already in use' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

export const me = async (req, res) => {
    try {
        const userId = req.user.userId;
        const businessId = req.user.businessId;
        const user = await prisma.user.findUnique({
            where: { id: userId, businessId },
            select: { id: true, email: true } // add more fields as needed
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
