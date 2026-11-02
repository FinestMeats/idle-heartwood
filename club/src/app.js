/* ===================== UrgerBae Card Club =====================
   Scan the counter QR once a day for a pack of 6 cards, collect the Founders set, finish sets for real items.
   State lives in users/{uid}/data/club on the website (same Google sign-in as the other games), else on this device. */
const $=id=>document.getElementById(id);
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney'}).format(new Date());
/* Nothing secret lives in this page. Today's counter code is random and stored in Firestore where only staff can read it;
   the database rules only accept a scan carrying the live code, and rewards are recorded by a signed-in staff device. */
const ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randCode=n=>{const a=new Uint32Array(n);crypto.getRandomValues(a);return Array.from(a,x=>ABC[x%ABC.length]).join('')};
/* milliseconds until the next midnight in Sydney (when the counter code changes) */
function msToMidnight(){const p={};new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Sydney',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(x=>p[x.type]=+x.value);
  return Math.max(60000,((24-p.hour)*3600-p.minute*60-p.second)*1000)}
const withTimeout=(pr,ms)=>Promise.race([pr,new Promise((_,j)=>setTimeout(()=>j({code:'timeout'}),ms))]);
const fresh=()=>({cards:{},packs:{last:'',n:0},pity:{l:0,m:0},claims:{},newIds:{},welcome:false});
let ST=fresh(),FB=null,EMAIL=null,VIEW='home',READY=false,OPEN=null,UNW=null;

