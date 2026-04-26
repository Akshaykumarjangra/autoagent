/**
 * X (Twitter) API v2 posting via OAuth 1.0a User Context.
 * Free tier limits: ~500 posts / month / user. Plenty.
 *
 * Requires all four:
 *   X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */
import crypto from 'crypto';
import fetch from 'node-fetch';

const POST_TWEET_URL = 'https://api.twitter.com/2/tweets';
const VERIFY_URL = 'https://api.twitter.com/2/users/me';

function creds() {
  const c = {
    consumerKey:    process.env.X_CONSUMER_KEY,
    consumerSecret: process.env.X_CONSUMER_SECRET,
    accessToken:        process.env.X_ACCESS_TOKEN,
    accessTokenSecret:  process.env.X_ACCESS_TOKEN_SECRET,
  };
  for (const k of Object.keys(c)) if (!c[k]) throw new Error(`X creds missing: ${k}`);
  return c;
}

export function isConfigured() {
  return !!(process.env.X_CONSUMER_KEY && process.env.X_CONSUMER_SECRET
         && process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_TOKEN_SECRET);
}

function pctEncode(s) {
  return encodeURIComponent(String(s)).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Build OAuth 1.0a Authorization header.
 * For POST with JSON body, the body is NOT included in the signature base
 * (only query params are). Per RFC 5849 § 3.4.1.3.1.
 */
function oauthHeader(method, url, queryParams = {}) {
  const c = creds();
  const oauth = {
    oauth_consumer_key:     c.consumerKey,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            c.accessToken,
    oauth_version:          '1.0',
  };

  const allParams = { ...queryParams, ...oauth };
  const paramString = Object.keys(allParams).sort()
    .map(k => `${pctEncode(k)}=${pctEncode(allParams[k])}`).join('&');

  const base = [method.toUpperCase(), pctEncode(url), pctEncode(paramString)].join('&');
  const signingKey = `${pctEncode(c.consumerSecret)}&${pctEncode(c.accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64');
  oauth.oauth_signature = signature;

  const header = 'OAuth ' + Object.keys(oauth).sort()
    .map(k => `${pctEncode(k)}="${pctEncode(oauth[k])}"`).join(', ');
  return header;
}

export async function verifyCredentials() {
  if (!isConfigured()) throw new Error('X not configured');
  const r = await fetch(VERIFY_URL, { headers: { Authorization: oauthHeader('GET', VERIFY_URL) } });
  const data = await r.json();
  if (!r.ok) throw new Error(`X verify failed ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Post a single tweet. Returns { id, text }.
 */
export async function postTweet(text) {
  if (!isConfigured()) throw new Error('X not configured');
  const body = JSON.stringify({ text });
  const r = await fetch(POST_TWEET_URL, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader('POST', POST_TWEET_URL),
      'Content-Type': 'application/json',
    },
    body,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`X post failed ${r.status}: ${JSON.stringify(data)}`);
  return data.data; // { id, text }
}
