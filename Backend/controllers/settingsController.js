import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Gracefully disconnect Prisma on process exit
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

// Helper: Validate setting input (basic example)
function validateSettingInput(data) {
    if (!data || typeof data.key !== 'string' || data.key.trim().length < 2) {
        return 'Setting key must be at least 2 characters';
    }
    if (typeof data.value === 'undefined') {
        return 'Setting value is required';
    }
    return null;
}

// Get all settings, with optional filter by key or group
export const getAllSettings = async (req, res) => {
    try {
        const { key, group } = req.query;
        const where = {
            ...(key && { key: { contains: key, mode: 'insensitive' } }),
            ...(group && { group: { equals: group } }),
        };
        const settings = await prisma.setting.findMany({ where });
        res.status(200).json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a single setting by ID or key
export const getSettingById = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { key } = req.query;
    if (isNaN(id) && !key) {
        return res.status(400).json({ message: 'Invalid ID or key required' });
    }
    try {
        let setting;
        if (!isNaN(id)) {
            setting = await prisma.setting.findUnique({ where: { id } });
        } else if (key) {
            setting = await prisma.setting.findFirst({ where: { key } });
        }
        if (!setting) {
            return res.status(404).json({ message: 'Setting not found' });
        }
        res.status(200).json(setting);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create a new setting with validation and duplicate key check
export const createSetting = async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'Request body is required' });
    }
    const validationError = validateSettingInput(req.body);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }
    try {
        // Prevent duplicate key
        const exists = await prisma.setting.findFirst({ where: { key: req.body.key } });
        if (exists) {
            return res.status(409).json({ message: 'Setting key already exists' });
        }
        const newSetting = await prisma.setting.create({
            data: req.body
        });
        res.status(201).json(newSetting);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Update a setting by ID or key
export const updateSetting = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { key } = req.query;
    if (isNaN(id) && !key) {
        return res.status(400).json({ message: 'Invalid ID or key required' });
    }
    try {
        let updatedSetting;
        if (!isNaN(id)) {
            updatedSetting = await prisma.setting.update({
                where: { id },
                data: req.body
            });
        } else if (key) {
            const setting = await prisma.setting.findFirst({ where: { key } });
            if (!setting) {
                return res.status(404).json({ message: 'Setting not found' });
            }
            updatedSetting = await prisma.setting.update({
                where: { id: setting.id },
                data: req.body
            });
        }
        res.status(200).json(updatedSetting);
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Setting not found' });
        }
        res.status(400).json({ message: err.message });
    }
};

// Delete a setting by ID or key
export const deleteSetting = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { key } = req.query;
    if (isNaN(id) && !key) {
        return res.status(400).json({ message: 'Invalid ID or key required' });
    }
    try {
        if (!isNaN(id)) {
            await prisma.setting.delete({ where: { id } });
        } else if (key) {
            const setting = await prisma.setting.findFirst({ where: { key } });
            if (!setting) {
                return res.status(404).json({ message: 'Setting not found' });
            }
            await prisma.setting.delete({ where: { id: setting.id } });
        }
        res.status(200).json({ message: 'Setting deleted' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Setting not found' });
        }
        res.status(500).json({ message: err.message });
    }
};

// Bulk update settings (by array of {id, value})
export const bulkUpdateSettings = async (req, res) => {
    const { updates } = req.body;
    if (!Array.isArray(updates) || !updates.length) {
        return res.status(400).json({ message: 'Array of updates required' });
    }
    try {
        const results = [];
        for (const u of updates) {
            if (!u.id || typeof u.value === 'undefined') continue;
            const updated = await prisma.setting.update({
                where: { id: u.id },
                data: { value: u.value }
            });
            results.push(updated);
        }
        res.json({ updated: results.length, results });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get settings by group
export const getSettingsByGroup = async (req, res) => {
    const { group } = req.params;
    if (!group) {
        return res.status(400).json({ message: 'Group is required' });
    }
    try {
        const settings = await prisma.setting.findMany({ where: { group } });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
