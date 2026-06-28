import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { queryAll, queryOne, runSql, saveDatabase } from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// --- Auth middleware ---
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer admin-token-purvisurbhi') {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  next();
}

// --- Multer setup ---
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    cb(null, extOk && mimeOk);
  },
});

// GET /api/products — list all products with optional filters
router.get('/', (req, res) => {
  const { category, search, available } = req.query;

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (available !== undefined) {
    sql += ' AND available = ?';
    params.push(Number(available));
  }

  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }

  sql += ' ORDER BY created_at DESC';

  const products = queryAll(sql, params);
  return res.json(products);
});

// GET /api/products/:id — single product
router.get('/:id', (req, res) => {
  const product = queryOne('SELECT * FROM products WHERE id = ?', [Number(req.params.id)]);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  return res.json(product);
});

// POST /api/products — create new product (auth required)
router.post('/', requireAuth, upload.single('image'), (req, res) => {
  const { name, category, price, description, stock } = req.body;

  if (!name || !category || !price) {
    return res.status(400).json({ success: false, message: 'name, category, and price are required.' });
  }

  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const initialStock = stock !== undefined ? Number(stock) : 1;

  const result = runSql(
    'INSERT INTO products (name, category, price, stock, description, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [name, category, Number(price), initialStock, description || null, image_url]
  );
  saveDatabase();

  const newProduct = queryOne('SELECT * FROM products WHERE id = ?', [result.lastId]);
  return res.status(201).json(newProduct);
});

// PUT /api/products/:id — update product (auth required)
router.put('/:id', requireAuth, upload.single('image'), (req, res) => {
  const existing = queryOne('SELECT * FROM products WHERE id = ?', [Number(req.params.id)]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const { name, category, price, description, stock } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : existing.image_url;

  runSql(
    'UPDATE products SET name = ?, category = ?, price = ?, stock = ?, description = ?, image_url = ? WHERE id = ?',
    [
      name || existing.name,
      category || existing.category,
      price ? Number(price) : existing.price,
      stock !== undefined ? Number(stock) : existing.stock,
      description !== undefined ? description : existing.description,
      image_url,
      Number(req.params.id),
    ]
  );
  saveDatabase();

  const updated = queryOne('SELECT * FROM products WHERE id = ?', [Number(req.params.id)]);
  return res.json(updated);
});

// DELETE /api/products/:id — delete product (auth required)
router.delete('/:id', requireAuth, (req, res) => {
  const existing = queryOne('SELECT * FROM products WHERE id = ?', [Number(req.params.id)]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  runSql('DELETE FROM products WHERE id = ?', [Number(req.params.id)]);
  saveDatabase();
  return res.json({ success: true, message: 'Product deleted.' });
});



export default router;