/* ---------- cloud ---------- */
async function fbInit(){if(!CFG.firebase)return null;const V='10.12.2',u=m=>`https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  const [Ap,AU,FS]=await Promise.all([import(u('app')),import(u('auth')),import(u('firestore'))]);
  const app=Ap.initializeApp(CFG.firebase),auth=AU.getAuth(app),fs=FS.getFirestore(app);
  await new Promise(r=>{const un=AU.onAuthStateChanged(auth,()=>{un();r()})});try{await AU.getRedirectResult(auth)}catch(_){}
  if(!auth.currentUser)await AU.signInAnonymously(auth);
  const uid=()=>auth.currentUser.uid,d=p=>FS.doc(fs,p),ref=()=>d('users/'+uid()+'/data/club');
  return {AU,FS,auth,fs,uid,email:()=>{const p=auth.currentUser&&auth.currentUser.providerData.find(x=>x.providerId==='google.com');return p?p.email||'Google account':null},
    load:async()=>{const r=await FS.getDoc(ref());return r.exists()?r.data():null},save:o=>FS.setDoc(ref(),o),
    /* a counter visit: the rules only accept it with today's live code, once per account per day */
    scan:(day,k)=>withTimeout(FS.setDoc(d('clubScans/'+uid()+'_'+day),{uid:uid(),day,k,t:FS.serverTimestamp()}),15000),
    scanned:async day=>{try{return (await FS.getDoc(d('clubScans/'+uid()+'_'+day))).exists()}catch(_){return false}},
    claims:async()=>{const o={};await Promise.all(MILESTONES.map(async m=>{try{const r=await FS.getDoc(d('clubClaims/'+uid()+'_'+m.id));
      if(r.exists()){const t=r.data().t;o[m.id]=t&&t.toMillis?t.toMillis():Date.now()}}catch(_){}}));return o},
    /* a claim request staff look up by its 6-character code */
    request:async mid=>{for(let i=0;;i++){const code=randCode(6);try{const b=FS.writeBatch(fs);b.set(d('clubReq/'+code),{uid:uid(),mid,t:FS.serverTimestamp()});b.set(d('limits/'+uid()),{rq:FS.serverTimestamp(),rqid:code},{merge:true});await withTimeout(b.commit(),15000);return code}catch(e){if(i>=3||e.code==='timeout')throw e}}},
    watchClaim:(mid,cb)=>FS.onSnapshot(d('clubClaims/'+uid()+'_'+mid),s=>{if(s.exists())cb(s.data())},()=>{})}}
function local(){try{return JSON.parse(localStorage.getItem('ubclub')||'null')}catch(_){return null}}
function save(){ST.t=Date.now();try{localStorage.setItem('ubclub',JSON.stringify(ST))}catch(_){}if(FB)FB.save(JSON.parse(JSON.stringify(ST))).catch(()=>toast('Not saved yet','Check your connection, it will try again'))}
async function signIn(){if(!FB)return;const {AU,auth}=FB,prov=new AU.GoogleAuthProvider();
  try{await AU.linkWithPopup(auth.currentUser,prov)}
  catch(e){const c=e&&e.code;if(c==='auth/credential-already-in-use'){await AU.signInWithCredential(auth,AU.GoogleAuthProvider.credentialFromError(e))}
    else if(c==='auth/popup-blocked'||c==='auth/operation-not-supported-in-this-environment'){await AU.signInWithRedirect(auth,prov);return}
    else if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return;else{toast('Sign-in failed',(e&&e.message)||'Try again later');return}}
  EMAIL=FB.email();const remote=await FB.load();
  /* signing in on a new phone: keep whichever binder holds more cards */
  if(remote&&count(remote.cards)>=count(ST.cards))ST=Object.assign(fresh(),remote);save();render();toast('Signed in','Your cards are safe on your Google account')}
const count=c=>Object.values(c||{}).reduce((a,b)=>a+b,0);

/* ---------- packs ---------- */
function rollRarity(){let u=Math.random(),a=0;for(let r=0;r<PACK.odds.length;r++){a+=PACK.odds[r];if(u<a)return r}return 0}
function openPack(){const out=[],P=ST.pity;P.l++;P.m++;
  for(let k=0;k<PACK.size;k++){let r=rollRarity();const last=k===PACK.size-1;
    if(last&&r<2)r=2;/* every pack: at least one Rare or better */
    if(last&&P.m>=PACK.pityM)r=5;else if(last&&P.l>=PACK.pityL&&r<4)r=4;
    if(r===5){P.m=0;P.l=0}else if(r===4)P.l=0;
    const pool=CARDS.filter(c=>c.r===r),c=pool[Math.floor(Math.random()*pool.length)];
    const isNew=!ST.cards[c.id];ST.cards[c.id]=(ST.cards[c.id]||0)+1;if(isNew)ST.newIds[c.id]=1;out.push({id:c.id,isNew})}
  ST.packs.n++;return out}
/* the QR at the counter opens ?k=<today's code>: one pack a day per account (plus a welcome pack the first time) */
async function checkScan(){const q=new URLSearchParams(location.search),k=q.get('k');if(k==null)return;
  history.replaceState(null,'',location.pathname);const d=today();
  if(ST.packs.last===d){toast('Already opened today','Come back tomorrow for your next pack');return}
  if(!FB){toast('Can\'t reach the Card Club','Check your connection, then scan the QR again');return}
  try{await FB.scan(d,k)}catch(e){
    if(await FB.scanned(d))toast('Already opened today','Come back tomorrow for your next pack');
    else if(e&&e.code==='permission-denied')toast('That code is out of date','Scan the QR at the counter today for your pack');
    else toast('Couldn\'t check the code','Check your connection, then scan the QR again');return}
  ST.packs.last=d;const packs=[openPack()];if(!ST.welcome){ST.welcome=true;packs.unshift(openPack())}save();showPacks(packs)}

/* ---------- trade-ins ---------- */
const dupes=r=>CARDS.filter(c=>c.r===r).reduce((a,c)=>a+Math.max(0,(ST.cards[c.id]||0)-1),0);
function trade(id){const c=CARD[id];if(!c||c.r>3||ST.cards[id])return;if(dupes(c.r)<PACK.trade)return;
  let left=PACK.trade;while(left>0){const d=CARDS.filter(x=>x.r===c.r&&(ST.cards[x.id]||0)>1).sort((a,b)=>ST.cards[b.id]-ST.cards[a.id])[0];ST.cards[d.id]--;left--}
  ST.cards[id]=1;ST.newIds[id]=1;save();closeModal();render();toast('Traded',`${PACK.trade} duplicates became ${c.n}`)}

/* ---------- cards on screen ---------- */
const setOf=c=>SETS.find(s=>s.id===c.set);
function cardHtml(id,o){o=o||{};const c=CARD[id],S=setOf(c),R=RAR[c.r];
  return `<div class="card${o.sm?' sm':''}${c.r>=3?' foil':''}" style="--rc:${R.c}" ${o.attr||''}><div class="cin">
  <div class="ctop"><span class="cset">${esc(S.n)}</span><span class="cno">${c.no}/32</span></div>
  <div class="cpanel" style="background:${S.col}">${cardArt(id)}</div>
  <div class="cname">${esc(c.n)}</div><div class="crar"><span>${R.n}</span></div>
  <div class="cfact">${esc(c.fact)}</div></div></div>`}
function tile(id){const c=CARD[id],n=ST.cards[id]||0;
  if(!n){const can=c.r<=3&&dupes(c.r)>=PACK.trade;return `<button type="button" class="tile miss${can?' can':''}" data-miss="${id}" aria-label="Missing: ${esc(c.n)}"><div class="sil" style="--rc:${RAR[c.r].c}"><span>?</span></div><div class="tn">${c.no}. ${RAR[c.r].n}</div>${can?'<div class="tt">Trade available</div>':''}</button>`}
  return `<button type="button" class="tile" data-card="${id}" aria-label="${esc(c.n)}">${cardHtml(id,{sm:1})}<div class="tn">${esc(c.n)}${n>1?` <b>×${n}</b>`:''}${ST.newIds[id]?' <i class="nw">New</i>':''}</div></button>`}
const owned=ids=>ids.filter(id=>ST.cards[id]).length;

/* ---------- screens ---------- */
function homeHtml(){const d=today(),done=ST.packs.last===d,tot=CARDS.length,have=owned(CARDS.map(c=>c.id));
  return `<div class="hero"><h1>UrgerBae<br>Card Club</h1><p>Collect the Founders set. Finish a set, get real food.</p></div>
  <div class="box big">${done?`<h2>Today's pack: opened</h2><p>Your next pack is waiting at the counter tomorrow.</p>`:`<h2>Your pack is waiting</h2><p>Scan the QR at the UrgerBae counter for a free pack of ${PACK.size} cards, once a day.</p>`}
  ${CFG.demo?'<button type="button" class="btn" data-demo="1">Preview: open a pack</button>':''}</div>
  <div class="box"><h2>${have} of ${tot} cards</h2><div class="bar"><i style="width:${Math.round(100*have/tot)}%"></i></div>
  <div class="sets">${SETS.filter(s=>s.reward).map(s=>{const ids=CARDS.filter(c=>c.set===s.id).map(c=>c.id),h=owned(ids);return `<div class="srow"><span class="dot" style="background:${s.col}"></span><span>${esc(s.n)}</span><b>${h}/${ids.length}</b></div>`}).join('')}</div>
  <button type="button" class="btn ghost" data-nav="binder">Open your binder</button></div>
  ${accountHtml()}${LEGAL}`}
function accountHtml(){if(!FB)return CFG.demo?'<div class="box"><p class="note">Preview: cards are kept on this device only.</p></div>':'';
  if(EMAIL)return `<div class="box"><p class="note">Signed in as ${esc(EMAIL)}. Your cards follow you to any phone.</p></div>`;
  return `<div class="box"><h2>Keep your cards safe</h2><p>Sign in with Google so your binder isn't lost if you change phones.</p><button type="button" class="btn" data-signin="1">Sign in with Google</button></div>`}
function binderHtml(){return SETS.map(s=>{const ids=CARDS.filter(c=>c.set===s.id).map(c=>c.id);
  return `<section class="set"><h2><span class="dot" style="background:${s.col}"></span>${esc(s.n)} <small>${owned(ids)}/${ids.length}</small></h2>${s.reward?`<p class="note">Finish it for: <b>${esc(s.reward)}</b></p>`:'<p class="note">The rarest card. No prize, just bragging rights.</p>'}<div class="grid">${ids.map(tile).join('')}</div></section>`}).join('')+
  `<section class="set"><h2>Trade-ins</h2><p class="note">Every ${PACK.trade} duplicates of one rarity swap for a missing card of that rarity (up to Epic). Tap a missing card to trade.</p><div class="sets">${[0,1,2,3].map(r=>`<div class="srow"><span class="dot" style="background:${RAR[r].c}"></span><span>${RAR[r].n} duplicates</span><b>${dupes(r)}</b></div>`).join('')}</div></section>`}
const LEGAL=`<p class="note legal"><a href="../terms.html#card-club" target="_blank" rel="noopener">Card Club rules and pack odds</a> · <a href="../privacy.html" target="_blank" rel="noopener">Privacy</a></p>`;
function rewardsHtml(){return `<p class="note top">Finish a set, tap Claim, then show the code to staff at the counter.</p>`+MILESTONES.map(m=>{const h=owned(m.cards),n=m.cards.length,done=h===n,cl=ST.claims[m.id];
  return `<div class="box"><h2>${esc(m.n)}</h2><p><b>${esc(m.reward)}</b></p><div class="bar"><i style="width:${Math.round(100*h/n)}%"></i></div><p class="note">${h} of ${n} cards</p>
  ${cl?`<p class="ok">Claimed on ${new Date(cl).toLocaleDateString('en-AU')}</p>`:done?`<button type="button" class="btn" data-claim="${m.id}">Claim at the counter</button>`:''}</div>`}).join('')+LEGAL}
function render(){const m=$('main');
  if(!READY){m.innerHTML='<p class="note top">Loading your binder…</p>';return}
  m.innerHTML=VIEW==='binder'?binderHtml():VIEW==='rewards'?rewardsHtml():homeHtml();
  $('nav').innerHTML=[['home','Home'],['binder','Binder'],['rewards','Rewards']].map(([k,n])=>`<button type="button" data-nav="${k}" aria-pressed="${VIEW===k}">${n}</button>`).join('')}

/* ---------- pop-ups ---------- */
function modal(html){$('modal').innerHTML=`<div class="mbox">${html}</div>`;$('modal').hidden=false}
function closeModal(){if(UNW){UNW();UNW=null}$('modal').hidden=true;$('modal').innerHTML=''}
let toastT=0;function toast(t,d){$('toast').innerHTML=`<b>${esc(t)}</b><span>${esc(d)}</span>`;$('toast').hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{$('toast').hidden=true},3600)}
/* opening packs: face-down cards, tap to flip */
function showPacks(packs){OPEN={packs,i:0,flipped:{}};drawPack()}
function drawPack(){const P=OPEN.packs[OPEN.i],first=!ST.packs.n||(OPEN.packs.length>1&&OPEN.i===0);
  modal(`<h2>${OPEN.packs.length>1&&OPEN.i===0?'Welcome pack':'Today\'s pack'}</h2><p class="note">Tap a card to flip it</p><div class="pack">${P.map((x,k)=>OPEN.flipped[k]?`<div class="pslot up">${cardHtml(x.id,{sm:1})}${x.isNew?'<i class="nw">New</i>':''}</div>`:`<button type="button" class="pslot down" data-flip="${k}" aria-label="Flip card ${k+1}"><span>UB</span></button>`).join('')}</div>
  <div class="row">${Object.keys(OPEN.flipped).length<P.length?'<button type="button" class="btn ghost" data-flipall="1">Flip all</button>':`<button type="button" class="btn" data-packdone="1">${OPEN.i<OPEN.packs.length-1?'Next pack':'Add to binder'}</button>`}</div>`)}
