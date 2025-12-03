const prisma = require('../prismaClient');
const { haversineKm } = require('../utils/haversine');

/**
 * Detect odometer tampering by comparing GPS distance with reported odometer
 * Returns: { tampered: boolean, type: string, details: object }
 */
async function checkOdometerTampering(vehicle, currentTelemetry, lastTelemetry) {
  try {
    if (!lastTelemetry || !currentTelemetry) {
      return { tampered: false, type: null, details: null };
    }

    const gpsDistance = haversineKm(
      lastTelemetry.latitude,
      lastTelemetry.longitude,
      currentTelemetry.latitude,
      currentTelemetry.longitude
    );

    // Get odometer readings
    const currentOdometer = currentTelemetry.totalDistance || 0;
    const lastOdometer = lastTelemetry.totalDistance || 0;
    const odometerDelta = currentOdometer - lastOdometer;

    // If no significant movement, skip check
    if (gpsDistance < 0.1) {
      return { tampered: false, type: null, details: null };
    }

    const result = {
      tampered: false,
      type: null,
      details: {
        gpsDistance,
        odometerDelta,
        currentOdometer,
        lastOdometer,
        discrepancy: null,
        discrepancyPercent: null
      }
    };

    // Check 1: Odometer rolled back
    if (odometerDelta < 0) {
      result.tampered = true;
      result.type = 'rollback';
      result.details.discrepancy = odometerDelta;
      
      await createAlert(vehicle.id, 'critical', 
        `Odometer rollback detected for ${vehicle.imei}: ${Math.abs(odometerDelta).toFixed(1)} km`);
      
      return result;
    }

    // Check 2: GPS distance much greater than odometer (odometer frozen/tampered)
    // Allow 20% tolerance for GPS inaccuracy
    if (gpsDistance > 1 && odometerDelta < gpsDistance * 0.5) {
      result.tampered = true;
      result.type = 'frozen';
      result.details.discrepancy = gpsDistance - odometerDelta;
      result.details.discrepancyPercent = ((gpsDistance - odometerDelta) / gpsDistance) * 100;
      
      await createAlert(vehicle.id, 'warning',
        `Possible odometer freeze for ${vehicle.imei}: GPS ${gpsDistance.toFixed(1)}km vs ODO ${odometerDelta.toFixed(1)}km`);
      
      return result;
    }

    // Check 3: Odometer jump (odometer advanced more than GPS, possible manual tampering)
    // Allow 30% tolerance
    if (gpsDistance > 1 && odometerDelta > gpsDistance * 1.5) {
      result.tampered = true;
      result.type = 'jump';
      result.details.discrepancy = odometerDelta - gpsDistance;
      result.details.discrepancyPercent = ((odometerDelta - gpsDistance) / gpsDistance) * 100;
      
      await createAlert(vehicle.id, 'warning',
        `Unusual odometer jump for ${vehicle.imei}: GPS ${gpsDistance.toFixed(1)}km vs ODO ${odometerDelta.toFixed(1)}km`);
      
      return result;
    }

    return result;
  } catch (err) {
    console.error('checkOdometerTampering error', err);
    return { tampered: false, type: null, details: null };
  }
}

/**
 * Create alert for odometer tampering
 */
async function createAlert(vehicleId, severity, message) {
  try {
    await prisma.geofenceAlert.create({
      data: {
        vehicleId,
        geofenceId: null,
        severity,
        message
      }
    });
  } catch (err) {
    console.error('createAlert error', err);
  }
}

/**
 * Update vehicle odometer
 */
async function updateOdometer(vehicleId, newOdometer) {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return null;

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        lastOdometer: vehicle.odometer || 0,
        odometer: newOdometer
      }
    });
  } catch (err) {
    console.error('updateOdometer error', err);
    return null;
  }
}

/**
 * Get odometer history from telemetry
 */
async function getOdometerHistory(vehicleId, limit = 50) {
  const telemetries = await prisma.telemetry.findMany({
    where: {
      vehicleId,
      totalDistance: { not: null }
    },
    select: {
      id: true,
      timestamp: true,
      totalDistance: true,
      todayDistance: true
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  });

  return telemetries;
}

module.exports = {
  checkOdometerTampering,
  updateOdometer,
  getOdometerHistory
};
