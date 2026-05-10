const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const shortenRoute = require('./routes/shorten');
const redirectRoute = require('./routes/redirect');
const statsRoute = require('./routes/stats');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security headers
app.use(helmet());

// Compress responses
app.use(compression());

// Parse JSON bodies
app.use(express.json());

// Rate limiting — 100 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, slow down!' }
}));

// Health check — before other routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api', shortenRoute);
app.use('/api/stats', statsRoute);
app.use('/', redirectRoute);

// Error handler — must be last
app.use(errorHandler);


module.exports = app;