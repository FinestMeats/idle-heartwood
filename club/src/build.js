/* Builds the UrgerBae Card Club page. Run from club/src after `npm i --no-save qrcode-generator@1`:
   node build.js           -> preview.html and test.html here (no cloud, with a "Preview: open a pack" button; not committed)
   node build.js web       -> also ../index.html (the website: Firebase sign-in, staff counter screen)
   Nothing secret goes into the page: firebase.json is the public web config, and staff, today's counter code and
   reward claims are all checked by the Firestore rules (../../firestore.rules). Never add a PIN or secret to CFG. */
const fs=require('fs'),path=require('path');
const src=f=>fs.readFileSync(path.join(__dirname,f),'utf8').replace(/\nif\(typeof module!=='undefined'\)module\.exports=[^\n]*\n?/,'\n');
const css=`
:root{--ink:#241a14;--bg:#fff6ec;--orange:#ff7a1a;--blue:#2f6bff;--muted:#6b5a50}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font-family:'Fredoka',system-ui,sans-serif;-webkit-tap-highlight-color:transparent}
body{min-height:100vh;padding-bottom:84px}
header{display:flex;align-items:center;justify-content:center;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 10px;background:var(--orange);border-bottom:4px solid var(--ink)}
header b{font-size:22px;color:#fff;letter-spacing:.5px;text-shadow:0 2px 0 var(--ink)}
main{max-width:560px;margin:0 auto;padding:14px 16px}
nav{position:fixed;left:0;right:0;bottom:0;display:flex;gap:8px;justify-content:center;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:#fff;border-top:4px solid var(--ink)}
nav button{flex:1;max-width:170px;min-height:48px;font:inherit;font-size:18px;font-weight:700;border:3px solid var(--ink);border-radius:14px;background:#fff;color:var(--ink)}
nav button[aria-pressed="true"]{background:var(--blue);color:#fff}
.hero{text-align:center;padding:8px 0 4px}.hero h1{margin:0;font-size:40px;line-height:1;color:var(--ink)}.hero p{margin:8px 0 0;font-size:18px;color:var(--muted)}
.box{background:#fff;border:4px solid var(--ink);border-radius:20px;padding:14px 16px;margin:14px 0;box-shadow:0 5px 0 var(--ink)}
.box.big{background:#ffe2c7}.box h2{margin:0 0 6px;font-size:22px}.box p{margin:4px 0;font-size:17px;line-height:1.35}
.note{color:var(--muted);font-size:15px}.note.top{margin:4px 0 10px}.ok{color:#1d8a46;font-weight:700}
.btn{display:block;width:100%;min-height:50px;margin-top:10px;font:inherit;font-size:19px;font-weight:700;border:3px solid var(--ink);border-radius:14px;background:var(--blue);color:#fff;box-shadow:0 4px 0 var(--ink)}
.btn.ghost{background:#fff;color:var(--ink)}.btn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}
.row{display:flex;gap:10px}.row .btn{flex:1}
.bar{height:16px;border:3px solid var(--ink);border-radius:999px;background:#fff;overflow:hidden;margin:6px 0}.bar i{display:block;height:100%;background:var(--orange)}
.sets{display:grid;gap:6px;margin:8px 0}.srow{display:flex;align-items:center;gap:8px;font-size:17px}.srow b{margin-left:auto}
.dot{display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid var(--ink);flex:none}
.set h2{display:flex;align-items:center;gap:8px;font-size:22px;margin:18px 0 2px}.set h2 small{color:var(--muted);font-weight:500}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:8px}
.tile{font:inherit;background:none;border:0;padding:0;text-align:center;color:var(--ink)}
.tile .tn{font-size:13px;line-height:1.2;margin-top:4px}.tile .tt{font-size:12px;color:var(--blue);font-weight:700}
.sil{aspect-ratio:5/7;border:3px dashed var(--rc);border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff}
.sil span{font-size:34px;font-weight:700;color:#d8cbbf}.tile.can .sil{border-style:solid;background:#eef3ff}
.nw{font-style:normal;font-size:11px;font-weight:700;color:#fff;background:#e8382a;border-radius:6px;padding:1px 5px}
/* the card: sized in em so one design scales from binder tile to full view */
.card{font-size:16px;width:20em;max-width:100%;aspect-ratio:5/7;border-radius:1.4em;padding:.45em;background:var(--rc);position:relative;overflow:hidden;margin:0 auto}
.card.sm{font-size:5.4px;width:100%;border-radius:1.6em}
.cin{width:100%;height:100%;border-radius:1em;background:#fff;border:.25em solid var(--ink);display:flex;flex-direction:column;overflow:hidden}
.ctop{display:flex;justify-content:space-between;align-items:center;padding:.6em .8em 0}
.cset{font-size:.8em;font-weight:700;padding:.15em .6em;border-radius:999px;background:#ffe2c7;border:.15em solid var(--ink)}.cno{font-size:.85em;font-weight:700}
.cpanel{margin:.55em .7em 0;border-radius:1em;border:.25em solid var(--ink);aspect-ratio:300/240;overflow:hidden}.cpanel .art{width:100%;height:100%;display:block}
.art .wht *{fill:#fff!important;stroke:#fff!important;stroke-width:22px!important}
.cname{text-align:center;font-size:1.45em;font-weight:700;line-height:1.05;padding:.4em .5em 0}
.crar{display:flex;justify-content:center;margin-top:.35em}.crar span{font-size:.8em;font-weight:700;padding:.15em .8em;border-radius:999px;background:var(--rc);color:#fff;border:.15em solid var(--ink)}
.cfact{text-align:center;font-size:.95em;line-height:1.25;padding:.4em .9em .6em;margin-top:auto}
.card.sm .cfact,.card.sm .ctop{display:none}.card.sm .cpanel{margin-top:.8em}.card.sm .cname{font-size:2.3em}.card.sm .crar span{font-size:1.6em}
.foil::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.55) 45%,transparent 60%);background-size:250% 100%;animation:foil 3.2s linear infinite;pointer-events:none;mix-blend-mode:overlay}
@keyframes foil{from{background-position:120% 0}to{background-position:-120% 0}}
@media (prefers-reduced-motion:reduce){.foil::after{animation:none}}
#modal{position:fixed;inset:0;background:rgba(36,26,20,.6);display:flex;align-items:center;justify-content:center;padding:16px;z-index:20}
.mbox{background:#fff;border:4px solid var(--ink);border-radius:22px;padding:16px;width:min(100%,420px);max-height:92vh;overflow-y:auto;text-align:center}.mbox h2{margin:2px 0 4px;font-size:24px}
.bigc{max-width:300px;margin:0 auto}
.pack{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0}
.pslot{position:relative;aspect-ratio:5/7;border-radius:10px}.pslot.up .nw{position:absolute;top:-6px;right:-6px}
.pslot.down{font:inherit;border:3px solid var(--ink);background:var(--orange);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 0 var(--ink)}
.pslot.down span{font-size:28px;font-weight:700;color:#fff;text-shadow:0 2px 0 var(--ink)}
.pslot.up{animation:flip .35s ease-out}@keyframes flip{from{transform:rotateY(90deg)}to{transform:none}}
.claimr{font-size:22px;font-weight:700;color:var(--blue)}
.ccode{font-size:44px;font-weight:700;letter-spacing:8px;margin:10px 0;font-family:ui-monospace,Menlo,monospace}
.uid{font-family:ui-monospace,Menlo,monospace;font-size:14px;word-break:break-all;background:#fff;border:2px solid var(--ink);border-radius:10px;padding:8px}
.bad{color:#c62a1d;font-weight:700}.warn{background:#fff1d6;border:3px solid #e09200;border-radius:14px;padding:8px 12px;margin:10px 0;text-align:left}.warn p{margin:4px 0}
.facts{text-align:left;font-size:17px;line-height:1.5;padding-left:20px;margin:8px 0}.btn.small{min-height:40px;font-size:16px;max-width:200px;margin:14px auto 0}
.pin{display:flex;flex-direction:column;gap:6px;text-align:left;font-weight:700;margin:12px 0}.pin input{font:inherit;font-size:24px;padding:10px;border:3px solid var(--ink);border-radius:12px;letter-spacing:6px}
#toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);width:min(92%,420px);background:var(--ink);color:#fff;border-radius:16px;padding:12px 16px;z-index:30;display:flex;flex-direction:column;gap:2px}
#toast[hidden],#modal[hidden]{display:none}
body.counter{padding-bottom:0}.qrwrap{text-align:center;padding:10px 0}.qrwrap h1{font-size:38px;line-height:1.05;margin:6px 0 14px}.qr{display:inline-block;width:min(80vw,340px);padding:16px;background:#fff;border:4px solid var(--ink);border-radius:20px}.qrwrap p{font-size:20px;font-weight:700;margin:12px 0 0}
`;
function page(cfg){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#ff7a1a"><title>UrgerBae Card Club</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap">
<style>${css}</style></head><body>
<header><b>UrgerBae Card Club</b></header><main id="main"></main><nav id="nav" aria-label="Sections"></nav>
<div id="modal" hidden role="dialog" aria-modal="true"></div><div id="toast" hidden role="status"></div>
<script>(function(){
const CFG=${JSON.stringify(cfg)};
${fs.readFileSync(path.join(__dirname,'node_modules','qrcode-generator','qrcode.js'),'utf8')}
${src('cards.js')}
${src('art.js')}
${src('app.js')}
${cfg.hooks?'window.__club={get ST(){return ST},openPack,trade,dupes,today,render,CARDS,MILESTONES,cardHtml,CFG};':''}
})();</script></body></html>`}
const base={};
fs.writeFileSync(path.join(__dirname,'preview.html'),page({...base,firebase:null,demo:true}));
fs.writeFileSync(path.join(__dirname,'test.html'),page({...base,firebase:null,demo:true,hooks:true}));
console.log('preview.html',fs.statSync(path.join(__dirname,'preview.html')).size,'bytes');
if(process.argv[2]==='web'){const fb=JSON.parse(fs.readFileSync(path.join(__dirname,'firebase.json'),'utf8'));
  const out=path.join(__dirname,'..','index.html');
  fs.writeFileSync(out,page({...base,firebase:fb,demo:false}));console.log('website build',out)}
