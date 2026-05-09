const Redis = require('ioredis');
require('dotenv').config();

let client;

function getRedis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        // Retry with exponential backoff
        return Math.min(times * 50, 2000);
      }
    });

    client.on('connect', () => console.log('✅ Redis connected'));
    client.on('error', (err) => console.error('Redis error:', err));
  }
  return client;
}

module.exports = { getRedis };