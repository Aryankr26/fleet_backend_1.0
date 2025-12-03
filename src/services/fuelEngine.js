const prisma = require('../prismaClient');

async function analyzeFuel(vehicle, lastTelemetry, currentPayload, distanceKm) {
  try {
    let currentFuel = null;
    if (currentPayload.charge != null) currentFuel = Number(currentPayload.charge);
    else if (currentPayload.raw?.attributes?.fuelLevel != null) currentFuel = Number(currentPayload.raw.attributes.fuelLevel);

    let previousFuel = null;
    const lastLog = await prisma.fuelLog.findFirst({ where: { vehicleId: vehicle.id }, orderBy: { createdAt: 'desc' } });
    if (lastLog) previousFuel = lastLog.currentFuel;
    else if (lastTelemetry?.raw?.attributes?.fuelLevel != null) previousFuel = Number(lastTelemetry.raw.attributes.fuelLevel);

    if (previousFuel == null || currentFuel == null) {
      // cannot compare
      return 'Green';
    }

    const delta = currentFuel - previousFuel;
    const absDrop = Math.abs(Math.min(0, delta));
    let suspicion = 'Green';
    if (absDrop >= 25 && distanceKm < 1) suspicion = 'Red';
    else if (absDrop >= 10 && distanceKm < 2) suspicion = 'Blue';
    else if (absDrop >= 2 && distanceKm < 1) suspicion = 'Blue';

    await prisma.fuelLog.create({
      data: {
        vehicleId: vehicle.id,
        previousFuel,
        currentFuel,
        delta,
        distanceKm,
        suspicion,
        notes: absDrop > 0 ? `Detected drop ${absDrop}L` : 'No significant drop'
      }
    });

    return suspicion;
  } catch (err) {
    console.error('fuelEngine error', err);
    return 'Green';
  }
}

module.exports = { analyzeFuel };