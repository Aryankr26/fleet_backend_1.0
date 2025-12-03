const express = require('express');
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

const router = express.Router();
router.use(auth);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // Get vehicle counts by status
    const vehicles = await prisma.vehicle.findMany({
      include: {
        telemetries: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    // Calculate status based on last telemetry
    const now = new Date();
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);

    let moving = 0, stopped = 0, idling = 0, offline = 0;

    const vehicleList = vehicles.map(v => {
      const lastTelemetry = v.telemetries[0];
      let status = 'offline';
      let statusText = 'Offline';

      if (lastTelemetry) {
        const lastSeen = new Date(lastTelemetry.timestamp);
        if (lastSeen < thirtyMinutesAgo) {
          status = 'offline';
          statusText = 'Offline';
          offline++;
        } else if (lastTelemetry.speed > 5) {
          status = 'moving';
          statusText = 'Moving';
          moving++;
        } else if (lastTelemetry.ignition) {
          status = 'idling';
          statusText = 'Idling';
          idling++;
        } else {
          status = 'stopped';
          statusText = 'Stopped';
          stopped++;
        }
      } else {
        offline++;
      }

      return {
        id: v.id,
        number: v.registrationNo || v.imei,
        manufacturer: v.make?.toLowerCase() || 'unknown',
        status,
        statusText,
        speed: lastTelemetry?.speed || 0,
        position: {
          lat: lastTelemetry?.latitude || v.lastLat || 0,
          lng: lastTelemetry?.longitude || v.lastLng || 0
        },
        lastUpdated: lastTelemetry?.timestamp || v.lastSeen || v.updatedAt,
        odometer: v.odometer || 0,
        model: v.model || 'Unknown'
      };
    });

    // Get recent alerts
    const recentAlerts = await prisma.geofenceAlert.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        vehicle: { select: { registrationNo: true, imei: true } },
        geofence: { select: { name: true } }
      }
    });

    // Get fuel logs summary
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const fuelLogs = await prisma.fuelLog.findMany({
      where: { timestamp: { gte: todayStart } },
      orderBy: { timestamp: 'desc' }
    });

    const suspiciousFuel = fuelLogs.filter(l => l.suspicion === 'Red').length;

    // Get complaints summary
    const openComplaints = await prisma.complaint.count({
      where: { status: { in: ['open', 'in_progress'] } }
    });

    res.json({
      data: {
        vehicleCounts: {
          total: vehicles.length,
          moving,
          stopped,
          idling,
          offline
        },
        vehicles: vehicleList,
        alerts: recentAlerts,
        fuelSummary: {
          todayLogs: fuelLogs.length,
          suspiciousEvents: suspiciousFuel
        },
        complaintsOpen: openComplaints
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vehicle details with full history
router.get('/vehicle/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        telemetries: {
          orderBy: { timestamp: 'desc' },
          take: 100
        },
        fuelLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50
        },
        documents: true,
        trips: {
          orderBy: { startTime: 'desc' },
          take: 20
        },
        stops: {
          orderBy: { startTime: 'desc' },
          take: 20
        },
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Calculate today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTelemetry = vehicle.telemetries.filter(
      t => new Date(t.timestamp) >= todayStart
    );

    const todayDistance = todayTelemetry.length > 0
      ? Math.max(...todayTelemetry.map(t => t.todayDistance || 0))
      : 0;

    const todayTrips = vehicle.trips.filter(
      t => new Date(t.startTime) >= todayStart
    ).length;

    // Get last telemetry for current status
    const lastTelemetry = vehicle.telemetries[0];
    let status = 'offline', statusText = 'Offline';
    
    if (lastTelemetry) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (new Date(lastTelemetry.timestamp) < thirtyMinutesAgo) {
        status = 'offline';
        statusText = 'Offline';
      } else if (lastTelemetry.speed > 5) {
        status = 'moving';
        statusText = 'Moving';
      } else if (lastTelemetry.ignition) {
        status = 'idling';
        statusText = 'Idling';
      } else {
        status = 'stopped';
        statusText = 'Stopped';
      }
    }

    res.json({
      data: {
        ...vehicle,
        status,
        statusText,
        currentSpeed: lastTelemetry?.speed || 0,
        currentLocation: {
          lat: lastTelemetry?.latitude || vehicle.lastLat,
          lng: lastTelemetry?.longitude || vehicle.lastLng
        },
        todayDistance,
        todayTrips,
        lastUpdated: lastTelemetry?.timestamp || vehicle.lastSeen
      }
    });
  } catch (err) {
    console.error('Vehicle details error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get insights/analytics
router.get('/insights', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let startDate = new Date();
    if (period === 'day') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Fuel consumption trends
    const fuelLogs = await prisma.fuelLog.findMany({
      where: { timestamp: { gte: startDate } },
      include: { vehicle: { select: { registrationNo: true } } },
      orderBy: { timestamp: 'asc' }
    });

    // Distance trends
    const telemetries = await prisma.telemetry.findMany({
      where: { timestamp: { gte: startDate } },
      select: { vehicleId: true, totalDistance: true, timestamp: true },
      orderBy: { timestamp: 'asc' }
    });

    // Driver scores
    const driverScores = await prisma.driverScore.findMany({
      where: { periodStart: { gte: startDate } },
      include: {
        user: { select: { name: true } },
        vehicle: { select: { registrationNo: true } }
      },
      orderBy: { score: 'desc' }
    });

    // Complaints by type
    const complaints = await prisma.complaint.groupBy({
      by: ['type'],
      _count: true,
      where: { createdAt: { gte: startDate } }
    });

    res.json({
      data: {
        fuelTrends: fuelLogs,
        distanceTrends: telemetries,
        driverScores,
        complaintsByType: complaints
      }
    });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
