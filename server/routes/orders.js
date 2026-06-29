import { Router } from 'express';
import { queryAll, queryOne, runSql, saveDatabase } from '../database.js';
import { config } from '../config.js';

const router = Router();

// --- Auth middleware ---
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${config.adminToken}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  next();
}

// --- Helper: send order email via Web3Forms ---
async function sendOrderEmail(order) {
  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: config.web3formsAccessKey,
        subject: `New Order #${order.id} — ${order.product_name}`,
        from_name: 'House of PurviSurbhi',
        message: `
New order received!

Order ID: ${order.id}
Product: ${order.product_name}
Price: ₹${order.product_price ? order.product_price.toLocaleString('en-IN') : 'N/A'}

Customer Details:
Name: ${order.customer_name}
Email: ${order.customer_email || 'Not provided'}
Phone: ${order.customer_phone}
Address: ${order.customer_address}

Placed at: ${order.created_at}
        `.trim(),
      }),
    });
    const data = await response.json();
    if (!data.success) {
      console.error('Web3Forms email failed:', data);
    } else {
      console.log(`Order email sent for order #${order.id}`);
    }
  } catch (err) {
    console.error('Failed to send order email:', err.message);
  }
}

// GET /api/orders — list all orders, newest first (auth required)
router.get('/', requireAuth, (req, res) => {
  const orders = queryAll('SELECT * FROM orders ORDER BY created_at DESC');
  return res.json(orders);
});

// POST /api/orders — create a new order (public)
router.post('/', async (req, res) => {
  const {
    product_id,
    product_name,
    product_price,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
  } = req.body;

  if (!customer_name || !customer_phone || !customer_address) {
    return res.status(400).json({
      success: false,
      message: 'customer_name, customer_phone, and customer_address are required.',
    });
  }

  // Check stock
  if (product_id) {
    const product = queryOne('SELECT stock FROM products WHERE id = ?', [product_id]);
    if (!product || product.stock <= 0) {
      return res.status(400).json({ success: false, message: 'Product is out of stock.' });
    }
  }

  const result = runSql(
    'INSERT INTO orders (product_id, product_name, product_price, customer_name, customer_email, customer_phone, customer_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      product_id || null,
      product_name || null,
      product_price ? Number(product_price) : null,
      customer_name,
      customer_email || null,
      customer_phone,
      customer_address,
    ]
  );
  
  saveDatabase();

  const newOrder = queryOne('SELECT * FROM orders WHERE id = ?', [result.lastId]);

  // Send email notification (fire-and-forget)
  sendOrderEmail(newOrder);

  return res.status(201).json(newOrder);
});

// PATCH /api/orders/:id/status — update order status (auth required)
router.patch('/:id/status', requireAuth, (req, res) => {
  const existing = queryOne('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  const { status, payment_status, payment_mode, payment_reference, tracking_details } = req.body;
  const validStatuses = ['new', 'confirmed', 'delivered', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `status must be one of: ${validStatuses.join(', ')}`,
    });
  }

  // Handle stock adjustments based on status transitions
  if (existing.product_id) {
    const stockDeductedStatuses = ['confirmed', 'delivered'];
    const wasDeducted = stockDeductedStatuses.includes(existing.status);
    const willBeDeducted = stockDeductedStatuses.includes(status);

    if (!wasDeducted && willBeDeducted) {
      // check stock > 0, then decrement
      const product = queryOne('SELECT stock FROM products WHERE id = ?', [existing.product_id]);
      if (!product || product.stock <= 0) {
        return res.status(400).json({ success: false, message: 'Insufficient stock.' });
      }
      runSql('UPDATE products SET stock = stock - 1 WHERE id = ?', [existing.product_id]);
    }

    if (wasDeducted && !willBeDeducted) {
      // restore stock
      runSql('UPDATE products SET stock = stock + 1 WHERE id = ?', [existing.product_id]);
    }
  }

  runSql(
    'UPDATE orders SET status = ?, payment_status = ?, payment_mode = ?, payment_reference = ?, tracking_details = ? WHERE id = ?', 
    [
      status, 
      payment_status !== undefined ? payment_status : existing.payment_status,
      payment_mode !== undefined ? payment_mode : existing.payment_mode,
      payment_reference !== undefined ? payment_reference : existing.payment_reference,
      tracking_details !== undefined ? tracking_details : existing.tracking_details,
      Number(req.params.id)
    ]
  );
  saveDatabase();

  const updated = queryOne('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
  return res.json(updated);
});

export default router;