function cardModal(id){const n=ST.cards[id]||0;delete ST.newIds[id];save();modal(`<div class="bigc">${cardHtml(id)}</div><p class="note">You have ${n}</p><button type="button" class="btn ghost" data-close="1">Close</button>`)}
async function claimModal(mid){const m=MILESTONES.find(x=>x.id===mid),head=`<h2>${esc(m.n)}</h2><p class="claimr">${esc(m.reward)}</p>`;
  if(!FB){if(CFG.demo)modal(`${head}<p class="note">Preview: on the website the customer gets a code here and staff check it on the counter screen.</p><div class="row"><button type="button" class="btn ghost" data-close="1">Cancel</button><button type="button" class="btn" data-democlaim="${mid}">Mark claimed</button></div>`);
    else toast('Can\'t reach the Card Club','Check your connection and try again');return}
  modal(`${head}<p class="note">Getting your claim code…</p>`);let code;
  try{code=await FB.request(mid)}catch(e){closeModal();toast('Couldn\'t start the claim',e&&e.code==='permission-denied'?'Wait a few seconds, then try again':'Check your connection and try again');return}
  modal(`${head}<p class="note">Show this code to staff at the counter</p><p class="ccode">${code}</p><p class="note">This screen updates by itself once staff approve it. The code works for 30 minutes.</p><button type="button" class="btn ghost" data-close="1">Close</button>`);
  UNW=FB.watchClaim(mid,()=>{ST.claims[mid]=Date.now();save();closeModal();render();toast('Enjoy!','Reward claimed')})}

