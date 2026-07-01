import express from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const router = express.Router();

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window`
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export function requireAuth(req, res, next) {
  const token = req.signedCookies.adminToken;
  if (!token || token !== config.adminToken) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  next();
}

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  if (password !== config.adminPassword) {
    return res.status(401).json({ success: false, message: 'Invalid password.' });
  }

  // Set secure cookie
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('adminToken', config.adminToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    signed: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  return res.json({ success: true });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('adminToken');
  return res.json({ success: true });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  const token = req.signedCookies.adminToken;
  if (token && token === config.adminToken) {
    return res.json({ success: true, authenticated: true });
  }
  return res.json({ success: true, authenticated: false });
});

export default router;
