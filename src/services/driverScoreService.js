const prisma = require('../prismaClient');

// Configurable thresholds - can be adjusted per vehicle type
const DEFAULT_SPEED_LIMIT = process.env.SPEED_LIMIT_KMH ? parseInt(process.env.SPEED_LIMIT_KMH, 10) : 80;

/**
 * Calculate driver score based on driving behavior
 * Score: 0-100
 * Rating: Green (80-100), Blue (50-79), Red (0-49)
 */
async function calculateDriverScore(userId, vehicleId, startDate, endDate, period = 'daily', speedLimit = DEFAULT_SPEED_LIMIT) {
  try {
    // Get telemetry data for the period
    const telemetries = await prisma.telemetry.findMany({
      where: {
        vehicleId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (telemetries.length === 0) {
      return null;
    }

    let speedEvents = 0;    // Over-speeding events
    let brakeEvents = 0;    // Hard braking events
    let idleEvents = 0;     // Excessive idling events

    let prevTelem = null;
    for (const telem of telemetries) {
      // Count speed events (over-speeding based on configurable limit)
      if (telem.speed > speedLimit) {
        speedEvents++;
      }

      // Detect hard braking (speed drop > 20 km/h in short time)
      if (prevTelem && prevTelem.speed - telem.speed > 20) {
        brakeEvents++;
      }

      // Detect excessive idling (ignition on, speed 0 for extended periods)
      if (telem.ignition && telem.speed === 0 && !telem.motion) {
        idleEvents++;
      }

      prevTelem = telem;
    }

    // Calculate score (deduct points for bad events)
    const totalEvents = telemetries.length;
    const speedPenalty = Math.min(30, (speedEvents / totalEvents) * 100);
    const brakePenalty = Math.min(30, (brakeEvents / totalEvents) * 100);
    const idlePenalty = Math.min(20, (idleEvents / totalEvents) * 50);

    let score = Math.round(100 - speedPenalty - brakePenalty - idlePenalty);
    score = Math.max(0, Math.min(100, score));

    // Determine rating
    let rating = 'Green';
    if (score < 50) rating = 'Red';
    else if (score < 80) rating = 'Blue';

    // Upsert the score
    const existingScore = await prisma.driverScore.findFirst({
      where: {
        userId,
        vehicleId,
        period,
        periodStart: startDate
      }
    });

    let driverScore;
    if (existingScore) {
      driverScore = await prisma.driverScore.update({
        where: { id: existingScore.id },
        data: {
          score,
          rating,
          speedEvents,
          brakeEvents,
          idleEvents,
          periodEnd: endDate
        }
      });
    } else {
      driverScore = await prisma.driverScore.create({
        data: {
          userId,
          vehicleId,
          score,
          rating,
          speedEvents,
          brakeEvents,
          idleEvents,
          period,
          periodStart: startDate,
          periodEnd: endDate
        }
      });
    }

    return driverScore;
  } catch (err) {
    console.error('calculateDriverScore error', err);
    return null;
  }
}

/**
 * Get driver scores for a user
 */
async function getDriverScores(userId, period = 'daily', limit = 30) {
  return prisma.driverScore.findMany({
    where: { userId, period },
    orderBy: { periodStart: 'desc' },
    take: limit,
    include: {
      vehicle: { select: { id: true, registrationNo: true, imei: true } }
    }
  });
}

/**
 * Get latest driver score for a vehicle
 */
async function getLatestVehicleScore(vehicleId) {
  return prisma.driverScore.findFirst({
    where: { vehicleId },
    orderBy: { periodEnd: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  });
}

module.exports = {
  calculateDriverScore,
  getDriverScores,
  getLatestVehicleScore
};
