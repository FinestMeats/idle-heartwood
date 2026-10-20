/* Heartwood TCG card pool, converted from the Classic cards by fixed rules (rules doc: "Converting the existing cards").
   Unit ids match Classic ids so one collection plays both formats. */
const {CARDSRC,LEADERS}=require('./src_classic.js');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CARDS={},UNITS=[];
const ROWF={L:'C',W:'T',S:'T',B:'C',N:'C'};
function convertUnits(){
  for(const f in CARDSRC)CARDSRC[f].forEach((c,i)=>{
    const [n,oldRow,oldP,ab,r]=c,id=f+String(i+1).padStart(2,'0');
    const kw={};let row=oldRow===0?'C':oldRow===1?'T':ROWF[f];
    if(ab==='bond')kw.crew=1;else if(ab==='morale'||ab==='horn')kw.rally=1;else if(ab==='medic')kw.revive=1;
    else if(ab==='spy')kw.scout=1;else if(ab==='agile'){kw.nimble=1;row='W'}else if(ab==='hero')kw.ancient=1;
    else if(ab.startsWith('muster:')){kw.call=1}else if(ab.startsWith('scorch'))kw.fire=3;
    let p=ab==='hero'?clamp(Math.round(oldP*0.6),6,8):clamp(Math.round(oldP*0.6),1,7);
    if(ab==='horn')p=2;
    /* faction flavour for plain cards (no ability), by position so it is stable */
    const plain=!ab;
    if(plain){
      if(f==='L'&&row==='C'&&i%3===0)kw.eager=1;
      else if(f==='L'&&row==='C'&&r>=2)kw.double=1;
      else if(f==='W'&&row==='C')kw.guard=1;
      else if(f==='W'&&row==='T'&&r>=1)kw.regrow=1;
      else if(f==='W'&&row==='T')kw.guard=1;
      else if(f==='S'&&r>=2)kw.sprout=1;
      else if(f==='S'&&i%2===0)kw.eager=1;
      else if(f==='B'&&row==='C'&&i%3===1)kw.eager=1;
      else if(f==='N'&&row==='C')kw.guard=1;
    }
    const nk=Object.keys(kw).filter(k=>k!=='ancient').length;
    const feral=f==='B'&&plain&&row==='C'&&!kw.eager&&i%3===0;
    /* +1 for a keyword; plain Treeline units pay +1 for their safety instead */
    const cost=clamp(p+(nk||(row==='T'&&!kw.rally)?1:0)+(kw.ancient?2:0),1,10);
    if(cost<=2&&!kw.ancient)kw.brace=1;
    /* Beasts: plain Clearing commons hit 1 harder for the same cost */
    let pp=feral?p+1:p;
    /* v91 balance (smart-AI tested): Warden Treeline units +1 power; Spirit units costing 3 or less +1 power */
    if(f==='W'&&row==='T'&&!kw.ancient)pp+=1;
    if(f==='S'&&cost<=3)pp+=1;
    const d={id,n,f,type:'unit',r,p:pp,row,kw,cost,mus:ab.startsWith('muster:')?ab.slice(7):null};
    CARDS[id]=d;UNITS.push(d)});
}
convertUnits();
/* Non-unit cards. fx keys are read by the engine. */
const EXTRA=[
 ['Xbell','Camp Bell','N','boon',2,{row:'C',v:1}],['Xlantern','Lantern Light','N','boon',2,{row:'T',v:1}],
 ['Xfrost','Snowdrift','N','blight',2,{row:'C',v:-1}],['Xmist','Sawdust','N','blight',2,{row:'T',v:-1}],
 ['Xstorm','Mudslide','N','reaction',1,{attackerMinus:2}],['Xsun','Sunbreak','N','event',2,{clearAuras:1,draw:1}],
 ['Xscare','Scarecrow','N','reaction',2,{decoy:3}],['Xfire','Wildfire','N','event',5,{wipe:2}],
 ['TL_axe','Sharp Axe','L','tool',2,{p:2}],['TL_hook','Peavey Hook','L','tool',1,{p:1,eager:1}],
 ['TL_line','Hold the Line','L','reaction',2,{plus:3}],['TL_timber','Timber!','L','event',4,{fell:4}],
 ['TW_bark','Bark Armour','W','tool',2,{p:1,guard:1}],['TW_rooted','Rooted','W','reaction',1,{plus:2}],
 ['TW_roots','Return to the Roots','W','event',1,{fellOwn:1,regrow:1,draw:1}],['TW_moss','Mossbed','W','event',3,{regrow:1,draw:1}],
 ['TS_charm','Wisp Charm','S','tool',1,{p:1,nimble:1}],['TS_fade','Fade','S','reaction',2,{negate:1}],
 ['TS_path','Moonlit Path','S','event',2,{daze:1,draw:1}],['TS_gust','Gust','S','event',3,{bounce:4}],
 ['TB_collar','Iron Collar','B','tool',2,{p:2}],['TB_pack','Pack Defence','B','reaction',2,{plusPerUnit:1}],
 ['TB_stampede','Stampede','B','event',3,{clearingBuff:2}],['TB_howl','Howl','B','event',2,{reviveHand:1,draw:1}]];
