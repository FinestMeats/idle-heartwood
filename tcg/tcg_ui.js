/* ===================== Heartwood TCG (preview): the phone board =====================
   Mirrored like a real table: their camp top-left (their right), yours bottom-right.
   Rows top to bottom: their Treeline, their Clearing, the middle line (auras), your Clearing, your Treeline. */
let TG=null,TS={sel:null,att:null,ab:null,busy:false,move:null};
const TK=()=>TCG.KEEPERS,TCd=id=>TCG.CARDS[id];
const TKW={eager:'Eager',guard:'Guard',crew:'Work Crew',rally:'Rally',revive:'Revive',scout:'Scout',call:'Call the Pack',fire:'Firebrand',ancient:'Ancient',double:'Double Cut',brace:'Brace',sprout:'Sprout',regrow:'Regrow',nimble:'Nimble'};
const TKW_TXT={eager:'can attack the turn it is played',guard:'can take an attack aimed at your Keeper',crew:'+1 power for each other copy on your board',rally:'your other units +1 power on your turn',revive:'when played, take back a unit costing 3 or less from your discard pile',scout:'when played, draw a card',call:'when played, find a copy in your deck and add it to your hand',fire:'when played, fell an enemy unit with that much power or less',ancient:'can\'t be targeted by abilities, Blights or Firebrand',double:'a landed hit on a Keeper cracks 2 Rings',brace:'discard while defending: +1 power for that fight',sprout:'if cracked from your Rings, it plays itself for free',regrow:'when played, Regrow (add a Ring)',nimble:'may switch rows once per turn'};
const TTYPE_IC={tool:'hammer',reaction:'glove',event:'scroll',boon:'sun',blight:'snow'};
const TROW={C:'Clearing',T:'Treeline',W:'Wanderer'};
function tKwLine(d){return Object.keys(d.kw||{}).map(k=>k==='fire'?'Firebrand '+d.kw.fire:k==='brace'?'Brace +'+d.kw.brace:TKW[k]).join(' · ')}
function tFxText(d){const f=d.fx||{};if(d.type==='tool')return 'Attach to a unit: +'+(f.p||0)+' power'+(f.eager?', Eager':'')+(f.guard?', Guard':'')+(f.nimble?', Nimble':'');
  if(d.type==='boon'||d.type==='blight')return (f.row==='C'?'Clearing':'Treeline')+' units on both sides '+(f.v>0?'+':'')+f.v+' power, until replaced';
  if(d.type==='reaction')return 'When attacked: '+(f.negate?'the attack misses':f.decoy?'a 3-power Scarecrow takes the hit':f.plus?'+'+f.plus+' power':f.attackerMinus?'the attacker gets −'+f.attackerMinus:f.plusPerUnit?'+1 power for each of your units':'');
  const out=[];if(f.fell)out.push('fell an enemy unit with '+f.fell+' or less power');if(f.bounce)out.push('return an enemy unit with '+f.bounce+' or less power to its owner\'s hand');if(f.fellOwn)out.push('fell one of your units');if(f.regrow)out.push('Regrow');if(f.clearAuras)out.push('clear both aura slots');if(f.wipe)out.push('fell every unit with '+f.wipe+' or less power');if(f.daze)out.push('Daze their Keeper');if(f.clearingBuff)out.push('your Clearing +'+f.clearingBuff+' this turn');if(f.reviveHand)out.push('take your best unit back from the discard pile');if(f.draw)out.push('draw '+f.draw);
  return out.join(', ').replace(/^./,c=>c.toUpperCase())}
