"""Bundles tcg/cards.js + tcg/engine.js into heartwood.html between /*TCG-START*/ and /*TCG-END*/.
In the game the Classic CARDSRC is already in scope, so the node-only require/export lines are dropped."""
import re,pathlib
here=pathlib.Path(__file__).parent
cards=(here/'cards.js').read_text()
eng=(here/'engine.js').read_text()
cards=cards.replace("const {CARDSRC,LEADERS}=require('./src_classic.js');\n","")
cards=re.sub(r"\nmodule\.exports=\{[^\n]*\};\n","\n",cards)
eng=eng.replace("const {CARDS,KEEPERS}=require('./cards.js');\n","")
assert 'require(' not in cards and 'require(' not in eng
bundle="/*TCG-START*/\n/* Heartwood TCG (preview): rules engine + computer opponent, bundled from tcg/cards.js and tcg/engine.js */\nconst TCG=(()=>{\n"+cards+"\n"+eng+"\nreturn Object.assign(API,{CARDS,UNITS,KEEPERS,starter});})();\n/*TCG-END*/"
p=here.parent/'heartwood.html'
s=p.read_text()
if '/*TCG-START*/' in s:
    a=s.index('/*TCG-START*/');b=s.index('/*TCG-END*/')+len('/*TCG-END*/')
    s=s[:a]+bundle+s[b:]
else:
    k=s.index('/*HWE-END*/')+len('/*HWE-END*/')
    s=s[:k]+'\n'+bundle+s[k:]
ui="/*TCGUI-START*/\n"+(here/'tcg_ui.js').read_text()+"\n/*TCGUI-END*/"
if '/*TCGUI-START*/' in s:
    a=s.index('/*TCGUI-START*/');b=s.index('/*TCGUI-END*/')+len('/*TCGUI-END*/')
    s=s[:a]+ui+s[b:]
else:
    k=s.index('/* ---------- tutorial duel:')
    s=s[:k]+ui+'\n'+s[k:]
p.write_text(s)
print('bundled',len(bundle),'+ ui',len(ui),'bytes')
