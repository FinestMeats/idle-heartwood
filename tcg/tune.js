const S=require('./smart.js');const {starter}=require('./cards.js');
const d=(f,k)=>{const s=starter(f);return {name:f,keeper:k,main:s.main,ring:s.ring}};
const cfgs=JSON.parse(process.argv[2]);const N=+process.argv[3]||1;
for(const c of cfgs){Object.assign(S.OPT,c);let w=0,n=0,h=0;
 for(const a of 'LWSB')for(const b of 'LWSB')for(let g=0;g<N;g++)for(const seat of [0,1]){const kinds=seat?['quick','smart']:['smart','quick'];
  const G=S.playMatch(d(a,a+'_'+'abc'[g%3]),d(b,b+'_'+'abc'[(g+1)%3]),g*7919+a.charCodeAt(0)*31+b.charCodeAt(0)*977+seat+101,kinds);n++;if(G.winner===seat)w++;h+=G.p[seat].stats.hits}
 console.log(JSON.stringify(c),'smart wins',Math.round(100*w/n)+'%','hits',(h/n).toFixed(1))}
