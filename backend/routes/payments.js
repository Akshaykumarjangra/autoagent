import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { recordFinancialTransaction, calculateTaxBreakdown } from '../services/finance.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Tier definitions (single source of truth)
const TIERS = {
  'matrix-consultation': { name: 'Matrix Consultation', amount: 100, currency: 'INR', agentType: 'consultation' },
  'basic-showcase': { name: 'Basic Showcase', amount: 5000, currency: 'INR', agentType: 'website' },
  'omni-search': { name: 'Omni-Search Domination', amount: 50000, currency: 'INR', agentType: 'consultation' },
  'c-suite-takeover': { name: 'C-Suite Takeover', amount: 500000, currency: 'INR', agentType: 'chat' },
};

// GET /api/payments/config - return public Razorpay key
router.get('/config', (req, res) => {
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    tiers: Object.entries(TIERS).map(([id, tier]) => ({
      id,
      name: tier.name,
      amount: tier.amount,
      currency: tier.currency,
    })),
  });
});

// POST /api/payments/create-order - create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { tierId, customerEmail, customerName } = req.body;
    const tier = TIERS[tierId];

    if (!tier) {
      return res.status(400).json({ error: 'Invalid tier selected' });
    }

    const orderOptions = {
      amount: tier.amount, // amount in smallest currency unit (paise)
      currency: tier.currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        tier_id: tierId,
        tier_name: tier.name,
        customer_email: customerEmail || '',
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    // Store in DB
    const db = getDb();
    const paymentId = uuidv4();
    db.prepare(`
      INSERT INTO payments (id, razorpay_order_id, amount, currency, tier_name, customer_email, customer_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'created')
    `).run(paymentId, order.id, tier.amount, tier.currency, tier.name, customerEmail || null, customerName || null);
    db.close();

    // Track analytics
    trackEvent(req, 'order_created', { tierId, amount: tier.amount });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId,
    });
  } catch (error) {
    console.error('[Payments] Order creation failed:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// POST /api/payments/verify - verify payment signature & trigger agent
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tierId } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const db = getDb();
    const tier = TIERS[tierId];

    // Update payment record
    db.prepare(`
      UPDATE payments
      SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'captured', updated_at = datetime('now')
      WHERE razorpay_order_id = ?
    `).run(razorpay_payment_id, razorpay_signature, razorpay_order_id);

    const payment = db.prepare('SELECT * FROM payments WHERE razorpay_order_id = ?').get(razorpay_order_id);

    // Create agent task
    const taskId = uuidv4();
    db.prepare(`
      INSERT INTO agent_tasks (id, payment_id, type, status, input_data)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(taskId, payment.id, tier?.agentType || 'consultation', JSON.stringify({ tierId }));

    // Link task to payment
    db.prepare('UPDATE payments SET agent_task_id = ? WHERE id = ?').run(taskId, payment.id);
    db.close();

    // ─── LEDGER-1: Automatic Financial Recording & Tax Compliance ───
    const taxBreakdown = recordFinancialTransaction(payment.id, tier.amount, tier.name);
    console.log(`[LEDGER-1] Tax recorded: Gross ₹${taxBreakdown.gross_amount} | GST ₹${taxBreakdown.gst_total} | Net ₹${taxBreakdown.net_revenue}`);

    trackEvent(req, 'payment_verified', { tierId, amount: tier?.amount, paymentId: razorpay_payment_id });

    res.json({
      success: true,
      paymentId: payment.id,
      taskId,
      agentType: tier?.agentType || 'consultation',
      taxBreakdown,
      message: 'Payment verified. Agent task queued. Tax auto-filed by LEDGER-1.',
    });
  } catch (error) {
    console.error('[Payments] Verification failed:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// POST /api/payments/webhook - Razorpay webhook handler
router.post('/webhook', (req, res) => {
  try {
    // Body may be raw Buffer (from express.raw) or parsed JSON
    let body;
    if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString('utf-8'));
    } else {
      body = req.body;
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature) {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = body.event;
    const payload = body.payload;

    const db = getDb();

    if (event === 'payment.captured') {
      const paymentEntity = payload.payment.entity;
      db.prepare(`
        UPDATE payments
        SET status = 'captured', razorpay_payment_id = ?, updated_at = datetime('now')
        WHERE razorpay_order_id = ?
      `).run(paymentEntity.id, paymentEntity.order_id);
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payment.entity;
      db.prepare(`
        UPDATE payments SET status = 'failed', updated_at = datetime('now')
        WHERE razorpay_order_id = ?
      `).run(paymentEntity.order_id);
    }

    db.close();
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('[Payments] Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// GET /api/payments/history - admin: list all payments
router.get('/history', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const payments = db.prepare(`
      SELECT p.*, t.type as agent_type, t.status as task_status
      FROM payments p
      LEFT JOIN agent_tasks t ON p.agent_task_id = t.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM payments').get();
    const revenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'captured'").get();

    db.close();

    res.json({
      payments,
      total: total.count,
      totalRevenue: revenue.total,
    });
  } catch (error) {
    console.error('[Payments] History fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

function trackEvent(req, eventType, eventData) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO analytics_events (event_type, event_data, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
    `).run(eventType, JSON.stringify(eventData), req.ip, req.get('user-agent'));
    db.close();
  } catch (e) {
    console.error('[Analytics] Event tracking failed:', e);
  }
}

export default router;
