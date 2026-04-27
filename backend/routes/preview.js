/**
 * Free preview endpoint — returns a 200-word teaser report from ORACLE-7
 * to demonstrate quality before paywall. Rate-limited per IP.
 *
 * Also captures emails from non-buyers via /api/leads.
 */
import { Router } from 'express';
import { generateContent } from '../services/gemini.js';
import { getDb } from '../db/init.js';

const router = Router();

const PREVIEW_SYSTEM = `You are ORACLE-7, the Chief Consulting Officer of Autonomix Global Swarm.
You write a TEASER consultation preview (~200 words, NOT a full report) that demonstrates the quality of the full $1 paid version.

The preview MUST:
- Be exactly 180–220 words. Hard limit.
- Show 1 sharp insight + 1 specific data point + 1 actionable recommendation.
- End with a 1-line teaser: "The full report includes [3 specific things the preview did NOT cover]."
- Use clean Markdown headings (### only, no ##).
- Sound expensive — McKinsey voice, not blog voice.
- NEVER promise the full report's exact content; tease it.
- NO emojis. NO disclaimers. NO "as an AI" language.`;

// 5 previews per IP per day
function checkAndRecordPreviewUse(ip, topic) {
  const db = getDb();
  const since = "datetime('now', '-1 day')";
  const { c } = db.prepare(`SELECT COUNT(*) as c FROM preview_uses WHERE ip_address = ? AND created_at > ${since}`).get(ip);
  if (c >= 5) {
    db.close();
    return { allowed: false, count: c };
  }
  db.prepare('INSERT INTO preview_uses (ip_address, topic) VALUES (?, ?)').run(ip, topic);
  db.close();
  return { allowed: true, count: c + 1 };
}

router.post('/', async (req, res) => {
  try {
    const topic = String(req.body?.topic || '').trim();
    if (topic.length < 10) return res.status(400).json({ error: 'Topic must be at least 10 characters' });
    if (topic.length > 500) return res.status(400).json({ error: 'Topic too long' });

    const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString().split(',')[0].trim();
    const gate = checkAndRecordPreviewUse(ip, topic);
    if (!gate.allowed) {
      return res.status(429).json({ error: 'Free preview limit reached for today. Upgrade to the full report.', limit: 5 });
    }

    const text = await generateContent(
      `Topic: ${topic}\n\nWrite the 200-word teaser preview now.`,
      PREVIEW_SYSTEM,
      { temperature: 0.6, maxTokens: 600 }
    );

    res.json({ preview: text, remainingToday: Math.max(0, 5 - gate.count) });
  } catch (err) {
    console.error('[Preview] error:', err);
    res.status(500).json({ error: 'Preview generation failed. Try again.' });
  }
});

export default router;
