// Updates Play listing text using Google Play Android Publisher API.
// Safe default: dry-run. Publishing requires --publish and explicit credentials.
// Requires Node 20+ and GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (JSON or base64-encoded JSON).
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const publish = process.argv.includes('--publish');
const packageName = 'com.currentflow.necalcul8r';
const directory = new URL('../play-listing/en-US/', import.meta.url);
const fields = ['title', 'short-description', 'full-description'];
const [title, shortDescription, fullDescription] = await Promise.all(fields.map(async name => (await fs.readFile(new URL(name + '.txt', directory), 'utf8')).trim()));
if (title.length > 30 || shortDescription.length > 80 || fullDescription.length > 4000) throw new Error('Play metadata character limit exceeded');
const listing = { language: 'en-US', title, shortDescription, fullDescription };
if (!publish) {
  console.log(JSON.stringify({ mode: 'dry-run', packageName, listing }, null, 2));
  process.exit(0);
}
const secret = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
if (!secret) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is required');
const credentials = JSON.parse(secret.trim().startsWith('{') ? secret : Buffer.from(secret, 'base64').toString('utf8'));
if (!credentials.client_email || !credentials.private_key) throw new Error('Invalid service account credentials');
const base64url = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const assertion = base64url({ alg: 'RS256', typ: 'JWT' }) + '.' + base64url({ iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
const signer = crypto.createSign('RSA-SHA256'); signer.update(assertion); signer.end();
const jwt = assertion + '.' + signer.sign(credentials.private_key, 'base64url');
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
if (!tokenResponse.ok) throw new Error('Google OAuth failed: HTTP ' + tokenResponse.status);
const { access_token: token } = await tokenResponse.json();
const api = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + packageName + '/edits';
const call = async (url, method, body) => {
  const response = await fetch(url, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) {
    // Google error responses may contain credentials or other sensitive details.
    // Emit only the documented reason and status, never request headers or tokens.
    let reason = 'unknown';
    let message = '';
    try {
      const payload = await response.json();
      const detail = payload?.error;
      reason = String(detail?.errors?.[0]?.reason ?? detail?.status ?? 'unknown').slice(0, 100);
      message = String(detail?.message ?? '').replace(/[\r\n]+/g, ' ').slice(0, 400);
    } catch {}
    const hint = response.status === 403
      ? ' Verify the service account has Play Console app access and the required Store presence permission for this package; also confirm the Android Publisher API is enabled for its Google Cloud project.'
      : '';
    throw new Error('Play API HTTP ' + response.status + ' (' + reason + ') at ' + method + ' ' + url.split('?')[0] + (message ? ': ' + message : '') + hint);
  }
  return response.json();
};
const edit = await call(api, 'POST');
await call(api + '/' + encodeURIComponent(edit.id) + '/listings/en-US', 'PUT', listing);
await call(api + '/' + encodeURIComponent(edit.id) + ':commit?changesNotSentForReview=true', 'POST');
console.log('Play listing edit committed; changes held for Play Console review/submission.');
