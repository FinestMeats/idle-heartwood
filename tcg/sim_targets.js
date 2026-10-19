/* node sim_targets.js [games per pairing] — chip trample on; compares who units can attack */
const E=require('./engine.js');const {starter,KEEPERS}=require('./cards.js');
const N=+process.argv[2]||200,F='LWSB';
const d=(f,k)=>{const s=starter(f);return {name:f,keeper:k,main:s.main,ring:s.ring}};
const label={0:'NOW: tired Clearing units (Treeline once Clearing is empty)',tired:'ANY TIRED UNIT, either row',clearing:'ANY CLEARING UNIT, ready or tired (Treeline once Clearing is empty)',all:'ANY UNIT ANYWHERE'};
for(const mode of (process.argv[3]||'0,tired,clearing,all').split(',').map(x=>x==='0'?0:x)){E.setTargets(mode);for(const k in E.TS)E.TS[k]=0;
 const win={},n={},kw={},kn={},mu={};let turns=[],reasons={},games=0,first=0,hits=0,board=0,bs=0;
 for(const a of F)for(const b of F)for(let g=0;g<N;g++){const ka=a+'_'+'abc'[g%3],kb=b+'_'+'abc'[(g+1)%3];
  const G=E.play(d(a,ka),d(b,kb),g*7919+a.charCodeAt(0)*31+b.charCodeAt(0)*977+1);games++;turns.push(G.turnNo);reasons[G.reason]=(reasons[G.reason]||0)+1;if(G.winner===G.first)first++;
  hits+=G.p[0].stats.hits+G.p[1].stats.hits;
  [[a,ka],[b,kb]].forEach(([f,k],i)=>{n[f]=(n[f]||0)+1;kn[k]=(kn[k]||0)+1;if(G.winner===i){win[f]=(win[f]||0)+1;kw[k]=(kw[k]||0)+1}});
  if(a!==b)mu[a+b]=(mu[a+b]||0)+(G.winner===0?1:0)}
 turns.sort((x,y)=>x-y);const pc=x=>Math.round(100*x)+'%';
 const ks=Object.keys(kn).map(k=>[KEEPERS[k].n,(kw[k]||0)/kn[k]]).sort((x,y)=>x[1]-y[1]);
 const worst=Object.entries(mu).map(([k,v])=>[k,v/N]).sort((x,y)=>Math.abs(y[1]-.5)-Math.abs(x[1]-.5))[0];
 console.log('\n=== '+label[mode]+' ===');
 console.log('factions',[...F].map(f=>f+' '+pc(win[f]/n[f])).join('  '),'| most lopsided',worst[0][0]+' v '+worst[0][1],pc(worst[1]));
 console.log('keepers',pc(ks[0][1]),'('+ks[0][0]+') to',pc(ks.at(-1)[1]),'('+ks.at(-1)[0]+') |',ks.map(([k,v])=>k.split(' ').at(-1)+' '+pc(v)).join(', '));
 console.log('first player',pc(first/games),'| median turns',turns[turns.length>>1],'p10',turns[Math.floor(games*0.1)],'p90',turns[Math.floor(games*0.9)],'| timeouts',reasons.timeout||0);
 console.log('deck-outs',pc((reasons['deck-out']||0)/games),'| units felled by attacks/game',(E.TS.kills/games).toFixed(1),'| Keeper hits/game',(hits/games).toFixed(1))}
