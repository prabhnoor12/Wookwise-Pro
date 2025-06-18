import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get dashboard summary: upcoming bookings, recent clients, stats, and recent cancellations
export async function getDashboardSummary(req, res) {
  try {
    // Upcoming bookings (next 7 days, not deleted, ordered by soonest)
    const now = new Date();
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        date: { gte: now, lte: sevenDaysLater },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 10,
      include: {
        client: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true } },
      },
    });

    // Recent clients (last 10, not deleted)
    const recentClients = await prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });

    // Booking stats: total, today, this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const totalBookings = await prisma.booking.count({ where: { deletedAt: null } });
    const todayBookings = await prisma.booking.count({
      where: { deletedAt: null, date: today }
    });
    const weekBookings = await prisma.booking.count({
      where: {
        deletedAt: null,
        date: { gte: weekStart, lte: sevenDaysLater }
      }
    });

    // Recent cancellations (last 5)
    const recentCancellations = await prisma.booking.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      take: 5,
      include: {
        client: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true } },
      },
    });

    // Most popular services (top 3)
    const popularServices = await prisma.booking.groupBy({
      by: ['serviceId'],
      where: { deletedAt: null },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 3,
    });
    const serviceDetails = await prisma.service.findMany({
      where: { id: { in: popularServices.map(s => s.serviceId) } },
      select: { id: true, name: true }
    });
    const popularServiceStats = popularServices.map(s => ({
      service: serviceDetails.find(sd => sd.id === s.serviceId),
      count: s._count.serviceId
    }));

    res.json({
      upcomingBookings,
      recentClients,
      stats: {
        totalBookings,
        todayBookings,
        weekBookings,
        popularServices: popularServiceStats
      },
      recentCancellations
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
}

// Cancel (soft delete) an appointment, with optional cancel reason
export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const booking = await prisma.booking.findUnique({ where: { id: Number(id) } });
    if (!booking || booking.deletedAt) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    await prisma.booking.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date(), cancelReason: reason || null },
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking', details: error.message });
  }
}

// Edit an appointment (booking) with audit
export async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, serviceId, notes } = req.body;
    const booking = await prisma.booking.findUnique({ where: { id: Number(id) } });
    if (!booking || booking.deletedAt) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data: {
        ...(date && { date }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(serviceId && { serviceId: Number(serviceId) }),
        ...(notes && { notes }),
        updatedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking', details: error.message });
  }
}

// Get detailed info for a single booking (for quick view/edit modal)
export async function getBookingDetails(req, res) {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, durationMinutes: true, price: true } },
      },
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking details', details: error.message });
  }
}

// Mark a booking as completed
export async function completeBooking(req, res) {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: Number(id) } });
    if (!booking || booking.deletedAt) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data: { status: 'COMPLETED', updatedAt: new Date() },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete booking', details: error.message });
  }
}

// Get dashboard analytics: bookings per day for the last 14 days, grouped by status
export async function getBookingTrends(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 13);

    // Group bookings by date and status for richer analytics
    const bookings = await prisma.booking.groupBy({
      by: ['date', 'status'],
      where: {
        deletedAt: null,
        date: { gte: fourteenDaysAgo, lte: today }
      },
      _count: { _all: true },
      orderBy: [{ date: 'asc' }, { status: 'asc' }]
    });

    // Aggregate by date for total and by status for breakdown
    const trendsMap = {};
    bookings.forEach(b => {
      const dateStr = b.date.toISOString().slice(0, 10);
      if (!trendsMap[dateStr]) trendsMap[dateStr] = { date: dateStr, total: 0, statuses: {} };
      trendsMap[dateStr].total += b._count._all;
      trendsMap[dateStr].statuses[b.status] = b._count._all;
    });
    const trends = Object.values(trendsMap);

    res.json({ trends });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking trends', details: error.message });
  }
}

// New: Get quick stats for today (bookings, cancellations, completions)
export async function getTodayStats(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [bookings, cancellations, completions] = await Promise.all([
      prisma.booking.count({
        where: {
          deletedAt: null,
          date: { gte: today, lt: tomorrow }
        }
      }),
      prisma.booking.count({
        where: {
          deletedAt: { not: null },
          deletedAt: { gte: today, lt: tomorrow }
        }
      }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          status: 'COMPLETED',
          date: { gte: today, lt: tomorrow }
        }
      })
    ]);

    res.json({
      today: today.toISOString().slice(0, 10),
      bookings,
      cancellations,
      completions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today stats', details: error.message });
  }
}

// New: Get recent activity feed (last 20 events: bookings, cancellations, completions)
export async function getRecentActivity(req, res) {
  try {
    const recentBookings = await prisma.booking.findMany({
      where: {},
      orderBy: [{ updatedAt: 'desc' }],
      take: 20,
      select: {
        id: true,
        date: true,
        status: true,
        deletedAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } }
      }
    });
    res.json({ activity: recentBookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent activity', details: error.message });
  }
}
