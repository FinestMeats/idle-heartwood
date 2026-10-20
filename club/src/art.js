/* UrgerBae Card Club: sticker-style card art. Every picture is drawn here in SVG (viewBox 300x240):
   thick dark outlines, flat colours, a white sticker edge, one white shine. stk() draws a shape group twice:
   once fat and white (the sticker edge), once in colour with the outline. */
const INK='#241a14';
const stk=s=>`<g class="wht">${s}</g><g stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">${s}</g>`;
const shine=d=>`<path d="${d}" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none"/>`;
const C={bun:'#ff9a3c',bunD:'#e07a1f',patty:'#6b3a22',cheese:'#ffd23f',pickle:'#6cc04a',onion:'#fff3d6',ketchup:'#e8382a',mustard:'#ffcc00',bbq:'#8a2a12',
  meat:'#e2574c',fat:'#fff1e0',steel:'#c9d3dc',steelD:'#8796a3',wood:'#b8743c',blue:'#2f6bff',orange:'#ff7a1a',cream:'#fff3d6',gold:'#ffc21a',goldD:'#e09200'};
const seeds=(y0)=>`<g fill="${C.onion}" stroke="${INK}" stroke-width="3">${[[108,84,-25],[152,64,10],[192,80,-8],[148,100,-15],[222,100,30]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y+y0}" rx="6" ry="3.2" transform="rotate(${r} ${x} ${y+y0})"/>`).join('')}</g>`;
/* a smash burger: n patties, sauce, an optional face (the mascot) and gold (the Secret card) */
function burger(o){o=o||{};const n=o.n||1,up=(n-1)*30,w=o.xl?1:0.92,g=o.gold,bun=g?C.gold:C.bun,pat=g?C.goldD:C.patty,ch=g?'#fff2a8':C.cheese;
  let s=`<path d="M40 172 h220 a12 12 0 0 1 12 12 v4 a26 26 0 0 1 -26 26 h-192 a26 26 0 0 1 -26 -26 v-4 a12 12 0 0 1 12 -12z" fill="${bun}"/>`;
  for(let k=0;k<n;k++){const y=-k*30;
    s+=`<path d="M34 ${150+y} q6 -18 26 -18 h180 q20 0 26 18 q4 12 -4 22 h-244 q-8 -10 -4 -22z" fill="${pat}"/>`;
    s+=`<path d="M30 ${128+y} h240 l-14 14 q-6 8 -10 20 q-3 8 -8 0 q-3 -10 -10 -16 l-22 4 q-6 18 -12 22 q-5 4 -8 -4 l-4 -18 h-46 q-6 14 -10 16 q-5 2 -7 -6 l-5 -12 h-48 l-10 12 q-5 7 -9 0 l-6 -14z" fill="${ch}"/>`}
  if(!g)s+=`<ellipse cx="96" cy="${124-up}" rx="16" ry="6" fill="${C.pickle}"/><ellipse cx="204" cy="${124-up}" rx="16" ry="6" fill="${C.pickle}"/>`;
  s+=`<path d="M36 ${120-up} q0 -84 114 -84 q114 0 114 84 q0 8 -10 8 h-208 q-10 0 -10 -8z" fill="${bun}"/>`;
  /* taller stacks shrink to fit the panel */
  const sc=Math.min(1,206/(182+up)),sx=w*sc,ty=up?12-sc*(36-up):0;
  let out=`<g transform="translate(${150-150*sx} ${ty}) scale(${sx} ${sc})">${stk(s)}`;
  if(o.sauce)out+=`<path d="M64 ${130-up} q14 -7 28 0 q14 7 28 0 q14 -7 28 0 q14 7 28 0 q14 -7 28 0" stroke="${o.sauce==='bbq'?C.bbq:C.ketchup}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
  out+=shine(`M72 ${72-up} q28 -22 66 -24`);
  if(o.face)out+=`<g stroke="${INK}" stroke-width="5" stroke-linecap="round"><circle cx="122" cy="${92-up}" r="8" fill="${INK}"/><circle cx="178" cy="${92-up}" r="8" fill="${INK}"/><path d="M128 ${108-up} q22 18 44 0" fill="none"/></g><circle cx="125" cy="${89-up}" r="2.5" fill="#fff"/><circle cx="181" cy="${89-up}" r="2.5" fill="#fff"/>`;
  else out+=seeds(-up);
  return out+`</g>`}
