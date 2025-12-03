const express = require('express');
const cors = require('cors');
const { apiLimiter, authLimiter } = require('./middlewares/rateLimiter');
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const telemetryRoutes = require('./routes/telemetry');
const fuelRoutes = require('./routes/fuel');
const geofenceRoutes = require('./routes/geofence');
const tyresRoutes = require('./routes/tyres');
const documentsRoutes = require('./routes/documents');
const complaintsRoutes = require('./routes/complaints');
const dashboardRoutes = require('./routes/dashboard');
const healthRoutes = require('./routes/health');

const app = express();

// CORS configuration - allow frontend origins
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://figma-eta-eight.vercel.app',
    'https://figmafleet.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (no rate limit)
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date() }));

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/geofence', geofenceRoutes);
app.use('/api/tyres', tyresRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', healthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;