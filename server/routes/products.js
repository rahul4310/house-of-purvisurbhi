import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { queryAll, queryOne, runSql, saveDatabase } from '../database.js';

const router = Router();

import { requireAuth } from './auth.js';

import { resolveStoragePaths } from '../storagePaths.js';
const { uploadsDir } = resolveStoragePaths();

import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIMES,
  MAX_FILE_SIZE,
  MAX_FILE_COUNT,
  validateAndFinalizeUploads,
  cleanupFiles,
} from '../uploadValidator.js';

// --- Multer setup ---

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, _file, cb) => {
    // Write with .tmp extension; renamed to detected type after magic-byte validation
    cb(null, `product-${crypto.randomUUID()}.tmp`);
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
    }
    cb(null, true);
  },
});

/**
 * Upload middleware: runs Multer, then validates magic bytes and renames files.
 * On any failure, cleans up ALL written files and returns a JSON error.
 * Invalid uploads never reach the route handler — no product record is created/updated.
 */
function handleUpload(req, res, next) {
  multerUpload.array('images', MAX_FILE_COUNT)(req, res, (err) => {
    if (err) {
      // Clean up any files already written before the error
      if (req.files && req.files.length > 0) {
        cleanupFiles(req.files);
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'File size exceeds the 5 MB limit.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: 'Maximum 5 images per product.' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Invalid upload.' });
    }

    // No files uploaded — that's fine, proceed to route handler
    if (!req.files || req.files.length === 0) {
      return next();
    }

    // Validate magic bytes and rename from .tmp to detected extension
    const result = validateAndFinalizeUploads(req.files, uploadsDir);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.error });
    }

    next();
  });
}

// GET /api/products — list all products with optional filters
router.get('/', (req, res) => {
  const { category, search, available } = req.query;

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  // Hide inactive products unless admin requests all
  if (req.query.all !== 'true') {
    sql += ' AND active = 1';
  }

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
  const product = queryOne('SELECT * FROM products WHERE id = ? AND active = 1', [Number(req.params.id)]);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  return res.json(product);
});

// POST /api/products — create new product (auth required)
router.post('/', requireAuth, handleUpload, (req, res) => {
  const { name, category, price, description, stock } = req.body;

  if (!name || !category || !price) {
    return res.status(400).json({ success: false, message: 'name, category, and price are required.' });
  }

  let image_url = null;
  let additional_images = [];

  if (req.files && req.files.length > 0) {
    image_url = `/uploads/${req.files[0].filename}`;
    additional_images = req.files.slice(1).map(f => `/uploads/${f.filename}`);
  }

  const initialStock = stock !== undefined ? Number(stock) : 1;

  const result = runSql(
    'INSERT INTO products (name, category, price, stock, description, image_url, additional_images) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, category, Number(price), initialStock, description || null, image_url, JSON.stringify(additional_images)]
  );
  saveDatabase();

  const newProduct = queryOne('SELECT * FROM products WHERE id = ?', [result.lastId]);
  return res.status(201).json(newProduct);
});

// PUT /api/products/:id — update product (auth required)
router.put('/:id', requireAuth, handleUpload, (req, res) => {
  const existing = queryOne('SELECT * FROM products WHERE id = ?', [Number(req.params.id)]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  const { name, category, price, description, stock } = req.body;
  
  let image_url = existing.image_url;
  let additional_images = existing.additional_images;

  // If new files were uploaded, replace the old ones entirely
  if (req.files && req.files.length > 0) {
    image_url = `/uploads/${req.files[0].filename}`;
    additional_images = JSON.stringify(req.files.slice(1).map(f => `/uploads/${f.filename}`));
  }

  runSql(
    'UPDATE products SET name = ?, category = ?, price = ?, stock = ?, description = ?, image_url = ?, additional_images = ? WHERE id = ?',
    [
      name || existing.name,
      category || existing.category,
      price ? Number(price) : existing.price,
      stock !== undefined ? Number(stock) : existing.stock,
      description !== undefined ? description : existing.description,
      image_url,
      additional_images,
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

  runSql('UPDATE products SET active = 0 WHERE id = ?', [Number(req.params.id)]);
  saveDatabase();
  return res.json({ success: true, message: 'Product deleted.' });
});



export default router;
