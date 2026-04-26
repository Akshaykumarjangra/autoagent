/**
 * Admin marketing routes — generate tweet drafts, list queue, post next, verify X.
 */
import { Router } from 'express';
import { generateTweetBatch, enqueueTweets, listQueue, ensureMarketingTables } from '../services/marketing.js';
import { tickOnce, start as startAutoposter, stop as stopAutoposter } from '../services/autoposter.js';
import { verifyCredentials, isConfigured } from '../services/x.js';

const router = Router();

router.get('/status', async (req, res) => {
  ensureMarketingTables();
  let xUser = null, xError = null;
  if (isConfigured()) {
    try { xUser = await verifyCredentials(); }
    catch (e) { xError = e.message; }
  }
  res.json({
    xConfigured: isConfigured(),
    xUser: xUser?.data || null,
    xError,
    autopostEnabled: (process.env.X_AUTOPOST_ENABLED || 'false').toLowerCase() === 'true',
    intervalMin: parseInt(process.env.X_AUTOPOST_INTERVAL_MIN || '30', 10),
  });
});

router.post('/generate', async (req, res) => {
  try {
    const n = Math.min(20, parseInt(req.body?.count || '5', 10));
    const note = req.body?.note || '';
    const batch = await generateTweetBatch(n, note);
    enqueueTweets(batch);
    res.json({ generated: batch.length, items: batch });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/queue', (req, res) => {
  res.json(listQueue(parseInt(req.query.limit || '50', 10)));
});

router.post('/tick', async (req, res) => {
  const result = await tickOnce();
  res.json(result);
});

router.post('/autoposter/start', (req, res) => {
  process.env.X_AUTOPOST_ENABLED = 'true';
  startAutoposter();
  res.json({ ok: true });
});
router.post('/autoposter/stop', (req, res) => {
  stopAutoposter();
  process.env.X_AUTOPOST_ENABLED = 'false';
  res.json({ ok: true });
});

export default router;
