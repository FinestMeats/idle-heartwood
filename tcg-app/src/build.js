/* Builds the standalone Heartwood TCG app as one page.
   node build.js            -> preview.html (no cloud: for the Claude preview and tests)
   node build.js config.json -> also ../idle-heartwood/tcg-app/index.html (website build, shared Firebase login)
   Shared pieces come straight from the idle game (pop-ups, icons, card art, sounds, styles) and from tcg/ (rules, AI, board),
   so fixes there flow into the app on the next build. */
const fs=require('fs'),path=require('path'),ex=require('./extract.js');
const TCGDIR='/home/claude/tcg',IDLE='/home/claude/heartwood.html';
const idle=fs.readFileSync(IDLE,'utf8');
/* 1. helpers from the idle game */
const roots=['$','ico','showModal','showToast','nextToast','sfx','buzz','addQuake','cardArt','hdArt','CARD','CARDS','FACTIONS','RAR','inMatch','peekBoard','holdInfo','CARDSRC','LEADERS','SPECIALS_SRC','sfxOn'];
const stop=new Set(['TCG','TCd','TK','TKW','TKW_TXT','TROW','TTYPE_IC','tCard','tFxText','tcgPopup','UNITS','TCG_ONLY','S','tab','buildList','TG','TS','cardPopup','save','refreshUI','buildRes','showWish','DG','duelClick','renderDuel']);
const helpers=ex.emit(ex.closure(roots,stop),(st,txt)=>/^for\(const f in CARDSRC\)|^SPECIALS_SRC\.forEach|^holdInfo\(document\)/.test(txt));
/* 2. rules, cards and AI as tiny modules */
const mod=(name,file)=>`(function(){const module={exports:{}};const require=__req;\n${fs.readFileSync(path.join(TCGDIR,file),'utf8')}\n__mods['${name}']=module.exports})();`;
const modules=`const __mods={'./src_classic.js':{CARDSRC,LEADERS}};const __req=n=>__mods[n];
${mod('./cards.js','cards.js')}
${mod('./engine.js','engine.js')}
${mod('./smart.js','smart.js')}
const TCG=Object.assign(__req('./engine.js'),(({CARDS,UNITS,KEEPERS,starter})=>({CARDS,UNITS,KEEPERS,starter}))(__req('./cards.js')));`;
const board=fs.readFileSync(path.join(TCGDIR,'tcg_ui.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
/* 3. styles: the idle game's, plus the app frame */
const css=[...idle.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const appCss=`
html,body{height:100%;overflow:hidden}
#app2{position:fixed;top:0;bottom:0;left:0;right:0;display:flex;flex-direction:column;max-width:560px;margin:0 auto;padding-top:env(safe-area-inset-top,0px)}
#main{flex:1 1 auto;min-height:0;overflow-y:auto;padding:10px 12px 24px;-webkit-overflow-scrolling:touch}
#nav{flex:0 0 auto;display:flex;gap:4px;padding:6px 8px calc(6px + env(safe-area-inset-bottom,0px));background:var(--panel);border-top:3px solid var(--edge)}
#nav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;background:transparent;border:2px solid transparent;color:var(--muted);font:inherit;font-size:17px;padding:4px 0;border-radius:6px}
#nav button[aria-pressed="true"]{color:var(--fg);border-color:var(--line);background:var(--panel2)}
.hero{text-align:center;margin:8px 0 4px}.hero h1{font-family:var(--display);font-weight:400;color:var(--gold);font-size:44px;margin:0;letter-spacing:1px}
.buy.big{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:56px;font-size:24px;margin:10px 0}
.cw{position:relative;display:inline-block}.cw .cnt{position:absolute;right:-2px;bottom:-4px;background:rgba(0,0,0,.85);color:var(--gold);font-size:13px;line-height:1;padding:2px 4px;border-radius:3px;pointer-events:none;white-space:nowrap}
.kp{font-size:15px;line-height:1.1}
.cw.dim .cd{opacity:.32;filter:grayscale(.8)}
.dot{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:middle}
#banners{position:fixed!important;top:calc(env(safe-area-inset-top,0px) + 8px)!important}
#main .sel{flex-wrap:wrap}
`;
const HEAD='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
 '<meta name="theme-color" content="#0f1512"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'+
 '<meta name="apple-mobile-web-app-status-bar-style" content="black"><meta name="apple-mobile-web-app-title" content="Heartwood TCG">'+
 '<title>Heartwood TCG</title><link rel="preconnect" href="https://fonts.googleapis.com">'+
 '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=VT323&family=IM+Fell+English:ital@0;1&display=swap">'+
 '<style>html,body{margin:0;overscroll-behavior:none}</style>';
const BODY=`<div id="app2"><main id="main"></main><nav id="nav" aria-label="Sections"></nav></div>
<div id="banners" aria-live="polite"></div><div id="toast" hidden></div><div id="cardZoom" hidden role="dialog" aria-label="Card details"></div>
<div id="duel" hidden></div><div id="tcg" hidden role="dialog" aria-label="Match"></div><div id="peekBack" hidden><button class="buy" type="button">Back</button></div>
<canvas id="cv" width="4" height="4" hidden></canvas>`;
function page(cfg,hooks){return HEAD+`<style>${css}\n${appCss}</style></head><body>${BODY}<script>(function(){\nconst FB_CONFIG=${cfg?JSON.stringify(cfg):'null'};\n${helpers}\n${modules}\n${board}\n${app}\n${hooks||''}\n})();</script></body></html>`}
fs.writeFileSync(path.join(__dirname,'preview.html'),page(null));
fs.writeFileSync(path.join(__dirname,'test.html'),page(null,'window.__app={A,TCG,SM,render,startMatch,deckProblems,get TG(){return TG},TS,tDo,loadAll};'));
console.log('preview.html',fs.statSync(path.join(__dirname,'preview.html')).size,'bytes');
if(process.argv[2]){const cfg=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const out='/home/claude/idle-heartwood/tcg-app/index.html';
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,page(cfg));console.log('website build',out,fs.statSync(out).size,'bytes')}