/* ---------- counter page (?counter): staff sign in with Google; their account must be listed in clubStaff ---------- */
let CQ=0,CHK=null;
function cbox(h){$('main').innerHTML=h}
async function isStaff(){const u=FB.auth.currentUser;if(!u||u.isAnonymous)return false;
  try{return (await FB.FS.getDoc(FB.FS.doc(FB.fs,'clubStaff/'+u.uid))).exists()}catch(_){return false}}
async function counterPage(){document.body.classList.add('counter');$('nav').hidden=true;cbox('<p class="note top">Starting the counter screen…</p>');
  if(!CFG.firebase){cbox('<div class="box"><p>The counter screen only works on the website.</p></div>');return}
  try{FB=await fbInit()}catch(e){cbox('<div class="box"><h2>Can\'t reach the Card Club</h2><p>Check the internet connection, then reload.</p></div>');return}
  counterHome()}
async function counterHome(){clearTimeout(CQ);const u=FB.auth.currentUser;
  if(!u||u.isAnonymous){cbox(`<div class="box big"><h2>Counter screen</h2><p>Staff only. Sign in with your staff Google account.</p><button type="button" class="btn" data-staffin="1">Staff sign in</button></div>`);return}
  if(!(await isStaff())){cbox(`<div class="box big"><h2>Not a staff account yet</h2><p>Signed in as ${esc(FB.email()||'this account')}. Ask Lucas to add this account ID to <b>clubStaff</b> in Firebase:</p><p class="uid">${esc(u.uid)}</p><button type="button" class="btn ghost" data-staffout="1">Sign out</button></div>`);return}
  cbox(`<div class="box big"><h2>Counter screen</h2><p class="note">Signed in as ${esc(FB.email()||'staff')}</p>
    <button type="button" class="btn" data-cqr="1">Show today's QR</button><button type="button" class="btn" data-ccheck="1">Check a reward</button>
    <button type="button" class="btn ghost" data-staffout="1">Sign out</button></div>`)}
