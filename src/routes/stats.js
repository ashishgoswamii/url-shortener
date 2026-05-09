const express = require('express');
const { getDB } = require('../db/postgres');

const router = express.Router();

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const db = getDB();

    // Get URL info
    const urlResult = await db.query(
      'SELECT * FROM urls WHERE code = $1',
      [code]
    );

    if (urlResult.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    // Get click count
    const clickResult = await db.query(
      'SELECT COUNT(*) as total FROM clicks WHERE code = $1',
      [code]
    );

    const url = urlResult.rows[0];
    const clicks = parseInt(clickResult.rows[0].total);

    res.json({
      code,
      originalUrl: url.original_url,
      shortUrl: `${process.env.BASE_URL}/${code}`,
      totalClicks: clicks,
      createdAt: url.created_at
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;