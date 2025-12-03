const prisma = require('../prismaClient');
const { haversineKm } = require('../utils/haversine');

// Configurable thresholds - can be adjusted per deployment or vehicle type
const STOP_DISTANCE_THRESHOLD_KM = process.env.STOP_DISTANCE_KM ? parseFloat(process.env.STOP_DISTANCE_KM) : 0.05; // 50 meters
const STOP_DURATION_THRESHOLD_SEC = process.env.STOP_DURATION_SEC ? parseInt(process.env.STOP_DURATION_SEC, 10) : 120; // 2 minutes

/**
 * Detect and record stops from telemetry data
 */
async function detectStop(vehicle, currentTelemetry, lastTelemetry) {
  try {
    // Check for active stop
    const activeStop = await prisma.stop.findFirst({
      where: {
        vehicleId: vehicle.id,
        endTime: null
      },
      orderBy: { startTime: 'desc' }
    });

    const isStationary = currentTelemetry.speed < 5 && !currentTelemetry.motion;

    if (isStationary) {
      if (activeStop) {
        // Vehicle is still stopped - check if it moved slightly
        const distFromStop = haversineKm(
          activeStop.latitude,
          activeStop.longitude,
          currentTelemetry.latitude,
          currentTelemetry.longitude
        );

        if (distFromStop <= STOP_DISTANCE_THRESHOLD_KM) {
          // Still at same stop location, update duration
          return activeStop;
        } else {
          // Moved to new stop location - end current and start new
          await endStop(activeStop.id, currentTelemetry.timestamp);
          return await startStop(vehicle.id, currentTelemetry);
        }
      } else {
        // Start new stop
        return await startStop(vehicle.id, currentTelemetry);
      }
    } else {
      // Vehicle is moving
      if (activeStop) {
        // End the active stop
        await endStop(activeStop.id, currentTelemetry.timestamp);
      }
      return null;
    }
  } catch (err) {
    console.error('detectStop error', err);
    return null;
  }
}

/**
 * Start a new stop
 */
async function startStop(vehicleId, telemetry) {
  return prisma.stop.create({
    data: {
      vehicleId,
      latitude: telemetry.latitude,
      longitude: telemetry.longitude,
      startTime: telemetry.timestamp
    }
  });
}

/**
 * End an active stop
 */
async function endStop(stopId, endTime) {
  const stop = await prisma.stop.findUnique({ where: { id: stopId } });
  if (!stop) return null;

  const durationSec = Math.round((new Date(endTime) - new Date(stop.startTime)) / 1000);

  // Only keep stops that are longer than threshold
  if (durationSec < STOP_DURATION_THRESHOLD_SEC) {
    await prisma.stop.delete({ where: { id: stopId } });
    return null;
  }

  return prisma.stop.update({
    where: { id: stopId },
    data: {
      endTime,
      duration: durationSec
    }
  });
}

/**
 * Get stops for a vehicle within a time range
 */
async function getStops(vehicleId, startDate, endDate, limit = 100) {
  const where = { vehicleId };
  if (startDate && endDate) {
    where.startTime = {
      gte: startDate,
      lte: endDate
    };
  }

  return prisma.stop.findMany({
    where,
    orderBy: { startTime: 'desc' },
    take: limit
  });
}

/**
 * Get stop statistics for a vehicle
 */
async function getStopStats(vehicleId, startDate, endDate) {
  const stops = await prisma.stop.findMany({
    where: {
      vehicleId,
      startTime: { gte: startDate, lte: endDate },
      endTime: { not: null }
    }
  });

  const totalStops = stops.length;
  const totalDuration = stops.reduce((acc, s) => acc + (s.duration || 0), 0);
  const avgDuration = totalStops > 0 ? Math.round(totalDuration / totalStops) : 0;
  const maxDuration = stops.length > 0 ? Math.max(...stops.map(s => s.duration || 0)) : 0;

  return {
    totalStops,
    totalDuration,
    avgDuration,
    maxDuration
  };
}

module.exports = {
  detectStop,
  getStops,
  getStopStats,
  startStop,
  endStop
};