async function staffIn(){const {AU,auth}=FB,prov=new AU.GoogleAuthProvider();
  try{await AU.signInWithPopup(auth,prov)}catch(e){const c=e&&e.code;
    if(c==='auth/popup-blocked'||c==='auth/operation-not-supported-in-this-environment'){await AU.signInWithRedirect(auth,prov);return}
    if(c!=='auth/popup-closed-by-user'&&c!=='auth/cancelled-popup-request')toast('Sign-in failed',(e&&e.message)||'Try again');}
  counterHome()}
/* today's code: made once per day by whichever staff device asks first, stops working at midnight Sydney time */
function dailyCode(){const {FS,fs}=FB,ref=FS.doc(fs,'clubDaily/'+today());
  return FS.runTransaction(fs,async tx=>{const s=await tx.get(ref),x=s.exists()&&s.data();if(x&&x.exp&&x.exp.toMillis()>Date.now())return x.k;
    const k=randCode(12);tx.set(ref,{k,exp:FS.Timestamp.fromMillis(Date.now()+msToMidnight()),by:FB.uid()});return k})}
async function showQR(){clearTimeout(CQ);let k;try{k=await dailyCode()}catch(e){cbox(`<div class="box"><h2>Couldn't load today's code</h2><p>${esc((e&&e.code)||'Check the connection')}</p><button type="button" class="btn" data-cqr="1">Try again</button><button type="button" class="btn ghost" data-chome="1">Back</button></div>`);return}
  const u=new URL(location.href);u.search='';u.hash='';const url=u.toString()+'?k='+k,d=today();
  cbox(`<div class="qrwrap"><h1>Scan for your<br>free card pack</h1><div id="qr" class="qr"></div><p>UrgerBae Card Club · one pack a day</p><p class="note">${d}</p><button type="button" class="btn ghost small" data-chome="1">Back</button></div>`);
  try{const qr=qrcode(0,'M');qr.addData(url);qr.make();$('qr').innerHTML=qr.createSvgTag({cellSize:8,margin:2,scalable:true})}catch(_){$('qr').textContent=url}
  CQ=setTimeout(showQR,Math.min(5*60000,msToMidnight()+5000))}
