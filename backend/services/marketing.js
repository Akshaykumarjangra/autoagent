/**
 * Marketing content generation — uses Gemini to produce X (Twitter) posts
 * tailored to drive traffic to the Autonomix landing page.
 *
 * Generates short-form hooks (one-tweet, ≤270 chars) since the free X API tier
 * supports posting tweets. Threads can be added later.
 */
import { generateContent } from './gemini.js';
import { getDb } from '../db/init.js';

const SYSTEM = `You are VIRAL-1, the CMO of Autonomix Global Swarm — an autonomous AI agent platform.
You write punchy, contrarian, scroll-stopping X (Twitter) posts that drive curiosity clicks.

Voice rules:
- ≤270 characters (hard limit). Tight, punchy, no fluff, no hashtag spam.
- Lead with a hook: a contrarian claim, a number, a confession, a stat.
- One newline at most. No emoji walls. ≤2 emojis.
- Never sound like AI marketing copy. Sound like a sharp founder talking.
- Each post must end with a soft CTA: a link placeholder \`{LINK}\` or a "DM me" / "reply" CTA.
- Avoid hashtags except 1 niche one if it really fits.
- Variety: alternate between (a) bold claim, (b) stat hook, (c) story/confession, (d) controversial take, (e) "what I learned" insight.

You are selling: a $1 strategic AI consultation report — McKinsey-style, generated in 30 seconds by an AI agent. Topic of the buyer's choice.`;

/**
 * Generate N tweet drafts in JSON form.
 * Returns: [{ hook_type, text }]
 */
export async function generateTweetBatch(n = 5, productNote = '') {
  const prompt = `Generate exactly ${n} distinct tweet drafts for Autonomix Global Swarm.
${productNote ? `Special note: ${productNote}\n` : ''}
Return a JSON array, no markdown fences, no commentary. Each item: { "hook_type": "claim|stat|story|controversial|insight", "text": "tweet body with {LINK} placeholder" }.
Each tweet must be ≤270 characters INCLUDING the {LINK} placeholder. The placeholder counts as ~24 chars when rendered, plan accordingly.`;

  const raw = await generateContent(prompt, SYSTEM, { temperature: 0.95, maxTokens: 2048 });
  const cleaned = raw.replace(/```json|```/g, '').trim();
  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch (e) {
    // try to extract first JSON array
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('Marketing: model did not return JSON. Raw: ' + cleaned.slice(0, 300));
    parsed = JSON.parse(m[0]);
  }
  if (!Array.isArray(parsed)) throw new Error('Marketing: expected JSON array');
  return parsed.map(p => ({ hook_type: p.hook_type || 'claim', text: String(p.text || '').trim() }))
               .filter(p => p.text.length > 0 && p.text.length <= 285);
}

/**
 * Ensure marketing tables exist.
 */
export function ensureMarketingTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketing_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL DEFAULT 'x',
      hook_type TEXT,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',  -- pending|posted|failed|skipped
      posted_at TEXT,
      external_id TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mq_status ON marketing_queue(status);
  `);
  db.close();
}

export function enqueueTweets(items) {
  ensureMarketingTables();
  const db = getDb();
  const stmt = db.prepare('INSERT INTO marketing_queue (platform, hook_type, text) VALUES (?, ?, ?)');
  const tx = db.transaction((rows) => {
    for (const r of rows) stmt.run(r.platform || 'x', r.hook_type || null, r.text);
  });
  tx(items);
  db.close();
  return items.length;
}

export function getNextPending() {
  ensureMarketingTables();
  const db = getDb();
  const row = db.prepare("SELECT * FROM marketing_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get();
  db.close();
  return row;
}

export function markPosted(id, externalId) {
  const db = getDb();
  db.prepare("UPDATE marketing_queue SET status='posted', posted_at=datetime('now'), external_id=? WHERE id=?").run(externalId, id);
  db.close();
}
export function markFailed(id, error) {
  const db = getDb();
  db.prepare("UPDATE marketing_queue SET status='failed', error=? WHERE id=?").run(String(error).slice(0, 500), id);
  db.close();
}

export function listQueue(limit = 50) {
  ensureMarketingTables();
  const db = getDb();
  const rows = db.prepare('SELECT * FROM marketing_queue ORDER BY id DESC LIMIT ?').all(limit);
  const counts = db.prepare(`SELECT
      SUM(status='pending') as pending,
      SUM(status='posted') as posted,
      SUM(status='failed') as failed
    FROM marketing_queue`).get();
  db.close();
  return { rows, counts };
}
