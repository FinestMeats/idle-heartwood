/* Heartwood TCG rules engine + computer opponent. No DOM: state is plain data (JSON-cloneable). */
const {CARDS,KEEPERS}=require('./cards.js');
const ROWCAP=3,SAPCAP=10,RINGCAP=6;
const C=id=>CARDS[id];
function rnd(G){G.rs=(G.rs+0x6D2B79F5)>>>0;let t=G.rs;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
function shuffle(G,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd(G)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
/* fast copy of the game state (the AI copies it a lot) */
const cpU=x=>({u:x.u,id:x.id,exh:x.exh,sick:x.sick,tools:x.tools.slice(),tmp:x.tmp,sh:x.sh,moved:x.moved,row:x.row});
const cpP=P=>({...P,k:{...P.k,used:{...P.k.used}},deck:P.deck.slice(),hand:P.hand.slice(),rings:P.rings.slice(),heart:P.heart.slice(),grave:P.grave.slice(),rows:{C:P.rows.C.map(cpU),T:P.rows.T.map(cpU)},stats:{...P.stats}});
const clone=G=>({...G,aura:{...G.aura},log:G.log.slice(),p:G.p.map(cpP)});
let UID=1;
function inst(G,id){return {u:G.uid++,id,exh:false,sick:true,tools:[],tmp:0,sh:0,moved:false,row:null}}
function newPlayer(G,cfg){const P={name:cfg.name,f:KEEPERS[cfg.keeper].f,k:{id:cfg.keeper,exh:false,dz:0,hush:0,used:{},row:KEEPERS[cfg.keeper].row==='W'?'C':KEEPERS[cfg.keeper].row},
  deck:shuffle(G,cfg.main.slice()),hand:[],rings:[],heart:null,grave:[],rows:{C:[],T:[]},sapLvl:0,sap:0,coin:false,stats:{abil:0,hits:0,react:0}};
  /* stronger Keeper, fewer starting Rings: power 5 → 4 Rings, 4 → 5, 3 or less → 6. The rest wait in the Heartwood. */
  const ring=shuffle(G,cfg.ring.slice()),n=startRings(cfg.keeper);P.rings=ring.slice(0,n);P.heart=ring.slice(n);
  for(let i=0;i<5;i++)P.hand.push(P.deck.shift());return P}
const startRings=k=>(KEEPERS[k].p>=4?5:6)+RULES.ringDelta;
function newGame(a,b,seed,human){const G={rs:seed>>>0||1,uid:1,turn:0,first:0,turnNo:0,phase:'work',aura:{C:0,T:0},over:false,winner:-1,reason:'',log:[]};
  G.p=[newPlayer(G,a),newPlayer(G,b)];
  /* coin flip: winner goes first, the other keeps the coin */
  G.first=rnd(G)<0.5?0:1;G.turn=G.first;G.p[1-G.first].coin=!RULES.noCoin;
  /* going second: keep the coin and draw one extra card */
  if(!RULES.noExtra)draw(G,1-G.first);
  for(let i=0;i<2;i++)if(i!==human)aiMulligan(G,i);
  dawn(G,true);return G}
function redraw(G,i){const P=G.p[i],n=P.hand.length;P.deck.push(...P.hand);P.hand=[];shuffle(G,P.deck);for(let k=0;k<n;k++)P.hand.push(P.deck.shift())}
function aiMulligan(G,i){const P=G.p[i];if(P.hand.filter(id=>C(id).cost<=3).length>=2)return;P.deck.push(...P.hand);P.hand=[];shuffle(G,P.deck);for(let k=0;k<5;k++)P.hand.push(P.deck.shift())}
const units=P=>P.rows.C.concat(P.rows.T);
const findU=(P,u)=>units(P).find(x=>x.u===u);
const kwOf=(x,k)=>C(x.id).kw[k]||x.tools.some(t=>C(t).fx[k]);
function power(G,P,x){const d=C(x.id);let v=d.p+x.tmp+x.sh;for(const t of x.tools)v+=C(t).fx.p||0;
  const row=x.row,au=G.aura[row];if(au&&!(au<0&&d.kw.ancient))v+=au;
  if(G.p[G.turn]===P)v+=units(P).filter(y=>y!==x&&C(y.id).kw.rally).length;
  if(d.kw.crew)v+=units(P).filter(y=>y!==x&&y.id===x.id).length;
  return Math.max(0,v)}
/* wear test: each hit a Keeper takes lowers its power by 1 for the rest of the game (never below 1) */
function kPower(G,P){return Math.max(1,KEEPERS[P.k.id].p-(RULES.wear?(P.k.wear||0):0))}
/* any ready unit in your Clearing can block; Guard units can block from either row and get +2 power while blocking */
const blockPower=(G,P,x)=>power(G,P,x)+(kwOf(x,'guard')?RULES.guardBonus:0);
const blockers=(G,P,d)=>units(P).filter(x=>!x.exh&&x.u!==d&&(x.row==='C'||kwOf(x,'guard')));
/* rule switches for testing (all off = the live rules) */
const RULES={fatigue:0,guardBonus:2,clock:0,wear:0,ringDelta:0,sapStep:2,sapCap:10,p1first:1,rampTo:0,noCoin:1,noExtra:1,regrowDiscard:0};
/* v91 rules: +2 Sap a turn (first player starts on 1, second on 2), no coin, no extra card, Regrow only from the Heartwood */const setRule=(k,v)=>{RULES[k]=v};
function draw(G,i){const P=G.p[i];
  if(!P.deck.length){
    /* 'reshuffle': the first time your deck runs out, shuffle your discard pile in as a new deck */
    if(RULES.fatigue==='reshuffle'&&!P.reshuf&&P.grave.length){P.reshuf=1;P.deck=shuffle(G,P.grave.splice(0));lg(G,P.name+' reshuffles the discard pile')}
    /* 'wither': drawing from an empty deck burns a Ring instead (no card); with no Rings left you lose */
    else if(RULES.fatigue==='wither'){if(P.rings.length){P.grave.push(P.rings.pop());lg(G,P.name+' withers: a Ring is lost');return false}end(G,1-i,'withered');return false}
    else{end(G,1-i,'deck-out');return false}}
  P.hand.push(P.deck.shift());return true}
const lg=(G,txt)=>{G.log.push(txt);if(G.log.length>80)G.log.shift()};
const nm=id=>C(id).n;
const vb=(P,v)=>P.name==='You'?({plays:'play',ends:'end',spends:'spend'}[v]||v):v;
const own=P=>P.name==='You'?'your':P.name+"'s";
function end(G,w,why){if(G.over)return;G.over=true;G.winner=w;G.reason=why}
function dawn(G,firstTurn){const i=G.turn,P=G.p[i];G.turnNo++;G.phase='work';
  for(const x of units(P)){x.exh=false;x.sick=false;x.moved=false;x.sh=0}
  P.k.exh=P.k.dz>0;P.k.dz=0;P.k.used={};
  if(KEEPERS[P.k.id].row==='W')P.k.row='C';
  /* Sap growth (tests): sapStep a turn up to sapCap; rampTo = +sapStep only until that level, then +1;
     p1first = what the first player gets on their very first turn */
  let step=RULES.sapStep;if(RULES.rampTo&&P.sapLvl>=RULES.rampTo)step=1;
  if(P.sapLvl===0&&i===G.first&&RULES.p1first!=null)step=RULES.p1first;
  P.sapLvl=Math.min(RULES.sapCap,P.sapLvl+step);P.sap=P.sapLvl;
  if(!(firstTurn&&i===G.first))draw(G,i)}
function dusk(G){const P=G.p[G.turn];for(const x of units(P))x.tmp=0;P.k.hush=0;G.turn=1-G.turn;if(!G.over)dawn(G,false)}
function toGrave(G,P,x){for(const r of ['C','T'])P.rows[r]=P.rows[r].filter(y=>y!==x);P.grave.push(x.id,...x.tools)}
/* Regrow: the Heartwood card first; after that, a random card from your discard pile (never your deck) */
function regrow(G,P){if(P.rings.length>=RINGCAP)return;if(P.heart.length){P.rings.push(P.heart.pop())}else if(RULES.regrowDiscard&&P.grave.length){const j=Math.floor(rnd(G)*P.grave.length);P.rings.push(P.grave.splice(j,1)[0])}}
function bestUnitIn(list,maxCost){let b=null;for(const id of list){const d=C(id);if(d.type==='unit'&&!d.kw.ancient&&d.cost<=maxCost&&(!b||d.p>C(b).p))b=id}return b}
function abilityText(op,v){return {buff:'+'+v+' power this turn',shield:'+'+v+' power until your next turn',ready:'ready a unit',draw:'draw '+v,buffRow:'your Clearing +'+v+' this turn',readyAll:'ready everything',hush:'Hush their Keeper',daze:'Daze their Keeper',regrow:'Regrow',regrowDraw:'Regrow and draw 1',cycleDraw:'put a card from your discard pile under your deck, then draw '+v,fell:'fell a unit with '+v+' or less power',fellExhausted:'fell an exhausted unit',bounce:'return a unit with '+v+' or less power to hand',reviveHand:'take a unit back from your discard pile',revivePlay:'play a unit from your discard pile'}[op]||op}
/* ---------- legal moves ---------- */
function rowsFor(P,d){const r=d.row==='W'?['C','T']:[d.row];return r.filter(x=>P.rows[x].length<ROWCAP)}
function enemyTargets(G,i,pred){const O=G.p[1-i];return units(O).filter(x=>!C(x.id).kw.ancient&&pred(x,O))}
function moves(G){const i=G.turn,P=G.p[i],O=G.p[1-i],out=[];
  if(G.over)return out;
  if(G.phase==='work'){
    for(const id of new Set(P.hand)){const d=C(id);if(d.cost>P.sap)continue;
      if(d.type==='unit'){for(const row of rowsFor(P,d))out.push({t:'play',id,row})}
      else if(d.type==='tool'){for(const x of units(P))out.push({t:'play',id,target:x.u})}
      else if(d.type==='boon'||d.type==='blight')out.push({t:'play',id});
      else if(d.type==='event'){const fx=d.fx;
        if(fx.fell)enemyTargets(G,i,(x,O)=>power(G,O,x)<=fx.fell).forEach(x=>out.push({t:'play',id,target:x.u}));
        else if(fx.bounce)enemyTargets(G,i,(x,O)=>power(G,O,x)<=fx.bounce).forEach(x=>out.push({t:'play',id,target:x.u}));
        else if(fx.fellOwn)units(P).forEach(x=>out.push({t:'play',id,target:x.u}));
        else out.push({t:'play',id})}}
    if(P.coin)out.push({t:'coin'});
    if(!P.k.hush&&!P.k.exh)KEEPERS[P.k.id].ab.forEach(([cost,op,v],ai)=>{if(cost>P.sap||P.k.used[ai])return;
      if(op==='buff'||op==='ready'||op==='shield')units(P).forEach(x=>out.push({t:'ability',ai,target:x.u}));
      else if(op==='fell'||op==='bounce')enemyTargets(G,i,(x,O)=>power(G,O,x)<=v).forEach(x=>out.push({t:'ability',ai,target:x.u}));
      else if(op==='fellExhausted')enemyTargets(G,i,x=>x.exh).forEach(x=>out.push({t:'ability',ai,target:x.u}));
      else out.push({t:'ability',ai})});
    for(const x of units(P))if(kwOf(x,'nimble')&&!x.moved){const to=x.row==='C'?'T':'C';if(P.rows[to].length<ROWCAP)out.push({t:'move',u:x.u})}
    out.push({t:'tofell'})}
  else{
    for(const a of attackers(G,i))for(const d of targets(G,i))out.push({t:'attack',a,d});
    out.push({t:'end'})}
  return out}
function canAttack(P,x){return !x.exh&&(!x.sick||kwOf(x,'eager'))}
function attackers(G,i){const P=G.p[i],a=units(P).filter(x=>canAttack(P,x)).map(x=>x.u);return a}
/* Target test switch: 0 = now (tired Clearing units; tired Treeline units once the Clearing is empty).
   'tired' = any tired unit, either row. 'clearing' = any Clearing unit, ready or tired (Treeline once the Clearing is empty).
   'all' = any unit anywhere. */
let TARGETS=0;const setTargets=v=>{TARGETS=v};
function targets(G,i){const O=G.p[1-i],t=[],clearEmpty=!O.rows.C.length;
  t.push('K');
  const ok=(x,row)=>TARGETS==='all'?true:TARGETS==='tired'?x.exh:TARGETS==='clearing'?(row==='C'||clearEmpty):x.exh&&(row==='C'||clearEmpty);
  for(const r of ['C','T'])for(const x of O.rows[r])if(ok(x,r))t.push(x.u);
  return t}
/* ---------- applying moves ---------- */
function apply(G,m,def){const i=G.turn,P=G.p[i],O=G.p[1-i];if(G.over)return;
  if(m.t==='tofell'){G.phase='fell';return}
  if(m.t==='end'){lg(G,P.name+' '+vb(P,'ends')+' the turn');dusk(G);return}
  if(m.t==='coin'){P.coin=false;P.sap+=2;lg(G,P.name+' '+vb(P,'spends')+' the coin: +2 Sap');return}
  if(m.t==='move'){const x=findU(P,m.u);P.rows[x.row]=P.rows[x.row].filter(y=>y!==x);x.row=x.row==='C'?'T':'C';P.rows[x.row].push(x);x.moved=true;return}
  if(m.t==='ability'){const [cost,op,v]=KEEPERS[P.k.id].ab[m.ai];lg(G,P.name+': '+KEEPERS[P.k.id].n+' uses '+abilityText(op,v)+(m.target?' on '+nm(findU(P,m.target)?.id||findU(O,m.target)?.id||'Xhorn'):''));P.sap-=cost;P.k.used[m.ai]=1;P.stats.abil++;effect(G,i,op,v,m.target);return}
  if(m.t==='play'){const d=C(m.id);P.hand.splice(P.hand.indexOf(m.id),1);P.sap-=d.cost;lg(G,P.name+' '+vb(P,'plays')+' '+d.n);
    if(d.type==='unit')enter(G,i,m.id,m.row);
    else if(d.type==='tool'){const x=findU(P,m.target);x.tools.push(m.id)}
    else if(d.type==='boon'||d.type==='blight'){G.aura[d.fx.row]=d.fx.v;P.grave.push(m.id)}
    else if(d.type==='event'){const fx=d.fx;
      if(fx.fell||fx.bounce){const x=findU(O,m.target);if(x){if(fx.fell)toGrave(G,O,x);else{for(const r of ['C','T'])O.rows[r]=O.rows[r].filter(y=>y!==x);O.grave.push(...x.tools);O.hand.push(x.id)}}}
      if(fx.fellOwn){const x=findU(P,m.target);if(x)toGrave(G,P,x)}
      if(fx.clearAuras)G.aura={C:0,T:0};
      if(fx.wipe)for(const Q of G.p)for(const x of units(Q).slice())if(!C(x.id).kw.ancient&&power(G,Q,x)<=fx.wipe)toGrave(G,Q,x);
      if(fx.regrow)regrow(G,P);
      if(fx.daze)O.k.dz=1;
      if(fx.clearingBuff)for(const x of P.rows.C)x.tmp+=fx.clearingBuff;
      if(fx.reviveHand){const b=bestUnitIn(P.grave,10);if(b){P.grave.splice(P.grave.indexOf(b),1);P.hand.push(b)}}
      if(fx.draw)for(let k=0;k<fx.draw;k++)draw(G,i);
      P.grave.push(m.id)}
    else P.grave.push(m.id);return}
  if(m.t==='attack')attack(G,i,m.a,m.d,def)}
function enter(G,i,id,row){const P=G.p[i],O=G.p[1-i],d=C(id);if(P.rows[row].length>=ROWCAP){P.grave.push(id);return}
  const x=inst(G,id);x.row=row;P.rows[row].push(x);const kw=d.kw;
  if(kw.scout)draw(G,i);
  if(kw.regrow)regrow(G,P);
  if(kw.revive){const b=bestUnitIn(P.grave,3);if(b){P.grave.splice(P.grave.indexOf(b),1);P.hand.push(b)}}
  if(kw.call){const j=P.deck.findIndex(z=>z===id||(d.mus&&C(z).mus===d.mus));if(j>=0)P.hand.push(P.deck.splice(j,1)[0])}
  if(kw.fire){const t=enemyTargets(G,i,(y,Q)=>power(G,Q,y)<=kw.fire).sort((a,b)=>power(G,O,b)-power(G,O,a))[0];if(t)toGrave(G,O,t)}}
function effect(G,i,op,v,target){const P=G.p[i],O=G.p[1-i];
  if(op==='buff'){const x=findU(P,target);if(x)x.tmp+=v}
  else if(op==='shield'){const x=findU(P,target);if(x)x.sh+=v}
  else if(op==='ready'){const x=findU(P,target);if(x){x.exh=false;x.sick=false}}
  else if(op==='draw'){for(let k=0;k<v;k++)draw(G,i)}
  else if(op==='cycleDraw'){if(P.grave.length){const b=bestUnitIn(P.grave,10)||P.grave[0];P.grave.splice(P.grave.indexOf(b),1);P.deck.push(b)}for(let k=0;k<v;k++)draw(G,i)}
  else if(op==='buffRow'){for(const x of P.rows.C)x.tmp+=v}
  else if(op==='readyAll'){for(const x of units(P)){x.exh=false;x.sick=false}P.k.exh=false}
  else if(op==='hush')O.k.hush=1;
  else if(op==='daze')O.k.dz=1;
  else if(op==='regrow')regrow(G,P);
  else if(op==='regrowDraw'){regrow(G,P);draw(G,i)}
  else if(op==='fell'||op==='fellExhausted'){const x=findU(O,target);if(x)toGrave(G,O,x)}
  else if(op==='bounce'){const x=findU(O,target);if(x){for(const r of ['C','T'])O.rows[r]=O.rows[r].filter(y=>y!==x);O.grave.push(...x.tools);O.hand.push(x.id)}}
  else if(op==='reviveHand'){const b=bestUnitIn(P.grave,10);if(b){P.grave.splice(P.grave.indexOf(b),1);P.hand.push(b)}}
  else if(op==='revivePlay'){const b=bestUnitIn(P.grave,10);if(b){const d=C(b),rs=rowsFor(P,d);if(rs.length){P.grave.splice(P.grave.indexOf(b),1);enter(G,i,b,rs[0])}}}}
/* Trample (on: 'chip'). 0 = off. 'carry' = the power left over after beating a blocker carries on to the
   original target and must beat it on its own. 'chip' = any power left over after beating a blocker cracks a Ring
   (Keeper attacks) or fells the target if it is enough (unit attacks). */
let TRAMPLE='chip';const DEFENDERS={};const setTrample=v=>{TRAMPLE=v};const TS={blocks:0,through:0,saved:0,gaveUp:0,kAtt:0,kills:0,readyKills:0};
const tramples=(left,tpow,isK)=>left>0&&(TRAMPLE==='chip'&&isK?true:left>=tpow);
/* one attack, with the defender's single React window */
function attack(G,i,a,d,def){const P=G.p[i],O=G.p[1-i];let att,ap;
  if(a==='K'){P.k.exh=true;ap=kPower(G,P)}else{att=findU(P,a);att.exh=true;ap=power(G,P,att)}
  let tgt=d==='K'?null:findU(O,d);let dp=d==='K'?kPower(G,O):power(G,O,tgt);
  const aN=a==='K'?KEEPERS[P.k.id].n:nm(att.id),dN=d==='K'?(O.name==='You'?'your Keeper':O.name+"'s Keeper"):nm(tgt.id);
  const plan=(def||DEFENDERS[O.ai]||aiDefend)(G,1-i,ap,d,dp,a);G.lastAttack={a:aN,d:dN,ap,dp,plan,landed:false,crack:null,isK:d==='K',trade:false};O.stats.react+=plan.cards.length;
  for(const id of plan.cards){O.hand.splice(O.hand.indexOf(id),1);O.grave.push(id);const c=C(id);if(c.type==='reaction')O.sap-=c.cost}
  if(plan.negate){lg(G,aN+' attacks '+dN+': Fade, the attack misses');return}
  if(plan.decoy){lg(G,aN+' attacks '+dN+': a Scarecrow takes the hit');return}
  const orig=tgt,origK=d==='K',origP=dp;let blocked=false,bN='';
  if(plan.guard!=null){const g=findU(O,plan.guard);g.exh=true;tgt=g;d=g.u;dp=blockPower(G,O,g);blocked=true;bN=nm(g.id)}
  dp+=plan.plus;ap=Math.max(0,ap-plan.minus);
  if(blocked&&TRAMPLE){TS.blocks++;
    if(ap>dp){const left=ap-dp;
      if(tramples(left,origP,origK)){TS.through++;lg(G,aN+' ('+ap+') tramples '+nm(tgt.id)+' ('+dp+'), '+left+' carries on');toGrave(G,O,tgt);
        G.lastAttack.landed=true;G.lastAttack.trample=left;G.lastAttack.blk=nm(tgt.id);G.lastAttack.through=origK?'K':nm(orig.id);G.lastAttack.fap=ap;G.lastAttack.fdp=dp;
        if(!origK){if(orig&&O.rows.C.concat(O.rows.T).includes(orig)){lg(G,'  '+nm(orig.id)+' ('+origP+') is felled too');toGrave(G,O,orig)}return}
        tgt=null;d='K';dp=origP;ap=Math.max(ap,dp);/* fall through to the Keeper hit below */
      }else TS.saved++}}
  G.lastAttack.fap=ap;G.lastAttack.fdp=dp;G.lastAttack.dn=tgt?nm(tgt.id):(bN||dN);G.lastAttack.guarded=plan.guard!=null;
  const how=(plan.guard!=null?' (blocked by '+bN+')':'')+(plan.cards.length?' ('+plan.cards.map(nm).join(', ')+')':'');
  if(ap<dp){lg(G,aN+' ('+ap+') attacks '+dN+' ('+dp+'): held'+how);return}
  G.lastAttack.landed=true;
  /* two units of equal power fell each other; a Keeper is never felled */
  if(tgt&&att&&ap===dp){lg(G,aN+' ('+ap+') attacks '+nm(tgt.id)+' ('+dp+'): both felled'+how);G.lastAttack.trade=true;toGrave(G,O,tgt);toGrave(G,P,att);return}
  if(tgt){lg(G,aN+' ('+ap+') attacks '+dN+' ('+dp+'): felled'+how);TS.kills++;G.kills=(G.kills||0)+1;toGrave(G,O,tgt);return}
  lg(G,aN+' ('+ap+') hits '+dN+' ('+dp+')'+how);
  /* clock test: from total turn RULES.clock on, every Keeper hit cracks one extra Ring */
  const n=((att&&kwOf(att,'double'))?2:1)+(RULES.clock&&G.turnNo>=RULES.clock?1:0);P.stats.hits++;O.k.wear=(O.k.wear||0)+1;
  for(let k=0;k<n&&!G.over;k++){if(!O.rings.length){end(G,i,'rings');return}
    const id=O.rings.pop();const c=C(id);G.lastAttack.crack=id;lg(G,'  A Ring cracks: '+c.n+(c.kw.sprout&&c.type==='unit'?' Sprouts onto '+own(O)+' board':' goes to '+own(O)+' hand'));
    if(c.kw.sprout&&c.type==='unit'){const rs=rowsFor(O,c);if(rs.length){enter(G,1-i,id,rs[0]);continue}}
    O.hand.push(id)}}
/* ---------- computer opponent ---------- */
const W={ring:3,hand:1,heart:1.5};
function value(G,i){const P=G.p[i],O=G.p[1-i];if(G.over)return G.winner===i?1e4:-1e4;
  const side=(Q,j)=>units(Q).reduce((s,x)=>s+power(G,Q,x)+0.6+(x.tools.length*0.3),0)+W.ring*Q.rings.length+Q.heart.length*W.heart+W.hand*Q.hand.length+(Q.rings.length===0?-4:0);
  return side(P,i)-side(O,1-i)}
function aiDefend(G,j,ap,d,dp){const Q=G.p[j];const none={cards:[],plus:0,minus:0,guard:null,negate:false,decoy:false};
  if(dp>ap)return none;
  const isK=d==='K',lethal=isK&&Q.rings.length===0;
  const worth=lethal?1e3:isK?(Q.rings.length<=2?4:2.2):(()=>{const x=findU(Q,d);return power(G,Q,x)+0.6})();
  const need=ap-dp+1,opts=[];
  /* single-card answers */
  for(const id of new Set(Q.hand)){const c=C(id);if(c.type!=='reaction'||c.cost>Q.sap)continue;
    if(c.fx.negate)opts.push({cost:1.6,p:{...none,cards:[id],negate:true}});
    if(c.fx.decoy)opts.push({cost:1.3,p:{...none,cards:[id],decoy:true}})}
  let lost=0;for(const x of blockers(G,Q,d)){const gp=blockPower(G,Q,x);if(TRAMPLE&&tramples(ap-gp,dp,isK)){lost++;continue}opts.push({cost:gp>ap?0.4:power(G,Q,x)+0.6,p:{...none,guard:x.u}})}
  if(lost&&!opts.some(o=>o.p.guard!=null))TS.gaveUp++;if(isK)TS.kAtt++;
  /* stack boosts: reactions then Brace cards, cheapest first */
  let plus=0,minus=0,cards=[],sap=Q.sap,cost=0;const hand=Q.hand.slice();
  const boosts=hand.map(id=>{const c=C(id);if(c.type==='reaction'){if(c.fx.plus)return {id,v:c.fx.plus,s:c.cost};if(c.fx.attackerMinus)return {id,v:c.fx.attackerMinus,s:c.cost,m:1};if(c.fx.plusPerUnit)return {id,v:units(Q).length,s:c.cost}}if(c.kw.brace)return {id,v:c.kw.brace,s:0};return null}).filter(Boolean).sort((a,b)=>b.v-a.v);
  for(const b of boosts){if(plus+minus>=need)break;if(b.s>sap)continue;sap-=b.s;cards.push(b.id);if(b.m)minus+=b.v;else plus+=b.v;cost+=1}
  if(plus+minus>=need)opts.push({cost,p:{...none,cards,plus,minus}});
  opts.sort((a,b)=>a.cost-b.cost);
  if(opts.length&&opts[0].cost<worth)return opts[0].p;
  return none}
function aiWork(G){const i=G.turn;let guard=0;const P0=G.p[i],O0=G.p[1-i];
  const swing=!P0.k.exh&&KEEPERS[P0.k.id].p>=KEEPERS[O0.k.id].p;
  while(!G.over&&G.phase==='work'&&guard++<30){const ms=moves(G).filter(m=>m.t!=='tofell'&&!(swing&&m.t==='ability'));const base=value(G,i);let best=null,bv=0.25;
    for(const m of ms){const H=clone(G);apply(H,m);let v=value(H,i)-base;
      if(m.t==='coin'){/* only worth it if it unlocks a play */const nm=moves(H).filter(x=>x.t==='play'&&C(x.id).cost===H.p[i].sap);v=nm.length?0.3:-1}
      if(v>bv){bv=v;best=m}}
    if(!best)break;apply(G,best)}
  if(!G.over&&G.phase==='work')apply(G,{t:'tofell'})}
function aiFell(G){const i=G.turn;let guard=0;
  while(!G.over&&G.phase==='fell'&&guard++<12){const ms=moves(G).filter(m=>m.t==='attack');if(!ms.length)break;
    const P=G.p[i],O=G.p[1-i];let best=null,bs=-1e9;
    for(const m of ms){const ap=m.a==='K'?kPower(G,P):power(G,P,findU(P,m.a));
      const dp=m.d==='K'?kPower(G,O):power(G,O,findU(O,m.d));if(ap<dp)continue;
      const tv=m.d==='K'?(O.rings.length===0?100:3+(6-O.rings.length)*0.2):dp+0.6-(ap===dp?ap+0.6:0);
      const cost=m.a==='K'?0.3:0.5+ap*0.05;const s=tv-cost;if(s>bs){bs=s;best=m}}
    if(!best)break;apply(G,best)}
  if(!G.over)apply(G,{t:'end'})}
/* one AI decision at a time, for the screen */
function aiNext(G){const i=G.turn;
  if(G.phase==='work'){const P0=G.p[i],O0=G.p[1-i];const swing=false;const ms=moves(G).filter(m=>m.t!=='tofell');const base=value(G,i);let best=null,bv=0.25;
    for(const m of ms){const H=clone(G);apply(H,m);let v=value(H,i)-base;if(m.t==='coin'){const nm2=moves(H).filter(x=>x.t==='play'&&C(x.id).cost===H.p[i].sap);v=nm2.length?0.3:-1}if(v>bv){bv=v;best=m}}
    return best||{t:'tofell'}}
  const P=G.p[i],O=G.p[1-i];let best=null,bs=-1e9;
  for(const m of moves(G).filter(m=>m.t==='attack')){const ap=m.a==='K'?kPower(G,P):power(G,P,findU(P,m.a));const dp=m.d==='K'?kPower(G,O):power(G,O,findU(O,m.d));if(ap<dp)continue;
    const tv=m.d==='K'?(O.rings.length===0?100:3+(6-O.rings.length)*0.2):dp+0.6-(ap===dp?ap+0.6:0);const s=tv-(0.5+ap*0.05);if(s>bs){bs=s;best=m}}
  return best||{t:'end'}}
/* what an attack looks like before anyone reacts (for the React prompt) */
function preview(G,m){const i=G.turn,P=G.p[i],O=G.p[1-i];const ap=m.a==='K'?kPower(G,P):power(G,P,findU(P,m.a));const dp=m.d==='K'?kPower(G,O):power(G,O,findU(O,m.d));
  return {ap,dp,aName:m.a==='K'?KEEPERS[P.k.id].n:nm(findU(P,m.a).id),dName:m.d==='K'?'your Keeper':nm(findU(O,m.d).id),d:m.d}}
function play(a,b,seed,maxTurns){const G=newGame(a,b,seed);maxTurns=maxTurns||80;
  while(!G.over&&G.turnNo<maxTurns){aiWork(G);if(!G.over&&G.phase==='fell')aiFell(G)}
  if(!G.over)end(G,-1,'timeout');return G}
const API={RULES,setRule,DEFENDERS,setTrample,setTargets,TS,blockPower,blockers,newGame,moves,apply,play,value,power,kPower,units,findU,aiWork,aiFell,aiNext,aiDefend,preview,redraw,clone,abilityText,startRings,canAttack};
if(typeof module!=='undefined')module.exports=API;
