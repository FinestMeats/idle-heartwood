/* Pulls named top-level declarations (and everything they depend on) out of the idle game's main script. */
const fs=require('fs'),acorn=require('acorn'),walk=require('acorn-walk');
const html=fs.readFileSync('/home/claude/heartwood.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);const src=scripts.sort((a,b)=>b.length-a.length)[0];
const ast=acorn.parse(src,{ecmaVersion:2022,sourceType:'script'});
/* the whole game sits inside one (function(){ ... })() wrapper: use its body */
let stmts=ast.body;{const e=stmts[0]&&stmts[0].expression;const f=e&&(e.callee||(e.argument&&e.argument.callee));if(stmts.length===1&&f&&f.body)stmts=f.body.body}
const decl=new Map();/* name -> statement */
for(const st of stmts){if(st.type==='FunctionDeclaration')decl.set(st.id.name,st);
  else if(st.type==='VariableDeclaration')for(const d of st.declarations){if(d.id.type==='Identifier')decl.set(d.id.name,st);else walk.full(d.id,n=>{if(n.type==='Identifier')decl.set(n.name,st)})}
  else if(st.type==='ClassDeclaration')decl.set(st.id.name,st)}
function refs(node){const out=new Set();walk.full(node,n=>{if(n.type==='Identifier')out.add(n.name)});return out}
function closure(roots,stop){const need=new Set(),q=[...roots];while(q.length){const nm=q.pop();if(need.has(nm)||stop.has(nm)||!decl.has(nm))continue;need.add(nm);for(const r of refs(decl.get(nm)))q.push(r)}return need}
module.exports={src,stmts,decl,refs,closure,
  emit(names,extraStmtFilter){const sts=new Set([...names].map(n=>decl.get(n)));
    /* also keep top-level non-declaration statements that only fill in kept data (e.g. CARDS.forEach / for loops building tables) */
    for(const st of stmts)if(!sts.has(st)&&extraStmtFilter&&extraStmtFilter(st,src.slice(st.start,st.end)))sts.add(st);
    return stmts.filter(s=>sts.has(s)).map(s=>src.slice(s.start,s.end)).join('\n')}};
if(require.main===module){const roots=process.argv.slice(2);const stop=new Set(['S','tab','buildList','TG','TS']);const c=closure(roots,stop);
  console.log([...c].map(n=>n+':'+(decl.get(n).end-decl.get(n).start)).join(' '));console.log('total chars',[...new Set([...c].map(n=>decl.get(n)))].reduce((a,s)=>a+s.end-s.start,0))}
