const prisma = require('../prismaClient');
const { haversineKm } = require('../utils/haversine');

async function checkReverseGeofence(vehicle, payload) {
  try {
    const geofences = await prisma.geofence.findMany();
    if (!geofences || geofences.length === 0) return;

    const inside = [];
    for (const gf of geofences) {
      if (gf.type === 'circle' && gf.centerLat && gf.centerLng && gf.radius) {
        const dKm = haversineKm(gf.centerLat, gf.centerLng, payload.latitude, payload.longitude);
        if (dKm <= (gf.radius / 1000)) {
          inside.push(gf);
        }
      } else {
        // polygon handling placeholder
      }
    }

    // If scheduledAt passed and vehicle is not inside that geofence -> alert
    for (const gf of geofences) {
      if (gf.scheduledAt && new Date(gf.scheduledAt) <= new Date()) {
        const vehicleInside = inside.find((x) => x.id === gf.id);
        if (!vehicleInside) {
          await prisma.geofenceAlert.create({
            data: {
              geofenceId: gf.id,
              vehicleId: vehicle.id,
              message: `Vehicle ${vehicle.imei} did not reach ${gf.name}`,
              severity: 'warning'
            }
          });
        }
      }
    }

    // If moving fast and not near geofence -> info alert
    if (payload.speed > 40 && inside.length === 0) {
      await prisma.geofenceAlert.create({
        data: {
          geofenceId: null,
          vehicleId: vehicle.id,
          message: `Vehicle ${vehicle.imei} is moving outside geofences`,
          severity: 'info'
        }
      });
    }

    return inside;
  } catch (err) {
    console.error('geofenceEngine error', err);
    return null;
  }
}

module.exports = { checkReverseGeofence };