const express = require('express');
const { nanoid } = require('nanoid');
const { getDB } = require('../db/postgres');
const { getRedis } = require('../db/redis');

const router = express.Router();

router.post('/shorten', async (req, res, next) => {
  try {
    const { url } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      new URL(url);  // throws if invalid URL
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const code = nanoid(7);
    const db = getDB();
    const redis = getRedis();

    // Save to Postgres
    await db.query(
      'INSERT INTO urls (code, original_url) VALUES ($1, $2)',
      [code, url]
    );

    // Cache in Redis — fast lookups
    await redis.set(`url:${code}`, url, 'EX', 86400);

    res.status(201).json({
      code,
      shortUrl: `${process.env.BASE_URL}/${code}`,
      originalUrl: url
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;