/* node report_var.js v1 v2 ... — one compact line block per variant */
const fs=require('fs');const {KEEPERS}=require('./cards.js');const pc=x=>Math.round(100*x)+'%';
const names=process.argv.slice(2).length?process.argv.slice(2):[...new Set(fs.readdirSync('varres').map(f=>f.replace(/\.[01]\.json$/,'')))];
for(const v of names){const parts=[0,1].map(s=>{try{return JSON.parse(fs.readFileSync('varres/'+v+'.'+s+'.json'))}catch(e){return null}}).filter(Boolean);if(parts.length<2)continue;
 const T={games:0,first:0,turns:[],reasons:{},fw:{},fn:{},kw:{},kn:{},hits:0,dko:{}};
 for(const p of parts){T.games+=p.games;T.first+=p.first;T.hits+=p.hits;T.turns.push(...p.turns);for(const o of ['reasons','fw','fn','kw','kn','dko'])for(const k in p[o])T[o][k]=(T[o][k]||0)+p[o][k]}
 T.turns.sort((a,b)=>a-b);const g=T.games,ks=Object.keys(T.kn).map(k=>[KEEPERS[k].n,(T.kw[k]||0)/T.kn[k]]).sort((a,b)=>a[1]-b[1]);
 const fac=['L','W','S','B'].map(f=>(T.fw[f]||0)/T.fn[f]),spread=Math.max(...fac)-Math.min(...fac),ksp=ks.at(-1)[1]-ks[0][1];
 const out=((T.reasons['deck-out']||0)+(T.reasons.withered||0))/g;
 console.log(`\n${v} (${g} games) | factions L ${pc(fac[0])} W ${pc(fac[1])} S ${pc(fac[2])} B ${pc(fac[3])} (spread ${pc(spread)}) | Keepers ${pc(ks[0][1])}–${pc(ks.at(-1)[1])} | first ${pc(T.first/g)} | median turns ${T.turns[g>>1]} p90 ${T.turns[Math.floor(g*.9)]} | out of cards ${pc(out)}${T.reasons.withered?' (withered '+T.reasons.withered+')':''}`);
 console.log('   '+ks.map(([k,v])=>k+' '+pc(v)).join(', '))}