function tCard(id,o){o=o||{};const d=TCd(id),F=FACTIONS.find(f=>f.id===d.f)||FACTIONS[4];const art=CARD[id]?`<img src="${cardArt(id)}" alt="">`:`<span class="tic">${ico(TTYPE_IC[d.type]||'card')}</span>`;
  const pw=d.type==='unit'?`<span class="pw${o.pw!=null&&o.pw>d.p?' up':o.pw!=null&&o.pw<d.p?' dn':''}">${o.pw!=null?o.pw:d.p}</span>`:'';
  return `<div class="cd tc${o.sm?' sm':''}${d.kw&&d.kw.ancient?' hero':''}${o.ex?' ex':''}${o.cls?' '+o.cls:''}" style="--fc:${F.col};--rc:${RAR[Math.min(6,d.r||0)].c}" data-cid="${id}"${o.attr||''}>${art}${pw}<span class="sap">${d.cost}</span>${o.tools?`<span class="tl">${ico('hammer')}${o.tools>1?o.tools:''}</span>`:''}${o.nm?`<span class="tn">${d.n}</span>`:''}</div>`}
function tcgPopup(id){const d=TCd(id);if(!d)return;const F=FACTIONS.find(f=>f.id===d.f)||FACTIONS[4];const z=$('cardZoom');
  const kw=Object.keys(d.kw||{}).map(k=>`<b>${k==='fire'?'Firebrand '+d.kw.fire:k==='brace'?'Brace +'+d.kw.brace:TKW[k]}</b>: ${TKW_TXT[k]}`).join('<br>');
  z.innerHTML=`<div class="czp"><h2 style="color:${RAR[Math.min(6,d.r||0)].c}">${d.n}</h2><div class="note">${F.n} · ${d.type==='unit'?TROW[d.row]+' unit':d.type[0].toUpperCase()+d.type.slice(1)} · ${d.cost} Sap</div><div style="display:flex;justify-content:center;margin:10px 0">${tCard(id,{cls:'big'})}</div><div style="font-size:17px;line-height:1.3;text-align:left">${d.type==='unit'?`<b>${d.p}</b> power<br>`:''}${kw}${d.type!=='unit'?tFxText(d):''}</div><button class="buy" type="button">Close</button></div>`;z.hidden=false}
/* ---------- start ---------- */
function tcgStart(){showModal(`<h2>${ico('card')} Heartwood TCG</h2><div class="note">Preview of the new turn-based format. Pick a faction; you get its starter deck.</div><div class="btns" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">${FACTIONS.slice(0,4).map(f=>`<button class="buy" type="button" data-tcgf="${f.id}" style="background:${f.col};color:#fff">${f.n}</button>`).join('')}</div><button class="info" type="button" id="toastOk">Cancel</button>`)}
function tcgPickKeeper(f){const ks=Object.values(TK()).filter(k=>k.f===f);
  showModal(`<h2>Choose your Keeper</h2><div class="note">More power: harder to hit, fewer Rings, weaker abilities.</div>${ks.map(k=>`<div class="row" style="text-align:left"><div class="t"><div class="n">${k.n}<small>${k.p} power · ${TCG.startRings(k.id)} Rings</small></div><div class="d">${k.ab.map(([c,op,v])=>`${c} Sap: ${TCG.abilityText(op,v)}`).join('<br>')}</div></div><button class="buy" type="button" data-tcgk="${k.id}">Pick</button></div>`).join('')}<button class="info" type="button" id="toastOk">Cancel</button>`);$('toast').classList.add('wide')}
function tcgBegin(kid){const f=TK()[kid].f,of='LWSB'.replace(f,'')[Math.floor(Math.random()*3)],ok=Object.values(TK()).filter(k=>k.f===of);const okid=ok[Math.floor(Math.random()*ok.length)].id;
  const mine=TCG.starter(f),theirs=TCG.starter(of);
  TG=TCG.newGame({name:'You',keeper:kid,main:mine.main,ring:mine.ring},{name:FACTIONS.find(x=>x.id===of).n,keeper:okid,main:theirs.main,ring:theirs.ring},(Math.random()*4e9)>>>0,0);
  TG.redrawn=false;TS={sel:null,att:null,ab:null,busy:false,move:null};nextToast();$('tcg').hidden=false;sfx('shimmer');
  showToast('Coin flip',TG.first===0?'You go first':'They go first. You keep the coin (+1 Sap once) and drew an extra card','amber');
  tcgRender();tcgAfter()}
