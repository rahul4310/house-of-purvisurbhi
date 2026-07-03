import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from './server.js';
import { initDatabase } from './database.js';

vi.mock('./email.js', () => ({
  sendOrderNotification: vi.fn().mockResolvedValue(undefined),
}));

let authCookie = '';

beforeAll(async () => {
  // Clear the test database if it exists
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const testDbPath = path.join(__dirname, 'test-database.sqlite');
  
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Initialize the database for tests
  await initDatabase();
});

describe('API Endpoints', () => {
  it('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/products should return a list of products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/auth/login should fail with incorrect credentials and not set cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'wrongpassword' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeUndefined();
  });

  it('POST /api/auth/login should succeed and set HttpOnly cookie', async () => {
    const { config } = await import('./config.js');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: config.adminPassword });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/sessionId=.*?HttpOnly/);
    authCookie = cookies[0].split(';')[0];
  });

  it('Old Authorization: Bearer token access should be rejected with 401', async () => {
    const { config } = await import('./config.js');
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${config.adminToken}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Unauthorized.');
  });

  it('GET /api/orders without auth should fail', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/orders with auth cookie should succeed', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Cookie', authCookie);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PATCH /api/orders/:id/status should handle stock deduction properly', async () => {
    const { runSql, queryOne } = await import('./database.js');
    
    // 1. Insert product with stock 1
    const pRes = runSql("INSERT INTO products (name, category, price, active, stock) VALUES ('Stock Product', 'suit', 1500, 1, 1)");
    const productId = pRes.lastId;

    // 2. Create an order (status = new)
    const oRes = runSql("INSERT INTO orders (product_id, customer_name, customer_phone, customer_address, status) VALUES (?, 'Test', '123', 'Address', 'new')", [productId]);
    const orderId = oRes.lastId;

    // 3. Confirm order -> should deduct stock to 0
    let res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'confirmed' });
    expect(res.statusCode).toBe(200);
    
    let product = queryOne('SELECT stock FROM products WHERE id = ?', [productId]);
    expect(product.stock).toBe(0);

    // 4. Try to confirm another order for the same product -> should fail
    const oRes2 = runSql("INSERT INTO orders (product_id, customer_name, customer_phone, customer_address, status) VALUES (?, 'Test2', '123', 'Address', 'new')", [productId]);
    let resFail = await request(app)
      .patch(`/api/orders/${oRes2.lastId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'confirmed' });
    expect(resFail.statusCode).toBe(400); // Insufficient stock

    // 5. Cancel first order -> should restore stock to 1
    let resCancel = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'cancelled' });
    expect(resCancel.statusCode).toBe(200);

    product = queryOne('SELECT stock FROM products WHERE id = ?', [productId]);
    expect(product.stock).toBe(1);
  });

  // ── Upload validation integration tests ────────────────────────────

  it('POST /api/products with valid JPEG upload should succeed and store .jpg', async () => {
    const fs = await import('fs');
    const { resolveStoragePaths } = await import('./storagePaths.js');
    const { uploadsDir } = resolveStoragePaths();

    // Minimal buffer with JPEG magic bytes
    const jpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00,
    ]);
    const res = await request(app)
      .post('/api/products')
      .set('Cookie', authCookie)
      .field('name', 'Upload JPEG Test')
      .field('category', 'saree')
      .field('price', '1000')
      .attach('images', jpegBuffer, 'test.jpg');

    expect(res.statusCode).toBe(201);
    expect(res.body.image_url).toMatch(/^\/uploads\/product-.*\.jpg$/);

    // Cleanup: delete the test file
    const filename = res.body.image_url.replace('/uploads/', '');
    const filePath = (await import('path')).join(uploadsDir, filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
  });

  it('POST /api/products with valid PNG upload should store .png', async () => {
    const fs = await import('fs');
    const { resolveStoragePaths } = await import('./storagePaths.js');
    const { uploadsDir } = resolveStoragePaths();

    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    ]);
    const res = await request(app)
      .post('/api/products')
      .set('Cookie', authCookie)
      .field('name', 'Upload PNG Test')
      .field('category', 'suit')
      .field('price', '2000')
      .attach('images', pngBuffer, 'photo.png');

    expect(res.statusCode).toBe(201);
    expect(res.body.image_url).toMatch(/^\/uploads\/product-.*\.png$/);

    const filename = res.body.image_url.replace('/uploads/', '');
    const filePath = (await import('path')).join(uploadsDir, filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
  });

  it('POST /api/products with spoofed bytes (.jpg ext, wrong content) returns 400 and leaves no files', async () => {
    const fs = await import('fs');
    const { resolveStoragePaths } = await import('./storagePaths.js');
    const { uploadsDir } = resolveStoragePaths();
    const beforeFiles = new Set(fs.readdirSync(uploadsDir));

    // Random bytes masquerading as .jpg
    const fakeBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    const res = await request(app)
      .post('/api/products')
      .set('Cookie', authCookie)
      .field('name', 'Spoofed Upload Test')
      .field('category', 'saree')
      .field('price', '100')
      .attach('images', fakeBuffer, 'fake.jpg');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not a valid image');

    // Verify no orphan files left behind
    const afterFiles = new Set(fs.readdirSync(uploadsDir));
    const newFiles = [...afterFiles].filter(f => !beforeFiles.has(f));
    expect(newFiles).toEqual([]);
  });

  it('POST /api/products with GIF should return 400', async () => {
    const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const res = await request(app)
      .post('/api/products')
      .set('Cookie', authCookie)
      .field('name', 'GIF Test')
      .field('category', 'suit')
      .field('price', '500')
      .attach('images', gifBuffer, { filename: 'anim.gif', contentType: 'image/gif' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Only JPG, PNG, and WebP');
  });

  it('Mixed valid + invalid upload rejects all and leaves no files behind', async () => {
    const fs = await import('fs');
    const { resolveStoragePaths } = await import('./storagePaths.js');
    const { uploadsDir } = resolveStoragePaths();
    const beforeFiles = new Set(fs.readdirSync(uploadsDir));

    const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const invalidFile = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const res = await request(app)
      .post('/api/products')
      .set('Cookie', authCookie)
      .field('name', 'Mixed Upload Test')
      .field('category', 'saree')
      .field('price', '200')
      .attach('images', validJpeg, 'valid.jpg')
      .attach('images', invalidFile, 'also-fake.jpg');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);

    // ALL files must be cleaned up — no orphans
    const afterFiles = new Set(fs.readdirSync(uploadsDir));
    const newFiles = [...afterFiles].filter(f => !beforeFiles.has(f));
    expect(newFiles).toEqual([]);
  });

  it('Invalid upload does not create a product record', async () => {
    const { queryAll } = await import('./database.js');
    const before = queryAll("SELECT id FROM products WHERE name = 'Ghost Product'");
    expect(before).toEqual([]);

    const fakeBuffer = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]);
    await request(app)
      .post('/api/products')
      .set('Cookie', authCookie)
      .field('name', 'Ghost Product')
      .field('category', 'saree')
      .field('price', '999')
      .attach('images', fakeBuffer, 'ghost.jpg');

    const after = queryAll("SELECT id FROM products WHERE name = 'Ghost Product'");
    expect(after).toEqual([]);
  });

  it('POST /api/auth/logout should clear cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie);
    expect(res.statusCode).toBe(200);
    
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('sessionId=;');
  });

  it('POST /api/auth/login should trigger rate limit (429)', async () => {
    let res;
    for (let i = 0; i < 4; i++) {
      res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'wrongpassword' });
    }
    expect(res.statusCode).toBe(429);
    expect(res.body.message).toContain('Too many login attempts');
  });

  it('POST /api/orders should create an order and return 201', async () => {
    const payload = {
      product_name: 'Test Product',
      product_price: 5000,
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '9999999999',
      customer_address: '1 Test Street',
    };
    const res = await request(app).post('/api/orders').send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.customer_name).toBe('Test Customer');
    expect(res.body.id).toBeDefined();
  });

  it('POST /api/orders should trigger rate limit (429)', async () => {
    let res;
    const payload = {
      customer_name: 'Test',
      customer_phone: '123',
      customer_address: 'Address'
    };
    for (let i = 0; i < 11; i++) {
      res = await request(app)
        .post('/api/orders')
        .send(payload);
    }
    expect(res.statusCode).toBe(429);
  });

  it('CORS allows configured origin', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('CORS rejects unconfigured origin', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://evil.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
