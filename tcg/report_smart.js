const fs=require('fs');const {KEEPERS}=require('./cards.js');
const label={'0_0':'No trample, targets as now (v89 rules)','carry_0':'Carry trample','chip_0':'Chip trample (live v90)','chip_tired':'Chip + any tired unit','chip_clearing':'Chip + any Clearing unit','chip_all':'Chip + any unit anywhere','chip_0_deck40':'Chip trample with 40-card decks'};
const pc=x=>Math.round(100*x)+'%';
for(const tag of Object.keys(label)){const parts=[0,1].map(s=>{try{return JSON.parse(fs.readFileSync('smartres/'+tag+'.'+s+'.json'))}catch(e){return null}}).filter(Boolean);if(parts.length<2)continue;
 const T={games:0,first:0,turns:[],reasons:{},fw:{},fn:{},kw:{},kn:{},mu:{},hits:0,kills:0,react:0};
 for(const p of parts){for(const k of ['games','first','hits','react'])T[k]+=p[k];T.k2=(T.k2||0)+(p.k2||0);T.has=p.k2!=null;for(const k in p.dko||{}){T.dko=T.dko||{};T.dko[k]=(T.dko[k]||0)+p.dko[k]}T.turns.push(...p.turns);for(const o of ['reasons','fw','fn','kw','kn'])for(const k in p[o])T[o][k]=(T[o][k]||0)+p[o][k];for(const k in p.mu){T.mu[k]=T.mu[k]||[0,0];T.mu[k][0]+=p.mu[k][0];T.mu[k][1]+=p.mu[k][1]}}
 T.turns.sort((a,b)=>a-b);const g=T.games;
 const ks=Object.keys(T.kn).map(k=>[KEEPERS[k].n,(T.kw[k]||0)/T.kn[k]]).sort((a,b)=>a[1]-b[1]);
 /* matchups: combine both seat orders */
 const mm={};for(const k in T.mu){const [a,b]=k;const key=[a,b].sort().join('');mm[key]=mm[key]||[0,0];const w=a<b?T.mu[k][0]:T.mu[k][1]-T.mu[k][0];mm[key][0]+=w;mm[key][1]+=T.mu[k][1]}
 const worst=Object.entries(mm).map(([k,v])=>[k,v[0]/v[1]]).sort((x,y)=>Math.abs(y[1]-.5)-Math.abs(x[1]-.5))[0];
 console.log(`\n=== ${label[tag]} (${g} games) ===`);
 console.log('factions',['L','W','S','B'].map(f=>f+' '+pc((T.fw[f]||0)/T.fn[f])).join('  '),'| most lopsided',worst[0][0]+' v '+worst[0][1],pc(worst[1]));
 console.log('keepers',pc(ks[0][1]),'('+ks[0][0]+') to',pc(ks.at(-1)[1]),'('+ks.at(-1)[0]+')');
 console.log('  ',ks.map(([k,v])=>k+' '+pc(v)).join(', '));
 console.log('first player',pc(T.first/g),'| median turns',T.turns[g>>1],'p10',T.turns[Math.floor(g*.1)],'p90',T.turns[Math.floor(g*.9)],'| deck-outs',pc((T.reasons['deck-out']||0)/g),'timeouts',T.reasons.timeout||0);
 console.log('Keeper hits/game',(T.hits/g).toFixed(1),'| units felled by attacks/game',T.has?(T.k2/g).toFixed(1):'n/a','| reaction+brace cards/game',(T.react/g).toFixed(1));if(T.dko)console.log('ran out of cards (loser Keeper):',Object.entries(T.dko).sort((a,b)=>b[1]-a[1]).map(([k,v])=>KEEPERS[k].n+' '+v).join(', '))}
