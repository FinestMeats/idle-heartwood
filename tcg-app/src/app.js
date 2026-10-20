/* ===================== Heartwood TCG: the standalone app =====================
   Same account and the same card collection as Idle Heartwood (users/{uid}/data/cards).
   Its own record users/{uid}/data/tcg holds decks and results; users/{uid}/data/link carries
   check-ins that keep the idle camp's away timer going, and the idle camp's status for the home screen. */
const S={wishPend:0,shown:{}};function save(){}function buildList(){}let tab='',DG=null;
function cardPopup(id){tcgPopup(id)}
const SM=__req('./smart.js');
const A={screen:'home',fb:null,email:null,cards:{},tcg:{decks:[],stats:{w:0,l:0}},link:null,ready:false,
  edit:null,editMode:'main',poolType:'unit',collF:'L',pick:null,diff:'smart',lastMatch:null};
const FN={L:'Lumberjacks',W:'Wardens',S:'Forest Spirits',B:'Beasts',N:'Neutral'};
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- cloud ---------- */
async function fbInit(){if(typeof FB_CONFIG==='undefined'||!FB_CONFIG)return null;const V='10.12.2',u=m=>`https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  const [Ap,AU,FS]=await Promise.all([import(u('app')),import(u('auth')),import(u('firestore'))]);
  const app=Ap.initializeApp(FB_CONFIG),auth=AU.getAuth(app),fs=FS.getFirestore(app);
  await new Promise(r=>{const un=AU.onAuthStateChanged(auth,()=>{un();r()})});try{await AU.getRedirectResult(auth)}catch(_){}
  if(!auth.currentUser)await AU.signInAnonymously(auth);
  const d=n=>FS.doc(fs,'users/'+auth.currentUser.uid+'/data/'+n);
  return {AU,auth,FS,
    email:()=>{const p=auth.currentUser&&auth.currentUser.providerData.find(x=>x.providerId==='google.com');return p?p.email||'Google account':null},
    get:async n=>{const r=await FS.getDoc(d(n));return r.exists()?r.data():null},
    set:(n,o)=>FS.setDoc(d(n),o,{merge:true}),
    checkin:()=>FS.setDoc(d('link'),{chk:FS.arrayUnion(Date.now())},{merge:true})}}
/* without the cloud (the preview inside Claude), decks and results stay on this device */
const LOCAL={get:n=>{try{return JSON.parse(localStorage.getItem('hwtcg-'+n)||'null')}catch(_){return null}},set:(n,o)=>{try{const c=LOCAL.get(n)||{};localStorage.setItem('hwtcg-'+n,JSON.stringify(Object.assign(c,o)))}catch(_){}}};
async function loadAll(){const fb=A.fb;
  if(fb){const [c,t,l]=await Promise.all([fb.get('cards'),fb.get('tcg'),fb.get('link')]);A.cards=(c&&c.c)||{};A.tcg=Object.assign({decks:[],stats:{w:0,l:0}},t||{});A.link=l;A.email=fb.email()}
  else{A.tcg=Object.assign({decks:[],stats:{w:0,l:0}},LOCAL.get('tcg')||{});A.cards={}}
  A.ready=true;render()}
function saveTcg(){const o={decks:A.tcg.decks,stats:A.tcg.stats,t:Date.now()};if(A.fb)A.fb.set('tcg',o).catch(()=>showToast('Not saved','Check your connection and try again','leaf'));else LOCAL.set('tcg',o)}
/* a check-in at most every 10 minutes: opening the app, or finishing a match */
async function checkin(){if(!A.fb)return;let last=0;try{last=+localStorage.getItem('hwtcg-chk')||0}catch(_){}
  if(Date.now()-last<600000)return;try{await A.fb.checkin();localStorage.setItem('hwtcg-chk',String(Date.now()));A.link=await A.fb.get('link');if(A.screen==='home')render()}catch(_){}}
async function signIn(){const fb=A.fb;if(!fb)return;const {AU,auth}=fb,prov=new AU.GoogleAuthProvider();
  try{await AU.linkWithPopup(auth.currentUser,prov)}
  catch(e){const c=e&&e.code;if(c==='auth/credential-already-in-use'){await AU.signInWithCredential(auth,AU.GoogleAuthProvider.credentialFromError(e))}
    else if(c==='auth/popup-blocked'||c==='auth/operation-not-supported-in-this-environment'){await AU.signInWithRedirect(auth,prov);return}
    else if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return;else{showToast('Sign-in failed',(e&&e.message)||'Try again later','leaf');return}}
  await loadAll();checkin();showToast('Signed in','Your cards and decks follow your Google account','leaf')}

/* ---------- cards and decks ---------- */
const own=id=>A.cards[id]||0;
const isAncient=id=>!!(TCd(id).kw&&TCd(id).kw.ancient);
const maxCopies=id=>isAncient(id)?1:3;
const sortCards=(a,b)=>TCd(a).cost-TCd(b).cost||TCd(a).n.localeCompare(TCd(b).n);
function starterDeck(f){const s=TCG.starter(f);return {id:'st_'+f,name:FN[f]+' starter',f,keeper:f+'_a',main:s.main,ring:s.ring,starter:true}}
const STARTERS=()=>'LWSB'.split('').map(starterDeck);
function count(list){const c={};list.forEach(id=>c[id]=(c[id]||0)+1);return c}
/* what's wrong with a deck, in plain words (empty = ready to play) */
function deckProblems(D){if(D.starter)return [];const out=[];
  if(D.main.length!==30)out.push(`Main deck has ${D.main.length} of 30 cards`);
  if(D.ring.length!==6)out.push(`Ring deck has ${D.ring.length} of 6 cards`);
  const c=count(D.main.concat(D.ring));
  for(const id in c){const d=TCd(id);if(!d){out.push('Unknown card '+id);continue}
    if(d.f!==D.f&&d.f!=='N')out.push(`${d.n} isn't a ${FN[D.f]} or Neutral card`);
    if(c[id]>maxCopies(id))out.push(`${d.n}: at most ${maxCopies(id)} ${maxCopies(id)===1?'copy':'copies'}`);
    else if(c[id]>own(id))out.push(`${d.n}: you own ${own(id)}, the deck uses ${c[id]}`)}
  return out}
