import { PrismaClient } from '@prisma/client';
import { DateTime, Interval } from 'luxon';
import { formatInTimezone } from '../utils/date.utils.js';

const prisma = new PrismaClient();

// Helper: Parse pagination and sorting params safely
function parsePaginationAndSorting(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 10));
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { page, pageSize, sortBy, sortOrder };
}

// Helper: Validate booking input
function validateBookingInput({ userId, date, startTime, endTime }) {
  if (!userId || !date) return 'userId and date are required';
  if (startTime && endTime && DateTime.fromISO(endTime) <= DateTime.fromISO(startTime)) {
    return 'endTime must be after startTime';
  }
  return null;
}

// Get all bookings with pagination, filtering, and sorting
export async function getAllBookings(req, res) {
  try {
    const { userId, status } = req.query;
    const { page, pageSize, sortBy, sortOrder } = parsePaginationAndSorting(req.query);
    const businessId = req.user.businessId;
    const userTimezone = req.user.timezone || 'UTC';

    const where = {
      deletedAt: null,
      businessId,
      ...(userId && { userId: Number(userId) }),
      ...(status && { status }),
    };

    const bookings = await prisma.booking.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    // Format booking dates in user's timezone
    const bookingsWithTz = bookings.map(b => ({
      ...b,
      dateFormatted: formatInTimezone(b.date, userTimezone)
    }));

    const total = await prisma.booking.count({ where });

    res.json({
      data: bookingsWithTz,
      page,
      pageSize,
      total,
    });
  } catch (error) {
    console.error('getAllBookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
}

// Create a new booking with validation and duplicate check
export async function createBooking(req, res) {
  try {
    const { userId, date, startTime, endTime, ...rest } = req.body;
    const businessId = req.user.businessId;
    const validationError = validateBookingInput({ userId, date, startTime, endTime });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    // Prevent duplicate booking for same user/date/time
    const existing = await prisma.booking.findFirst({
      where: {
        userId,
        date,
        startTime,
        deletedAt: null,
        businessId,
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'Booking already exists for this slot' });
    }
    const booking = await prisma.booking.create({
      data: { userId, date, startTime, endTime, businessId, ...rest },
    });
    res.status(201).json(booking);
  } catch (error) {
    console.error('createBooking error:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
}

// Get a booking by ID
export async function getBookingById(req, res) {
  try {
    const businessId = req.user.businessId;
    const booking = await prisma.booking.findUnique({
      where: { id: Number(req.params.id), businessId },
    });
    if (!booking || booking.deletedAt) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('getBookingById error:', error);
    res.status(500).json({ error: 'Failed to fetch booking', details: error.message });
  }
}

// Update a booking with validation
export async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const data = req.body;
    if (data.id) delete data.id; // Prevent changing primary key
    if (data.startTime && data.endTime && DateTime.fromISO(data.endTime) <= DateTime.fromISO(data.startTime)) {
      return res.status(400).json({ error: 'endTime must be after startTime' });
    }
    const booking = await prisma.booking.update({
      where: { id: Number(id), businessId },
      data,
    });
    res.json(booking);
  } catch (error) {
    console.error('updateBooking error:', error);
    res.status(500).json({ error: 'Failed to update booking', details: error.message });
  }
}

// Soft delete a booking (set deletedAt)
export async function deleteBooking(req, res) {
  try {
    const businessId = req.user.businessId;
    await prisma.booking.update({
      where: { id: Number(req.params.id), businessId },
      data: { deletedAt: new Date() },
    });
    res.status(204).end();
  } catch (error) {
    console.error('deleteBooking error:', error);
    res.status(500).json({ error: 'Failed to delete booking', details: error.message });
  }
}

// Restore a soft-deleted booking
export async function restoreBooking(req, res) {
  try {
    const businessId = req.user.businessId;
    const booking = await prisma.booking.update({
      where: { id: Number(req.params.id), businessId },
      data: { deletedAt: null },
    });
    res.json(booking);
  } catch (error) {
    console.error('restoreBooking error:', error);
    res.status(500).json({ error: 'Failed to restore booking', details: error.message });
  }
}

// Get bookings by user
export async function getBookingsByUser(req, res) {
  try {
    const { userId } = req.params;
    const businessId = req.user.businessId;
    const bookings = await prisma.booking.findMany({
      where: { userId: Number(userId), deletedAt: null, businessId },
      orderBy: { date: 'asc' },
    });
    res.json(bookings);
  } catch (error) {
    console.error('getBookingsByUser error:', error);
    res.status(500).json({ error: 'Failed to fetch user bookings', details: error.message });
  }
}

// Get upcoming bookings for a user (future only)
export async function getUpcomingBookingsByUser(req, res) {
  try {
    const { userId } = req.params;
    const businessId = req.user.businessId;
    const now = DateTime.now().toISODate();
    const bookings = await prisma.booking.findMany({
      where: {
        userId: Number(userId),
        deletedAt: null,
        date: { gte: now },
        businessId,
      },
      orderBy: { date: 'asc' },
    });
    res.json(bookings);
  } catch (error) {
    console.error('getUpcomingBookingsByUser error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming bookings', details: error.message });
  }
}

// Cancel a booking (set status to 'cancelled')
export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const booking = await prisma.booking.update({
      where: { id: Number(id), businessId },
      data: { status: 'cancelled' },
    });
    res.json(booking);
  } catch (error) {
    console.error('cancelBooking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking', details: error.message });
  }
}

