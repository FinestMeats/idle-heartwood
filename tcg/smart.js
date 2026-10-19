/* Heartwood TCG: a "thinking" computer opponent for testing rules.
   - Never looks at hidden cards: before each look-ahead it reshuffles everything it can't see
     (the other player's hand + deck, both decks, both Ring stacks).
   - Work and Fell: for every legal move, plays out the rest of its turn and the other player's whole
     next turn several times, then scores the position at the start of its next turn. Picks the best average.
   - Defending: tries every sensible answer (take it, each blocker, Reactions/Brace stacks, Fade, Scarecrow),
     resolves each on a copy and keeps the one that leaves it best off, counting what Sap it keeps for later.
   - Scoring knows Rings get more precious as they run out, threats on board, cards in hand,
     a thin deck, and how many big hitters each side has against the other's Keeper. */
const E=require('./engine.js');const {CARDS,KEEPERS}=require('./cards.js');
const C=id=>CARDS[id];
const OPT={samples:3,maxCand:14,rw:1.75,uw:1,pw:1,hw:1,deckNeed:15,dw:2.5};
let rs=12345;const rnd=()=>{rs=(rs*1103515245+12345)>>>0;return rs/4294967296};
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

/* ---------- position score from player i's side ---------- */
const lifeVal=L=>{let v=0;for(let k=1;k<=L;k++)v+=2.2+7/k;return v};/* L = hits still needed to win */
function unitVal(G,P,x){const d=C(x.id),kw=d.kw;let v=1+E.power(G,P,x)*1.1+x.tools.length*0.3;
  if(kw.guard)v+=0.6;if(kw.rally)v+=0.5*(E.units(P).length-1);if(kw.double)v+=1;if(kw.crew)v+=0.4;return v}
function side(G,j){const P=G.p[j],O=G.p[1-j];
  let v=OPT.rw*lifeVal(P.rings.length+1)+P.heart.length*1.2;
  for(const x of E.units(P))v+=OPT.uw*unitVal(G,P,x);
  for(const id of P.hand){const d=C(id);v+=OPT.hw*(d.type==='reaction'?1.1:d.type==='unit'&&d.cost<=P.sapLvl+1?1:0.8)}
  /* a thin deck is a slow loss: weigh it like a real player, more as it empties */
  {const dl=P.deck.length,need=OPT.deckNeed;if(dl<need)v-=OPT.dw*(need-dl)*(need-dl)/need}
  /* pressure: units that beat their Keeper, minus their blockers that could stop them */
  const kp=E.kPower(G,O),hit=E.units(P).filter(x=>E.power(G,P,x)>=kp).length;
  const walls=E.units(O).filter(y=>y.row==='C'||C(y.id).kw.guard).length;
  v+=OPT.pw*Math.max(0,hit-walls*0.5)*(1.2+3/(O.rings.length+1));
  return v}
function score(G,i){if(G.over)return G.winner===i?1e4:G.winner<0?0:-1e4;return side(G,i)-side(G,1-i)}

/* ---------- hidden information: reshuffle what player i can't see ---------- */
function determinize(G,i){const H=E.clone(G);H.rs=(rnd()*4294967296)>>>0||1;const O=H.p[1-i],P=H.p[i];
  const pool=shuf(O.hand.concat(O.deck)),n=O.hand.length;O.hand=pool.slice(0,n);O.deck=pool.slice(n);
  shuf(P.deck);for(const Q of H.p){const r=shuf(Q.rings.concat(Q.heart)),k=Q.rings.length;Q.rings=r.slice(0,k);Q.heart=r.slice(k)}
  return H}

