require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const orderRoutes = require('./routes/order.routes');
const adminRoutes = require('./routes/admin.routes');
const { startDailyMISJob } = require('./jobs/dailyMIS.job');
const { startTrackingSyncJob } = require('./jobs/trackingSync.job');

const app = express();

const allowedOrigins = [
  'https://skentlogistics.vercel.app',
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve PDFs statically
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Health check — must be before authenticated routes
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ShipEase API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', orderRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', error: `${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 ShipEase API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  startDailyMISJob();
  startTrackingSyncJob();
});

module.exports = app;
