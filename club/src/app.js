/* ===================== UrgerBae Card Club =====================
   Scan the counter QR once a day for a pack of 6 cards, collect the Founders set, finish sets for real items.
   State lives in users/{uid}/data/club on the website (same Google sign-in as the other games), else on this device. */
const $=id=>document.getElementById(id);
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney'}).format(new Date());
/* today's counter code: changes at midnight Sydney time */
function dayCode(d){let h=2166136261;for(const ch of CFG.secret+'|'+d){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36).slice(0,6)}
const fresh=()=>({cards:{},packs:{last:'',n:0},pity:{l:0,m:0},claims:{},newIds:{},welcome:false});
let ST=fresh(),FB=null,EMAIL=null,VIEW='home',READY=false,OPEN=null;

/* ---------- cloud ---------- */
async function fbInit(){if(!CFG.firebase)return null;const V='10.12.2',u=m=>`https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  const [Ap,AU,FS]=await Promise.all([import(u('app')),import(u('auth')),import(u('firestore'))]);
  const app=Ap.initializeApp(CFG.firebase),auth=AU.getAuth(app),fs=FS.getFirestore(app);
  await new Promise(r=>{const un=AU.onAuthStateChanged(auth,()=>{un();r()})});try{await AU.getRedirectResult(auth)}catch(_){}
  if(!auth.currentUser)await AU.signInAnonymously(auth);
  const ref=()=>FS.doc(fs,'users/'+auth.currentUser.uid+'/data/club');
  return {AU,auth,email:()=>{const p=auth.currentUser&&auth.currentUser.providerData.find(x=>x.providerId==='google.com');return p?p.email||'Google account':null},
    load:async()=>{const r=await FS.getDoc(ref());return r.exists()?r.data():null},save:o=>FS.setDoc(ref(),o)}}
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
function checkScan(){const q=new URLSearchParams(location.search),k=q.get('k');if(k==null)return;
  history.replaceState(null,'',location.pathname);const d=today();
  if(k!==dayCode(d)){toast('That code is out of date','Scan the QR at the counter today for your pack');return}
  if(ST.packs.last===d){toast('Already opened today','Come back tomorrow for your next pack');return}
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
  ${accountHtml()}`}
function accountHtml(){if(!FB)return CFG.demo?'<div class="box"><p class="note">Preview: cards are kept on this device only.</p></div>':'';
  if(EMAIL)return `<div class="box"><p class="note">Signed in as ${esc(EMAIL)}. Your cards follow you to any phone.</p></div>`;
  return `<div class="box"><h2>Keep your cards safe</h2><p>Sign in with Google so your binder isn't lost if you change phones.</p><button type="button" class="btn" data-signin="1">Sign in with Google</button></div>`}
function binderHtml(){return SETS.map(s=>{const ids=CARDS.filter(c=>c.set===s.id).map(c=>c.id);
  return `<section class="set"><h2><span class="dot" style="background:${s.col}"></span>${esc(s.n)} <small>${owned(ids)}/${ids.length}</small></h2>${s.reward?`<p class="note">Finish it for: <b>${esc(s.reward)}</b></p>`:'<p class="note">The rarest card. No prize, just bragging rights.</p>'}<div class="grid">${ids.map(tile).join('')}</div></section>`}).join('')+
  `<section class="set"><h2>Trade-ins</h2><p class="note">Every ${PACK.trade} duplicates of one rarity swap for a missing card of that rarity (up to Epic). Tap a missing card to trade.</p><div class="sets">${[0,1,2,3].map(r=>`<div class="srow"><span class="dot" style="background:${RAR[r].c}"></span><span>${RAR[r].n} duplicates</span><b>${dupes(r)}</b></div>`).join('')}</div></section>`}
function rewardsHtml(){return `<p class="note top">Finish a set, then show this screen at the counter. Staff approve it on your phone.</p>`+MILESTONES.map(m=>{const h=owned(m.cards),n=m.cards.length,done=h===n,cl=ST.claims[m.id];
  return `<div class="box"><h2>${esc(m.n)}</h2><p><b>${esc(m.reward)}</b></p><div class="bar"><i style="width:${Math.round(100*h/n)}%"></i></div><p class="note">${h} of ${n} cards</p>
  ${cl?`<p class="ok">Claimed on ${new Date(cl).toLocaleDateString('en-AU')}</p>`:done?`<button type="button" class="btn" data-claim="${m.id}">Claim at the counter</button>`:''}</div>`}).join('')}
function render(){const m=$('main');
  if(!READY){m.innerHTML='<p class="note top">Loading your binder…</p>';return}
  m.innerHTML=VIEW==='binder'?binderHtml():VIEW==='rewards'?rewardsHtml():homeHtml();
  $('nav').innerHTML=[['home','Home'],['binder','Binder'],['rewards','Rewards']].map(([k,n])=>`<button type="button" data-nav="${k}" aria-pressed="${VIEW===k}">${n}</button>`).join('')}

