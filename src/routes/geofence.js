const express = require('express');
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

const router = express.Router();
router.use(auth);

router.post('/', async (req, res) => {
  const { name, type, centerLat, centerLng, radius, polygon, scheduledAt } = req.body;
  const gf = await prisma.geofence.create({
    data: {
      name, type: type || 'circle', centerLat: centerLat ? Number(centerLat) : null,
      centerLng: centerLng ? Number(centerLng) : null, radius: radius ? Number(radius) : null,
      polygon: polygon || null, scheduledAt: scheduledAt ? new Date(scheduledAt) : null
    }
  });
  res.status(201).json({ data: gf });
});

router.get('/', async (req, res) => {
  const gfs = await prisma.geofence.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ data: gfs });
});

router.get('/alerts', async (req, res) => {
  const alerts = await prisma.geofenceAlert.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ data: alerts });
});

module.exports = router;