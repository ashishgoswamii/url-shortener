// In-memory stores shared across mocks so created codes persist between requests
const _dbStore = {};    // code -> row
const _redisStore = {}; // key -> value

// Mock DB (postgres)
jest.mock('../db/postgres', () => ({
  getDB: () => ({
    query: jest.fn().mockImplementation((text, params = []) => {
      const sql = (text || '').toLowerCase();

      // INSERT
      if (sql.includes('insert')) {
        const code = params.find(p => typeof p === 'string' && !/^https?:\/\//i.test(p));
        const originalUrl = params.find(p => typeof p === 'string' && /^https?:\/\//i.test(p));
        if (code) {
          _dbStore[code] = {
            code,
            original_url: originalUrl,
            originalUrl,
            clicks: 0,
            total_clicks: 0,
            created_at: new Date()
          };
        }
        return Promise.resolve({ rows: [_dbStore[code] || {}] });
      }

      // UPDATE (e.g., increment clicks)
      if (sql.includes('update')) {
        const code = params[params.length - 1];
        if (_dbStore[code]) {
          _dbStore[code].clicks += 1;
          _dbStore[code].total_clicks = _dbStore[code].clicks;
        }
        return Promise.resolve({ rows: _dbStore[code] ? [_dbStore[code]] : [] });
      }

      // SELECT ... WHERE code = $1
      if (sql.includes('select') && sql.includes('where')) {
        const code = params[0];
        const row = _dbStore[code];
        return Promise.resolve({ rows: row ? [row] : [] });
      }

      return Promise.resolve({ rows: [] });
    })
  }),
  initDB: jest.fn()
}));

// Mock Redis
jest.mock('../db/redis', () => ({
  getRedis: () => ({
    get: jest.fn().mockImplementation((key) =>
      Promise.resolve(_redisStore[key] !== undefined ? _redisStore[key] : null)
    ),
    set: jest.fn().mockImplementation((key, value) => {
      _redisStore[key] = value;
      return Promise.resolve('OK');
    }),
    incr: jest.fn().mockImplementation((key) => {
      const v = (parseInt(_redisStore[key], 10) || 0) + 1;
      _redisStore[key] = String(v);
      return Promise.resolve(v);
    }),
    expire: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockImplementation((key) => {
      delete _redisStore[key];
      return Promise.resolve(1);
    })
  })
}));

const request = require('supertest');
const app = require('../index');

describe('Health Check', () => {
  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/shorten', () => {
  it('should create a short URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://google.com' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('shortUrl');
    expect(res.body.originalUrl).toBe('https://google.com');
  });

  it('should return 400 for missing URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 for invalid URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'not-a-valid-url' });

    expect(res.status).toBe(400);
  });
});

describe('GET /:code', () => {
  it('should redirect to original URL', async () => {
    const createRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://github.com' });

    const { code } = createRes.body;

    const res = await request(app).get(`/${code}`);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('https://github.com');
  });

  it('should return 404 for unknown code', async () => {
    const res = await request(app).get('/unknowncode');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/stats/:code', () => {
  it('should return stats for valid code', async () => {
    const createRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com' });

    const { code } = createRes.body;

    const res = await request(app).get(`/api/stats/${code}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalClicks');
    expect(res.body.originalUrl).toBe('https://example.com');
  });
});