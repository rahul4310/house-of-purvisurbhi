import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from './server.js';
import { initDatabase } from './database.js';

beforeAll(async () => {
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

  it('POST /api/auth/login should fail with incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'wrongpassword' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/orders without auth should fail', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/products/:id should return 404 for inactive products', async () => {
    // 1. Manually insert an inactive product
    const { runSql, queryOne } = await import('./database.js');
    const result = runSql("INSERT INTO products (name, category, price, active, stock) VALUES ('Inactive Product', 'saree', 1000, 0, 10)");
    const productId = result.lastId;

    // 2. Fetch the product via API
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.statusCode).toBe(404);
  });

  it('PATCH /api/orders/:id/status should handle stock deduction properly', async () => {
    const { runSql, queryOne } = await import('./database.js');
    const { config } = await import('./config.js');
    
    // 1. Insert product with stock 1
    const pRes = runSql("INSERT INTO products (name, category, price, active, stock) VALUES ('Stock Product', 'suit', 1500, 1, 1)");
    const productId = pRes.lastId;

    // 2. Create an order (status = new)
    const oRes = runSql("INSERT INTO orders (product_id, customer_name, customer_phone, customer_address, status) VALUES (?, 'Test', '123', 'Address', 'new')", [productId]);
    const orderId = oRes.lastId;

    const token = `Bearer ${config.adminToken}`;

    // 3. Confirm order -> should deduct stock to 0
    let res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', token)
      .send({ status: 'confirmed' });
    expect(res.statusCode).toBe(200);
    
    let product = queryOne('SELECT stock FROM products WHERE id = ?', [productId]);
    expect(product.stock).toBe(0);

    // 4. Try to confirm another order for the same product -> should fail
    const oRes2 = runSql("INSERT INTO orders (product_id, customer_name, customer_phone, customer_address, status) VALUES (?, 'Test2', '123', 'Address', 'new')", [productId]);
    let resFail = await request(app)
      .patch(`/api/orders/${oRes2.lastId}/status`)
      .set('Authorization', token)
      .send({ status: 'confirmed' });
    expect(resFail.statusCode).toBe(400); // Insufficient stock

    // 5. Cancel first order -> should restore stock to 1
    let resCancel = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', token)
      .send({ status: 'cancelled' });
    expect(resCancel.statusCode).toBe(200);

    product = queryOne('SELECT stock FROM products WHERE id = ?', [productId]);
    expect(product.stock).toBe(1);
  });
});
