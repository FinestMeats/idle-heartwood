/* node sim_smart.js trample targets gamesPerPairing shard shards > out.json — smart vs smart */
const E=require('./engine.js');const S=require('./smart.js');const {starter,KEEPERS}=require('./cards.js');
const [tr,tg,N,sh,shs,dk]=process.argv.slice(2);E.setTrample(tr==='0'?0:tr);E.setTargets(tg==='0'?0:tg);
/* deck40 test: add every third card again (10 more) */
const d=(f,k)=>{const s=starter(f);const main=dk==='deck40'?s.main.concat(s.main.filter((_,i)=>i%3===0)):s.main;return {name:f,keeper:k,main,ring:s.ring}};
const out={games:0,first:0,turns:[],reasons:{},fw:{},fn:{},kw:{},kn:{},mu:{},hits:0,kills:0,react:0,blocks:0};
for(const k in E.TS)E.TS[k]=0;let idx=0;
for(const a of 'LWSB')for(const b of 'LWSB')for(let g=0;g<+N;g++){if(idx++%+shs!==+sh)continue;
  const ka=a+'_'+'abc'[g%3],kb=b+'_'+'abc'[(g+1)%3];
  const G=S.playMatch(d(a,ka),d(b,kb),g*7919+a.charCodeAt(0)*31+b.charCodeAt(0)*977+5,['smart','smart']);
  out.games++;out.k2=(out.k2||0)+(G.kills||0);if(G.reason==='deck-out'){const lk=G.winner===0?kb:ka;out.dko=out.dko||{};out.dko[lk]=(out.dko[lk]||0)+1}out.turns.push(G.turnNo);out.reasons[G.reason]=(out.reasons[G.reason]||0)+1;if(G.winner===G.first)out.first++;
  out.hits+=G.p[0].stats.hits+G.p[1].stats.hits;out.react+=G.p[0].stats.react+G.p[1].stats.react;
  [[a,ka],[b,kb]].forEach(([f,k],i)=>{out.fn[f]=(out.fn[f]||0)+1;out.kn[k]=(out.kn[k]||0)+1;if(G.winner===i){out.fw[f]=(out.fw[f]||0)+1;out.kw[k]=(out.kw[k]||0)+1}});
  if(a!==b){out.mu[a+b]=out.mu[a+b]||[0,0];out.mu[a+b][1]++;if(G.winner===0)out.mu[a+b][0]++}}
out.kills=E.TS.kills;
console.log(JSON.stringify(out));
