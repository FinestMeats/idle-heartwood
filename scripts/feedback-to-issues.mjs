// GitHub Action entry point. Needs secrets FIREBASE_SERVICE_ACCOUNT (JSON key) and GITHUB_TOKEN.
import admin from 'firebase-admin';
import { fileFeedback } from './feedback-lib.mjs';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (!sa.project_id) { console.error('FIREBASE_SERVICE_ACCOUNT secret is missing or invalid.'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const fs = admin.firestore();
const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
const gh = (path, opts = {}) => fetch(`https://api.github.com/repos/${repo}${path}`, {
  ...opts, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } });

await fileFeedback({
  async newFeedback() {
    const snap = await fs.collection('feedback').where('status', '==', 'new').limit(50).get();
    return snap.docs.map(doc => ({ id: doc.id, data: doc.data(),
      markFiled: (issue, status) => doc.ref.update({ status, issue: issue ?? null, filedAt: Date.now() }) }));
  },
}, {
  async ensureLabel(name, color, description) {
    const r = await gh('/labels', { method: 'POST', body: JSON.stringify({ name, color, description }) });
    if (!r.ok && r.status !== 422) throw new Error(`label ${name}: ${r.status} ${await r.text()}`);
  },
  async createIssue(issue) {
    const r = await gh('/issues', { method: 'POST', body: JSON.stringify(issue) });
    if (!r.ok) throw new Error(`issue: ${r.status} ${await r.text()}`);
    return (await r.json()).number;
  },
});
