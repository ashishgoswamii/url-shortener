const express = require('express');
const { getDB } = require('../db/postgres');
const { getRedis } = require('../db/redis');

const router = express.Router();

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    // Skip non-shortcode routes
    if (code === 'health' || code === 'api') {
      return next();
    }

    const redis = getRedis();

    // Check Redis first
    let originalUrl = await redis.get(`url:${code}`);

    if (!originalUrl) {
      // Cache miss — check Postgres
      const db = getDB();
      const result = await db.query(
        'SELECT original_url FROM urls WHERE code = $1',
        [code]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Short URL not found' });
      }

      originalUrl = result.rows[0].original_url;

      // Repopulate cache
      await redis.set(`url:${code}`, originalUrl, 'EX', 86400);
    }

    // Track click — fire and forget
    trackClick(code).catch(console.error);

    res.redirect(301, originalUrl);

  } catch (err) {
    next(err);
  }
});

async function trackClick(code) {
  const db = getDB();
  await db.query(
    'INSERT INTO clicks (code) VALUES ($1)',
    [code]
  );
}

module.exports = router;