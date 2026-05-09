const { Pool } = require('pg');
require('dotenv').config();

let pool;

function getDB() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DB_URL
    });

    pool.on('error', (err) => {
      console.error('Postgres pool error:', err);
    });
  }
  return pool;
}

async function initDB() {
  const db = getDB();

  await db.query(`
    CREATE TABLE IF NOT EXISTS urls (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clicks (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) NOT NULL,
      clicked_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_urls_code ON urls(code);
    CREATE INDEX IF NOT EXISTS idx_clicks_code ON clicks(code);
  `);

  console.log('✅ Database initialized');
}

module.exports = { getDB, initDB };