const allDecks=()=>A.tcg.decks.concat(STARTERS());
const findDeck=id=>allDecks().find(d=>d.id===id);

/* ---------- idle camp status (from the link record) ---------- */
function campHtml(){const L=A.link,idle=L&&L.idle;
  if(!A.fb)return `<div class="row"><div class="t"><div class="n">${ico('tent')}Your idle camp</div><div class="d">On the website, playing here keeps your Idle Heartwood camp going.</div></div></div>`;
  if(!idle)return `<div class="row"><div class="t"><div class="n">${ico('tent')}Your idle camp</div><div class="d">Open Idle Heartwood on this account once to link your camp. After that, every visit here keeps its away timer going.</div></div></div>`;
  const now=Date.now(),cap=(idle.capH||12)*3600,from=idle.last||now,chk=(L.chk||[]).filter(t=>t>from).sort((a,b)=>a-b);
  let prev=from,banked=0;for(const t of chk){banked+=Math.min((t-prev)/1000,cap);prev=t}
  const fill=Math.min((now-prev)/1000,cap),waiting=banked+fill,pct=Math.round(100*fill/cap),hr=s=>s>=3600?(s/3600).toFixed(s>=36000?0:1)+'h':Math.round(s/60)+'m';
  return `<div class="row"><div class="t"><div class="n">${ico('tent')}Your idle camp<small>stores ${pct}% full</small></div>
    <div class="bar" style="margin:6px 0 4px"><i style="width:${pct}%"></i></div>
    <div class="d">Waiting for you in Idle Heartwood: about <b>${hr(waiting)}</b> of away time${chk.length?` (${chk.length} visit${chk.length===1?'':'s'} from here so far)`:''}. Stores hold ${idle.capH||12}h. Every visit here empties them into your camp, so they keep filling.</div></div></div>`}

