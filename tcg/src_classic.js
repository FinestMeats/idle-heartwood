const CARDSRC={
 L:[['Greenhand Logger',0,2,'',0],['Bucker',0,3,'',0],['Tree Faller',0,4,'',0],['Log Roller',0,5,'',0],['Bark Peeler',1,2,'',0],['Hand Sawyer',1,3,'',0],['Crosscut Sawyers',1,4,'bond',0],['Camp Cook',2,1,'morale',0],['Ox Team',2,6,'',0],['Log Wagon',2,5,'',0],['Choker Setter',0,3,'bond',0],['Axe Thrower',1,5,'',0],
    ['Climbing Topper',1,6,'',1],['Rigging Slinger',0,5,'agile',1],['Camp Medic',2,5,'medic',1],['Steam Donkey',2,8,'',1],['Foreman Bray',0,6,'morale',1],['Spar Tree Rigger',2,6,'bond',1],['Rival Scout',0,4,'spy',1],['Riverman',1,6,'agile',1],
    ['High Climber',1,8,'',2],['Bullcook Mags',2,0,'horn',2],['Saw Filer',1,5,'morale',2],['Log Driver',0,5,'muster:drive',2],['Steam Skidder',2,10,'',2],['Peavey Brothers',0,6,'bond',2],
    ['Champion Faller',0,10,'',3],['Iron Topper',1,10,'',3],['Guild Master',2,8,'medic',3],
    ['Old Bjorn',0,15,'hero',4],['The Twins',1,10,'hero',4],['Golden Gus',2,12,'hero',5],['Spectral Woodcutter',0,16,'hero',6]],
 W:[['Sapling Guard',0,2,'',0],['Rootling',0,3,'',0],['Thornshield',0,4,'',0],['Barkskin',0,5,'',0],['Briar Archer',1,3,'',0],['Sap Slinger',1,4,'',0],['Knot Watcher',1,5,'',0],['Stonewood',2,6,'',0],['Bough Catapult',2,5,'',0],['Mossback',2,4,'',0],['Burl Sentinel',0,6,'',0],['Acorn Sling',1,3,'bond',0],
    ['Root Spy',0,5,'spy',1],['Grove Healer',1,5,'medic',1],['Ironbark',0,7,'',1],['Thorn Volley',1,6,'',1],['Pollen Spy',1,4,'spy',1],['Antler Ram',2,8,'',1],['Rootwalker',0,6,'agile',1],['Ringkeeper',2,7,'',1],
    ['Gnarlbark',0,8,'',2],['Sapwood',1,9,'',2],['Whispering Willow',1,7,'spy',2],['Heartroot Medic',2,6,'medic',2],['Thornwall',0,9,'',2],['Storm Oak',2,10,'',2],
    ['Grimwood',0,10,'scorch0',3],['Ashen Warden',1,11,'',3],['Pale Elder',2,10,'medic',3],
    ['Elder Moss',0,12,'hero',4],['Saplimb',2,14,'hero',4],['The Old Grove',1,15,'hero',5],['The First Warden',2,16,'hero',6]],
 S:[['Wisp',1,3,'muster:wisp',0],['Firefly',1,4,'muster:fly',0],['Fox Kit',0,4,'agile',0],['Hare Spirit',0,4,'agile',0],['Dew Sprite',1,4,'',0],['Moss Imp',0,4,'bond',0],['Fern Dancer',1,5,'agile',0],['Glimmer',1,5,'',0],['Stag Calf',0,5,'',0],['Mist Wraith',2,5,'',0],['Rain Caller',2,5,'',0],['Owl Shade',1,5,'agile',0],
    ['White Hart',0,6,'agile',1],['Mosslight Healer',1,5,'medic',1],['Thorn Sprite',0,4,'muster:thorn',1],['Breeze',1,6,'agile',1],['Echo',0,5,'spy',1],['Bramble Fae',2,7,'',1],['Silver Fox',0,6,'morale',1],['Pondmother',2,6,'medic',1],
    ['Stag of Dawn',0,8,'agile',2],['Starlit Wisp',1,8,'',2],['Grove Song',2,0,'horn',2],['Twin Hares',0,6,'bond',2],['Ghost Lantern',1,7,'scorch1',2],['Moon Stag',0,9,'',2],
    ['Great White Stag',0,10,'agile',3],['Aurora',1,10,'',3],['Spirit of Rain',2,9,'medic',3],
    ['The Wandering Spirit',0,12,'hero',4],['Lantern Mother',1,10,'hero',4],['Heart of the Forest',1,15,'hero',5],['Aurora Stag',0,16,'hero',6]],
 B:[['Squirrel',0,1,'muster:squirrel',0],['Badger',0,3,'',0],['Boar',0,4,'',0],['Crow',1,2,'muster:crow',0],['Owl',1,4,'',0],['Hawk',1,5,'',0],['Wolf',0,3,'muster:wolf',0],['Beaver',2,3,'bond',0],['Elk',2,6,'',0],['Bear Cub',0,3,'bond',0],['Lynx',0,5,'',0],['Raven',1,3,'',0],
    ['Packleader',0,6,'muster:wolf',1],['Brown Bear',0,7,'',1],['Great Horned Owl',1,6,'',1],['Moose',2,8,'',1],['Boar Sounder',0,5,'bond',1],['Old Badger',2,4,'morale',1],['Golden Eagle',1,6,'agile',1],['Stormcrow',1,5,'muster:crow',1],
    ['Cave Bear',0,9,'',2],['Dire Wolf',0,8,'muster:wolf',2],['Thunder Moose',2,10,'',2],['Night Owl',1,7,'scorch1',2],['Hive Queen',2,0,'horn',2],['Bramble Boar',0,7,'bond',2],
    ['Great Bear',0,11,'',3],['Elder Elk',2,11,'',3],['Raven King',1,10,'',3],
    ['Ursa the Old',0,14,'hero',4],['The Grey Mother',1,12,'hero',4],['Thunderhoof',2,15,'hero',5],['Golden Squirrel',0,15,'hero',6]],
 N:[['Wandering Tinker',0,5,'',1],['Travelling Bard',1,4,'morale',1],['Hermit',2,6,'',1],['Lost Lumberjack',0,3,'muster:lost',0],['Pedlar',1,3,'',0],
    ['Ferryman',0,6,'spy',2],['Herbalist',1,5,'medic',2],['Hedge Witch',1,8,'',3],['Mountain Giant',2,12,'',3],['Edda Thorne',0,12,'hero',4],['Grandmother Thorne',1,13,'hero',5],['The Heartwood',2,18,'hero',6]]};

