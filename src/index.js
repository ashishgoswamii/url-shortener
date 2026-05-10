require('dotenv').config();

const app = require('./app');
const { initDB } = require('./db/postgres');
const { getRedis } = require('./db/redis');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDB();
    getRedis(); // initialize Redis connection

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    });

    // graceful shutdown
    process.on('SIGTERM', () => server.close(() => process.exit(0)));
    process.on('SIGINT', () => server.close(() => process.exit(0)));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = app;