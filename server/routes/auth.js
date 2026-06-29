import { Router } from 'express';

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'purvisurbhi2024';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-token-purvisurbhi';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid password.' });
  }

  return res.json({ success: true, token: ADMIN_TOKEN });
});

export default router;