function checkForm(msg){clearTimeout(CQ);CHK=null;cbox(`<div class="box big"><h2>Check a reward</h2><p>Type the 6-character code on the customer's phone.</p>
  <label class="pin">Claim code<input id="ccode" autocapitalize="characters" autocomplete="off" maxlength="6" spellcheck="false"></label>${msg?`<p class="bad">${esc(msg)}</p>`:''}
  <div class="row"><button type="button" class="btn ghost" data-chome="1">Back</button><button type="button" class="btn" data-cgo="1">Check</button></div></div>`);$('ccode').focus()}
async function checkReward(){const code=(($('ccode')||{}).value||'').toUpperCase().replace(/[^A-Z0-9]/g,''),{FS,fs}=FB;
  if(code.length!==6){checkForm('The code has 6 letters and numbers.');return}
  cbox('<p class="note top">Checking…</p>');let r=null;try{r=await FS.getDoc(FS.doc(fs,'clubReq/'+code))}catch(_){}
  if(!r||!r.exists()){checkForm('No claim with that code. Check the letters, or ask the customer to tap Claim again.');return}
  const q=r.data(),m=MILESTONES.find(x=>x.id===q.mid);if(!m){checkForm('That claim is for an unknown reward.');return}
  if(Date.now()-(q.t&&q.t.toMillis?q.t.toMillis():0)>30*60000){checkForm('That code is over 30 minutes old. Ask the customer to tap Claim again.');return}
  let bin,visits,claim;
  try{[bin,visits,claim]=await Promise.all([FS.getDoc(FS.doc(fs,'users/'+q.uid+'/data/club')).then(s=>s.exists()?s.data():{}),
    FS.getCountFromServer(FS.query(FS.collection(fs,'clubScans'),FS.where('uid','==',q.uid))).then(s=>s.data().count),
    FS.getDoc(FS.doc(fs,'clubClaims/'+q.uid+'_'+q.mid))])}catch(e){checkForm('Couldn\'t load their binder ('+((e&&e.code)||'connection')+'). Try again.');return}
  const cards=bin.cards||{},have=m.cards.filter(id=>cards[id]).length,total=count(cards),max=PACK.size*(visits+1),old=(bin.claims||{})[m.id];
  const head=`<h2>${esc(m.n)}</h2><p class="claimr">${esc(m.reward)}</p><ul class="facts"><li>Set cards: <b>${have} of ${m.cards.length}</b></li><li>Verified counter visits: <b>${visits}</b> (needs ${m.minVisits})</li><li>Cards on record: <b>${total}</b> (most possible from ${visits} visit${visits===1?'':'s'}: ${max})</li></ul>`;
  if(claim.exists()||old){const t=claim.exists()?claim.data().t:null,when=new Date(t&&t.toMillis?t.toMillis():old).toLocaleDateString('en-AU');
    cbox(`<div class="box">${head}<p class="bad">Already claimed on ${when}. Don't hand it over again.</p><button type="button" class="btn" data-ccheck="1">Done</button></div>`);return}
  if(have<m.cards.length){cbox(`<div class="box">${head}<p class="bad">Not finished: their saved binder is missing ${m.cards.length-have} card${m.cards.length-have===1?'':'s'} from this set.</p><button type="button" class="btn" data-ccheck="1">Done</button></div>`);return}
  const issues=[];if(visits<m.minVisits)issues.push(`Only ${visits} verified visit${visits===1?'':'s'}. A real collection of this set takes at least ${m.minVisits}.`);
  if(total>max)issues.push(`More cards than their visits could give.`);
  CHK={uid:q.uid,mid:m.id,note:issues.length?'override':''};
  cbox(`<div class="box">${head}${issues.length?`<div class="warn"><b>Doesn't add up</b>${issues.map(t=>`<p>${esc(t)}</p>`).join('')}<p>Customers who collected before 3 November 2026 have fewer verified visits. If you know they've been coming in, approve anyway. If not, say no.</p></div>`:'<p class="ok">Checks out. Hand it over and approve.</p>'}
    <div class="row"><button type="button" class="btn ghost" data-ccheck="1">Cancel</button><button type="button" class="btn" data-capprove="1">${issues.length?'Approve anyway':'Approve'}</button></div></div>`)}
