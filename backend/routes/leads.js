/**
 * Lead capture — visitors who don't buy can leave their email.
 * Public endpoint. De-dupes on email.
 */
import { Router } from 'express';
import { getDb } from '../db/init.js';

const router = Router();

router.post('/', (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const source = String(req.body?.source || 'unknown').slice(0, 100);
    const topic  = String(req.body?.topic || '').slice(0, 500);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString().split(',')[0].trim();

    const db = getDb();
    const existing = db.prepare('SELECT id FROM leads WHERE email = ?').get(email);
    if (!existing) {
      db.prepare('INSERT INTO leads (email, source, topic, ip_address) VALUES (?, ?, ?, ?)').run(email, source, topic, ip);
    }
    db.close();
    res.json({ ok: true, deduped: !!existing });
  } catch (err) {
    console.error('[Leads] error:', err);
    res.status(500).json({ error: 'Failed to capture lead' });
  }
});

router.get('/count', (req, res) => {
  const db = getDb();
  const { c } = db.prepare('SELECT COUNT(*) as c FROM leads').get();
  db.close();
  res.json({ total: c });
});

export default router;