for(const [id,n,f,type,cost,fx] of EXTRA)CARDS[id]={id,n,f,type,cost,fx,kw:{},p:0,r:1};
/* Keepers: power runs opposite to ability strength. Ability ops are read by the engine. */
const KEEPERS={
 L_a:{n:'Foreman Hale',f:'L',p:5,row:'C',ab:[[1,'buff',2],[3,'draw',1],[6,'buffRow',2]]},
 L_b:{n:'Guild Mistress Ada',f:'L',p:3,row:'T',ab:[[1,'draw',1],[3,'fell',3],[6,'readyAll',1]]},
 L_c:{n:'Tally Clerk Wen',f:'L',p:4,row:'C',ab:[[1,'buff',2],[3,'hush',1],[6,'draw',2]]},
 W_a:{n:'Elder of Roots',f:'W',p:3,row:'T',ab:[[1,'shield',2],[3,'regrowDraw',1],[6,'fell',7]]},
 W_b:{n:'Seer of Rings',f:'W',p:3,row:'T',ab:[[1,'shield',2],[3,'regrowDraw',1],[6,'fell',7]]},
 W_c:{n:'Grove Judge',f:'W',p:4,row:'C',ab:[[1,'shield',1],[3,'daze',1],[6,'fell',5]]},
 S_a:{n:'Moon Doe',f:'S',p:3,row:'W',ab:[[2,'draw',1],[3,'bounce',5],[6,'bounce',9]]},
 S_b:{n:'Lantern Keeper',f:'S',p:3,row:'T',ab:[[2,'draw',1],[3,'bounce',5],[6,'readyAll',1]]},
 S_c:{n:'Mist Mother',f:'S',p:4,row:'W',ab:[[1,'buff',2],[3,'daze',1],[6,'bounce',9]]},
 B_a:{n:'Den Mother',f:'B',p:4,row:'C',ab:[[1,'buff',2],[2,'reviveHand',1],[6,'revivePlay',1]]},
 B_b:{n:'The Alpha',f:'B',p:5,row:'C',ab:[[1,'buff',2],[3,'buffRow',2],[6,'readyAll',1]]},
 B_c:{n:'Old Raven',f:'B',p:3,row:'T',ab:[[2,'draw',1],[3,'fell',3],[6,'fell',7]]}};
for(const k in KEEPERS)KEEPERS[k].id=k;
/* Starter decks: 30 main cards + 6 Ring cards, from one faction plus Neutral. */
function starter(f){
  /* a cost curve: 8 cheap (1-2), 8 mid (3-4), 4 big (5+) units, 2 copies each */
  const pool=UNITS.filter(c=>c.f===f&&!c.kw.ancient&&c.r<=2);
  const pick=(lo,hi,n)=>{const out=[];for(const c of pool.filter(c=>c.cost>=lo&&c.cost<=hi).sort((a,b)=>b.p-a.p)){if(out.length>=n)break;out.push(c.id,c.id)}return out.slice(0,n)};
  const main=[...pick(1,2,8),...pick(3,4,8),...pick(5,7,4)];
  for(const c of pool.slice().sort((a,b)=>a.cost-b.cost)){if(main.length>=20)break;if(main.filter(x=>x===c.id).length<2)main.push(c.id)}
  const ex=Object.values(CARDS).filter(c=>c.type!=='unit'&&c.f===f).map(c=>c.id);
  main.push(...ex,...ex.slice(0,2),'Xbell','Xfrost','Xstorm','Xscare','Xsun','Xfire');
  while(main.length>30)main.pop();
  const ring=UNITS.filter(c=>c.f===f&&c.r>=2).sort((a,b)=>b.cost-a.cost).slice(0,6).map(c=>c.id);
  return {main,ring};
}
module.exports={CARDS,UNITS,KEEPERS,starter};