/* ---------- screens ---------- */
function navHtml(){return [['home','house','Home'],['play','swords','Play'],['decks','card','Decks'],['coll','book','Collection']].map(([k,ic,n])=>`<button type="button" data-nav="${k}" aria-pressed="${A.screen===k||(k==='decks'&&A.screen==='edit')}">${ico(ic)}<span>${n}</span></button>`).join('')}
function homeHtml(){const st=A.tcg.stats,tot=Object.keys(TCG.CARDS).length,have=Object.keys(TCG.CARDS).filter(id=>own(id)>0).length;
  return `<div class="hero"><h1>Heartwood TCG</h1><div class="note">Turn-based battles with your Idle Heartwood cards</div></div>
  <button class="buy big" type="button" data-nav="play">${ico('swords')} Play</button>
  <p class="sec">Record</p><div class="row"><div class="t"><div class="n">${ico('medal')}${st.w} wins · ${st.l} losses</div><div class="d">Against the computer. Rewards and a ladder come next.</div></div></div>
  <p class="sec">Collection</p><div class="row"><div class="t"><div class="n">${ico('card')}${have} of ${tot} cards</div><div class="d">Shared with Idle Heartwood: cards you find there show up here.</div></div><button class="info" type="button" data-nav="coll">View</button></div>
  <p class="sec">Camp</p>${campHtml()}
  <p class="sec">Account</p>${accountHtml()}`}
function accountHtml(){if(!A.fb)return `<div class="row"><div class="t"><div class="n">${ico('leaf')}Playing on this device</div><div class="d">The website version shares your account with Idle Heartwood.</div></div></div>`;
  return `<div class="row"><div class="t"><div class="n">${ico('leaf')}${A.email?'Signed in':'This device only'}</div><div class="d">${A.email?'Signed in as '+esc(A.email)+'. The same account as Idle Heartwood.':'Sign in with the Google account you use in Idle Heartwood to bring your cards here.'}</div></div>${A.email?'':'<button class="buy" type="button" data-signin="1">Sign in with Google</button>'}</div>`}
function deckRow(D,act){const p=deckProblems(D),K=TCG.KEEPERS[D.keeper];
  return `<div class="row"><div class="t"><div class="n"><span class="dot" style="background:${FACTIONS.find(f=>f.id===D.f).col}"></span>${esc(D.name)}<small>${K.n}</small></div><div class="d">${p.length?`<span style="color:#ff9f43">${esc(p[0])}${p.length>1?` (+${p.length-1} more)`:''}</span>`:D.starter?'Always available':`Ready${D.w||D.l?` · ${D.w||0}–${D.l||0}`:''}`}</div></div>${act}</div>`}
function playHtml(){const ds=allDecks();if(!A.pick||!findDeck(A.pick))A.pick=(ds.find(d=>!deckProblems(d).length)||ds[0]).id;
  return `<p class="sec">Choose your deck</p>${ds.map(D=>deckRow(D,`<button class="${A.pick===D.id?'buy':'info'}" type="button" data-pick="${D.id}" ${deckProblems(D).length?'disabled':''}>${A.pick===D.id?'Picked':'Pick'}</button>`)).join('')}
  <p class="sec">Opponent</p><div class="sel">${[['smart','Smart'],['easy','Easy']].map(([k,n])=>`<button type="button" data-diff="${k}" aria-pressed="${A.diff===k}">${n}</button>`).join('')}</div>
  <div class="note">${A.diff==='smart'?'Smart thinks ahead and defends well.':'Easy plays the best-looking card and is good for learning.'} They use a random starter deck.</div>
  <button class="buy big" type="button" data-start="1">${ico('swords')} Start match</button>`}
