/* node sim.js [gamesPerPairing] — faction balance, first-player edge, game length, how games end */
const {play}=require('./engine.js');
const {starter,KEEPERS}=require('./cards.js');
const N=+process.argv[2]||40,F=['L','W','S','B'];
const deck=(f,k)=>{const s=starter(f);return {name:f,keeper:k,main:s.main,ring:s.ring}};
const res={},fk={},reasons={},turns=[];let firstWins=0,games=0,decided=0;
let seed=1;
for(const a of F)for(const b of F){let w=0,n=0;
  for(let g=0;g<N;g++){const ka=a+'_'+'abc'[g%3],kb=b+'_'+'abc'[(g+1)%3];
    const G=play(deck(a,ka),deck(b,kb),seed++*7919);games++;turns.push(G.turnNo);reasons[G.reason]=(reasons[G.reason]||0)+1;
    if(G.winner>=0){decided++;if(G.winner===G.first)firstWins++;if(G.winner===0)w++;
      const kw=G.winner===0?ka:kb,kl=G.winner===0?kb:ka;fk[kw]=fk[kw]||{w:0,n:0};fk[kl]=fk[kl]||{w:0,n:0};fk[kw].w++;fk[kw].n++;fk[kl].n++}
    n++}
  res[a+b]=Math.round(100*w/n)}
console.log('win% row vs col (L W S B)');for(const a of F)console.log(a+': '+F.map(b=>String(res[a+b]).padStart(3)).join(' ')+'  avg '+Math.round(F.reduce((s,b)=>s+res[a+b],0)/4));
turns.sort((x,y)=>x-y);
console.log('games',games,'ended by',JSON.stringify(reasons),'first player wins',Math.round(100*firstWins/decided)+'%');
console.log('turns (both players): median',turns[turns.length>>1],'p10',turns[Math.floor(turns.length*0.1)],'p90',turns[Math.floor(turns.length*0.9)]);
console.log('keepers:',Object.entries(fk).sort().map(([k,v])=>KEEPERS[k].n+' '+Math.round(100*v.w/v.n)+'%').join(', '));
