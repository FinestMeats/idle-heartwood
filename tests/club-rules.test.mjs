// Firestore rules tests: the UrgerBae Card Club and the per-player rate limits. Run in CI by .github/workflows/rules-test.yml:
//   npx firebase emulators:exec --only firestore --project demo-heartwood "node --test tests/club-rules.test.mjs"
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getCountFromServer, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';

let env;
const DAY = '2026-11-03', CODE = 'K7Q2M9XPRT4W';
const inHour = () => Timestamp.fromMillis(Date.now() + 3600e3);

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-heartwood', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, 'clubStaff/staff1'), {});
    await setDoc(doc(db, `clubDaily/${DAY}`), { k: CODE, exp: inHour(), by: 'staff1' });
    await setDoc(doc(db, 'clubDaily/2026-11-02'), { k: 'OLDCODEOLDCO', exp: Timestamp.fromMillis(Date.now() - 1000), by: 'staff1' });
    await setDoc(doc(db, 'users/alice/data/club'), { cards: { m_og: 1 } });
  });
});
const as = uid => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
// A reward-claim request, written the way the page does it: with this player's rate-limit entry in one batch.
const req = (db, uid, code, mid = 'menu') => { const b = writeBatch(db);
  b.set(doc(db, `clubReq/${code}`), { uid, mid, t: serverTimestamp() });
  b.set(doc(db, `limits/${uid}`), { rq: serverTimestamp(), rqid: code }, { merge: true }); return b.commit(); };
const scan = (uid, day, k) => setDoc(doc(as(uid), `clubScans/${uid}_${day}`), { uid, day, k, t: serverTimestamp() });

test('nobody but staff can read the daily code', async () => {
  await assertFails(getDoc(doc(as('alice'), `clubDaily/${DAY}`)));
  await assertFails(getDoc(doc(anon(), `clubDaily/${DAY}`)));
  await assertSucceeds(getDoc(doc(as('staff1'), `clubDaily/${DAY}`)));
});
test('customers cannot write the daily code or make themselves staff', async () => {
  await assertFails(setDoc(doc(as('alice'), `clubDaily/${DAY}`), { k: 'MYOWNCODE123', exp: inHour(), by: 'alice' }));
  await assertFails(setDoc(doc(as('alice'), 'clubStaff/alice'), {}));
  await assertSucceeds(setDoc(doc(as('staff1'), 'clubDaily/2026-11-04'), { k: 'NEWCODE12345', exp: inHour(), by: 'staff1' }));
});
test('a scan needs the live code, once per account per day', async () => {
  await assertFails(scan('alice', DAY, 'WRONGCODE123'));
  await assertFails(scan('alice', '2026-11-02', 'OLDCODEOLDCO')); // expired
  await assertFails(scan('alice', '2026-11-05', CODE)); // no code made for that day
  await assertSucceeds(scan('alice', DAY, CODE));
  await assertFails(scan('alice', DAY, CODE)); // second pack the same day
  await assertFails(deleteDoc(doc(as('alice'), `clubScans/alice_${DAY}`)));
});
test('a scan cannot be filed for someone else or under another id', async () => {
  await assertFails(setDoc(doc(as('alice'), `clubScans/bob_${DAY}`), { uid: 'bob', day: DAY, k: CODE, t: serverTimestamp() }));
  await assertFails(setDoc(doc(as('alice'), `clubScans/alice_extra`), { uid: 'alice', day: DAY, k: CODE, t: serverTimestamp() }));
});
test('customers read their own scans; only staff count them', async () => {
  await assertSucceeds(scan('alice', DAY, CODE));
  await assertSucceeds(getDoc(doc(as('alice'), `clubScans/alice_${DAY}`)));
  await assertSucceeds(getDoc(doc(as('alice'), 'clubScans/alice_2026-01-01'))); // missing doc: still allowed to check
  await assertFails(getDoc(doc(as('bob'), `clubScans/alice_${DAY}`)));
  await assertFails(getCountFromServer(query(collection(as('alice'), 'clubScans'), where('uid', '==', 'alice'))));
  await assertSucceeds(getCountFromServer(query(collection(as('staff1'), 'clubScans'), where('uid', '==', 'alice'))));
});
test('claim requests: own uid only, readable by owner and staff', async () => {
  await assertFails(req(as('alice'), 'bob', 'ABC234'));
  await assertFails(req(as('alice'), 'alice', 'abc'));
  await assertFails(setDoc(doc(as('alice'), 'clubReq/ABC234'), { uid: 'alice', mid: 'menu', t: serverTimestamp() })); // no rate-limit entry
  await assertSucceeds(req(as('alice'), 'alice', 'ABC234'));
  await assertFails(req(as('bob'), 'bob', 'ABC234')); // taken
  await assertFails(getDoc(doc(as('bob'), 'clubReq/ABC234')));
  await assertSucceeds(getDoc(doc(as('staff1'), 'clubReq/ABC234')));
});
test('only staff record a claim, once, and nobody can undo it', async () => {
  const claim = (db, uid) => setDoc(doc(db, `clubClaims/${uid}_menu`), { uid, mid: 'menu', by: 'staff1', t: serverTimestamp(), note: '' });
  await assertFails(claim(as('alice'), 'alice'));
  await assertSucceeds(claim(as('staff1'), 'alice'));
  await assertFails(claim(as('staff1'), 'alice')); // second claim of the same reward
  await assertFails(deleteDoc(doc(as('alice'), 'clubClaims/alice_menu')));
  await assertFails(deleteDoc(doc(as('staff1'), 'clubClaims/alice_menu')));
  await assertSucceeds(getDoc(doc(as('alice'), 'clubClaims/alice_menu')));
  await assertSucceeds(getDoc(doc(as('alice'), 'clubClaims/alice_crew'))); // not claimed yet: still allowed to check
  await assertFails(getDoc(doc(as('bob'), 'clubClaims/alice_menu')));
});
test('staff can read a club binder but not other saves; customers keep their own', async () => {
  await assertSucceeds(getDoc(doc(as('staff1'), 'users/alice/data/club')));
  await assertFails(getDoc(doc(as('staff1'), 'users/alice/data/game')));
  await assertFails(setDoc(doc(as('staff1'), 'users/alice/data/club'), { cards: {} }));
  await assertFails(getDoc(doc(as('bob'), 'users/alice/data/club')));
  await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice/data/club'), { cards: { m_og: 2 } }));
});

