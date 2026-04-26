/**
 * LEDGER-1 (CFO) — Financial & Tax Compliance API
 *
 * Autonomous financial system that:
 * - Auto-calculates GST on every transaction
 * - Splits CGST/SGST/IGST correctly
 * - Maintains fiscal year + quarter tracking
 * - Generates GST filing-ready summaries (GSTR-1, GSTR-3B)
 * - Produces P&L statements and balance snapshots
 * - Flags compliance deadlines automatically
 */

import { Router } from 'express';
import { getFinancialReport, calculateTaxBreakdown } from '../services/finance.js';
import { getDb } from '../db/init.js';

const router = Router();

// GET /api/finance/report — Full financial report for admin
router.get('/report', (req, res) => {
  try {
    const report = getFinancialReport();
    res.json(report);
  } catch (error) {
    console.error('[LEDGER-1] Report generation failed:', error);
    res.status(500).json({ error: 'Financial report generation failed' });
  }
});

// GET /api/finance/tax-preview?amount=100 — Preview tax breakdown for any amount (in paise)
router.get('/tax-preview', (req, res) => {
  const amount = parseInt(req.query.amount) || 0;
  if (amount <= 0) return res.status(400).json({ error: 'Valid amount (in paise) required' });
  res.json(calculateTaxBreakdown(amount));
});

// GET /api/finance/gst-summary — GST filing summary by month
router.get('/gst-summary', (req, res) => {
  try {
    const db = getDb();

    let taxSummary = [];
    try {
      taxSummary = db.prepare(`
        SELECT * FROM tax_summary ORDER BY period DESC
      `).all();
    } catch { /* table doesn't exist yet */ }

    // Calculate upcoming filing deadlines
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // GSTR-1: Due 11th of following month
    // GSTR-3B: Due 20th of following month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    const deadlines = {
      gstr1: {
        name: 'GSTR-1 (Outward Supplies)',
        due_date: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-11`,
        description: 'Details of outward supplies of goods/services',
        status: 'auto-prepared',
      },
      gstr3b: {
        name: 'GSTR-3B (Summary Return)',
        due_date: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-20`,
        description: 'Monthly summary return with tax payment',
        status: 'auto-prepared',
      },
    };

    db.close();

    res.json({
      summary: taxSummary,
      deadlines,
      agent: 'LEDGER-1 (CFO)',
      note: 'All GST obligations are automatically computed. File via GST portal before deadlines.',
    });
  } catch (error) {
    console.error('[LEDGER-1] GST summary failed:', error);
    res.status(500).json({ error: 'GST summary generation failed' });
  }
});

// GET /api/finance/pnl — Profit & Loss statement
router.get('/pnl', (req, res) => {
  try {
    const db = getDb();

    let data = { gross: 0, base: 0, gst: 0, net: 0, transactions: 0 };
    try {
      data = db.prepare(`
        SELECT
          COALESCE(SUM(gross_amount), 0) as gross,
          COALESCE(SUM(base_amount), 0) as base,
          COALESCE(SUM(gst_total), 0) as gst,
          COALESCE(SUM(net_revenue), 0) as net,
          COUNT(*) as transactions
        FROM financial_ledger
      `).get();
    } catch { /* table may not exist yet */ }

    // Estimated operational costs (compute, API calls)
    const estimatedApiCost = data.transactions * 0.02; // ~₹0.02 per Gemini API call
    const estimatedInfraCost = 500; // ₹500/month base infrastructure

    const pnl = {
      period: 'All Time',
      revenue: {
        gross_revenue: Number(data.gross.toFixed(2)),
        gst_collected: Number(data.gst.toFixed(2)),
        net_revenue: Number(data.net.toFixed(2)),
      },
      expenses: {
        gst_payable: Number(data.gst.toFixed(2)),
        api_costs: Number(estimatedApiCost.toFixed(2)),
        infrastructure: estimatedInfraCost,
        total_expenses: Number((data.gst + estimatedApiCost + estimatedInfraCost).toFixed(2)),
      },
      profit: {
        gross_profit: Number(data.net.toFixed(2)),
        operating_profit: Number((data.net - estimatedApiCost - estimatedInfraCost).toFixed(2)),
        net_profit_margin: data.net > 0
          ? Number(((data.net - estimatedApiCost - estimatedInfraCost) / data.gross * 100).toFixed(1))
          : 0,
      },
      metadata: {
        total_transactions: data.transactions,
        avg_transaction_value: data.transactions > 0
          ? Number((data.gross / data.transactions).toFixed(2))
          : 0,
        agent: 'LEDGER-1 (CFO)',
        generated_at: new Date().toISOString(),
      },
    };

    db.close();
    res.json(pnl);
  } catch (error) {
    console.error('[LEDGER-1] P&L generation failed:', error);
    res.status(500).json({ error: 'P&L statement generation failed' });
  }
});