/* ---------- render ---------- */
function tRow(pi,r){const P=TG.p[pi],tg=tTargets(),mine=pi===0;const rowTgt=mine&&tg.rows.includes(r);
  const au=TG.aura[r];
  return `<div class="tr${rowTgt?' tgt':''}" data-trow="${pi}${r}"><span class="tlab">${pi?'Their':'Your'} ${TROW[r]}${au?` <b class="${au>0?'up':'dn'}">${au>0?'+':''}${au}</b>`:''}</span><div class="cs">${P.rows[r].map(x=>{const can=tg.units.includes(x.u);return tCard(x.id,{pw:TCG.power(TG,P,x),ex:x.exh,tools:x.tools.length,cls:(can?'tgt':'')+(TS.att===x.u?' sel':''),attr:` data-tu="${x.u}"`})}).join('')}</div></div>`}
function tCamp(pi){const P=TG.p[pi],K=TK()[P.k.id],tg=tTargets(),kt=pi===1&&tg.keeper;
  const rings=`<span class="trg">${P.rings.map(()=>'<i></i>').join('')}${P.heart.map(()=>'<i class="hw"></i>').join('')}</span>`;
  const sap=`<span class="tsp">${ico('drop')}${P.sap}/${P.sapLvl}</span>`;
  return `<div class="tcamp${pi?' opp':''}">${pi?'':`<span class="hc">${ico('chest')}${P.deck.length}</span>`}${pi?`<span class="hc">${ico('card')}${P.hand.length}</span>`:''}${sap}${rings}<button type="button" class="tkp${kt?' tgt':''}${P.k.hush?' hush':''}${P.k.dz?' dz':''}" data-tkeep="${pi}">${ico('crew')}<span>${K.n}</span><b>${K.p}</b></button>${pi?`<span class="hc">${ico('chest')}${P.deck.length}</span>`:''}</div>`}
function tcgRender(){const el=$('tcg');if(!TG){el.hidden=true;return}const P=TG.p[0],O=TG.p[1],my=TG.turn===0&&!TG.over&&!TS.busy;
  let h=`<div class="tbar opp">${tCamp(1)}<button type="button" class="dquit" id="tQuit" aria-label="Leave">✕</button></div>`;
  h+=tRow(1,'T')+tRow(1,'C');
  const last=TG.log.slice(-2).map(x=>`<div>${x}</div>`).join('');
  h+=`<div class="tmid"><span class="tph">${TG.over?'Game over':TG.turn===0?(TG.phase==='work'?'Your turn · Work':'Your turn · Fell'):'Their turn…'}</span><div class="tlog" id="tLog" role="button">${last||'Match log'}</div></div>`;
  h+=tRow(0,'C')+tRow(0,'T');
  h+=`<div class="tbar me">${my&&P.coin?`<button type="button" class="info" id="tCoin">${ico('amber')}Coin</button>`:''}${my&&TG.phase==='work'?`<button type="button" class="buy" id="tFell">Attack ▸</button>`:my&&TG.phase==='fell'?`<button type="button" class="buy" id="tEnd">End turn</button>`:''}${tCamp(0)}</div>`;
  h+=`<div class="dinfo" id="tInfo">${tInfo()}</div><div class="dhand">${P.hand.map((id,k)=>tCard(id,{cls:TS.sel===k?'sel':'',attr:` data-th="${k}"`})).join('')}</div>`;
  el.innerHTML=h}
