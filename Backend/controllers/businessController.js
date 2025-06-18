import { PrismaClient } from '../generated/prisma/index.js';
const prisma = new PrismaClient();

// Get all businesses (optionally scoped to current tenant)
export async function getAllBusinesses(req, res) {
  try {
    const businesses = await prisma.business.findMany();
    res.json(businesses);
  } catch (err) {
    console.error('[BusinessController] Error fetching all businesses:', err);
    res.status(500).json({ message: err.message });
  }
}

// Get a single business by ID (scoped to tenant)
export async function getBusinessById(req, res) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!business) {
      console.warn(`[BusinessController] Business not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Business not found' });
    }
    res.json(business);
  } catch (err) {
    console.error('[BusinessController] Error fetching business by id:', err);
    res.status(500).json({ message: err.message });
  }
}

// Create a new business
export async function createBusiness(req, res) {
  try {
    const newBusiness = await prisma.business.create({
      data: req.body,
    });
    res.status(201).json(newBusiness);
  } catch (err) {
    console.error('[BusinessController] Error creating business:', err);
    res.status(400).json({ message: err.message });
  }
}

// Update a business
export async function updateBusiness(req, res) {
  try {
    const updatedBusiness = await prisma.business.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(updatedBusiness);
  } catch (err) {
    console.error('[BusinessController] Error updating business:', err);
    res.status(400).json({ message: err.message });
  }
}

// Delete a business
export async function deleteBusiness(req, res) {
  try {
    await prisma.business.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: 'Business deleted' });
  } catch (err) {
    console.error('[BusinessController] Error deleting business:', err);
    res.status(500).json({ message: err.message });
  }
}