const LEADERS={
 L:[{id:'L_a',n:'Foreman Hale',ab:'horn1',d:'Camp Bell on your Saw row'},{id:'L_b',n:'Guild Mistress Ada',ab:'draw',d:'Draw a card'},{id:'L_c',n:'Tally Clerk Wen',ab:'clear',d:'Clear all weather'}],
 W:[{id:'W_a',n:'Elder of Roots',ab:'scorch2',d:'Burn the strongest enemy Beast-row unit if that row holds 3+ units'},{id:'W_b',n:'Seer of Rings',ab:'peek',d:'See 2 random cards in the enemy hand'},{id:'W_c',n:'Grove Judge',ab:'weather',d:'Play a weather card from your deck'}],
 S:[{id:'S_a',n:'Moon Doe',ab:'draw',d:'Draw a card'},{id:'S_b',n:'Lantern Keeper',ab:'horn0',d:'Camp Bell on your Axe row'},{id:'S_c',n:'Mist Mother',ab:'weather',d:'Play a weather card from your deck'}],
 B:[{id:'B_a',n:'Den Mother',ab:'medic',d:'Return a unit from your discard pile to your hand'},{id:'B_b',n:'The Alpha',ab:'horn2',d:'Camp Bell on your Beast row'},{id:'B_c',n:'Old Raven',ab:'scorch1',d:'Burn the strongest enemy Saw-row unit if that row holds 3+ units'}]};

module.exports={CARDSRC,LEADERS};