function tInfo(){if(!TG)return '';const P=TG.p[0];if(TG.over)return '';if(TG.turn!==0||TS.busy)return '<i>They are thinking…</i>';
  if(!TG.redrawn&&TG.turnNo<=2)return `Starting hand. <button type="button" class="info" id="tRedraw">Redraw once</button> <button type="button" class="buy" id="tKeep">Keep</button>`;
  if(TS.ab!=null){const [c,op,v]=TK()[P.k.id].ab[TS.ab];return `${TCG.abilityText(op,v)}: tap a glowing unit <button type="button" class="info" id="tCancel">Cancel</button>`}
  if(TS.sel!=null){const id=P.hand[TS.sel],d=TCd(id),ms=tMovesFor(id);
    const what=`<b>${d.n}</b> · ${d.cost} Sap${d.type==='unit'?' · '+d.p+' power · '+TROW[d.row]:''}${d.type==='unit'&&tKwLine(d)?' · '+tKwLine(d):d.type!=='unit'?' · '+tFxText(d):''}`;
    if(TG.phase!=='work')return what;
    if(!ms.length)return what+(d.type==='reaction'?' · <i>played when you are attacked</i>':d.cost>P.sap?' · <i>not enough Sap</i>':' · <i>nothing to play it on</i>');
    if(ms.length===1&&ms[0].row==null&&ms[0].target==null)return what+` <button type="button" class="buy" id="tPlay">Play</button>`;
    return what+' · tap a glowing '+(ms[0].row!=null?'row':'unit')}
  if(TS.att!=null){const x=TCG.findU(P,TS.att),ap=TCG.power(TG,P,x),kp=TCG.kPower(TG,TG.p[1]);return `<b>${TCd(x.id).n}</b> (${ap}) attacks: tap their Keeper (${kp}) or a glowing exhausted unit. Equal or higher power lands, unless they react.${ap<kp?' <i>Too weak to hit their Keeper alone.</i>':''} <button type="button" class="info" id="tCancel">Cancel</button>`}
  if(TS.move!=null)return `<button type="button" class="info" id="tMove">Switch row</button> <button type="button" class="info" id="tCancel">Cancel</button>`;
  return TG.phase==='work'?'Play cards from your hand, or tap your Keeper for abilities. Then Attack.':'Tap one of your ready units to attack with it, or End turn.'}
function tMovesFor(id){return TCG.moves(TG).filter(m=>m.t==='play'&&m.id===id)}
function tTargets(){const out={rows:[],units:[],keeper:false};if(!TG||TG.turn!==0||TS.busy)return out;const P=TG.p[0];
  if(TS.sel!=null&&TG.phase==='work'){tMovesFor(P.hand[TS.sel]).forEach(m=>{if(m.row!=null)out.rows.push(m.row);if(m.target!=null)out.units.push(m.target)})}
  else if(TS.ab!=null){TCG.moves(TG).filter(m=>m.t==='ability'&&m.ai===TS.ab&&m.target!=null).forEach(m=>out.units.push(m.target))}
  else if(TS.att!=null){TCG.moves(TG).filter(m=>m.t==='attack'&&m.a===TS.att).forEach(m=>{if(m.d==='K')out.keeper=true;else out.units.push(m.d)})}
  else if(TG.phase==='fell'){TCG.moves(TG).filter(m=>m.t==='attack').forEach(m=>{if(!out.units.includes(m.a))out.units.push(m.a)})}
  return out}
/* ---------- your moves ---------- */
function tDo(m){if(!TG||TG.over)return;TS.sel=null;TS.att=null;TS.ab=null;TS.move=null;const rings=TG.p[1].rings.length;TCG.apply(TG,m);
  if(m.t==='attack'&&TG.lastAttack){const la=TG.lastAttack;sfx(la.landed?'fell':'buy');if(la.landed&&TG.p[1].rings.length<rings)addQuake(4)}else sfx('chop');
  tcgRender();tcgAfter()}
