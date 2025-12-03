const prisma = require('../prismaClient');
const { haversineKm } = require('../utils/haversine');
const fuelEngine = require('./fuelEngine');
const geofenceEngine = require('./geofenceEngine');
const stopService = require('./stopService');
const odometerService = require('./odometerService');
const driverScoreService = require('./driverScoreService');

/**
 * Normalize and persist telemetry and trigger processors
 */
async function processTelemetry(payload) {
  try {
    if (!payload || !payload.imei) {
      console.warn('Telemetry ignored: missing IMEI', payload);
      return;
    }

    // --- VALID SINGLE TRY BLOCK START ---

    const vehicle = await prisma.vehicle.findUnique({
      where: { imei: payload.imei }
    });

    if (!vehicle) {
      console.warn('Unknown IMEI', payload.imei);
      return null;
    }

    const last = await prisma.telemetry.findFirst({
      where: { vehicleId: vehicle.id },
      orderBy: { timestamp: 'desc' }
    });

    const distanceKm = last
      ? haversineKm(last.latitude, last.longitude, payload.latitude, payload.longitude)
      : 0;

    const speed = Number(payload.speed ?? 0);
    let state = 'stopped';
    if (speed > 5 || payload.motion) state = 'moving';
    else if (speed > 0 && speed <= 5) state = 'idle';

    const tele = await prisma.telemetry.create({
      data: {
        vehicleId: vehicle.id,
        imei: payload.imei,
        timestamp: payload.timestamp,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed,
        ignition: !!payload.ignition,
        motion: !!payload.motion,
        power: payload.power,
        charge: payload.charge,
        totalDistance: payload.totalDistance,
        todayDistance: payload.todayDistance,
        raw: payload.raw
      }
    });

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        lastLat: payload.latitude,
        lastLng: payload.longitude,
        lastSeen: payload.timestamp
      }
    });

    // Fuel Engine
    setImmediate(async () => {
      try { await fuelEngine.analyzeFuel(vehicle, last, payload, distanceKm); }
      catch (e) { console.error(e); }
    });

    // Geofence Engine
    setImmediate(async () => {
      try { await geofenceEngine.checkReverseGeofence(vehicle, payload); }
      catch (e) { console.error(e); }
    });

    // Stop detection
    setImmediate(async () => {
      try { await stopService.detectStop(vehicle, payload, last); }
      catch (e) { console.error('Stop detection error', e); }
    });

    // Odometer tampering
    setImmediate(async () => {
      try { await odometerService.checkOdometerTampering(vehicle, payload, last); }
      catch (e) { console.error('Odometer check error', e); }
    });

    // Driver score logic
    setImmediate(async () => {
      try {
        if (vehicle.ownerId) {
          const now = new Date(payload.timestamp);
          if (now.getMinutes() < 5) {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            await driverScoreService.calculateDriverScore(
              vehicle.ownerId,
              vehicle.id,
              startOfDay,
              now,
              'daily'
            );
          }
        }
      } catch (e) { console.error('Driver score error', e); }
    });

    // Trip engine
    setImmediate(async () => {
      try {
        if (state === 'moving') {
          const activeTrip = await prisma.trip.findFirst({
            where: { vehicleId: vehicle.id, endTime: null }
          });
          if (!activeTrip) {
            await prisma.trip.create({
              data: { vehicleId: vehicle.id, startTime: payload.timestamp }
            });
          }
        } else if (state === 'stopped') {
          const activeTrip = await prisma.trip.findFirst({
            where: { vehicleId: vehicle.id, endTime: null },
            orderBy: { startTime: 'desc' }
          });
          if (activeTrip) {
            const telems = await prisma.telemetry.findMany({
              where: {
                vehicleId: vehicle.id,
                timestamp: { gte: activeTrip.startTime }
              },
              orderBy: { timestamp: 'asc' }
            });

            let dist = 0;
            for (let i = 1; i < telems.length; i++) {
              dist += haversineKm(
                telems[i - 1].latitude,
                telems[i - 1].longitude,
                telems[i].latitude,
                telems[i].longitude
              );
            }

            await prisma.trip.update({
              where: { id: activeTrip.id },
              data: { endTime: payload.timestamp, distanceKm: dist }
            });
          }
        }
      } catch (err) {
        console.error('Trip engine error', err);
      }
    });

    return { tele, distanceKm, state };

  } catch (err) {
    console.error('processTelemetry', err);
    throw err;
  }
}

module.exports = { processTelemetry };