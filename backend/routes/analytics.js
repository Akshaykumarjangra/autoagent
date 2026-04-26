import { Router } from 'express';
import { getDb } from '../db/init.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/analytics/dashboard - full dashboard stats (admin only)
router.get('/dashboard', requireAdmin, (req, res) => {
  try {
    const db = getDb();

    // Revenue stats
    const revenue = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'captured' THEN amount ELSE 0 END), 0) as total_revenue,
        COUNT(CASE WHEN status = 'captured' THEN 1 END) as successful_payments,
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'captured' AND created_at >= datetime('now', '-7 days') THEN amount ELSE 0 END), 0) as week_revenue,
        COALESCE(SUM(CASE WHEN status = 'captured' AND created_at >= datetime('now', '-1 day') THEN amount ELSE 0 END), 0) as today_revenue
      FROM payments
    `).get();

    // Revenue by tier (which departments earn most)
    const revenueByTier = db.prepare(`
      SELECT tier_name, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments WHERE status = 'captured'
      GROUP BY tier_name ORDER BY total DESC
    `).all();

    // Agent task stats
    const taskStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM agent_tasks
    `).get();

    // Tasks by type (which departments are busiest)
    const tasksByType = db.prepare(`
      SELECT type, COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM agent_tasks GROUP BY type
    `).all();

    // RAG stats
    const ragStats = db.prepare(`
      SELECT
        COUNT(*) as total_documents,
        SUM(CASE WHEN status = 'embedded' THEN 1 ELSE 0 END) as embedded,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        COALESCE(SUM(chunk_count), 0) as total_chunks
      FROM documents
    `).get();

    // Daily revenue trend (last 30 days)
    const dailyRevenue = db.prepare(`
      SELECT date(created_at) as day, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as orders
      FROM payments WHERE status = 'captured' AND created_at >= datetime('now', '-30 days')
      GROUP BY date(created_at) ORDER BY day ASC
    `).all();

    // Recent activity
    const recentPayments = db.prepare(`
      SELECT id, tier_name, amount, currency, status, customer_email, created_at
      FROM payments ORDER BY created_at DESC LIMIT 10
    `).all();

    // Visitor/event counts
    const eventCounts = db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM analytics_events
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY event_type
    `).all();

    db.close();

    res.json({
      revenue: {
        ...revenue,
        total_revenue_display: (revenue.total_revenue / 100).toFixed(2),
        week_revenue_display: (revenue.week_revenue / 100).toFixed(2),
        today_revenue_display: (revenue.today_revenue / 100).toFixed(2),
      },
      revenueByTier,
      taskStats,
      tasksByType,
      ragStats,
      dailyRevenue,
      recentPayments,
      eventCounts,
    });
  } catch (error) {
    console.error('[Analytics] Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// POST /api/analytics/track - track a frontend event
router.post('/track', (req, res) => {
  try {
    const { eventType, eventData } = req.body;
    if (!eventType) return res.status(400).json({ error: 'eventType required' });

    const db = getDb();
    db.prepare(`
      INSERT INTO analytics_events (event_type, event_data, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
    `).run(eventType, JSON.stringify(eventData || {}), req.ip, req.get('user-agent'));
    db.close();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Tracking failed' });
  }
});

export default router;