/* ---------- defending: try each answer on a copy ---------- */
function smartDefend(G,j,ap,d,dp,a){const Q=G.p[j];const none={cards:[],plus:0,minus:0,guard:null,negate:false,decoy:false};
  if(dp>ap)return none;
  const opts=[none];
  for(const id of new Set(Q.hand)){const c=C(id);if(c.type!=='reaction'||c.cost>Q.sap)continue;
    if(c.fx.negate)opts.push({...none,cards:[id],negate:true});if(c.fx.decoy)opts.push({...none,cards:[id],decoy:true})}
  /* boost cards, best value per Sap first; try each prefix */
  const boosts=[];Q.hand.forEach(id=>{const c=C(id);if(c.type==='reaction'){if(c.fx.plus)boosts.push({id,v:c.fx.plus,s:c.cost});else if(c.fx.attackerMinus)boosts.push({id,v:c.fx.attackerMinus,s:c.cost,m:1});else if(c.fx.plusPerUnit)boosts.push({id,v:E.units(Q).length,s:c.cost})}else if(c.kw&&c.kw.brace)boosts.push({id,v:c.kw.brace,s:0})});
  boosts.sort((x,y)=>(x.s-y.s)||(y.v-x.v));
  const prefixes=[[]];{let sap=Q.sap,cur=[];for(const b of boosts){if(b.s>sap)continue;sap-=b.s;cur=cur.concat([b]);prefixes.push(cur);if(prefixes.length>5)break}}
  const guards=[null,...E.blockers(G,Q,d).map(x=>x.u)];
  for(const g of guards)for(const pre of prefixes){if(g==null&&!pre.length)continue;
    opts.push({...none,guard:g,cards:pre.map(b=>b.id),plus:pre.filter(b=>!b.m).reduce((s,b)=>s+b.v,0),minus:pre.filter(b=>b.m).reduce((s,b)=>s+b.v,0)})}
  let best=none,bs=-1e9;
  for(const p of opts){const H=E.clone(G);H.log=[];
    /* the attacker is already tired; replay just the fight on the copy */
    const P=H.p[1-j];let undo=null;if(a==='K')H.p[1-j].k.exh=false;else{const x=E.findU(P,a);if(x)x.exh=false}
    E.apply(H,{t:'attack',a,d},()=>p);
    let v=score(H,j);
    /* Sap kept back is still worth something on their turn (more Reactions later) */
    v+=H.p[j].sap*0.15;
    if(v>bs){bs=v;best=p}}
  return best}

/* ---------- playouts with the quick policy ---------- */
function quickRestOfTurn(H){const i=H.turn;let n=0;while(!H.over&&H.turn===i&&n++<3){if(H.phase==='work')E.aiWork(H);else E.aiFell(H)}}
function lookahead(G,i,m){let tot=0;
  for(let s=0;s<OPT.samples;s++){const H=determinize(G,i);H.log=[];E.apply(H,m);
    /* finish my turn, then their whole reply; always stop at the start of my next turn */
    let n=0;while(!H.over&&H.turn===i&&n++<4){if(H.phase==='work')E.aiWork(H);else E.aiFell(H)}
    n=0;while(!H.over&&H.turn!==i&&n++<4){if(H.phase==='work')E.aiWork(H);else E.aiFell(H)}
    tot+=score(H,i)}
  return tot/OPT.samples}
/* pick the moves worth looking ahead on: an instant score first, then the best few */
function pick(G,i,ms){if(ms.length===1)return ms[0];
  let cand=ms;if(ms.length>OPT.maxCand){cand=ms.map(m=>{const H=E.clone(G);H.log=[];E.apply(H,m);return [score(H,i),m]}).sort((x,y)=>y[0]-x[0]).slice(0,OPT.maxCand).map(x=>x[1]);
    for(const t of ['tofell','end']){const e=ms.find(m=>m.t===t);if(e&&!cand.includes(e))cand.push(e)}}
  let best=cand[0],bs=-1e9;for(const m of cand){const v=lookahead(G,i,m);if(v>bs){bs=v;best=m}}return best}
function smartTurn(G){const i=G.turn;let n=0;
  while(!G.over&&G.turn===i&&n++<40){let ms=E.moves(G);
    /* the coin only when it unlocks a play this turn, same as the quick AI */
    if(G.phase==='work'){const P=G.p[i];ms=ms.filter(m=>m.t!=='coin'||P.hand.some(id=>C(id).cost>P.sap&&C(id).cost<=P.sap+2))}
    E.apply(G,pick(G,i,ms))}}
/* smarter mulligan: want 2+ cards you can play by turn 3 and at least one unit costing 1-2 */
function smartMulligan(G,i){const P=G.p[i],ok=h=>h.filter(id=>C(id).cost<=3).length>=2&&h.some(id=>C(id).type==='unit'&&C(id).cost<=2);
  if(!ok(P.hand))E.redraw(G,i)}

E.DEFENDERS.smart=smartDefend;
/* a full game: kinds = ['smart'|'quick', 'smart'|'quick'] */
function playMatch(a,b,seed,kinds,maxTurns){rs=(seed*2654435761)>>>0||7;
  const G=E.newGame(a,b,seed);kinds.forEach((k,j)=>{G.p[j].ai=k==='smart'?'smart':undefined});
  /* the engine already did the quick mulligan; smart players get their own check on top */
  kinds.forEach((k,j)=>{if(k==='smart')smartMulligan(G,j)});
  maxTurns=maxTurns||80;
  while(!G.over&&G.turnNo<maxTurns){const k=kinds[G.turn];if(k==='smart')smartTurn(G);else{E.aiWork(G);if(!G.over&&G.phase==='fell')E.aiFell(G)}}
  if(!G.over){G.over=true;G.winner=-1;G.reason='timeout'}return G}
module.exports={smartDefend,smartTurn,playMatch,score,OPT};