/* ---------- pop-ups ---------- */
function modal(html){$('modal').innerHTML=`<div class="mbox">${html}</div>`;$('modal').hidden=false}
function closeModal(){$('modal').hidden=true;$('modal').innerHTML=''}
let toastT=0;function toast(t,d){$('toast').innerHTML=`<b>${esc(t)}</b><span>${esc(d)}</span>`;$('toast').hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{$('toast').hidden=true},3600)}
/* opening packs: face-down cards, tap to flip */
function showPacks(packs){OPEN={packs,i:0,flipped:{}};drawPack()}
function drawPack(){const P=OPEN.packs[OPEN.i],first=!ST.packs.n||(OPEN.packs.length>1&&OPEN.i===0);
  modal(`<h2>${OPEN.packs.length>1&&OPEN.i===0?'Welcome pack':'Today\'s pack'}</h2><p class="note">Tap a card to flip it</p><div class="pack">${P.map((x,k)=>OPEN.flipped[k]?`<div class="pslot up">${cardHtml(x.id,{sm:1})}${x.isNew?'<i class="nw">New</i>':''}</div>`:`<button type="button" class="pslot down" data-flip="${k}" aria-label="Flip card ${k+1}"><span>UB</span></button>`).join('')}</div>
  <div class="row">${Object.keys(OPEN.flipped).length<P.length?'<button type="button" class="btn ghost" data-flipall="1">Flip all</button>':`<button type="button" class="btn" data-packdone="1">${OPEN.i<OPEN.packs.length-1?'Next pack':'Add to binder'}</button>`}</div>`)}
function cardModal(id){const n=ST.cards[id]||0;delete ST.newIds[id];save();modal(`<div class="bigc">${cardHtml(id)}</div><p class="note">You have ${n}</p><button type="button" class="btn ghost" data-close="1">Close</button>`)}
function claimModal(mid){const m=MILESTONES.find(x=>x.id===mid);
  modal(`<h2>${esc(m.n)}</h2><p class="claimr">${esc(m.reward)}</p><p class="note">Show this to staff at the counter.</p><label class="pin">Staff PIN<input id="pinIn" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></label><div class="row"><button type="button" class="btn ghost" data-close="1">Cancel</button><button type="button" class="btn" data-approve="${mid}">Approve</button></div>`)}

/* ---------- counter page: today's QR for customers to scan (staff PIN to open) ---------- */
function counterPage(){document.body.classList.add('counter');const u=new URL(location.href);u.search='';u.hash='';const base=u.toString();
  const show=()=>{const d=today(),url=base+'?k='+dayCode(d);$('main').innerHTML=`<div class="qrwrap"><h1>Scan for your<br>free card pack</h1><div id="qr" class="qr"></div><p>UrgerBae Card Club · one pack a day</p><p class="note">${d}</p></div>`;
    try{const qr=qrcode(0,'M');qr.addData(url);qr.make();$('qr').innerHTML=qr.createSvgTag({cellSize:8,margin:2,scalable:true})}catch(_){$('qr').textContent=url}
    const next=new Date();next.setHours(24,0,5,0);setTimeout(show,Math.max(60000,next-Date.now()))};
  $('nav').hidden=true;
  $('main').innerHTML=`<div class="box big"><h2>Counter screen</h2><p>Staff only. Enter the PIN to show today's QR.</p><label class="pin">Staff PIN<input id="cpin" type="password" inputmode="numeric" maxlength="8"></label><button type="button" class="btn" id="cgo">Show QR</button></div>`;
  $('cgo').onclick=()=>{if($('cpin').value===CFG.pin)show();else toast('Wrong PIN','Try again')}}

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
  if(el=q('[data-approve]')){if(($('pinIn')||{}).value!==CFG.pin){toast('Wrong PIN','Staff: try again');return}ST.claims[el.dataset.approve]=Date.now();save();closeModal();render();toast('Enjoy!','Reward claimed');return}
  if(q('[data-close]')||e.target.id==='modal'){if(!OPEN)closeModal();return}});

/* ---------- start ---------- */
(async()=>{if(new URLSearchParams(location.search).has('counter')){counterPage();return}
  render();const l=local();if(l)ST=Object.assign(fresh(),l);
  try{FB=await fbInit()}catch(e){console.warn('Cloud unavailable',e);FB=null}
  if(FB){try{EMAIL=FB.email();const r=await FB.load();if(r&&count(r.cards)>=count(ST.cards))ST=Object.assign(fresh(),r)}catch(_){}}
  READY=true;render();checkScan()})();
