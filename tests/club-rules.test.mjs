// Firestore rules tests for the UrgerBae Card Club. Run in CI by .github/workflows/rules-test.yml:
//   npx firebase emulators:exec --only firestore --project demo-heartwood "node --test tests/club-rules.test.mjs"
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getCountFromServer, serverTimestamp, Timestamp } from 'firebase/firestore';

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
  await assertFails(setDoc(doc(as('alice'), 'clubReq/ABC234'), { uid: 'bob', mid: 'menu', t: serverTimestamp() }));
  await assertFails(setDoc(doc(as('alice'), 'clubReq/abc'), { uid: 'alice', mid: 'menu', t: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(as('alice'), 'clubReq/ABC234'), { uid: 'alice', mid: 'menu', t: serverTimestamp() }));
  await assertFails(setDoc(doc(as('bob'), 'clubReq/ABC234'), { uid: 'bob', mid: 'menu', t: serverTimestamp() })); // taken
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