// Helper: Check if a slot is bookable for a user (enforces per-user/day limits)
async function canUserBookSlot(userId, date, maxPerDay = 1, businessId) {
  const count = await prisma.booking.count({
    where: {
      userId: Number(userId),
      date,
      deletedAt: null,
      businessId,
    },
  });
  return count < maxPerDay;
}

// Enhanced: Get available time slots for a given date, service, and timezone
export async function getAvailableTimeSlots(req, res) {
  try {
    const {
      date,
      serviceId,
      timezone = 'UTC',
      slotMinutes = 15,
      userId,
      minAdvanceMinutes = 60,
      maxDaysInFuture = 90,
    } = req.query;
    if (!date || !serviceId) {
      return res.status(400).json({ error: 'date and serviceId are required' });
    }
    const businessId = req.user.businessId;

    // Enforce advance and future booking window
    const now = DateTime.now().setZone(timezone);
    const slotDay = DateTime.fromISO(date, { zone: timezone });
    if (slotDay < now.plus({ minutes: Number(minAdvanceMinutes) }).startOf('day')) {
      return res.status(400).json({ error: 'Cannot book with insufficient advance notice' });
    }
    if (slotDay > now.plus({ days: Number(maxDaysInFuture) })) {
      return res.status(400).json({ error: 'Cannot book this far in advance' });
    }

    // Fetch service duration, buffer, group size, blackout
    const service = await prisma.service.findUnique({
      where: { id: Number(serviceId), businessId },
      select: {
        durationMinutes: true,
        bufferMinutes: true,
        groupSize: true,
        maxBookingsPerUserPerDay: true,
        blackoutPeriods: true, // [{startTime, endTime}]
      },
    });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Fetch recurring and exception availabilities for the weekday and date
    const weekday = slotDay.weekday;
    const [recurringAvail, exceptions] = await Promise.all([
      prisma.availability.findMany({
        where: { weekday, businessId },
        select: { startTime: true, endTime: true },
      }),
      prisma.availabilityException.findMany({
        where: { date, businessId },
        select: { startTime: true, endTime: true, isAvailable: true },
      }),
    ]);

    // Merge availabilities, applying exceptions (e.g., holidays, overrides)
    let availabilities = recurringAvail;
    if (exceptions.length) {
      availabilities = exceptions.filter(e => e.isAvailable)
        .map(e => ({ startTime: e.startTime, endTime: e.endTime }));
      if (!availabilities.length) return res.json({ slots: [], timezone, slotDuration: service.durationMinutes, buffer: service.bufferMinutes });
    }

    // Apply blackout periods (per-service or per-day)
    let blackoutPeriods = [];
    if (service.blackoutPeriods && service.blackoutPeriods.length) {
      blackoutPeriods = service.blackoutPeriods.map(b => ({
        start: DateTime.fromISO(`${date}T${b.startTime}`, { zone: timezone }),
        end: DateTime.fromISO(`${date}T${b.endTime}`, { zone: timezone }),
      }));
    }

    // Fetch all bookings for the day
    const bookings = await prisma.booking.findMany({
      where: {
        date,
        serviceId: Number(serviceId),
        deletedAt: null,
        businessId,
      },
      select: { startTime: true, endTime: true, groupCount: true },
    });

    // Build slots with custom granularity and metadata
    const slots = [];
    const slotLabels = [];
    let nextAvailableSlot = null;
    for (const avail of availabilities) {
      let slotStart = DateTime.fromISO(`${date}T${avail.startTime}`, { zone: timezone });
      const availEnd = DateTime.fromISO(`${date}T${avail.endTime}`, { zone: timezone });

      while (slotStart.plus({ minutes: service.durationMinutes }).plus({ minutes: service.bufferMinutes }) <= availEnd) {
        const slotEnd = slotStart.plus({ minutes: service.durationMinutes });

        // Skip if slot is in a blackout period
        const inBlackout = blackoutPeriods.some(bp =>
          Interval.fromDateTimes(bp.start, bp.end).overlaps(Interval.fromDateTimes(slotStart, slotEnd))
        );
        if (inBlackout) {
          slotStart = slotStart.plus({ minutes: Number(slotMinutes) });
          continue;
        }

        // Skip if slot is in the past or before minAdvance
        if (slotEnd < now.plus({ minutes: Number(minAdvanceMinutes) })) {
          slotStart = slotStart.plus({ minutes: Number(slotMinutes) });
          continue;
        }

        // Check for group bookings (partially booked slots)
        let overlappingBookings = bookings.filter(b => {
          const bStart = DateTime.fromISO(`${date}T${b.startTime}`, { zone: timezone });
          const bEnd = DateTime.fromISO(`${date}T${b.endTime}`, { zone: timezone });
          return slotStart < bEnd.plus({ minutes: service.bufferMinutes }) &&
                 slotEnd.plus({ minutes: service.bufferMinutes }) > bStart;
        });

        let isBookable = true;
        let reason = '';
        let bookedCount = 0;
        if (overlappingBookings.length) {
          bookedCount = overlappingBookings.reduce((sum, b) => sum + (b.groupCount || 1), 0);
          if (!service.groupSize || bookedCount >= service.groupSize) {
            isBookable = false;
            reason = 'Fully booked';
          } else {
            reason = `Partially booked (${bookedCount}/${service.groupSize})`;
          }
        }

        // Per-user/day booking limit
        if (userId && isBookable && service.maxBookingsPerUserPerDay) {
          const canBook = await canUserBookSlot(userId, date, service.maxBookingsPerUserPerDay, businessId);
          if (!canBook) {
            isBookable = false;
            reason = 'User booking limit reached for this day';
          }
        }

        // Slot label
        let label = '';
        const hour = slotStart.hour;
        if (hour < 12) label = 'Morning';
        else if (hour < 17) label = 'Afternoon';
        else label = 'Evening';
        slotLabels.push(label);

        const slotObj = {
          startLocal: slotStart.toISO({ suppressMilliseconds: true }),
          endLocal: slotEnd.toISO({ suppressMilliseconds: true }),
          startUTC: slotStart.toUTC().toISO({ suppressMilliseconds: true }),
          endUTC: slotEnd.toUTC().toISO({ suppressMilliseconds: true }),
          isBookable,
          reason,
          bookedCount,
          label,
        };

        if (isBookable && !nextAvailableSlot) nextAvailableSlot = slotObj;

        slots.push(slotObj);

        slotStart = slotStart.plus({ minutes: Number(slotMinutes) });
      }
    }

    // Optionally, add all-day and multi-day events (e.g., holidays, business closures)
    const allDayEvents = exceptions.filter(e => !e.startTime && !e.endTime && !e.isAvailable)
      .map(e => ({
        type: 'all-day',
        date,
        isBookable: false,
        reason: 'Business closed',
      }));

    res.json({
      slots,
      allDayEvents,
      timezone,
      slotDuration: service.durationMinutes,
      buffer: service.bufferMinutes,
      slotLabels: Array.from(new Set(slotLabels)),
      nextAvailableSlot,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get available slots', details: error.message });
  }
}
