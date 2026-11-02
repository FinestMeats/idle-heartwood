// GitHub Action entry point (.github/workflows/health-check.yml). Needs secrets FIREBASE_SERVICE_ACCOUNT and GITHUB_TOKEN.
// Read-only on Firestore: it only counts documents.
import admin from 'firebase-admin';
import { appendFileSync } from 'node:fs';
import { CHECKS, overLimit, report, alertIssue } from './health-lib.mjs';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (!sa.project_id) { console.error('FIREBASE_SERVICE_ACCOUNT secret is missing or invalid.'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const fs = admin.firestore();
const since = Date.now() - 864e5;
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

const counts = {};
for (const c of CHECKS) {
  const from = c.ms ? since : admin.firestore.Timestamp.fromMillis(since);
  try { counts[c.id] = (await fs.collection(c.col).where(c.field, '>=', from).count().get()).data().count; }
  catch (e) { counts[c.id] = null; console.warn(`${c.id}: ${e.message}`); }
}
const summary = report(counts, day);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Health check ${day}\n\n${summary}\n`);

const hits = overLimit(counts);
if (!hits.length) { console.log('All normal: no alert.'); process.exit(0); }
const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
const gh = (path, opts = {}) => fetch(`https://api.github.com/repos/${repo}${path}`, {
  ...opts, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } });
await gh('/labels', { method: 'POST', body: JSON.stringify({ name: 'alert', color: 'b60205', description: 'Daily health check crossed a limit' }) });
const r = await gh('/issues', { method: 'POST', body: JSON.stringify(alertIssue(hits, counts, day)) });
if (!r.ok) { console.error(`issue: ${r.status} ${await r.text()}`); process.exit(1); }
console.log(`Opened alert issue #${(await r.json()).number}`);