function decksHtml(){const mine=A.tcg.decks;
  return `<p class="sec">Your decks</p>${mine.length?mine.map(D=>deckRow(D,`<button class="info" type="button" data-edit="${D.id}">Edit</button>`)).join(''):'<div class="note">No decks yet. Start from a starter deck, or build one from scratch.</div>'}
  <button class="buy" type="button" data-newdeck="1">${ico('card')} New deck</button>
  <p class="sec">Starter decks</p>${STARTERS().map(D=>deckRow(D,`<button class="info" type="button" data-copy="${D.f}">Copy</button>`)).join('')}
  <div class="note">A deck is 30 cards plus a 6-card Ring deck, from one faction and Neutral, using cards you own. Up to 3 copies of a card (1 of an Ancient).</div>`}
function editHtml(){const D=A.edit,c=count(D.main.concat(D.ring)),list=A.editMode==='main'?D.main:D.ring,p=deckProblems(D);
  const keepers=Object.values(TCG.KEEPERS).filter(k=>k.f===D.f);
  const pool=Object.keys(TCG.CARDS).filter(id=>{const d=TCd(id);return (d.f===D.f||d.f==='N')&&own(id)>0&&(A.poolType==='unit'?d.type==='unit':d.type!=='unit')}).sort(sortCards);
  const grouped=Object.entries(count(list)).sort((a,b)=>sortCards(a[0],b[0]));
  return `<div class="row"><div class="t"><div class="n"><span class="dot" style="background:${FACTIONS.find(f=>f.id===D.f).col}"></span>${esc(D.name)}</div><div class="d">${FN[D.f]}</div></div><div class="pair"><button class="info" type="button" data-rename="1">Rename</button><button class="buy" type="button" data-savedeck="1">Save</button></div></div>
  <p class="sec">Keeper</p><div class="sel">${keepers.map(k=>`<button type="button" data-keeper="${k.id}" aria-pressed="${D.keeper===k.id}"><span class="kp">${k.n}<br><small>${k.p} power</small></span></button>`).join('')}</div>
  <div class="note">${(()=>{const K=TCG.KEEPERS[D.keeper];return `${K.n}: ${K.p} power, ${TCG.startRings(K.id)} Rings. `+K.ab.map(([c2,op,v])=>`${c2} Sap: ${TCG.abilityText(op,v)}`).join(' · ')})()}</div>
  <div class="sel">${[['main','Main deck',D.main.length,30],['ring','Ring deck',D.ring.length,6]].map(([k,n,x,y])=>`<button type="button" data-emode="${k}" aria-pressed="${A.editMode===k}">${n} <b style="color:${x===y?'var(--sap)':'#ff9f43'}">${x}/${y}</b></button>`).join('')}</div>
  <div class="cgrid">${grouped.length?grouped.map(([id,n])=>`<div class="cw">${tCard(id,{attr:` data-rmc="${id}"`})}<span class="cnt">×${n}</span></div>`).join(''):`<div class="note">Empty. Tap cards below to add them.</div>`}</div>
  ${A.editMode==='ring'?'<div class="note">Rings crack into your hand when your Keeper is hit. Big units and Sprout cards make strong Rings.</div>':''}
  <p class="sec">Add cards</p><div class="sel">${[['unit','Units'],['other','Tools, Reactions, Events']].map(([k,n])=>`<button type="button" data-ptype="${k}" aria-pressed="${A.poolType===k}">${n}</button>`).join('')}</div>
  <div class="cgrid">${pool.length?pool.map(id=>{const left=Math.min(own(id),maxCopies(id))-(c[id]||0);return `<div class="cw${left<=0?' dim':''}">${tCard(id,{attr:left>0?` data-addc="${id}"`:''})}<span class="cnt">${left>0?'+'+left:'max'}</span></div>`}).join(''):`<div class="note">You don't own any ${A.poolType==='unit'?'units':'cards of this kind'} for ${FN[D.f]} yet. Find them in Idle Heartwood chests.</div>`}</div>
  ${p.length?`<p class="sec">Before you can play</p>${p.slice(0,6).map(x=>`<div class="note" style="color:#ff9f43">· ${esc(x)}</div>`).join('')}`:'<div class="note" style="color:var(--sap)">Ready to play</div>'}
  <div class="pair" style="margin-top:10px"><button class="info" type="button" data-back="1">Back</button>${D.id&&A.tcg.decks.some(x=>x.id===D.id)?'<button class="info" type="button" data-deldeck="1">Delete deck</button>':''}</div>
  <div class="note">Tap a card in the deck to take it out; hold any card to read it.</div>`}
function collHtml(){const ids=Object.keys(TCG.CARDS).filter(id=>TCd(id).f===A.collF).sort(sortCards),have=ids.filter(id=>own(id)>0).length;
  return `<div class="sel">${'LWSBN'.split('').map(f=>`<button type="button" data-collf="${f}" aria-pressed="${A.collF===f}"><span class="dot" style="background:${FACTIONS.find(x=>x.id===f).col}"></span>${FN[f].split(' ').pop()}</button>`).join('')}</div>
  <div class="note">${have} of ${ids.length} ${FN[A.collF]} cards. Hold a card to read it.</div>
  <div class="cgrid">${ids.map(id=>own(id)?`<div class="cw">${tCard(id,{})}<span class="cnt">×${own(id)}</span></div>`:`<div class="cw dim">${tCard(id,{})}<span class="cnt">0</span></div>`).join('')}</div>
  ${A.fb&&!Object.keys(A.cards).length?'<div class="note">No cards yet on this account. Play Idle Heartwood and open sealed cards from chests, or sign in with the account you use there.</div>':''}`}
function render(){$('nav').innerHTML=navHtml();const m=$('main');
  if(!A.ready){m.innerHTML='<div class="note" style="margin-top:40px;text-align:center">Loading your cards…</div>';return}
  const top=m.scrollTop;m.innerHTML=A.screen==='play'?playHtml():A.screen==='decks'?decksHtml():A.screen==='edit'&&A.edit?editHtml():A.screen==='coll'?collHtml():homeHtml();
  if(A.screen==='edit')m.scrollTop=top}

/* ---------- matches ---------- */
function startMatch(){const D=findDeck(A.pick);if(!D||deckProblems(D).length){showToast('Pick a deck','That deck is not ready yet','card');return}
  const of='LWSB'.replace(D.f,'')[Math.floor(Math.random()*3)],ok=Object.values(TCG.KEEPERS).filter(k=>k.f===of),okid=ok[Math.floor(Math.random()*ok.length)].id,T=TCG.starter(of);
  A.lastMatch={deck:D.id};
  TCG_HOST.aiNext=A.diff==='smart'?SM.smartNext:TCG.aiNext;
  tcgBeginDecks({keeper:D.keeper,main:D.main.slice(),ring:D.ring.slice()},{name:FN[of],keeper:okid,main:T.main,ring:T.ring},A.diff==='smart'?'smart':null)}
TCG_HOST.finish=won=>{const st=A.tcg.stats;if(won)st.w++;else st.l++;const D=A.tcg.decks.find(d=>d.id===(A.lastMatch&&A.lastMatch.deck));if(D){if(won)D.w=(D.w||0)+1;else D.l=(D.l||0)+1}saveTcg();checkin()};
TCG_HOST.finishNote=won=>`<div class="note">Record ${A.tcg.stats.w}–${A.tcg.stats.l}${A.fb&&A.link&&A.link.idle?' · this match counts as a visit to your idle camp':''}</div>`;
TCG_HOST.again=()=>startMatch();
TCG_HOST.close=()=>{A.screen='home';render()};

/* ---------- taps ---------- */
$('app2').addEventListener('click',e=>{const q=s=>e.target.closest(s);let el;
  if(el=q('[data-nav]')){A.screen=el.dataset.nav;$('main').scrollTop=0;render();return}
  if(q('[data-signin]')){signIn();return}
  if(el=q('[data-pick]')){A.pick=el.dataset.pick;render();return}
  if(el=q('[data-diff]')){A.diff=el.dataset.diff;render();return}
  if(q('[data-start]')){startMatch();return}
  if(q('[data-newdeck]')){showModal(`<h2>New deck</h2><div class="note">Pick a faction. You can add Neutral cards too.</div><div class="btns" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">${'LWSB'.split('').map(f=>`<button class="buy" type="button" data-nf="${f}" style="background:${FACTIONS.find(x=>x.id===f).col};color:#fff">${FN[f]}</button>`).join('')}</div><button class="info" type="button" id="toastOk">Cancel</button>`);return}
  if(el=q('[data-copy]')){const s=starterDeck(el.dataset.copy);A.edit={id:'d'+Date.now(),name:'My '+FN[s.f],f:s.f,keeper:s.keeper,main:s.main.slice(),ring:s.ring.slice()};A.editMode='main';A.screen='edit';$('main').scrollTop=0;render();return}
  if(el=q('[data-edit]')){const D=A.tcg.decks.find(d=>d.id===el.dataset.edit);A.edit=JSON.parse(JSON.stringify(D));A.editMode='main';A.screen='edit';$('main').scrollTop=0;render();return}
  if(!A.edit&&A.screen==='edit'){A.screen='decks';render();return}
  if(el=q('[data-keeper]')){A.edit.keeper=el.dataset.keeper;render();return}
  if(el=q('[data-emode]')){A.editMode=el.dataset.emode;render();return}
  if(el=q('[data-ptype]')){A.poolType=el.dataset.ptype;render();return}
  if(el=q('[data-addc]')){const id=el.dataset.addc,L=A.editMode==='main'?A.edit.main:A.edit.ring,cap=A.editMode==='main'?30:6;
    if(L.length>=cap){showToast(A.editMode==='main'?'Main deck full':'Ring deck full',`It holds ${cap} cards. Take one out first.`,'card');return}L.push(id);render();return}
  if(el=q('[data-rmc]')){const L=A.editMode==='main'?A.edit.main:A.edit.ring,i=L.lastIndexOf(el.dataset.rmc);if(i>=0)L.splice(i,1);render();return}
  if(q('[data-rename]')){const n=prompt('Deck name',A.edit.name);if(n!=null&&n.trim()){A.edit.name=n.trim().slice(0,24);render()}return}
  if(q('[data-savedeck]')){const D=A.edit,i=A.tcg.decks.findIndex(d=>d.id===D.id);if(i>=0)A.tcg.decks[i]=D;else A.tcg.decks.push(D);saveTcg();A.pick=D.id;showToast('Deck saved',deckProblems(D).length?'Saved. Finish it to play':'Ready to play','card');return}
  if(q('[data-deldeck]')){if(!confirm('Delete this deck?'))return;A.tcg.decks=A.tcg.decks.filter(d=>d.id!==A.edit.id);saveTcg();A.edit=null;A.screen='decks';render();return}
  if(q('[data-back]')){A.edit=null;A.screen='decks';render();return}
  if(el=q('[data-collf]')){A.collF=el.dataset.collf;render();return}});
/* pop-up buttons for this app (faction pick for a new deck, OK) */
$('toast').addEventListener('click',e=>{const f=e.target.closest('[data-nf]');
  if(f){nextToast();const k=f.dataset.nf;A.edit={id:'d'+Date.now(),name:'My '+FN[k],f:k,keeper:k+'_a',main:[],ring:[]};A.editMode='main';A.screen='edit';render();return}
  if(e.target.id==='toastOk')nextToast()});
$('cardZoom').addEventListener('click',e=>{e.stopPropagation();$('cardZoom').hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('cardZoom').hidden)$('cardZoom').hidden=true});
document.addEventListener('pointerdown',()=>{try{if(!AC&&sfxOn)sfx('chop')}catch(_){}},{once:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&A.fb)loadAll().then(checkin).catch(()=>{})});

/* ---------- start ---------- */
render();
(async()=>{try{A.fb=await fbInit()}catch(e){console.warn('Cloud unavailable',e);A.fb=null}
  try{await loadAll()}catch(e){A.ready=true;render();showToast('Offline','Could not load your cards. Starter decks still work.','leaf')}
  checkin()})();
