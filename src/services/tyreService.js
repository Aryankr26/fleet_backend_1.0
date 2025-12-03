const prisma = require('../prismaClient');

async function installTyre({ vehicleId, position, serial }) {
  const tyre = await prisma.tyre.create({
    data: { vehicleId, position, serial, installedAt: new Date() }
  });
  await prisma.tyreHistory.create({ data: { tyreId: tyre.id, event: 'installed', notes: `installed at ${position}` } });
  return tyre;
}

async function removeTyre({ tyreId, reason }) {
  await prisma.tyre.update({ where: { id: tyreId }, data: { removedAt: new Date() } });
  await prisma.tyreHistory.create({ data: { tyreId, event: 'removed', notes: reason || 'removed' } });
  return await prisma.tyre.findUnique({ where: { id: tyreId }, include: { history: true } });
}

async function getTyres(vehicleId) {
  return prisma.tyre.findMany({ where: { vehicleId }, include: { history: true } });
}

/**
 * Check for potential tyre theft based on unusual removal patterns
 * - Removal during night hours (10 PM - 6 AM)
 * - Multiple tyres removed in short succession
 * Note: Location-based checks require geofence integration and are handled by geofenceEngine
 */
async function checkTyreTheft(vehicleId) {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent removals
    const recentRemovals = await prisma.tyreHistory.findMany({
      where: {
        event: 'removed',
        timestamp: { gte: oneDayAgo },
        tyre: { vehicleId }
      },
      include: { tyre: true },
      orderBy: { timestamp: 'desc' }
    });

    const alerts = [];

    // Check 1: Night removal (10 PM - 6 AM)
    for (const removal of recentRemovals) {
      const hour = new Date(removal.timestamp).getHours();
      if (hour >= 22 || hour < 6) {
        alerts.push({
          type: 'night_removal',
          severity: 'warning',
          message: `Tyre removed during night hours at position ${removal.tyre.position}`,
          tyreId: removal.tyreId,
          timestamp: removal.timestamp
        });
      }
    }

    // Check 2: Multiple tyres removed within 30 minutes
    if (recentRemovals.length >= 2) {
      for (let i = 0; i < recentRemovals.length - 1; i++) {
        const timeDiff = new Date(recentRemovals[i].timestamp) - new Date(recentRemovals[i + 1].timestamp);
        if (timeDiff < 30 * 60 * 1000) { // 30 minutes
          alerts.push({
            type: 'rapid_removal',
            severity: 'critical',
            message: `Multiple tyres removed rapidly - possible theft`,
            tyreIds: [recentRemovals[i].tyreId, recentRemovals[i + 1].tyreId],
            timestamp: recentRemovals[i].timestamp
          });
          break;
        }
      }
    }

    // Create alerts in database
    for (const alert of alerts) {
      await prisma.geofenceAlert.create({
        data: {
          vehicleId,
          geofenceId: null,
          severity: alert.severity,
          message: alert.message
        }
      });
    }

    return alerts;
  } catch (err) {
    console.error('checkTyreTheft error', err);
    return [];
  }
}

/**
 * Get tyre history with theft alerts
 */
async function getTyreHistory(vehicleId, limit = 50) {
  const history = await prisma.tyreHistory.findMany({
    where: {
      tyre: { vehicleId }
    },
    include: {
      tyre: {
        select: { id: true, position: true, serial: true }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  });

  return history;
}

/**
 * Get tyre statistics for a vehicle
 */
async function getTyreStats(vehicleId) {
  const tyres = await prisma.tyre.findMany({
    where: { vehicleId },
    include: { history: true }
  });

  const installed = tyres.filter(t => t.installedAt && !t.removedAt).length;
  const removed = tyres.filter(t => t.removedAt).length;
  const total = tyres.length;

  // Calculate average lifespan
  const completedTyres = tyres.filter(t => t.installedAt && t.removedAt);
  let avgLifespanDays = 0;
  if (completedTyres.length > 0) {
    const totalDays = completedTyres.reduce((acc, t) => {
      return acc + (new Date(t.removedAt) - new Date(t.installedAt)) / (1000 * 60 * 60 * 24);
    }, 0);
    avgLifespanDays = Math.round(totalDays / completedTyres.length);
  }

  return {
    installed,
    removed,
    total,
    avgLifespanDays
  };
}

module.exports = { 
  installTyre, 
  removeTyre, 
  getTyres, 
  checkTyreTheft, 
  getTyreHistory, 
  getTyreStats 
};