function tcgClick(e){if(!TG)return;const P=TG.p[0];
  if(e.target.closest('#tQuit')){if(TG.over||confirm('Leave this game? It won\'t be saved.')){TG=null;$('tcg').hidden=true}return}
  if(e.target.closest('#tLog')){showModal(`<h2>${ico('book')} Match log</h2><div class="logl">${TG.log.map(x=>`<div>${x}</div>`).join('')}</div><button class="buy" type="button" id="toastOk">Close</button>`);const l=$('toast').querySelector('.logl');if(l)l.scrollTop=l.scrollHeight;return}
  {const kp=e.target.closest('[data-tkeep]');if(kp&&kp.dataset.tkeep==='1'&&TS.att!=null){tDo({t:'attack',a:TS.att,d:'K'});return}if(kp){tKeeperSheet(+kp.dataset.tkeep);return}}
  if(TG.turn!==0||TS.busy||TG.over)return;
  if(e.target.closest('#tKeep')){TG.redrawn=true;tcgRender();return}
  if(e.target.closest('#tRedraw')){TCG.redraw(TG,0);TG.redrawn=true;sfx('buy');tcgRender();return}
  if(e.target.closest('#tCancel')){TS.sel=TS.att=TS.ab=TS.move=null;tcgRender();return}
  if(e.target.closest('#tCoin')){tDo({t:'coin'});return}
  if(e.target.closest('#tFell')){tDo({t:'tofell'});return}
  if(e.target.closest('#tEnd')){tcgEndTurn();return}
  if(e.target.closest('#tPlay')){const ms=tMovesFor(P.hand[TS.sel]);if(ms[0])tDo(ms[0]);return}
  if(e.target.closest('#tMove')){tDo({t:'move',u:TS.move});return}
  const th=e.target.closest('[data-th]');if(th){const k=+th.dataset.th;TS.att=TS.ab=TS.move=null;
    TS.sel=TS.sel===k?null:k;tcgRender();return}
  const tu=e.target.closest('[data-tu]');if(tu){const u=+tu.dataset.tu;
    if(TS.sel!=null){const m=tMovesFor(P.hand[TS.sel]).find(m=>m.target===u);if(m){tDo(m);return}}
    if(TS.ab!=null){const m=TCG.moves(TG).find(m=>m.t==='ability'&&m.ai===TS.ab&&m.target===u);if(m){tDo(m);return}}
    if(TS.att!=null){const m=TCG.moves(TG).find(m=>m.t==='attack'&&m.a===TS.att&&m.d===u);if(m){tDo(m);return}}
    const mine=TCG.findU(P,u);
    if(mine&&TG.phase==='fell'&&TCG.moves(TG).some(m=>m.t==='attack'&&m.a===u)){TS.att=TS.att===u?null:u;TS.sel=null;tcgRender();return}
    if(mine&&TG.phase==='work'&&TCG.moves(TG).some(m=>m.t==='move'&&m.u===u)){TS.move=u;TS.sel=null;tcgRender();return}
    return}
  const tr=e.target.closest('[data-trow]');if(tr&&TS.sel!=null){const r=tr.dataset.trow.slice(1);if(tr.dataset.trow[0]==='0'){const m=tMovesFor(P.hand[TS.sel]).find(m=>m.row===r);if(m)tDo(m)}}}
function tKeeperSheet(pi){const P=TG.p[pi],K=TK()[P.k.id],my=pi===0&&TG.turn===0&&TG.phase==='work'&&!TS.busy&&!TG.over;const ms=my?TCG.moves(TG).filter(m=>m.t==='ability'):[];
  showModal(`<h2>${ico('crew')} ${K.n}</h2><div class="note">${FACTIONS.find(f=>f.id===K.f).n} · ${K.p} power · ${P.rings.length} Rings left${P.heart.length?' · '+P.heart.length+' in the Heartwood':''}${P.k.hush?' · <b>Hushed</b>':''}${P.k.dz?' · <b>Dazed</b>':''}</div><div style="text-align:left;margin-top:8px">${K.ab.map(([c,op,v],i)=>{const can=ms.some(m=>m.ai===i);return `<div class="row"><div class="t"><div class="n">${c} Sap<small>${P.k.used[i]?'used this turn':''}</small></div><div class="d">${TCG.abilityText(op,v)}</div></div>${my?`<button class="buy" type="button" data-tab2="${i}" ${can?'':'disabled'}>Use</button>`:''}</div>`}).join('')}</div><div class="note">${pi?'':'Keepers never attack. Each ability once per turn, during Work.'}</div><button class="info" type="button" id="toastOk">Close</button>`);$('toast').classList.add('wide')}
