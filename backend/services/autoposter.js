/**
 * Autoposter — drips one queued tweet at a time on a fixed interval.
 * Refills the queue from Gemini when it runs low.
 */
import { generateTweetBatch, enqueueTweets, getNextPending, markPosted, markFailed, ensureMarketingTables } from './marketing.js';
import { postTweet, isConfigured as xConfigured } from './x.js';
import { getDb } from '../db/init.js';

let timer = null;
let running = false;

function publicLink() {
  return process.env.PUBLIC_BASE_URL || `http://localhost:5173`;
}

function renderTweet(text) {
  // Replace {LINK} with the public URL; trim to 280 chars hard cap.
  const link = publicLink();
  let out = text.replace(/\{LINK\}/g, link).trim();
  if (out.length > 280) out = out.slice(0, 277) + '...';
  return out;
}

async function ensureBacklog(min = 3) {
  ensureMarketingTables();
  const db = getDb();
  const { c } = db.prepare("SELECT COUNT(*) as c FROM marketing_queue WHERE status='pending'").get();
  db.close();
  if (c >= min) return c;
  console.log(`[Autoposter] Backlog low (${c}), generating fresh batch...`);
  try {
    const batch = await generateTweetBatch(8);
    enqueueTweets(batch);
    console.log(`[Autoposter] Enqueued ${batch.length} new drafts.`);
    return c + batch.length;
  } catch (e) {
    console.error('[Autoposter] Generation failed:', e.message);
    return c;
  }
}

export async function tickOnce() {
  if (running) return { skipped: true, reason: 'already running' };
  running = true;
  try {
    if (!xConfigured()) return { skipped: true, reason: 'X not configured' };
    await ensureBacklog(3);
    const next = getNextPending();
    if (!next) return { skipped: true, reason: 'no pending posts' };
    const text = renderTweet(next.text);
    try {
      const result = await postTweet(text);
      markPosted(next.id, result?.id || null);
      console.log(`[Autoposter] Posted #${next.id} → ${result?.id}`);
      return { posted: true, id: next.id, externalId: result?.id, text };
    } catch (e) {
      markFailed(next.id, e.message);
      console.error('[Autoposter] Post failed:', e.message);
      return { posted: false, id: next.id, error: e.message };
    }
  } finally {
    running = false;
  }
}

export function start() {
  const enabled = (process.env.X_AUTOPOST_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) {
    console.log('[Autoposter] Disabled (set X_AUTOPOST_ENABLED=true to enable).');
    return;
  }
  if (!xConfigured()) {
    console.log('[Autoposter] X not configured — skipping start.');
    return;
  }
  const minutes = Math.max(5, parseInt(process.env.X_AUTOPOST_INTERVAL_MIN || '30', 10));
  const ms = minutes * 60 * 1000;
  if (timer) clearInterval(timer);
  console.log(`[Autoposter] Starting — every ${minutes} minutes.`);
  // Fire one shortly after boot, then on interval.
  setTimeout(() => tickOnce().catch(e => console.error(e)), 15_000);
  timer = setInterval(() => tickOnce().catch(e => console.error(e)), ms);
}

export function stop() {
  if (timer) { clearInterval(timer); timer = null; }
}
