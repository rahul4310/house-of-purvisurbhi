import express from 'express';
import { config } from '../config.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  if (password !== config.adminPassword) {
    return res.status(401).json({ success: false, message: 'Invalid password.' });
  }

  return res.json({ success: true, token: config.adminToken });
});

export default router;
