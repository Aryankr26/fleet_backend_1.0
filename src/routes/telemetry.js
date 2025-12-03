const express = require('express');
const auth = require('../middlewares/auth');
const { processTelemetry } = require('../services/telemetryProcessor');
const prisma = require('../prismaClient');
const stopService = require('../services/stopService');
const driverScoreService = require('../services/driverScoreService');
const router = express.Router();

router.use(auth);

// Process new telemetry
router.post('/', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.imei) return res.status(400).json({ error: 'imei required' });
  try {
    const result = await processTelemetry(payload);
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get latest telemetry by IMEI
router.get('/latest/:imei', async (req, res) => {
  try {
    const { imei } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { imei }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const last = await prisma.telemetry.findFirst({
      where: { vehicleId: vehicle.id },
      orderBy: { timestamp: 'desc' }
    });

    if (!last) {
      return res.status(404).json({ error: 'No telemetry found' });
    }

    res.json({ data: last });

  } catch (err) {
    console.error('Latest telemetry error', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get telemetry history for a vehicle
router.get('/history/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, limit = 1000 } = req.query;

    const where = { vehicleId };
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const telemetries = await prisma.telemetry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit, 10)
    });

    res.json({ data: telemetries });
  } catch (err) {
    console.error('Get history error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get route replay for a vehicle (ordered by time ascending for playback)
router.get('/replay/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate required' });
    }

    const telemetries = await prisma.telemetry.findMany({
      where: {
        vehicleId,
        timestamp: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        id: true,
        timestamp: true,
        latitude: true,
        longitude: true,
        speed: true,
        ignition: true,
        motion: true
      },
      orderBy: { timestamp: 'asc' }
    });

    res.json({ data: telemetries });
  } catch (err) {
    console.error('Get replay error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get stops for a vehicle
router.get('/stops/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    const stops = await stopService.getStops(
      vehicleId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      parseInt(limit, 10)
    );

    res.json({ data: stops });
  } catch (err) {
    console.error('Get stops error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get stop statistics for a vehicle
router.get('/stops/:vehicleId/stats', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate required' });
    }

    const stats = await stopService.getStopStats(vehicleId, new Date(startDate), new Date(endDate));
    res.json({ data: stats });
  } catch (err) {
    console.error('Get stop stats error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get driver scores
router.get('/scores/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'daily', limit = 30 } = req.query;

    const scores = await driverScoreService.getDriverScores(userId, period, parseInt(limit, 10));
    res.json({ data: scores });
  } catch (err) {
    console.error('Get driver scores error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get latest driver score for a vehicle
router.get('/scores/vehicle/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const score = await driverScoreService.getLatestVehicleScore(vehicleId);
    res.json({ data: score });
  } catch (err) {
    console.error('Get vehicle score error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get trips for a vehicle
router.get('/trips/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    const where = { vehicleId };
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const trips = await prisma.trip.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: parseInt(limit, 10)
    });

    res.json({ data: trips });
  } catch (err) {
    console.error('Get trips error', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;