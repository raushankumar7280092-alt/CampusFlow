const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('./config/db');
const announcementsRouter = require('./routes/announcements');
const eventsRouter = require('./routes/events');
const registrationsRouter = require('./routes/registrations');
const timetableRouter = require('./routes/timetable');
const assignmentsRouter = require('./routes/assignments');
const statsRouter = require('./routes/stats');

const app = express();
const port = process.env.PORT || 5000;

const configuredOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevelopmentOrigins = ['http://localhost:5000', 'http://127.0.0.1:5000'];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? configuredOrigins
      : [...localDevelopmentOrigins, ...configuredOrigins];
    return callback(null, allowedOrigins.includes(origin));
  },
}));
app.use(express.json());

app.use('/api/announcements', announcementsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/timetable', timetableRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CampusFlow API is running',
  });
});

app.get('/api/db-status', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    success: connected,
    database: connected ? 'connected' : 'disconnected',
  });
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error(`API error: ${error.message}`);
  if (error.name === 'ValidationError' || error.name === 'CastError' || error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ success: false, message: 'Validation error', error: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate resource', error: 'A matching record already exists' });
  }
  res.status(error.status || 500).json({
    success: false,
    message: error.status && error.status < 500 ? error.message : 'Internal server error',
  });
});

async function startServer() {
  let databaseConnected = false;
  try {
    await connectDB();
    databaseConnected = true;
  } catch {
    // Keep health and database status available while clearly reporting degraded mode.
  }

  app.listen(port, () => {
    if (databaseConnected && mongoose.connection.readyState === 1) {
      console.log(`CampusFlow ready at http://localhost:${port} (MongoDB connected).`);
    } else {
      console.error(`CampusFlow health server listening at http://localhost:${port}, but MongoDB is disconnected. Configure backend/.env; data APIs are unavailable.`);
    }
  });
}

startServer();



