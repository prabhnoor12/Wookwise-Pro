import { PrismaClient } from '@prisma/client';
import { Parser as CsvParser } from 'json2csv';

const prisma = new PrismaClient();

// Helper: Validate email format
function isValidEmail(email) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}

// Helper: Validate phone (simple)
function isValidPhone(phone) {
  return typeof phone === 'string' && phone.replace(/\D/g, '').length >= 7;
}

// Helper: Log errors
function logError(context, error) {
  console.error(`[${context}]`, error);
}

// List/search clients with pagination, filter, and sorting
export async function getClients(req, res) {
  try {
    const { page = 1, pageSize = 10, name, email, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const where = {
      deletedAt: null,
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(email && { email: { contains: email, mode: 'insensitive' } }),
    };
    const clients = await prisma.client.findMany({
      where,
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
      orderBy: { [sortBy]: sortOrder },
      select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true },
    });
    const total = await prisma.client.count({ where });
    res.json({ data: clients, page: Number(page), pageSize: Number(pageSize), total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients', details: error.message });
  }
}

// Create a new client (for booking) with duplicate phone check and audit fields
export async function createClient(req, res) {
  try {
    const { name, email, phone } = req.body;
    if (
      !name || typeof name !== 'string' || name.trim().length < 2 ||
      !email || typeof email !== 'string' || !/^[^@]+@[^@]+\.[^@]+$/.test(email)
    ) {
      return res.status(400).json({ error: 'Valid name and email are required' });
    }
    // Check for existing client by email or phone
    let client = await prisma.client.findFirst({
      where: {
        OR: [
          { email: email.trim().toLowerCase() },
          ...(phone ? [{ phone: phone.trim() }] : []),
        ],
      },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
        },
      });
    }
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create client', details: error.message });
  }
}

// Get client info by ID (with created/updated timestamps)
export async function getClientById(req, res) {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      select: { id: true, name: true, email: true, phone: true, deletedAt: true, createdAt: true, updatedAt: true },
    });
    if (!client || client.deletedAt) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client', details: error.message });
  }
}

// Update client info with audit and phone duplicate check
export async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;
    const client = await prisma.client.findUnique({ where: { id: Number(id) } });
    if (!client || client.deletedAt) {
      return res.status(404).json({ error: 'Client not found' });
    }
    // Prevent duplicate email or phone
    if ((email && email !== client.email) || (phone && phone !== client.phone)) {
      const exists = await prisma.client.findFirst({
        where: {
          id: { not: Number(id) },
          OR: [
            ...(email ? [{ email: email.trim().toLowerCase() }] : []),
            ...(phone ? [{ phone: phone.trim() }] : []),
          ],
        },
      });
      if (exists) {
        return res.status(409).json({ error: 'Email or phone already in use' });
      }
    }
    const updated = await prisma.client.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(email && { email: email.trim().toLowerCase() }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
      },
      select: { id: true, name: true, email: true, phone: true, updatedAt: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client', details: error.message });
  }
}

// Soft delete a client (with reason support)
export async function deleteClient(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const client = await prisma.client.findUnique({ where: { id: Number(id) } });
    if (!client || client.deletedAt) {
      return res.status(404).json({ error: 'Client not found' });
    }
    await prisma.client.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date(), deleteReason: reason || null },
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client', details: error.message });
  }
}

// Restore a soft-deleted client
export async function restoreClient(req, res) {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({ where: { id: Number(id) } });
    if (!client || !client.deletedAt) {
      return res.status(404).json({ error: 'Client not found or not deleted' });
    }
    const restored = await prisma.client.update({
      where: { id: Number(id) },
      data: { deletedAt: null, deleteReason: null },
      select: { id: true, name: true, email: true, phone: true, updatedAt: true },
    });
    res.json(restored);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore client', details: error.message });
  }
}

// Get all deleted clients (for admin restore/audit)
export async function getDeletedClients(req, res) {
  try {
    const { page = 1, pageSize = 10, sortBy = 'deletedAt', sortOrder = 'desc' } = req.query;
    const clients = await prisma.client.findMany({
      where: { deletedAt: { not: null } },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
      orderBy: { [sortBy]: sortOrder },
      select: { id: true, name: true, email: true, phone: true, deletedAt: true, deleteReason: true },
    });
    const total = await prisma.client.count({ where: { deletedAt: { not: null } } });
    res.json({ data: clients, page: Number(page), pageSize: Number(pageSize), total });
  } catch (error) {
    logError('getDeletedClients', error);
    res.status(500).json({ error: 'Failed to fetch deleted clients', details: error.message });
  }
}

// Search clients by phone (partial match)
export async function searchClientsByPhone(req, res) {
  try {
    const { phone } = req.query;
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Valid phone is required' });
    }
    const clients = await prisma.client.findMany({
      where: {
        phone: { contains: phone, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true, name: true, email: true, phone: true },
    });
    res.json(clients);
  } catch (error) {
    logError('searchClientsByPhone', error);
    res.status(500).json({ error: 'Failed to search clients', details: error.message });
  }
}

// Bulk import clients (array of {name, email, phone})
export async function bulkImportClients(req, res) {
  try {
    const { clients } = req.body;
    if (!Array.isArray(clients) || !clients.length) {
      return res.status(400).json({ error: 'Array of clients required' });
    }
    const results = [];
    for (const c of clients) {
      if (!c.name || !isValidEmail(c.email)) {
        results.push({ ...c, status: 'invalid' });
        continue;
      }
      try {
        let client = await prisma.client.findFirst({
          where: {
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
    res.json({ imported: results.length, results });
  } catch (error) {
    logError('bulkImportClients', error);
    res.status(500).json({ error: 'Failed to import clients', details: error.message });
  }
}

// Export clients as CSV
export async function exportClientsCsv(req, res) {
  try {
    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true },
    });
    const parser = new CsvParser({ fields: ['id', 'name', 'email', 'phone', 'createdAt', 'updatedAt'] });
    const csv = parser.parse(clients);
    res.header('Content-Type', 'text/csv');
    res.attachment('clients.csv');
    res.send(csv);
  } catch (error) {
    logError('exportClientsCsv', error);
    res.status(500).json({ error: 'Failed to export clients', details: error.message });
  }
}

// Get all bookings for a client
export async function getClientBookings(req, res) {
  try {
    const { id } = req.params;
    const bookings = await prisma.booking.findMany({
      where: { clientId: Number(id), deletedAt: null },
      orderBy: { date: 'desc' },
      select: { id: true, date: true, status: true, createdAt: true, serviceId: true },
    });
    res.json(bookings);
  } catch (error) {
    logError('getClientBookings', error);
    res.status(500).json({ error: 'Failed to fetch client bookings', details: error.message });
  }
}

// Improved createClient with better validation and logging
export async function improvedCreateClient(req, res) {
  try {
    const { name, email, phone } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    let client = await prisma.client.findFirst({
      where: {
        OR: [
          { email: email.trim().toLowerCase() },
          ...(phone ? [{ phone: phone.trim() }] : []),
        ],
      },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
        },
      });
    }
    res.status(201).json(client);
  } catch (error) {
    logError('improvedCreateClient', error);
    res.status(500).json({ error: 'Failed to create client', details: error.message });
  }
}