async function approve(){if(!CHK)return;const {FS,fs}=FB,c=CHK,m=MILESTONES.find(x=>x.id===c.mid);CHK=null;
  try{await FS.setDoc(FS.doc(fs,'clubClaims/'+c.uid+'_'+c.mid),{uid:c.uid,mid:c.mid,by:FB.uid(),t:FS.serverTimestamp(),note:c.note})}
  catch(e){checkForm('Couldn\'t record it ('+((e&&e.code)||'connection')+'). It may already be claimed: check the code again.');return}
  cbox(`<div class="box big"><h2>Approved</h2><p class="claimr">Hand over: ${esc(m.reward)}</p><button type="button" class="btn" data-ccheck="1">Next customer</button><button type="button" class="btn ghost" data-chome="1">Back</button></div>`)}

/* ---------- taps ---------- */
document.addEventListener('click',e=>{const q=s=>e.target.closest(s);let el;
  if(el=q('[data-nav]')){VIEW=el.dataset.nav;render();window.scrollTo(0,0);return}
  if(q('[data-signin]')){signIn();return}
  if(q('[data-demo]')){const d=today();const packs=[openPack()];if(!ST.welcome){ST.welcome=true;packs.unshift(openPack())}ST.packs.last=d;save();showPacks(packs);return}
  if(el=q('[data-flip]')){OPEN.flipped[+el.dataset.flip]=1;drawPack();return}
  if(q('[data-flipall]')){OPEN.packs[OPEN.i].forEach((_,k)=>OPEN.flipped[k]=1);drawPack();return}
  if(q('[data-packdone]')){if(OPEN.i<OPEN.packs.length-1){OPEN.i++;OPEN.flipped={};drawPack();return}OPEN=null;closeModal();VIEW='binder';render();window.scrollTo(0,0);return}
  if(el=q('[data-card]')){cardModal(el.dataset.card);render();return}
  if(el=q('[data-miss]')){const c=CARD[el.dataset.miss];
    if(c.r<=3&&dupes(c.r)>=PACK.trade)modal(`<h2>Trade for card ${c.no}?</h2><p>Swap ${PACK.trade} ${RAR[c.r].n} duplicates for this missing ${RAR[c.r].n} card.</p><div class="row"><button type="button" class="btn ghost" data-close="1">Not now</button><button type="button" class="btn" data-trade="${c.id}">Trade</button></div>`);
    else modal(`<h2>Card ${c.no}: not found yet</h2><p>A ${RAR[c.r].n} card from ${esc(setOf(c).n)}. Keep opening packs${c.r<=3?`, or trade ${PACK.trade} ${RAR[c.r].n} duplicates for it`:''}.</p><button type="button" class="btn ghost" data-close="1">OK</button>`);return}
  if(el=q('[data-trade]')){trade(el.dataset.trade);return}
  if(el=q('[data-claim]')){claimModal(el.dataset.claim);return}
  if(el=q('[data-democlaim]')){ST.claims[el.dataset.democlaim]=Date.now();save();closeModal();render();toast('Enjoy!','Reward claimed');return}
  if(q('[data-staffin]')){staffIn();return}
  if(q('[data-staffout]')){FB.AU.signOut(FB.auth).then(counterHome);return}
  if(q('[data-chome]')){counterHome();return}
  if(q('[data-cqr]')){showQR();return}
  if(q('[data-ccheck]')){checkForm();return}
  if(q('[data-cgo]')){checkReward();return}
  if(q('[data-capprove]')){approve();return}
  if(q('[data-close]')||e.target.id==='modal'){if(!OPEN)closeModal();return}});

document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='ccode')checkReward()});

/* ---------- start ---------- */
(async()=>{if(new URLSearchParams(location.search).has('counter')){counterPage();return}
  render();const l=local();if(l)ST=Object.assign(fresh(),l);
  try{FB=await fbInit()}catch(e){console.warn('Cloud unavailable',e);FB=null}
  if(FB){try{EMAIL=FB.email();const r=await FB.load();if(r&&count(r.cards)>=count(ST.cards))ST=Object.assign(fresh(),r)}catch(_){}
    try{Object.assign(ST.claims,await FB.claims())}catch(_){}}
  READY=true;render();checkScan()})();
