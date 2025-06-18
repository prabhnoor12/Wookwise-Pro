import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: Validate service input
function validateServiceInput({ name, durationMinutes, price }) {
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return 'Service name must be at least 2 characters';
  }
  if (!durationMinutes || isNaN(Number(durationMinutes)) || Number(durationMinutes) <= 0) {
    return 'Valid durationMinutes is required';
  }
  if (price !== undefined && price !== null && (isNaN(Number(price)) || Number(price) < 0)) {
    return 'Price must be a positive number';
  }
  return null;
}

// Get all services, with optional name/category filter and pagination
export async function getAllServices(req, res) {
  try {
    const { name, category, page = 1, pageSize = 20, active } = req.query;
    const businessId = req.user.businessId;
    const where = {
      deletedAt: null,
      businessId,
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(category && { category: { contains: category, mode: 'insensitive' } }),
      ...(active !== undefined && { active: active === 'true' }),
    };
    const services = await prisma.service.findMany({
      where,
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        price: true,
        category: true,
        description: true,
        active: true,
        buffer: true,
      },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
      orderBy: { name: 'asc' },
    });
    const total = await prisma.service.count({ where });
    res.json({ data: services, page: Number(page), pageSize: Number(pageSize), total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services', details: error.message });
  }
}

// Get a single service by ID (with provider info if available)
export async function getServiceById(req, res) {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const service = await prisma.service.findUnique({
      where: { id: Number(id), businessId },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        price: true,
        category: true,
        description: true,
        active: true,
        buffer: true,
        deletedAt: true,
        provider: { select: { id: true, name: true, timezone: true } }
      },
    });
    if (!service || service.deletedAt) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service', details: error.message });
  }
}

// Create a new service with validation and duplicate name check
export async function createService(req, res) {
  try {
    const { name, durationMinutes, price, category, description, active, buffer, providerId } = req.body;
    const businessId = req.user.businessId;
    const validationError = validateServiceInput({ name, durationMinutes, price });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    // Prevent duplicate names
    const exists = await prisma.service.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null, businessId },
    });
    if (exists) {
      return res.status(409).json({ error: 'Service name already exists' });
    }
    const service = await prisma.service.create({
      data: {
        name: name.trim(),
        durationMinutes: Number(durationMinutes),
        price: price !== undefined && price !== null ? Number(price) : null,
        category: category !== undefined ? category : null,
        description: description !== undefined ? description : null,
        active: typeof active === 'boolean' ? active : true,
        buffer: buffer !== undefined && buffer !== null ? Number(buffer) : null,
        ...(providerId && { providerId: Number(providerId) }),
        businessId,
      },
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service', details: error.message });
  }
}

