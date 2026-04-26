/**
 * NOWPayments integration — create hosted crypto invoices and verify IPN webhooks.
 * Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
 */
import fetch from 'node-fetch';
import crypto from 'crypto';

const API_BASE = 'https://api.nowpayments.io/v1';

function getApiKey() {
  const k = process.env.NOWPAYMENTS_API_KEY;
  if (!k) throw new Error('NOWPAYMENTS_API_KEY not set');
  return k;
}

export async function ping() {
  const r = await fetch(`${API_BASE}/status`);
  return r.json();
}

/**
 * Create a hosted invoice. The customer is redirected to NOWPayments-hosted
 * checkout where they can pay in any supported crypto.
 */
export async function createInvoice({ orderId, priceUsd, description, ipnUrl, successUrl, cancelUrl }) {
  const body = {
    price_amount: priceUsd,
    price_currency: 'usd',
    // pay_currency omitted: lets the customer pick any supported coin at NOWPayments hosted checkout
    order_id: orderId,
    order_description: description,
    ipn_callback_url: ipnUrl,
    success_url: successUrl,
    cancel_url: cancelUrl,
    is_fixed_rate: true,
    is_fee_paid_by_user: true,
  };
  // Note: payout_address is configured on your NOWPayments account dashboard
  // (Settings → Payments / Wallets), not per-invoice on the standard plan.

  const r = await fetch(`${API_BASE}/invoice`, {
    method: 'POST',
    headers: { 'x-api-key': getApiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`NOWPayments invoice error: ${JSON.stringify(data)}`);
  return data; // { id, invoice_url, ... }
}

/**
 * Verify an IPN (webhook) signature.
 * NOWPayments signs the JSON body with HMAC-SHA512 using the IPN secret.
 * The body must be sorted alphabetically by key before HMAC.
 */
export function verifyIpnSignature(rawBodyString, signatureHeader) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return { ok: false, reason: 'IPN secret not configured' };
  if (!signatureHeader) return { ok: false, reason: 'Missing x-nowpayments-sig' };

  let parsed;
  try { parsed = JSON.parse(rawBodyString); }
  catch { return { ok: false, reason: 'Body not JSON' }; }

  const sorted = sortKeysDeep(parsed);
  const sortedString = JSON.stringify(sorted);
  const hmac = crypto.createHmac('sha512', secret).update(sortedString).digest('hex');
  return { ok: hmac === signatureHeader, reason: hmac === signatureHeader ? 'ok' : 'sig mismatch' };
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, k) => {
      acc[k] = sortKeysDeep(value[k]);
      return acc;
    }, {});
  }
  return value;
}
