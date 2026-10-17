// Turns new in-game feedback (Firestore 'feedback', status 'new') into GitHub issues.
// Kept free of Firebase/GitHub setup so it can be tested with fakes.
import { createHash } from 'node:crypto';

export const LABELS = [
  ['bug', 'd73a4a', 'Something is broken'],
  ['idea', 'a2eeef', 'Player suggestion'],
  ['from-game', '5319e7', 'Sent from inside the game'],
];

const clean = (s, n) => String(s ?? '').replace(/@/g, '@​').replace(/\r/g, '').slice(0, n);
const anon = uid => uid ? 'player-' + createHash('sha256').update(String(uid)).digest('hex').slice(0, 8) : 'unknown player';

export function issueFor(d) {
  const kind = d.type === 'bug' ? 'Bug' : 'Idea';
  const first = clean(d.text, 400).split('\n').find(l => l.trim()) || '(no text)';
  const title = `${kind}: ${first.length > 70 ? first.slice(0, 67).trimEnd() + '…' : first}`;
  const c = d.ctx || {};
  const errs = Array.isArray(c.errs) && c.errs.length ? c.errs.map(e => '`' + clean(e, 200).replace(/`/g, "'") + '`').join('<br>') : 'none';
  const body = [
    clean(d.text, 1500).split('\n').map(l => '> ' + l).join('\n'),
    '',
    '| | |', '|---|---|',
    `| Game version | ${clean(c.v, 12)} |`,
    `| Woodcutting level | ${clean(c.lvl, 6)} |`,
    `| Grove | ${clean(c.grove, 8)} |`,
    `| Trees felled | ${clean(c.felled, 12)} |`,
    `| Replants | ${clean(c.replants, 6)} |`,
    `| Screen | ${clean(c.scr, 20)} |`,
    `| Device | ${clean(c.ua, 160).replace(/\|/g, '/')} |`,
    `| Recent errors | ${errs} |`,
    `| From | ${anon(d.uid)} |`,
    `| Sent | ${d.t ? new Date(d.t).toISOString() : 'unknown'} |`,
  ].join('\n');
  return { title, body, labels: [d.type === 'bug' ? 'bug' : 'idea', 'from-game'] };
}

// db: { newFeedback(): Promise<[{id, data, markFiled(issueNumber)}]> }
// gh: { ensureLabel(name,color,desc), createIssue({title,body,labels}) -> number }
export async function fileFeedback(db, gh, log = console.log) {
  for (const [n, c, d] of LABELS) await gh.ensureLabel(n, c, d);
  const items = await db.newFeedback();
  let filed = 0;
  for (const it of items) {
    const d = it.data;
    if (!d || !['bug', 'idea'].includes(d.type) || !String(d.text || '').trim()) { await it.markFiled(null, 'skipped'); continue; }
    const num = await gh.createIssue(issueFor(d));
    await it.markFiled(num, 'filed');
    filed++;
    log(`Filed #${num}: ${issueFor(d).title}`);
  }
  log(`Done: ${filed} filed, ${items.length - filed} skipped.`);
  return filed;
}