const sparkle=(x,y,r)=>`<path d="M${x} ${y-r} L${x+r*0.28} ${y-r*0.28} L${x+r} ${y} L${x+r*0.28} ${y+r*0.28} L${x} ${y+r} L${x-r*0.28} ${y+r*0.28} L${x-r} ${y} L${x-r*0.28} ${y-r*0.28}z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
/* a faceless character: cap, apron, holding a tool */
function person(o){const cap=o.cap||C.orange,apron=o.apron||'#ffffff',shirt=o.shirt||C.blue;
  let s=`<path d="M70 230 q0 -70 80 -70 q80 0 80 70z" fill="${shirt}"/><path d="M118 168 h64 v62 h-64z" fill="${apron}"/><circle cx="150" cy="108" r="40" fill="#f2c39b"/>
  <path d="M108 100 q0 -44 42 -44 q42 0 42 44z" fill="${cap}"/><path d="M182 96 h34 q6 0 6 6 q0 6 -6 6 h-34z" fill="${cap}"/>`;
  return stk(s)+(o.badge?`<g><circle cx="150" cy="198" r="16" fill="${o.badgeFill||C.gold}" stroke="${INK}" stroke-width="4"/><text x="150" y="204" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="15" fill="${INK}">${o.badge}</text></g>`:'')+(o.tool||'')}
const ART={
 /* The Menu */
 m_og:()=>burger({sauce:'ketchup'}),
 m_xl:()=>burger({xl:1,sauce:'ketchup'}),
 m_bbqjr:()=>burger({sauce:'bbq'}),
 m_cookie:()=>stk(`<circle cx="150" cy="124" r="86" fill="#d9954a"/>`)+`<g fill="#4a2414">${[[112,92,12],[168,84,10],[190,132,13],[130,150,11],[96,134,9],[158,118,8],[150,176,10]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`+shine('M96 72 q24 -22 56 -24'),
 m_bbqbig:()=>burger({xl:1,sauce:'bbq'}),
 m_double:()=>burger({n:2,sauce:'ketchup'}),
 m_can:()=>stk(`<path d="M100 44 h100 l8 18 v136 l-8 18 h-100 l-8 -18 v-136z" fill="${C.blue}"/><path d="M92 112 h116 v40 h-116z" fill="${C.orange}"/><path d="M110 30 h80 v14 h-80z" fill="${C.steel}"/>`)+shine('M114 62 v118')+`<g fill="#bfe6ff" stroke="${INK}" stroke-width="3"><circle cx="232" cy="70" r="7"/><circle cx="246" cy="98" r="5"/><circle cx="64" cy="150" r="6"/></g>`,
 m_triple:()=>burger({n:3,sauce:'ketchup'}),
 m_sauce:()=>stk(`<path d="M122 26 h56 v18 h-56z" fill="${C.bbq}"/><path d="M140 6 h20 v20 h-20z" fill="${C.bbq}"/><path d="M110 44 h80 q14 0 14 14 v140 q0 18 -18 18 h-72 q-18 0 -18 -18 v-140 q0 -14 14 -14z" fill="#b8361a"/><path d="M106 96 h88 v60 h-88z" fill="${C.cream}"/>`)+`<text x="150" y="122" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="17" fill="${INK}">BaeBecue</text><text x="150" y="144" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="14" fill="${C.bbq}">SAUCE</text>`+shine('M118 64 v24'),
 m_wagyu:()=>burger({sauce:'ketchup'})+sparkle(40,40,14)+sparkle(262,58,11),
 /* The Crew */
 c_press:()=>stk(`<path d="M80 150 h140 q10 0 10 10 v20 q0 10 -10 10 h-140 q-10 0 -10 -10 v-20 q0 -10 10 -10z" fill="${C.steel}"/><path d="M138 70 h24 v80 h-24z" fill="${C.steelD}"/><path d="M104 44 h92 q14 0 14 14 q0 14 -14 14 h-92 q-14 0 -14 -14 q0 -14 14 -14z" fill="${C.wood}"/>`)+shine('M90 162 h60')+`<path d="M60 214 q20 -10 40 0 q20 10 40 0 q20 -10 40 0 q20 10 40 0" stroke="${C.patty}" stroke-width="8" stroke-linecap="round" fill="none"/>`,
 c_flattop:()=>stk(`<path d="M40 120 h220 v26 h-220z" fill="#4a4f57"/><path d="M52 146 h196 v58 h-196z" fill="${C.steel}"/><path d="M84 112 h44 q10 0 10 8 h-64 q0 -8 10 -8z" fill="${C.patty}"/><path d="M168 112 h44 q10 0 10 8 h-64 q0 -8 10 -8z" fill="${C.patty}"/>`)+`<g stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.95"><path d="M100 96 q-10 -16 0 -30 q10 -14 0 -30"/><path d="M190 96 q-10 -16 0 -30 q10 -14 0 -30"/></g><g fill="${C.orange}" stroke="${INK}" stroke-width="3"><circle cx="90" cy="176" r="9"/><circle cx="210" cy="176" r="9"/></g>`,
 c_toaster:()=>stk(`<path d="M60 100 h180 q12 0 12 12 v84 q0 12 -12 12 h-180 q-12 0 -12 -12 v-84 q0 -12 12 -12z" fill="${C.steel}"/><path d="M86 70 h128 q10 0 10 10 v20 h-148 v-20 q0 -10 10 -10z" fill="${C.bun}"/><path d="M78 132 h144 v14 h-144z" fill="#4a4f57"/>`)+`<g fill="${C.orange}" stroke="${INK}" stroke-width="3"><circle cx="96" cy="178" r="9"/></g>`+shine('M74 116 h40'),
 c_order:()=>stk(`<path d="M86 30 h128 v170 l-16 -10 l-16 10 l-16 -10 l-16 10 l-16 -10 l-16 10 l-16 -10 l-16 10z" fill="#ffffff"/>`)+`<g stroke="${INK}" stroke-width="5" stroke-linecap="round"><path d="M106 62 h88"/><path d="M106 90 h70"/><path d="M106 118 h80"/><path d="M106 146 h56"/></g><text x="150" y="182" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="16" fill="${C.orange}">ORDER UP</text>`+stk(`<path d="M220 60 l26 -26 l14 14 l-26 26z" fill="${C.blue}"/><path d="M220 60 l14 14 l-20 6z" fill="${C.cream}"/>`),
 c_cook:()=>person({cap:'#ffffff',shirt:C.orange,tool:stk(`<path d="M228 120 l30 -60 l12 6 l-30 60z" fill="${C.wood}"/><path d="M210 150 h44 v18 h-44z" fill="${C.steel}"/>`)}),
 c_truck:()=>stk(`<path d="M30 70 h170 v110 h-170z" fill="${C.orange}"/><path d="M200 104 h44 l26 34 v42 h-70z" fill="${C.blue}"/><path d="M50 94 h120 v44 h-120z" fill="${C.cream}"/><path d="M216 116 h24 l14 20 h-38z" fill="#bfe6ff"/><circle cx="80" cy="190" r="22" fill="#4a4f57"/><circle cx="226" cy="190" r="22" fill="#4a4f57"/>`)+`<text x="110" y="124" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="16" fill="${INK}">URGERBAE</text>`,
 c_boss:()=>person({cap:C.orange,shirt:'#1d1d1f',apron:C.orange,badge:'B',badgeFill:C.blue}),
 /* The Butcher's Block */
 b_brisket:()=>stk(`<path d="M42 108 q20 -40 110 -40 q100 0 108 40 q10 50 -30 74 q-80 30 -160 4 q-44 -20 -28 -78z" fill="${C.meat}"/><path d="M48 104 q26 -30 104 -32 q96 0 106 34 q-10 12 -104 12 q-94 0 -106 -14z" fill="${C.fat}"/>`)+`<g stroke="#ffd2cc" stroke-width="4" stroke-linecap="round" fill="none"><path d="M78 146 q40 -10 70 6"/><path d="M162 160 q34 -14 64 -4"/></g>`,
 b_chuck:()=>stk(`<path d="M60 70 q90 -40 180 10 q30 60 -10 110 q-80 40 -160 0 q-40 -50 -10 -120z" fill="${C.meat}"/><path d="M150 96 q30 0 30 30 q0 30 -30 30 q-30 0 -30 -30 q0 -30 30 -30z" fill="${C.fat}"/>`)+`<g stroke="#ffd2cc" stroke-width="4" stroke-linecap="round" fill="none"><path d="M84 110 q20 20 0 50"/><path d="M216 100 q-16 30 4 60"/></g>`,
 b_leg:()=>stk(`<path d="M54 120 q0 -70 90 -76 q90 4 96 70 q-6 60 -96 70 q-30 2 -50 -10 l-30 26 q-14 10 -22 -2 q-6 -10 6 -20 l28 -24 q-22 -16 -22 -34z" fill="${C.meat}"/><path d="M30 196 q-8 -14 6 -22 q14 -6 18 6 q10 -4 14 6 q4 14 -10 18 q-14 4 -28 -8z" fill="${C.fat}"/>`)+shine('M96 76 q30 -18 66 -16'),
 b_neck:()=>[[96,120],[204,120],[150,96]].map(([x,y])=>stk(`<circle cx="${x}" cy="${y}" r="56" fill="${C.meat}"/><circle cx="${x}" cy="${y}" r="20" fill="${C.fat}"/>`)).join(''),
 b_snags:()=>stk(`<path d="M30 150 q0 -40 50 -40 h30 q30 0 30 30 q0 30 -30 30 h-30 q-50 0 -50 -20z" fill="#c9533a"/><path d="M140 140 q0 -30 30 -30 h40 q30 0 30 30 q0 30 -30 30 h-40 q-30 0 -30 -30z" fill="#c9533a"/><path d="M240 132 q24 -20 40 -6 q8 22 -14 40 q-20 10 -26 -10z" fill="#c9533a"/>`)+shine('M54 128 h40')+shine('M164 126 h34'),
 b_mincer:()=>stk(`<path d="M70 120 h150 v50 h-150z" fill="${C.steel}"/><path d="M110 54 h70 l-14 66 h-42z" fill="${C.steelD}"/><path d="M220 112 h20 v66 h-20z" fill="${C.steelD}"/><path d="M240 140 h30 v10 h-30z" fill="${C.wood}"/><path d="M90 170 h50 v40 h-50z" fill="${C.steelD}"/>`)+`<g stroke="${C.meat}" stroke-width="8" stroke-linecap="round"><path d="M70 136 q-20 10 -16 30"/><path d="M70 152 q-24 14 -18 40"/></g>`,
 b_scale:()=>stk(`<path d="M50 150 h200 v56 h-200z" fill="${C.steel}"/><path d="M70 128 h160 v22 h-160z" fill="${C.steelD}"/><path d="M90 168 h120 v26 h-120z" fill="#1f2a1a"/><path d="M92 92 q58 -40 116 0 v36 h-116z" fill="${C.meat}"/>`)+`<text x="150" y="188" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="18" fill="#8cff8c">1.000 kg</text>`,
 b_saw:()=>stk(`<path d="M80 30 h140 v180 h-140z" fill="${C.blue}"/><path d="M104 54 h92 v132 h-92z" fill="${C.steel}"/><path d="M60 150 h180 v20 h-180z" fill="${C.steelD}"/>`)+`<path d="M150 54 v132" stroke="${INK}" stroke-width="4" stroke-dasharray="6 5"/>`,
 b_blend:()=>stk(`<circle cx="150" cy="120" r="88" fill="${C.meat}"/><path d="M150 120 L150 32 A88 88 0 1 1 ${150+88*Math.sin(2*Math.PI*0.73)} ${120-88*Math.cos(2*Math.PI*0.73)} Z" fill="#a8322a"/>`)+`<text x="198" y="150" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="30" fill="#fff" stroke="${INK}" stroke-width="5" paint-order="stroke">73</text><text x="100" y="86" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="24" fill="#fff" stroke="${INK}" stroke-width="5" paint-order="stroke">27</text>`,
 b_counter:()=>stk(`<path d="M30 110 h240 v90 h-240z" fill="#ffffff"/><path d="M40 70 h220 l10 40 h-240z" fill="#bfe6ff"/><path d="M52 124 h60 v20 h-60z" fill="${C.meat}"/><path d="M122 124 h60 v20 h-60z" fill="#c9533a"/><path d="M192 124 h60 v20 h-60z" fill="${C.meat}"/><path d="M30 200 h240 v14 h-240z" fill="${C.blue}"/>`)+shine('M60 82 l40 0'),
 b_shop:()=>stk(`<path d="M40 90 h220 v120 h-220z" fill="${C.cream}"/><path d="M30 60 h240 l-12 40 h-216z" fill="${C.orange}"/><path d="M60 120 h80 v90 h-80z" fill="#bfe6ff"/><path d="M164 120 h76 v56 h-76z" fill="#bfe6ff"/>`)+`<g stroke="#ffffff" stroke-width="6"><path d="M70 64 l-6 34"/><path d="M118 64 l-4 34"/><path d="M166 64 l0 34"/><path d="M214 64 l4 34"/></g>`,
 /* Icons */
 i_butcher:()=>person({cap:'#ffffff',shirt:'#1d2a4d',apron:'#ffffff',badge:'45+',badgeFill:C.gold,tool:stk(`<path d="M220 104 h44 q8 0 8 8 v28 q0 8 -8 8 h-44z" fill="${C.steel}"/><path d="M206 116 h16 v20 h-16z" fill="${C.wood}"/>`)})+sparkle(48,52,12),
 i_wagyu:()=>stk(`<path d="M42 108 q20 -40 110 -40 q100 0 108 40 q10 50 -30 74 q-80 30 -160 4 q-44 -20 -28 -78z" fill="${C.meat}"/>`)+`<g stroke="#fff4ec" stroke-width="5" stroke-linecap="round" fill="none"><path d="M70 110 q30 10 50 -6 q20 -10 40 6"/><path d="M90 140 q30 -10 60 4 q24 10 50 -4"/><path d="M180 108 q20 6 40 -4"/><path d="M110 168 q30 6 60 -4"/></g>`+sparkle(40,40,14)+sparkle(262,52,12)+sparkle(250,196,10),
 i_mascot:()=>burger({face:1})+sparkle(44,44,14)+sparkle(258,60,12),
 /* Secret */
 s_golden:()=>burger({gold:1})+sparkle(40,40,16)+sparkle(262,48,12)+sparkle(250,196,12)+sparkle(52,190,10),
};
/* each card's picture, in a sticker panel the colour of its set */
function cardArt(id){const f=ART[id];return `<svg viewBox="0 0 300 240" role="img" aria-hidden="true" class="art">${f?f():''}</svg>`}
if(typeof module!=='undefined')module.exports={cardArt,ART};
