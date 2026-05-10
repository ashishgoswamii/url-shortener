require('dotenv').config();
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = require('./app');

const { initDB } = require('./db/postgres');
const { getRedis } = require('./db/redis');

const shortenRoute = require('./routes/shorten');
const redirectRoute = require('./routes/redirect');
const statsRoute = require('./routes/stats');
const errorHandler = require('./middleware/errorHandler');


// Security headers
app.use(helmet());

// Compress responses
app.use(compression());

// Parse JSON
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

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDB();
    getRedis();  // initialize connection

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);

        console.log('Simulated crash 1$$$$$$$$$!')
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }

    console.log('Simulated crash2 **********!')
 
}

start();

module.exports = app;