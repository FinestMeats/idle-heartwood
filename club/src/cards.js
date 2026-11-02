/* The Founders set: 32 cards. r = rarity 0 Common … 6 Secret. Edit names and facts here. */
const RAR=[{n:'Common',c:'#8fa3b8'},{n:'Uncommon',c:'#3fbf6a'},{n:'Rare',c:'#2f8cff'},{n:'Epic',c:'#7d3cf0'},{n:'Legendary',c:'#ffb300'},{n:'Mythic',c:'#ff4d6d'},{n:'Secret',c:'#19c9a8'}];
const SETS=[
 {id:'menu',n:'The Menu',col:'#2f6bff',reward:'Free Choc-Chip Cookie'},
 {id:'crew',n:'The Crew',col:'#ff7a1a',reward:'Free drink'},
 {id:'block',n:"The Butcher's Block",col:'#e8473c',reward:'A free Finest Meats item, up to $20'},
 {id:'icons',n:'Icons',col:'#241a14',reward:'UrgerBae T-shirt'},
 {id:'secret',n:'Secret',col:'#c79200',reward:null}];
const CARDS=[
 ['m_og','OG Smash','menu',0,'4" bun, 85 g patty, fully smashed'],
 ['m_xl','XL Smash','menu',0,'5" bun, 120 g patty, half smashed'],
 ['m_bbqjr','BaeBecue Jr','menu',0,'The OG with BaeBecue Sauce'],
 ['m_cookie','Choc-Chip Cookie','menu',0,'House recipe, chunky'],
 ['m_bbqbig','Big BaeBecue','menu',1,'The XL with BaeBecue Sauce'],
 ['m_double','The Double','menu',1,'Two patties'],
 ['m_can','Ice-Cold Can','menu',1,'Drinks from the fridge'],
 ['m_triple','The Triple','menu',2,'For the brave'],
 ['m_sauce','BaeBecue Sauce','menu',2,'The house sauce'],
 ['m_wagyu','LA Style Wagyu Smash','menu',3,'The burger that started it all'],
 ['c_press','The Smash Press','crew',0,'The tool behind the crust'],
 ['c_flattop','The Flat-top','crew',0,'Where the smash happens'],
 ['c_toaster','Bun Toaster','crew',0,'A soft bun, toasted'],
 ['c_order','Order Taker','crew',1,'Front counter'],
 ['c_cook','Grill Cook','crew',1,'Runs the flat-top'],
 ['c_truck','The Food Truck','crew',2,'Fixed in the backyard, out of sight'],
 ['c_boss','The Boss','crew',3,'You, the face of UrgerBae'],
 ['b_brisket','Brisket','block',0,'Half of the patty blend'],
 ['b_chuck','Chuck','block',0,'The other half'],
 ['b_leg','Lamb Leg','block',0,'Better than backstrap for souvlaki'],
 ['b_neck','Lamb Neck','block',0,'Slow-cook gold'],
 ['b_snags','Snags','block',0,'A butcher shop staple'],
 ['b_mincer','The Mincer','block',1,'Every patty starts here'],
 ['b_scale','The Scale','block',1,'Every cut weighed and priced'],
 ['b_saw','The Bandsaw','block',1,'Bone-in cuts'],
 ['b_blend','The 73/27 Blend','block',2,'Wagyu brisket and Angus chuck'],
 ['b_counter','The Display Counter','block',2,"Sydney's Finest Meats"],
 ['b_shop','Carss Park','block',3,'Where it all happens'],
 ['i_butcher','The Butcher','icons',4,'Your dad: 45+ years on the block'],
 ['i_wagyu','Wagyu Brisket','icons',4,'Where the blend begins'],
 ['i_mascot','The UrgerBae','icons',5,'The face on the brand'],
 ['s_golden','Golden Smash','secret',6,'Bragging rights only']].map(([id,n,set,r,fact],i)=>({id,n,set,r,fact,no:i+1}));
const CARD=Object.fromEntries(CARDS.map(c=>[c.id,c]));
/* pack rules, tested over 2,000 simulated players: 6 cards, the last one Rare or better,
   a Legendary within 10 packs, the Mythic within 25; 4 duplicates of a rarity (up to Epic) trade for a missing card of it */
const PACK={size:6,odds:[.58,.26,.11,.04,.008,.0015,.0005],pityL:10,pityM:25,trade:4};
/* verified counter visits a real collector needs before staff hand over each reward: about the luckiest 1 in 100
   players (simulated with the pack odds, pity and trade-ins above). Change the odds -> re-run the simulation. */
const MIN_VISITS={menu:4,crew:3,block:5,icons:12,all:15};
/* milestones: finish a set; "all" = every card except the Secret */
const MILESTONES=[...SETS.filter(s=>s.reward).map(s=>({id:s.id,n:'Finish '+s.n,reward:s.reward,cards:CARDS.filter(c=>c.set===s.id).map(c=>c.id),minVisits:MIN_VISITS[s.id]||1})),
  {id:'all',n:'Finish all four sets',reward:'Free Double XL, plus a shout-out in a video',cards:CARDS.filter(c=>c.set!=='secret').map(c=>c.id),minVisits:MIN_VISITS.all}];
if(typeof module!=='undefined')module.exports={RAR,SETS,CARDS,CARD,PACK,MILESTONES};
