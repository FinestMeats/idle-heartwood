// End-to-end check of the Card Club flow (customer phone + staff counter) with a stand-in Firebase.
// The real security comes from firestore.rules (tested in tests/club-rules.test.mjs); this checks the page logic.
// Run: npm i --no-save playwright && node tests/club-flow.cjs   (Playwright's Chromium must be installed)
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { join, normalize } = require('node:path');
const { chromium } = require('playwright');

const root = join(__dirname, '..');
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

/* ---------- in-memory backend shared by every page, with the rules that matter for the flow ---------- */
const db = new Map([['clubStaff/staff1', {}]]);
const now = () => ({ __ts: Date.now() });
const fill = d => JSON.parse(JSON.stringify(d), (k, v) => (v && v.__server ? now() : v));
const createOnly = p => /^(clubScans|clubReq|clubClaims)\//.test(p);
function backend(op, a) {
  const deny = () => ({ error: 'permission-denied' });
  if (op === 'get') return { exists: db.has(a.path), data: db.get(a.path) || null };
  if (op === 'set') {
    if (createOnly(a.path) && db.has(a.path)) return deny();
    if (a.path.startsWith('clubScans/')) {
      const day = db.get('clubDaily/' + a.data.day);
      if (!day || day.k !== a.data.k || day.exp.__ts < Date.now() || a.path !== `clubScans/${a.uid}_${a.data.day}`) return deny();
    }
    if (/^(clubClaims|clubDaily)\//.test(a.path) && !db.has('clubStaff/' + a.uid)) return deny();
    db.set(a.path, fill(a.data)); return { ok: true };
  }
  if (op === 'count') return { count: [...db.entries()].filter(([p, d]) => p.startsWith(a.col + '/') && d[a.field] === a.value).length };
  throw new Error('unknown op ' + op);
}

/* ---------- stand-in Firebase modules, served in place of gstatic ---------- */
const MOCK = {
  app: `export const initializeApp=c=>({c});`,
  auth: `
/* like real Firebase, the sign-in survives reloads and clearing localStorage */
let user=JSON.parse(sessionStorage.getItem('mockUser')||'null');window.__uid=user?user.uid:null;
const set=u=>{user=u;window.__uid=u?u.uid:null;sessionStorage.setItem('mockUser',JSON.stringify(u))};
export const getAuth=()=>({get currentUser(){return user}});
export const onAuthStateChanged=(a,cb)=>{setTimeout(()=>cb(user));return()=>{}};
export const getRedirectResult=async()=>null;
export const signInAnonymously=async()=>{set({uid:'anon'+Math.random().toString(36).slice(2,8),isAnonymous:true,providerData:[]});return {user}};
export class GoogleAuthProvider{static credentialFromError(){return null}}
const google=()=>{const g=window.__google;set({uid:g.uid,isAnonymous:false,providerData:[{providerId:'google.com',email:g.email}]});return {user}};
export const signInWithPopup=async()=>google();export const linkWithPopup=async()=>{const u=user.uid;google();user.uid=u;window.__uid=u;return {user}};
export const signInWithRedirect=async()=>google();export const signInWithCredential=async()=>google();
export const signOut=async()=>{set(null)};`,
  firestore: `
const revive=v=>JSON.parse(JSON.stringify(v),(k,x)=>x&&x.__ts!=null?{toMillis:()=>x.__ts}:x);
const call=async(op,a)=>{const uid=window.__uid||null;const r=await window.__fb(op,{...a,uid});if(r&&r.error){const e=new Error(r.error);e.code=r.error;throw e}return r};
const snap=r=>({exists:()=>r.exists,data:()=>revive(r.data)});
const pack=d=>JSON.parse(JSON.stringify(d,(k,v)=>v&&typeof v.toMillis==='function'?{__ts:v.toMillis()}:v));
export const getFirestore=()=>({});
export const doc=(fs,path)=>({path});export const collection=(fs,col)=>({col});
export const where=(field,op,value)=>({field,value});export const query=(c,w)=>({...c,...w});
export const getDoc=async r=>snap(await call('get',{path:r.path}));
export const setDoc=async(r,d)=>{await call('set',{path:r.path,data:pack(d)})};
export const serverTimestamp=()=>({__server:1});
export const writeBatch=()=>{const ops=[];return {set:(r,d)=>{ops.push([r,d])},commit:async()=>{for(const [r,d] of ops)await setDoc(r,d)}}};
export const Timestamp={fromMillis:ms=>({toMillis:()=>ms})};
export const getCountFromServer=async q=>{const r=await call('count',q);return {data:()=>({count:r.count})}};
export const runTransaction=async(fs,fn)=>fn({get:r=>getDoc(r),set:(r,d)=>{tx.push([r,d])}}).then(async v=>{for(const [r,d] of tx.splice(0))await setDoc(r,d);return v});
const tx=[];
export const onSnapshot=(r,cb)=>{let on=true;(async function poll(){while(on){try{const s=await getDoc(r);if(s.exists()){cb(s);}}catch(_){}await new Promise(z=>setTimeout(z,250))}})();return()=>{on=false}};`,
};

(async () => {
  const server = createServer(async (req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    try { res.writeHead(200, { 'content-type': 'text/html' }); res.end(await readFile(join(root, p))); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/club/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function phone(google) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.exposeFunction('__fb', (op, a) => backend(op, a));
    await ctx.addInitScript(g => { window.__google = g; }, google);
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-(app|auth|firestore)\.js/, (route, req) => {
      const m = req.url().match(/firebase-(app|auth|firestore)\.js/)[1];
      route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: MOCK[m] });
    });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    return page;
  }
  const step = (msg) => console.log('  ok', msg);
  const expectText = async (page, text) => { await page.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 }); };

  try {
    /* counter: staff signs in, today's QR appears and the code is stored server-side */
    const counter = await phone({ uid: 'staff1', email: 'staff@urgerbae.com' });
    await counter.goto(base + '?counter');
    await counter.getByRole('button', { name: 'Staff sign in' }).click();
    await expectText(counter, "Show today's QR");
    await counter.getByRole('button', { name: "Show today's QR" }).click();
    await counter.locator('#qr svg').waitFor({ timeout: 8000 });
    const code = db.get('clubDaily/' + today()).k;
    if (!/^[A-HJ-NP-Z2-9]{12}$/.test(code)) throw new Error('bad daily code ' + code);
    const html = await readFile(join(root, 'club/index.html'), 'utf8');
    if (/"(pin|secret)"\s*:/.test(html)) throw new Error('page still ships a PIN or secret');
    step('staff counter shows a QR; the code lives only in the database');

    /* customer: wrong code refused, real code opens the welcome + daily pack, second scan refused */
    const cust = await phone({ uid: 'alice-google', email: 'alice@example.com' });
    await cust.goto(base);
    await expectText(cust, 'Your pack is waiting');
    // learn the anonymous uid the page signed in with from the binder it saved
    const custUid = () => [...db.keys()].map(k => k.match(/^users\/([^/]+)\/data\/club$/)).filter(Boolean).map(m => m[1]).find(u => u.startsWith('anon'));
    await cust.goto(base + '?k=WRONGCODE999');
    await expectText(cust, 'That code is out of date');
    step('a wrong code is refused');
    await cust.goto(base + '?k=' + code);
    await expectText(cust, 'Welcome pack');
    await cust.getByRole('button', { name: 'Flip all' }).click();
    await cust.getByRole('button', { name: 'Next pack' }).click();
    await cust.getByRole('button', { name: 'Flip all' }).click();
    await cust.getByRole('button', { name: 'Add to binder' }).click();
    const aliceUid = custUid();
    if (!db.has(`clubScans/${aliceUid}_${today()}`)) throw new Error('scan not recorded');
    step('the live code opens the welcome and daily packs and records a verified visit');
    await cust.evaluate(() => localStorage.clear());
    await cust.goto(base + '?k=' + code);
    await expectText(cust, 'Already opened today');
    step('a second pack the same day is refused by the server, even after clearing the phone');

    /* customer forges a full Menu set, claims it */
    const { MILESTONES } = require('../club/src/cards.js');
    const menu = MILESTONES.find(m => m.id === 'menu');
    const bin = db.get(`users/${aliceUid}/data/club`);
    for (const id of menu.cards) bin.cards[id] = (bin.cards[id] || 0) + 1;
    await cust.evaluate(() => localStorage.clear());
    await cust.goto(base);
    await cust.getByRole('button', { name: 'Rewards' }).click();
    await cust.locator('[data-claim="menu"]').click();
    const claimCode = (await cust.locator('.ccode').textContent({ timeout: 8000 })).trim();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(claimCode)) throw new Error('bad claim code ' + claimCode);
    step('claiming shows a 6-character code (no PIN on the customer phone)');

    /* counter checks it: one visit is far too few for a Menu set, so staff are warned */
    await counter.getByRole('button', { name: 'Back' }).click();
    await counter.getByRole('button', { name: 'Check a reward' }).click();
    await counter.fill('#ccode', claimCode.toLowerCase());
    await counter.getByRole('button', { name: 'Check' }).click();
    await expectText(counter, "Doesn't add up");
    await expectText(counter, 'Only 1 verified visit');
    step('the counter flags a set finished in too few visits');
    await counter.getByRole('button', { name: 'Approve anyway' }).click();
    await expectText(counter, 'Hand over: ' + menu.reward);
    const claim = db.get(`clubClaims/${aliceUid}_menu`);
    if (!claim || claim.by !== 'staff1' || claim.note !== 'override') throw new Error('claim not recorded: ' + JSON.stringify(claim));
    await expectText(cust, 'Reward claimed');
    step('approving records the claim server-side and the customer phone updates by itself');

    /* the same reward cannot be handed out twice */
    await cust.locator('[data-claim="menu"]').waitFor({ state: 'detached', timeout: 8000 });
    await counter.getByRole('button', { name: 'Next customer' }).click();
    await counter.fill('#ccode', claimCode);
    await counter.getByRole('button', { name: 'Check' }).click();
    await expectText(counter, 'Already claimed');
    step('checking the same reward again says already claimed');

    /* a Google account that isn't staff can't use the counter */
    const stranger = await phone({ uid: 'mallory', email: 'mallory@example.com' });
    await stranger.goto(base + '?counter');
    await stranger.getByRole('button', { name: 'Staff sign in' }).click();
    await expectText(stranger, 'Not a staff account yet');
    step('a non-staff Google account is turned away from the counter');

    if (errors.length) throw new Error('page errors:\n' + errors.join('\n'));
    console.log('club flow passed');
  } finally {
    await browser.close(); server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
