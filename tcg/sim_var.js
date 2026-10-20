/* node sim_var.js "variant+variant" gamesPerPairing shard shards — smart vs smart with chip trample (live rules) */
const E=require('./engine.js');const S=require('./smart.js');const {starter,KEEPERS}=require('./cards.js');const {applyVariants}=require('./variants.js');
const [spec,N,sh,shs]=process.argv.slice(2);const vx=applyVariants(spec);
const d=(f,k)=>{const s=starter(f);const extra=s.main.filter((_,i)=>i%3===0).slice(0,vx.deckExtra);return {name:f,keeper:k,main:s.main.concat(extra),ring:s.ring}};
const out={games:0,first:0,turns:[],reasons:{},fw:{},fn:{},kw:{},kn:{},mu:{},hits:0,react:0,k2:0,dko:{}};let idx=0;
for(const a of 'LWSB')for(const b of 'LWSB')for(let g=0;g<+N;g++){if(idx++%+shs!==+sh)continue;
  const ka=a+'_'+'abc'[g%3],kb=b+'_'+'abc'[(g+1)%3];
  const G=S.playMatch(d(a,ka),d(b,kb),g*7919+a.charCodeAt(0)*31+b.charCodeAt(0)*977+5,['smart','smart']);
  out.games++;out.k2+=G.kills||0;out.turns.push(G.turnNo);out.reasons[G.reason]=(out.reasons[G.reason]||0)+1;if(G.winner===G.first)out.first++;
  if(G.reason==='deck-out'||G.reason==='withered'){const lk=G.winner===0?kb:ka;out.dko[lk]=(out.dko[lk]||0)+1}
  out.hits+=G.p[0].stats.hits+G.p[1].stats.hits;out.react+=G.p[0].stats.react+G.p[1].stats.react;
  [[a,ka],[b,kb]].forEach(([f,k],i)=>{out.fn[f]=(out.fn[f]||0)+1;out.kn[k]=(out.kn[k]||0)+1;if(G.winner===i){out.fw[f]=(out.fw[f]||0)+1;out.kw[k]=(out.kw[k]||0)+1}});
  if(a!==b){out.mu[a+b]=out.mu[a+b]||[0,0];out.mu[a+b][1]++;if(G.winner===0)out.mu[a+b][0]++}}
console.log(JSON.stringify(out));
