const express = require('express');
const auth = require('../middlewares/auth');
const tyreService = require('../services/tyreService');
const router = express.Router();

router.use(auth);

router.post('/install', async (req, res) => {
  const { vehicleId, position, serial } = req.body;
  if (!vehicleId || !position) return res.status(400).json({ error: 'missing' });
  const tyre = await tyreService.installTyre({ vehicleId, position, serial });
  res.status(201).json({ data: tyre });
});

router.post('/remove', async (req, res) => {
  const { tyreId, reason } = req.body;
  if (!tyreId) return res.status(400).json({ error: 'missing' });
  const tyre = await tyreService.removeTyre({ tyreId, reason });
  
  // Check for potential theft after removal
  const vehicle = tyre ? await tyreService.getTyres(tyre.vehicleId) : null;
  if (vehicle && vehicle.length > 0) {
    await tyreService.checkTyreTheft(vehicle[0].vehicleId);
  }
  
  res.json({ data: tyre });
});

router.get('/:vehicleId', async (req, res) => {
  const tyres = await tyreService.getTyres(req.params.vehicleId);
  res.json({ data: tyres });
});

// Get tyre history for a vehicle
router.get('/:vehicleId/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await tyreService.getTyreHistory(req.params.vehicleId, parseInt(limit, 10));
    res.json({ data: history });
  } catch (err) {
    console.error('Get tyre history error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get tyre statistics for a vehicle
router.get('/:vehicleId/stats', async (req, res) => {
  try {
    const stats = await tyreService.getTyreStats(req.params.vehicleId);
    res.json({ data: stats });
  } catch (err) {
    console.error('Get tyre stats error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Check for potential tyre theft
router.post('/:vehicleId/check-theft', async (req, res) => {
  try {
    const alerts = await tyreService.checkTyreTheft(req.params.vehicleId);
    res.json({ data: alerts });
  } catch (err) {
    console.error('Check tyre theft error', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;