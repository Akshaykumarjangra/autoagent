/**
 * Crypto payment routes (NOWPayments).
 *
 * Flow:
 *   1. Client POST /api/payments/crypto/create-invoice with { tierId, customerEmail }
 *   2. Backend creates a payment row + an agent_tasks row + NOWPayments invoice.
 *   3. Client redirects to invoice_url. Customer pays in any supported coin.
 *   4. NOWPayments POSTs IPN to /api/payments/crypto/ipn.
 *   5. On status=finished, payment marked paid, agent task processed.
 *   6. Client polls /api/payments/crypto/status/:orderId.
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { createInvoice, verifyIpnSignature } from '../services/nowpayments.js';
import { processTask } from '../services/agents.js';

const router = Router();

// USD-priced tiers (mirrors INR tiers but priced for global crypto buyers)
const TIERS = {
  'matrix-consultation': { name: 'Matrix Consultation', priceUsd: 1, agentType: 'consultation' },
  'basic-showcase':      { name: 'Basic Showcase',      priceUsd: 1, agentType: 'website' }, // launch price
  'omni-search':         { name: 'Omni-Search Domination', priceUsd: 6, agentType: 'consultation' },
  'c-suite-takeover':    { name: 'C-Suite Takeover',    priceUsd: 60, agentType: 'chat' },
};

router.get('/config', (req, res) => {
  res.json({
    tiers: Object.entries(TIERS).map(([id, t]) => ({ id, name: t.name, priceUsd: t.priceUsd })),
  });
});

// POST /api/payments/crypto/create-invoice
router.post('/create-invoice', async (req, res) => {
  try {
    const { tierId, customerEmail, customerName } = req.body;
    const tier = TIERS[tierId];
    if (!tier) return res.status(400).json({ error: 'Invalid tierId' });

    const orderId = `ax_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const taskId = `task_${orderId}`;

    const db = getDb();
    db.prepare(`INSERT INTO payments (id, razorpay_order_id, amount, currency, tier_name, status, customer_email, customer_name)
                VALUES (?, ?, ?, 'USD', ?, 'created', ?, ?)`)
      .run(orderId, orderId, Math.round(tier.priceUsd * 100), tier.name, customerEmail || null, customerName || null);
    db.prepare(`INSERT INTO agent_tasks (id, payment_id, type, status) VALUES (?, ?, ?, 'awaiting_payment')`)
      .run(taskId, orderId, tier.agentType);
    db.close();

    const baseUrl = process.env.PUBLIC_BASE_URL || `http://${process.env.API_BACKEND_HOST}:${process.env.API_BACKEND_PORT}`;
    const invoice = await createInvoice({
      orderId,
      priceUsd: tier.priceUsd,
      description: `${tier.name} — Autonomix`,
      ipnUrl: `${baseUrl}/api/payments/crypto/ipn`,
      successUrl: `${baseUrl}/?paid=${orderId}`,
      cancelUrl:  `${baseUrl}/?cancelled=${orderId}`,
    });

    res.json({ orderId, taskId, invoiceUrl: invoice.invoice_url, invoiceId: invoice.id });
  } catch (err) {
    console.error('[Crypto] create-invoice error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/crypto/status/:orderId
router.get('/status/:orderId', (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT id, status, tier_name, amount, agent_task_id FROM payments WHERE id = ?').get(req.params.orderId);
  const t = p ? db.prepare('SELECT id, type, status, output_data FROM agent_tasks WHERE payment_id = ?').get(req.params.orderId) : null;
  db.close();
  if (!p) return res.status(404).json({ error: 'Order not found' });
  res.json({ payment: p, task: t });
});

// POST /api/payments/crypto/ipn — NOWPayments webhook
router.post('/ipn', (req, res) => {
  const raw = req.body instanceof Buffer ? req.body.toString('utf8')
            : typeof req.body === 'string' ? req.body
            : JSON.stringify(req.body);
  const sig = req.headers['x-nowpayments-sig'];
  const verify = verifyIpnSignature(raw, sig);
  if (!verify.ok) {
    console.warn('[Crypto IPN] Rejected:', verify.reason);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let payload;
  try { payload = JSON.parse(raw); }
  catch { return res.status(400).json({ error: 'Bad JSON' }); }

  const { order_id, payment_status } = payload;
  console.log('[Crypto IPN]', order_id, payment_status);

  const db = getDb();
  const payment = db.prepare('SELECT id FROM payments WHERE id = ?').get(order_id);
  if (!payment) {
    db.close();
    return res.json({ ok: true, note: 'unknown order' });
  }

  // map NOWPayments statuses
  const newStatus =
    payment_status === 'finished'  ? 'paid' :
    payment_status === 'partially_paid' ? 'partial' :
    payment_status === 'failed' || payment_status === 'expired' || payment_status === 'refunded' ? 'failed' :
    'pending';

  db.prepare('UPDATE payments SET status = ?, razorpay_payment_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(newStatus, payload.payment_id ? String(payload.payment_id) : null, order_id);

  if (newStatus === 'paid') {
    const task = db.prepare('SELECT id, status FROM agent_tasks WHERE payment_id = ?').get(order_id);
    if (task && task.status === 'awaiting_payment') {
      db.prepare('UPDATE agent_tasks SET status = ? WHERE id = ?').run('pending', task.id);
      // process async — caller doesn't wait
      processTask(task.id).catch(e => console.error('[Crypto IPN] processTask error:', e));
    }
  }

  db.close();
  res.json({ ok: true });
});

export default router;