function tUseAbility(i){nextToast();const ms=TCG.moves(TG).filter(m=>m.t==='ability'&&m.ai===i);if(!ms.length)return;if(ms.length===1&&ms[0].target==null){tDo(ms[0]);return}TS.ab=i;TS.sel=TS.att=TS.move=null;tcgRender()}
/* ---------- their turn ---------- */
function tcgEndTurn(){tDo({t:'end'})}
function tcgAfter(){if(!TG)return;if(TG.over){tcgFinish();return}if(TG.turn!==1)return;TS.busy=true;tcgRender();setTimeout(tcgAIStep,650)}
function tcgAIStep(){if(!TG||TG.over){TS.busy=false;tcgAfter();return}if(TG.turn!==1){TS.busy=false;tcgRender();return}
  const m=TCG.aiNext(TG);
  if(m.t==='attack'){tcgReact(m);return}
  const before=TG.log.length;TCG.apply(TG,m);if(m.t==='play'||m.t==='ability')sfx('chop');
  tcgRender();if(TG.over){TS.busy=false;tcgFinish();return}setTimeout(tcgAIStep,m.t==='tofell'?300:700)}
/* the React window: you choose Guard, Reactions and Brace cards, and see if it holds */
let TR=null;
function tcgReact(m){const pv=TCG.preview(TG,m),P=TG.p[0];TR={m,pv,idx:[],guard:null};
  const can=P.hand.some(id=>{const d=TCd(id);return (d.type==='reaction'&&d.cost<=P.sap)||(d.kw&&d.kw.brace)})||(pv.d==='K'&&P.rows.C.some(x=>!x.exh&&(TCd(x.id).kw.guard||x.tools.some(t=>TCd(t).fx.guard))));
  if(!can){const ring=P.rings.length;TCG.apply(TG,m,()=>({cards:[],plus:0,minus:0,guard:null,negate:false,decoy:false}));tReactDone(ring);return}
  tReactShow()}
function tReactPlan(){const P=TG.p[0];let plus=0,minus=0,negate=false,decoy=false,sap=0;
  const cards=TR.idx.map(k=>P.hand[k]);for(const id of cards){const d=TCd(id);if(d.type==='reaction'){sap+=d.cost;const f=d.fx;if(f.negate)negate=true;if(f.decoy)decoy=true;if(f.plus)plus+=f.plus;if(f.attackerMinus)minus+=f.attackerMinus;if(f.plusPerUnit)plus+=TCG.units(P).length}else if(d.kw.brace)plus+=d.kw.brace}
  let dp=TR.pv.dp;if(TR.guard!=null){const g=TCG.findU(P,TR.guard);dp=TCG.power(TG,P,g)}
  const ap=Math.max(0,TR.pv.ap-minus),holds=negate||decoy||ap<dp+plus;return {plan:{cards,plus,minus,guard:TR.guard,negate,decoy},sap,ap,dp:dp+plus,holds}}
function tReactShow(){const P=TG.p[0],pl=tReactPlan(),pv=TR.pv;
  const opts=[];P.hand.forEach((id,k)=>{const d=TCd(id);if(d.type==='reaction'||(d.kw&&d.kw.brace))opts.push([id,k])});
  const guards=pv.d==='K'?P.rows.C.filter(x=>!x.exh&&(TCd(x.id).kw.guard||x.tools.some(t=>TCd(t).fx.guard))):[];
  showModal(`<h2>${ico('swords')} You're attacked!</h2><div style="font-size:19px"><b>${pv.aName}</b> (${pl.ap}) attacks <b>${pv.dName}</b> (${pl.dp})</div><div class="note">${pl.holds?'<b style="color:var(--sap)">Your defence holds</b>':pv.d==='K'?'It lands: a Ring cracks into your hand':'It lands: your unit is felled'} · Sap left ${P.sap-pl.sap}</div>
  ${guards.length?`<p class="sec">Guard</p><div class="cgrid" style="justify-content:center">${guards.map(x=>tCard(x.id,{pw:TCGpow(x),cls:TR.guard===x.u?'sel':'',attr:` data-rg="${x.u}"`})).join('')}</div>`:''}
  ${opts.length?`<p class="sec">Reactions and Brace</p><div class="cgrid" style="justify-content:center">${opts.map(([id,k])=>tCard(id,{cls:TR.idx.includes(k)?'sel':'',attr:` data-rc="${k}"`})).join('')}</div>`:''}
  <div class="note">Tap cards to add them. Hold a card to read it.</div><div class="pair" style="justify-content:center"><button class="info" type="button" data-rtake="1">Take it</button><button class="buy" type="button" data-rdef="1" ${TR.idx.length||TR.guard!=null?'':'disabled'} ${pl.sap>P.sap?'disabled':''}>Defend</button></div>`);$('toast').classList.add('wide')}
