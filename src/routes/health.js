const express = require('express');
const router = express.Router();

router.get('/health', async (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

module.exports = router;