/* ---------- rate limits (firestore.rules "rate limits") ---------- */
const sendFeedback = (db, uid, n = 1) => { const b = writeBatch(db); let last;
  for (let i = 0; i < n; i++) { last = doc(collection(db, 'feedback'));
    b.set(last, { type: 'bug', text: 'it broke', ctx: {}, t: Date.now(), uid, status: 'new' }); }
  b.set(doc(db, `limits/${uid}`), { fb: serverTimestamp(), fbid: last.id }, { merge: true }); return b.commit(); };
const ago = s => Timestamp.fromMillis(Date.now() - s * 1000);

test('feedback: one a minute per player, and only with the rate-limit entry', async () => {
  await assertFails(setDoc(doc(as('alice'), 'feedback/x1'), { type: 'bug', text: 'hi', ctx: {}, t: 1, uid: 'alice', status: 'new' }));
  await assertSucceeds(sendFeedback(as('alice'), 'alice'));
  await assertFails(sendFeedback(as('alice'), 'alice')); // straight away again
  await assertSucceeds(sendFeedback(as('bob'), 'bob')); // other players aren't affected
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'limits/alice'), { fb: ago(61), fbid: 'old' }));
  await assertSucceeds(sendFeedback(as('alice'), 'alice')); // a minute later
});
test('feedback: a batch cannot carry more than one report', async () => {
  await assertFails(sendFeedback(as('alice'), 'alice', 5));
});
test('rate-limit entries cannot be faked or reset', async () => {
  await assertFails(setDoc(doc(as('alice'), 'limits/alice'), { fb: ago(3600), fbid: 'x' })); // backdated
  await assertFails(setDoc(doc(as('alice'), 'limits/bob'), { fb: serverTimestamp(), fbid: 'x' }));
  await assertFails(setDoc(doc(as('alice'), 'limits/alice'), { fb: serverTimestamp(), fbid: 'x', extra: 1 }));
  await assertSucceeds(sendFeedback(as('alice'), 'alice'));
  await assertFails(deleteDoc(doc(as('alice'), 'limits/alice')));
  await assertSucceeds(getDoc(doc(as('alice'), 'limits/alice')));
  await assertFails(getDoc(doc(as('bob'), 'limits/alice')));
});
test('claim requests: one code every 20 seconds per player', async () => {
  await assertSucceeds(req(as('alice'), 'alice', 'ABC234'));
  await assertFails(req(as('alice'), 'alice', 'XYZ234'));
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'limits/alice'), { rq: ago(21), rqid: 'ABC234' }));
  await assertSucceeds(req(as('alice'), 'alice', 'XYZ234'));
});
test('ladder: signed-in reads, one write every 5 seconds per player', async () => {
  const row = (extra = {}) => ({ r: 1000, best: 1000, w: 1, l: 0, d: 0, n: 1, f: 'x', t: Date.now(), name: 'Alice', st: serverTimestamp(), ...extra });
  await assertFails(setDoc(doc(as('alice'), 'ladder/alice'), (({ st, ...r }) => r)(row()))); // no server time
  await assertSucceeds(setDoc(doc(as('alice'), 'ladder/alice'), row()));
  await assertFails(setDoc(doc(as('alice'), 'ladder/alice'), row({ r: 1010 }))); // straight away again
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'ladder/alice'), { st: ago(6) }));
  await assertSucceeds(setDoc(doc(as('alice'), 'ladder/alice'), row({ r: 1010 })));
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'ladder/alice'), { st: ago(6) }));
  await assertFails(setDoc(doc(as('alice'), 'ladder/alice'), row({ w: '<img src=x onerror=alert(1)>' }))); // markup in a number field
  await assertFails(setDoc(doc(as('alice'), 'ladder/alice'), row({ f: 'x'.repeat(50) })));
  await assertFails(getDoc(doc(anon(), 'ladder/alice')));
  await assertSucceeds(getDoc(doc(as('bob'), 'ladder/alice')));
});

/* ---------- race conditions ---------- */
test('idle save: each write must be exactly one step newer, so two devices cannot both write over the same save', async () => {
  const save = (rev) => setDoc(doc(as('alice'), 'users/alice/data/save3'), { state: '{}', savedAt: Date.now(), dev: 'phone', rev });
  await assertSucceeds(save(1));
  await assertSucceeds(save(2));
  await assertFails(save(2)); // a second device that also read rev 1
  await assertFails(save(9)); // skipping ahead
  await assertSucceeds(save(3));
  await assertFails(setDoc(doc(as('bob'), 'users/alice/data/save3'), { state: '{}', rev: 4 }));
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'users/bob/data/save3'), { state: '{}' })); // an old save with no rev
  await assertSucceeds(setDoc(doc(as('bob'), 'users/bob/data/save3'), { state: '{}', rev: 1 }));
});
