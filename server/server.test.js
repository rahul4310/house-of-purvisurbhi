import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from './server.js';
import { initDatabase } from './database.js';

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
    expect(cookies[0]).toMatch(/adminToken=.*?HttpOnly/);
    authCookie = cookies[0].split(';')[0];
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

  it('POST /api/auth/logout should clear cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie);
    expect(res.statusCode).toBe(200);
    
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('adminToken=;');
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