function TCGpow(x){return TCG.power(TG,TG.p[0],x)}
function tReactDone(ring){const la=TG.lastAttack,P=TG.p[0];TR=null;
  if(la){sfx(la.landed?'fell':'buy');if(la.landed&&la.crack){addQuake(5);buzz([20,30]);showToast('A Ring cracks',`${TCd(la.crack).n} goes to your hand${TCd(la.crack).kw.sprout?' and Sprouts':''}`,'card')}else if(la.landed&&!TG.over)showToast('Felled',la.d+' was felled','card');else showToast('Held!','Your defence held','card')}
  tcgRender();if(TG.over){TS.busy=false;tcgFinish();return}setTimeout(tcgAIStep,800)}
function tcgReactClick(e){if(!TR)return false;const P=TG.p[0];
  const g=e.target.closest('[data-rg]');if(g){const u=+g.dataset.rg;TR.guard=TR.guard===u?null:u;tReactShow();return true}
  const c=e.target.closest('[data-rc]');if(c){const k=+c.dataset.rc,i=TR.idx.indexOf(k);if(i>=0)TR.idx.splice(i,1);else TR.idx.push(k);tReactShow();return true}
  if(e.target.closest('[data-rtake]')){const m=TR.m,ring=P.rings.length;nextToast();TCG.apply(TG,m,()=>({cards:[],plus:0,minus:0,guard:null,negate:false,decoy:false}));tReactDone(ring);return true}
  if(e.target.closest('[data-rdef]')){const pl=tReactPlan(),m=TR.m,ring=P.rings.length;if(pl.sap>P.sap)return true;nextToast();TCG.apply(TG,m,()=>pl.plan);tReactDone(ring);return true}
  return false}
function tcgFinish(){const won=TG.winner===0;S.tcgStats=S.tcgStats||{w:0,l:0};if(won)S.tcgStats.w++;else S.tcgStats.l++;save();
  setTimeout(()=>{if(!TG)return;showModal(`<h2>${won?'Victory!':'Defeat'}</h2><div class="note">${TG.reason==='deck-out'?(won?'They ran out of cards':'You ran out of cards'):won?'You broke through their last Ring':'They broke through your last Ring'} · ${Math.ceil(TG.turnNo/2)} turns</div><div class="note">Preview format: no rewards yet. Tell us what you think with Suggest an idea.</div><div class="btns" style="display:flex;gap:6px;justify-content:center;margin-top:6px"><button class="buy" type="button" data-tcgagain="1">Play again</button><button class="info" type="button" data-tcgclose="1">Close</button></div>`);sfx(won?'level':'buy')},700)}

$('tcg').addEventListener('click',tcgClick);
$('toast').addEventListener('click',e=>{if(e.target.closest('[data-peek]')){e.stopImmediatePropagation();peekBoard(true)}},true);
$('peekBack').addEventListener('click',()=>peekBoard(false));
$('toast').addEventListener('click',e=>{if(tcgReactClick(e))return;
  const f=e.target.closest('[data-tcgf]');if(f){tcgPickKeeper(f.dataset.tcgf);return}
  const k=e.target.closest('[data-tcgk]');if(k){tcgBegin(k.dataset.tcgk);return}
  const a=e.target.closest('[data-tab2]');if(a){tUseAbility(+a.dataset.tab2);return}
  if(e.target.closest('[data-tcgagain]')){nextToast();TG=null;$('tcg').hidden=true;tcgStart();return}
  if(e.target.closest('[data-tcgclose]')){nextToast();TG=null;$('tcg').hidden=true;buildList(true);return}});
