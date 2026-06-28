import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Serve static frontend files (Vite build output)
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Serve uploaded images as static files at /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve seed images as static files at /images
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'House of PurviSurbhi API' });
});

// --- SPA Fallback ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// --- Global error handler ---
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// --- Initialize database and start server ---
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized successfully.');

    app.listen(PORT, () => {
      console.log(`House of PurviSurbhi API server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
