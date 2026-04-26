import { Router } from 'express';
import { generateAdminToken, verifyAdminEmail } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/admin-login
router.post('/admin-login', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!verifyAdminEmail(email)) {
    return res.status(403).json({ error: 'Access Denied. Unauthorized identity. Incident logged.' });
  }

  const token = generateAdminToken(email);

  res.json({
    success: true,
    token,
    email,
    expiresIn: '24h',
  });
});

export default router;