// Update a service with validation and audit
export async function updateService(req, res) {
  try {
    const { id } = req.params;
    const { name, durationMinutes, price, category, description, active, buffer, providerId } = req.body;
    const businessId = req.user.businessId;
    const service = await prisma.service.findUnique({ where: { id: Number(id), businessId } });
    if (!service || service.deletedAt) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (name && name !== service.name) {
      const exists = await prisma.service.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: Number(id) }, deletedAt: null, businessId },
      });
      if (exists) {
        return res.status(409).json({ error: 'Service name already exists' });
      }
    }
    const validationError = validateServiceInput({ name: name || service.name, durationMinutes: durationMinutes || service.durationMinutes, price: price !== undefined ? price : service.price });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    const updated = await prisma.service.update({
      where: { id: Number(id), businessId },
      data: {
        ...(name && { name: name.trim() }),
        ...(durationMinutes && { durationMinutes: Number(durationMinutes) }),
        ...(price !== undefined && { price: price !== null ? Number(price) : null }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
        ...(buffer !== undefined && { buffer: buffer !== null ? Number(buffer) : null }),
        ...(providerId && { providerId: Number(providerId) }),
        updatedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service', details: error.message });
  }
}

// Soft delete a service
export async function deleteService(req, res) {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const service = await prisma.service.findUnique({ where: { id: Number(id), businessId } });
    if (!service || service.deletedAt) {
      return res.status(404).json({ error: 'Service not found' });
    }
    await prisma.service.update({
      where: { id: Number(id), businessId },
      data: { deletedAt: new Date() },
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service', details: error.message });
  }
}

// Restore a soft-deleted service
export async function restoreService(req, res) {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const service = await prisma.service.findUnique({ where: { id: Number(id), businessId } });
    if (!service || !service.deletedAt) {
      return res.status(404).json({ error: 'Service not found or not deleted' });
    }
    const restored = await prisma.service.update({
      where: { id: Number(id), businessId },
      data: { deletedAt: null },
    });
    res.json(restored);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore service', details: error.message });
  }
}

// Archive or unarchive a service
export async function setServiceArchived(req, res) {
  try {
    const { id } = req.params;
    const { archived } = req.body;
    if (typeof archived !== 'boolean') {
      return res.status(400).json({ error: 'archived (boolean) is required' });
    }
    const businessId = req.user.businessId;
    const service = await prisma.service.findUnique({ where: { id: Number(id), businessId } });
    if (!service || service.deletedAt) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const updated = await prisma.service.update({
      where: { id: Number(id), businessId },
      data: { archived },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update archive status', details: error.message });
  }
}

// --- Provider Setup Panel Features ---

// Set or update provider working hours and timezone
export async function setProviderAvailability(req, res) {
  try {
    const { providerId, timezone, availability } = req.body;
    const businessId = req.user.businessId;
    // availability: [{ weekday: 1-7, startTime: '09:00', endTime: '17:00' }, ...]
    if (!providerId || !timezone || !Array.isArray(availability)) {
      return res.status(400).json({ error: 'providerId, timezone, and availability are required' });
    }
    // Save timezone (assume provider table exists)
    await prisma.provider.update({
      where: { id: Number(providerId), businessId },
      data: { timezone: timezone || 'UTC' },
    });
    // Remove old and add new availability
    await prisma.availability.deleteMany({ where: { providerId: Number(providerId), businessId } });
    await prisma.availability.createMany({
      data: availability.map(a => ({
        providerId: Number(providerId),
        businessId,
        weekday: a.weekday,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    });
    res.json({ message: 'Availability and timezone updated', timezone: timezone || 'UTC' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set availability', details: error.message });
  }
}

// Add or update provider breaks (e.g., lunch)
export async function setProviderBreaks(req, res) {
  try {
    const { providerId, breaks } = req.body;
    const businessId = req.user.businessId;
    // breaks: [{ weekday: 1-7, startTime: '12:00', endTime: '13:00' }, ...]
    if (!providerId || !Array.isArray(breaks)) {
      return res.status(400).json({ error: 'providerId and breaks are required' });
    }
    // Remove old and add new breaks
    await prisma.break.deleteMany({ where: { providerId: Number(providerId), businessId } });
    await prisma.break.createMany({
      data: breaks.map(b => ({
        providerId: Number(providerId),
        businessId,
        weekday: b.weekday,
        startTime: b.startTime,
        endTime: b.endTime,
      })),
    });
    res.json({ message: 'Breaks updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set breaks', details: error.message });
  }
}

// Get provider setup panel data (services, availability, breaks, timezone, upcoming bookings)
export async function getProviderSetupPanel(req, res) {
  try {
    const { providerId } = req.params;
    const businessId = req.user.businessId;
    if (!providerId) {
      return res.status(400).json({ error: 'providerId is required' });
    }
    const [services, provider, availability, breaks, upcomingBookings] = await Promise.all([
      prisma.service.findMany({
        where: { providerId: Number(providerId), deletedAt: null, businessId },
        orderBy: { name: 'asc' },
      }),
      prisma.provider.findUnique({
        where: { id: Number(providerId), businessId },
        select: { id: true, name: true, timezone: true },
      }),
      prisma.availability.findMany({
        where: { providerId: Number(providerId), businessId },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.break.findMany({
        where: { providerId: Number(providerId), businessId },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.booking.findMany({
        where: {
          providerId: Number(providerId),
          deletedAt: null,
          date: { gte: new Date() },
          businessId,
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 10,
        include: {
          client: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, name: true } },
        },
      }),
    ]);
    res.json({
      provider,
      timezone: provider?.timezone || 'UTC',
      services,
      availability,
      breaks,
      upcomingBookings,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch setup panel data', details: error.message });
  }
}
