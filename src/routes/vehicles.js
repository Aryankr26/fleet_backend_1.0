const express = require('express');
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');
const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ data: vehicles });
});

router.get('/:id', async (req, res) => {
  const v = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!v) return res.status(404).json({ error: 'not found' });
  res.json({ data: v });
});

router.post('/', async (req, res) => {
  const { imei, registrationNo, make, model, year, fuelCapacity } = req.body;
  if (!imei) return res.status(400).json({ error: 'imei required' });
  const existing = await prisma.vehicle.findUnique({ where: { imei } });
  if (existing) return res.status(409).json({ error: 'exists' });
  const v = await prisma.vehicle.create({ data: { imei, registrationNo, make, model, year: year ? Number(year) : null, fuelCapacity: fuelCapacity ? Number(fuelCapacity) : null, ownerId: req.user.id } });
  res.status(201).json({ data: v });
});

module.exports = router;