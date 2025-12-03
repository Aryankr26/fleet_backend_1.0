const express = require('express');
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');

const router = express.Router();
router.use(auth);

router.get('/logs', async (req, res) => {
  const logs = await prisma.fuelLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ data: logs });
});

router.get('/report', async (req, res) => {
  const logs = await prisma.fuelLog.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 });
  // simple summary per vehicle
  const summary = {};
  for (const l of logs) {
    summary[l.vehicleId] = summary[l.vehicleId] || { totalDelta: 0, count: 0 };
    summary[l.vehicleId].totalDelta += (l.delta || 0);
    summary[l.vehicleId].count += 1;
  }
  res.json({ data: { logs, summary } });
});

module.exports = router;