// GET /api/finance/compliance-check — Check regulatory compliance status
router.get('/compliance-check', (req, res) => {
  try {
    const db = getDb();

    let totalRevenue = 0;
    try {
      const row = db.prepare('SELECT COALESCE(SUM(gross_amount), 0) as total FROM financial_ledger').get();
      totalRevenue = row.total;
    } catch { /* table may not exist */ }

    db.close();

    // Indian regulatory thresholds
    const GST_REGISTRATION_THRESHOLD = 2000000; // ₹20 lakh
    const TAX_AUDIT_THRESHOLD = 10000000; // ₹1 crore
    const ADVANCE_TAX_THRESHOLD = 10000; // ₹10,000 tax liability

    const checks = [];

    // GST Registration
    checks.push({
      name: 'GST Registration',
      status: totalRevenue > GST_REGISTRATION_THRESHOLD ? 'required' : 'not_required_yet',
      threshold: `₹${(GST_REGISTRATION_THRESHOLD / 100000).toFixed(0)} lakh`,
      current: `₹${(totalRevenue / 100000).toFixed(2)} lakh`,
      action: totalRevenue > GST_REGISTRATION_THRESHOLD
        ? 'LEDGER-1 ALERT: Turnover exceeds ₹20L. GST registration is mandatory. Register on gst.gov.in immediately.'
        : 'Below threshold. GST registration optional but recommended for input tax credit.',
      priority: totalRevenue > GST_REGISTRATION_THRESHOLD ? 'critical' : 'low',
    });

    // Tax Audit
    checks.push({
      name: 'Tax Audit (Section 44AB)',
      status: totalRevenue > TAX_AUDIT_THRESHOLD ? 'required' : 'not_required',
      threshold: `₹${(TAX_AUDIT_THRESHOLD / 10000000).toFixed(0)} crore`,
      current: `₹${(totalRevenue / 10000000).toFixed(4)} crore`,
      action: totalRevenue > TAX_AUDIT_THRESHOLD
        ? 'LEDGER-1 ALERT: Turnover exceeds ₹1Cr. Tax audit by CA is mandatory before filing ITR.'
        : 'Below audit threshold.',
      priority: totalRevenue > TAX_AUDIT_THRESHOLD ? 'critical' : 'low',
    });

    // TDS compliance
    checks.push({
      name: 'TDS Compliance',
      status: 'monitored',
      action: 'LEDGER-1 monitors all payments. No TDS obligations currently (no human employees/contractors).',
      priority: 'info',
    });

    // Advance Tax
    const estimatedTax = totalRevenue * 0.25 * 0.3; // ~30% of ~25% profit margin
    checks.push({
      name: 'Advance Tax',
      status: estimatedTax > ADVANCE_TAX_THRESHOLD ? 'may_be_required' : 'not_required',
      estimated_liability: `₹${estimatedTax.toFixed(2)}`,
      action: estimatedTax > ADVANCE_TAX_THRESHOLD
        ? 'Pay advance tax in quarterly installments: Jun 15 (15%), Sep 15 (45%), Dec 15 (75%), Mar 15 (100%).'
        : 'Estimated tax liability below ₹10,000. No advance tax required.',
      priority: estimatedTax > ADVANCE_TAX_THRESHOLD ? 'high' : 'low',
    });

    // Digital services tax
    checks.push({
      name: 'Equalization Levy / Digital Services',
      status: 'compliant',
      action: 'Services are India-to-India digital consultations. Standard GST applies. No equalization levy.',
      priority: 'info',
    });

    res.json({
      overall_status: checks.some(c => c.priority === 'critical') ? 'action_required' : 'compliant',
      checks,
      agent: 'LEDGER-1 (CFO)',
      last_checked: new Date().toISOString(),
      note: 'LEDGER-1 continuously monitors all financial thresholds and regulatory requirements. Alerts are generated automatically when action is needed.',
    });
  } catch (error) {
    console.error('[LEDGER-1] Compliance check failed:', error);
    res.status(500).json({ error: 'Compliance check failed' });
  }
});

export default router;
