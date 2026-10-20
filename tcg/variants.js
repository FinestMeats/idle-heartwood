/* NOTE: 'base' is now the v91 rules, with the balance-pass changes already built in.
   Don't stack the old balance variants (warden_p1, spirit_p1, seer_shield ...) on top: they would apply twice.
   Named, combinable test variants ("a+b+c"). Each one changes cards, Keepers or rules in memory only. */
const E=require('./engine.js');const {CARDS,UNITS,KEEPERS}=require('./cards.js');
const setAb=(k,i,ab)=>{KEEPERS[k].ab[i]=ab};
const V={
 base:()=>{},
 /* option 1: Keepers whose 1-Sap draw empties their deck */
 seer_cycle:()=>setAb('W_b',0,[1,'cycleDraw',1]),
 den_cycle:()=>setAb('B_a',0,[1,'cycleDraw',1]),
 all_cycle:()=>{for(const k in KEEPERS)KEEPERS[k].ab.forEach((a,i)=>{if(a[1]==='draw'&&a[0]===1)setAb(k,i,[1,'cycleDraw',a[2]])})},
 seer_2sap:()=>setAb('W_b',0,[2,'draw',1]),
 seer_shield:()=>setAb('W_b',0,[1,'shield',2]),
 den_buff2:()=>setAb('B_a',0,[1,'buff',2]),
 den_buff:()=>setAb('B_a',0,[1,'buff',1]),
 /* option 3: games that run out of cards */
 deck40:()=>{},deck35:()=>{},/* handled when decks are built */
 wither:()=>E.setRule('fatigue','wither'),
 reshuffle:()=>E.setRule('fatigue','reshuffle'),
 seer_regrow2:()=>setAb('W_b',0,[2,'regrow',1]),
 seer_buff:()=>setAb('W_b',0,[1,'buff',1]),
 /* option 3b: a late-game clock so long games finish */
 clock16:()=>E.setRule('clock',16),clock20:()=>E.setRule('clock',20),
 wear:()=>E.setRule('wear',1),
 rings_m1:()=>E.setRule('ringDelta',-1),
 /* Sap growth tests */
 sap2:()=>E.setRule('sapStep',2),
 p1first1:()=>E.setRule('p1first',1),
 ramp6:()=>E.setRule('rampTo',6),
 cap12:()=>E.setRule('sapCap',12),
 nocoin:()=>E.setRule('noCoin',1),
 noextra:()=>E.setRule('noExtra',1),
 noclock:()=>E.setRule('clock',0),
 clock24:()=>E.setRule('clock',24),
 regrow_heart:()=>E.setRule('regrowDiscard',0),
 guard1:()=>E.setRule('guardBonus',1),
 guard0:()=>E.setRule('guardBonus',0),
 /* option 2: faction balance levers */
 hale1:()=>setAb('L_a',0,[1,'buff',1]),
 alpha1:()=>setAb('B_b',0,[1,'buff',1]),
 guard3:()=>E.setRule('guardBonus',3),
 spirit_p1:()=>{for(const c of UNITS)if(c.f==='S'&&c.cost<=3)c.p+=1},
 spirit_eager:()=>{for(const c of UNITS)if(c.f==='S'&&!c.kw.ancient)c.kw.eager=1},
 warden_p1:()=>{for(const c of UNITS)if(c.f==='W'&&c.row==='T'&&!c.kw.ancient)c.p+=1},
 beast_nofer:()=>{for(const c of UNITS)if(c.f==='B'&&c.row==='C'&&!Object.keys(c.kw).some(k=>k!=='brace'))c.p=Math.max(1,c.p-1)},
 lj_nodouble:()=>{for(const c of UNITS)if(c.f==='L'&&c.kw.double)delete c.kw.double},
 wen_up:()=>setAb('L_c',0,[1,'buff',2]),
 judge_down:()=>setAb('W_c',2,[6,'fell',5]),
 spirit_p1c2:()=>{for(const c of UNITS)if(c.f==='S'&&c.cost<=2)c.p+=1},
 ada_2sap:()=>setAb('L_b',0,[2,'draw',1]),
 ada_fell3:()=>setAb('L_b',1,[3,'fell',3]),
 ada_shield:()=>setAb('L_b',0,[1,'shield',1]),
 doe_2sap:()=>setAb('S_a',0,[2,'draw',1]),
 lantern_2sap:()=>setAb('S_b',0,[2,'draw',1]),
 den_rev2:()=>setAb('B_a',1,[2,'reviveHand',1]),
 lantern_bounce4:()=>setAb('S_b',1,[3,'bounce',4]),
 lantern_ready8:()=>setAb('S_b',2,[8,'readyAll',1]),
 raven_2sap:()=>setAb('B_c',0,[2,'draw',1]),
 raven_fell5:()=>setAb('B_c',2,[6,'fell',5]),
 doe_bounce4:()=>setAb('S_a',1,[3,'bounce',4]),
 lantern_1sap:()=>setAb('S_b',0,[1,'draw',1]),
 mist_up:()=>{setAb('S_c',0,[1,'buff',2])},
 seer_p4:()=>{KEEPERS.W_b.p=4},
};
function applyVariants(spec){const names=spec.split('+');for(const n of names){if(!V[n])throw new Error('unknown variant '+n);V[n]()}
  return {deckExtra:names.includes('deck40')?10:names.includes('deck35')?5:0}}
module.exports={applyVariants,V};
