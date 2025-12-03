const axios = require('axios');
const prisma = require('../prismaClient');
const { parseMillitrackResponse } = require('./parsers/millitrackParser');
const telemetryProcessor = require('./telemetryProcessor');

const BASE = process.env.MILLITRACK_BASE || 'https://mvts1.millitrack.com/api/middleMan/getDeviceInfo';
const TOKEN = process.env.MILLITRACK_TOKEN || '';
const INTERVAL = 10000; // 10 seconds

let handle = null;

async function pollOnce() {
  try {
    const vehicles = await prisma.vehicle.findMany({ select: { imei: true } });
    const imeis = vehicles.map(v => v.imei).filter(Boolean);

    if (imeis.length === 0) return;

    const batchSize = 20;

    for (let i = 0; i < imeis.length; i += batchSize) {
      const batch = imeis.slice(i, i + batchSize);

      const params = new URLSearchParams();
      if (TOKEN) params.append('accessToken', TOKEN);
      batch.forEach(im => params.append('imei', im));

      const url = `${BASE}?${params.toString()}`;

      try {
        const resp = await axios.get(url, { timeout: 8000 });
        const parsed = parseMillitrackResponse(resp.data);

        for (const p of parsed) {
          try {
            await telemetryProcessor.processTelemetry(p);
          } catch (e) {
            console.error('Telemetry error:', e);
          }
        }
      } catch (err) {
        console.error('Vendor call error:', err.message || err);
      }
    }

  } catch (err) {
    console.error('pollOnce error:', err);
  }
}

function start() {
  if (handle) return;
  pollOnce(); // immediate run
  handle = setInterval(pollOnce, INTERVAL);
  console.info('Vendor poller started');
}

function stop() {
  if (!handle) return;
  clearInterval(handle);
  handle = null;
  console.info('Vendor poller stopped');
}

module.exports = { start, stop };