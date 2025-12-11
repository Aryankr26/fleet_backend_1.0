// simulate.js - PRO LEVEL SIMULATOR

const axios = require('axios');
require('dotenv').config();

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN = `${BASE}/api/auth/login`;
const TELEMETRY = `${BASE}/api/telemetry`;

const EMAIL = process.env.EMAIL || 'admin@example.com';
const PASSWORD = process.env.PASSWORD || 'adminpass';
const IMEI = process.env.IMEI || '864512345678901';

const PACKETS = 80;            // total GPS packets (increase for more data)
const INTERVAL = 1000;         // 1 second interval ✔ real GPS
const STOP_DURATION = 15;      // 15 seconds stopped -> stop detection works
const JITTER = 0.0003;         // small movement variations

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function jitter(val) {
  return val + (Math.random() - 0.5) * JITTER;
}

function nowISO() {
  return new Date().toISOString();
}

async function login() {
  const resp = await axios.post(LOGIN, { email: EMAIL, password: PASSWORD });
  return resp.data.token;
}

async function sendTelemetry(token, payload) {
  const headers = { Authorization: `Bearer ${token}` };
  return axios.post(TELEMETRY, payload, { headers });
}

(async () => {
  console.log("Logging in...");
  const token = await login();
  console.log("LOGIN OK");

  let lat = 12.9716;
  let lng = 77.5946;

  let totalDistance = 1000;

  for (let i = 1; i <= PACKETS; i++) {

    let speed = 0;

    // Movement logic
    if (i < 50) {
      // moving
      speed = random(15, 45);      // movement
      lat += random(0.0001, 0.0003);
      lng += random(0.0001, 0.0003);
    } else {
      // STOP for long
      speed = 0;
      lat = jitter(lat);
      lng = jitter(lng);
    }

    totalDistance += speed * 0.02;   // approx dist increment

    const payload = {
      imei: IMEI,
      timestamp: nowISO(),
      latitude: lat,
      longitude: lng,
      speed,
      ignition: speed > 1,
      motion: speed > 1,
      power: 12.2,
      charge: 85,
      totalDistance,
      todayDistance: totalDistance % 100,
      raw: "simulated-rich"
    };

    const res = await sendTelemetry(token, payload);
    console.log(`[${i}/${PACKETS}] speed=${speed.toFixed(1)} → ${res.status}`);

    await new Promise(r => setTimeout(r, INTERVAL));
  }

  console.log("Simulation COMPLETE");
})();