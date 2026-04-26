/**
 * AUTONOMIX FINANCIAL CONTROLLER
 * Agent: LEDGER-1 (Chief Financial Officer)
 *
 * Handles automated tax regulation, GST calculation, financial reporting,
 * and compliance monitoring. All revenue through Razorpay is automatically
 * categorized, taxed, and logged for regulatory compliance.
 */

import { getDb } from '../db/init.js';

// Indian GST rate for digital services
const GST_RATE = 0.18; // 18% GST
const TDS_RATE = 0.10; // 10% TDS on professional services (for future use)

/**
 * Calculate tax breakdown for a payment
 */
export function calculateTaxBreakdown(amountInPaise) {
  const grossAmount = amountInPaise / 100; // Convert paise to rupees

  // GST is inclusive in the price (reverse calculation)
  const baseAmount = grossAmount / (1 + GST_RATE);
  const gstAmount = grossAmount - baseAmount;
  const cgst = gstAmount / 2; // Central GST
  const sgst = gstAmount / 2; // State GST (or IGST for inter-state)

  return {
    gross_amount: Number(grossAmount.toFixed(2)),
    base_amount: Number(baseAmount.toFixed(2)),
    gst_total: Number(gstAmount.toFixed(2)),
    cgst: Number(cgst.toFixed(2)),
    sgst: Number(sgst.toFixed(2)),
    gst_rate: GST_RATE * 100,
    net_revenue: Number(baseAmount.toFixed(2)), // What the company actually keeps
  };
}

/**
 * Record a financial transaction with full tax audit trail
 */
export function recordFinancialTransaction(paymentId, amountInPaise, tierName) {
  const tax = calculateTaxBreakdown(amountInPaise);
  const db = getDb();

  // Ensure the financial_ledger table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id TEXT NOT NULL,
      transaction_date TEXT DEFAULT (datetime('now')),
      fiscal_year TEXT,
      fiscal_quarter TEXT,
      tier_name TEXT,
      gross_amount REAL NOT NULL,
      base_amount REAL NOT NULL,
      gst_total REAL NOT NULL,
      cgst REAL NOT NULL,
      sgst REAL NOT NULL,
      gst_rate REAL NOT NULL,
      net_revenue REAL NOT NULL,
      status TEXT DEFAULT 'recorded',
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    );

    CREATE TABLE IF NOT EXISTS tax_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT UNIQUE NOT NULL,
      period_type TEXT NOT NULL,
      total_gross REAL DEFAULT 0,
      total_base REAL DEFAULT 0,
      total_gst REAL DEFAULT 0,
      total_cgst REAL DEFAULT 0,
      total_sgst REAL DEFAULT 0,
      total_transactions INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Determine fiscal year and quarter
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  const fiscalYear = month >= 4 ? `FY${year}-${year + 1}` : `FY${year - 1}-${year}`;
  const quarter = month >= 4 && month <= 6 ? 'Q1' :
                  month >= 7 && month <= 9 ? 'Q2' :
                  month >= 10 && month <= 12 ? 'Q3' : 'Q4';
  const fiscalQuarter = `${fiscalYear}-${quarter}`;

  // Record in ledger
  db.prepare(`
    INSERT INTO financial_ledger (payment_id, fiscal_year, fiscal_quarter, tier_name, gross_amount, base_amount, gst_total, cgst, sgst, gst_rate, net_revenue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(paymentId, fiscalYear, fiscalQuarter, tierName, tax.gross_amount, tax.base_amount, tax.gst_total, tax.cgst, tax.sgst, tax.gst_rate, tax.net_revenue);

  // Update monthly tax summary
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const existing = db.prepare('SELECT * FROM tax_summary WHERE period = ?').get(monthKey);

  if (existing) {
    db.prepare(`
      UPDATE tax_summary SET
        total_gross = total_gross + ?,
        total_base = total_base + ?,
        total_gst = total_gst + ?,
        total_cgst = total_cgst + ?,
        total_sgst = total_sgst + ?,
        total_transactions = total_transactions + 1,
        updated_at = datetime('now')
      WHERE period = ?
    `).run(tax.gross_amount, tax.base_amount, tax.gst_total, tax.cgst, tax.sgst, monthKey);
  } else {
    db.prepare(`
      INSERT INTO tax_summary (period, period_type, total_gross, total_base, total_gst, total_cgst, total_sgst, total_transactions)
      VALUES (?, 'monthly', ?, ?, ?, ?, ?, 1)
    `).run(monthKey, tax.gross_amount, tax.base_amount, tax.gst_total, tax.cgst, tax.sgst);
  }

  db.close();

  console.log(`[LEDGER-1] Recorded: ₹${tax.gross_amount} (Base: ₹${tax.base_amount}, GST: ₹${tax.gst_total}) for ${tierName}`);
  return tax;
}

/**
 * Get financial report (for admin dashboard)
 */
export function getFinancialReport() {
  const db = getDb();

  // Check if tables exist
  try {
    db.prepare("SELECT 1 FROM financial_ledger LIMIT 1").get();
  } catch {
    db.close();
    return { ledger: [], taxSummary: [], totals: { gross: 0, base: 0, gst: 0, net: 0, transactions: 0 } };
  }

  const ledger = db.prepare(`
    SELECT * FROM financial_ledger ORDER BY transaction_date DESC LIMIT 100
  `).all();

  const taxSummary = db.prepare(`
    SELECT * FROM tax_summary ORDER BY period DESC
  `).all();

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(gross_amount), 0) as gross,
      COALESCE(SUM(base_amount), 0) as base,
      COALESCE(SUM(gst_total), 0) as gst,
      COALESCE(SUM(net_revenue), 0) as net,
      COUNT(*) as transactions
    FROM financial_ledger
  `).get();

  // GST filing readiness
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthSummary = db.prepare('SELECT * FROM tax_summary WHERE period = ?').get(currentMonth);

  db.close();

  return {
    ledger,
    taxSummary,
    totals,
    currentMonth: currentMonthSummary || null,
    gstFilingStatus: {
      period: currentMonth,
      gstPayable: currentMonthSummary?.total_gst || 0,
      status: 'auto-calculated',
      note: 'LEDGER-1 has pre-computed all GST obligations. File GSTR-1 and GSTR-3B by the 20th of next month.',
    },
  };
}
