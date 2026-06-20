export const CATEGORIES = {
  SWALLOW: "Swallow",
  GRAINS:  "Rice & Grains",
  PROTEIN: "Protein",
  SIDE:    "Side",
  SOUP:    "Soup",
};

export const STANDARD_MENU = [
  { id:"eba",         name:"Eba",              category:CATEGORIES.SWALLOW,  price:200, satiety:7, maxPortions:4, note:"Auto-includes free soup" },
  { id:"fufu",        name:"Fufu",             category:CATEGORIES.SWALLOW,  price:200, satiety:8, maxPortions:4, note:"Auto-includes free soup" },
  { id:"amala",       name:"Amala",            category:CATEGORIES.SWALLOW,  price:300, satiety:8, maxPortions:4, note:"Auto-includes free soup" },
  { id:"semo",        name:"Semo",             category:CATEGORIES.SWALLOW,  price:300, satiety:7, maxPortions:4, note:"Auto-includes free soup" },
  { id:"pounded_yam", name:"Pounded Yam",      category:CATEGORIES.SWALLOW,  price:300, satiety:9, maxPortions:4, note:"Most filling swallow" },
  { id:"white_rice",  name:"White Rice",       category:CATEGORIES.GRAINS,   price:300, satiety:6, maxPortions:3 },
  { id:"jollof_rice", name:"Jollof/Fried Rice",category:CATEGORIES.GRAINS,   price:350, satiety:7, maxPortions:3 },
  { id:"beans",       name:"Beans",            category:CATEGORIES.GRAINS,   price:300, satiety:8, maxPortions:2, dualRole:true, note:"Dual role: carb + protein" },
  { id:"spaghetti",        name:"Spaghetti",          category:CATEGORIES.GRAINS,   price:300, satiety:6, maxPortions:3 },
  { id:"jollof_spaghetti", name:"Jollof Spaghetti",   category:CATEGORIES.GRAINS,   price:350, satiety:7, maxPortions:3 },
  { id:"beef",        name:"Beef",             category:CATEGORIES.PROTEIN,  price:200, satiety:6, maxPortions:2 },
  { id:"small_fish",  name:"Small Fish",       category:CATEGORIES.PROTEIN,  price:250, satiety:5, maxPortions:2 },
  { id:"big_fish",    name:"Big Fish",         category:CATEGORIES.PROTEIN,  price:400, satiety:8, maxPortions:1 },
  { id:"egg",         name:"Egg",              category:CATEGORIES.PROTEIN,  price:250, satiety:5, maxPortions:2 },
  { id:"sausage",     name:"Sausage",          category:CATEGORIES.PROTEIN,  price:250, satiety:4, maxPortions:2 },
  { id:"ponmo",       name:"Ponmo",            category:CATEGORIES.PROTEIN,  price:200, satiety:3, maxPortions:2 },
  { id:"moimoi",      name:"Moimoi",           category:CATEGORIES.PROTEIN,  price:200, satiety:5, maxPortions:2 },
  { id:"plantain",    name:"Fried Plantain",   category:CATEGORIES.SIDE,     price:100, satiety:4, maxPortions:3, note:"Per 5 pieces" },
  { id:"egusi_soup",  name:"Egusi Soup",       category:CATEGORIES.SOUP,     price:0,   satiety:3, maxPortions:1, isFree:true, note:"Auto-added with swallow" },
  { id:"efo_soup",    name:"Efo Riro",          category:CATEGORIES.SOUP,     price:0,   satiety:3, maxPortions:1, isFree:true, note:"Auto-added with swallow" },
  { id:"ewedu_soup",  name:"Ewedu Soup",        category:CATEGORIES.SOUP,     price:0,   satiety:2, maxPortions:1, isFree:true, note:"Auto-added with swallow" },
  { id:"okro_soup",   name:"Okro Soup",         category:CATEGORIES.SOUP,     price:0,   satiety:2, maxPortions:1, isFree:true, note:"Auto-added with swallow" },
];

export const CAFETERIAS = [
  {
    id:1, name:"BBSF", location:"Main Campus", code:"Caf A",
    additions:[
      { id:"chicken",       name:"Chicken",         category:CATEGORIES.PROTEIN, price:1500, satiety:9,  maxPortions:1, note:"Specialty" },
      { id:"chicken_large", name:"Chicken (Large)", category:CATEGORIES.PROTEIN, price:2000, satiety:11, maxPortions:1, note:"Specialty" },
    ],
    overrides:{},
  },
  {
    id:2, name:"Jubilee", location:"Chapel Area", code:"Caf B",
    additions:[
      { id:"rice_beans", name:"Rice & Beans", category:CATEGORIES.GRAINS,  price:350,  satiety:8, maxPortions:2, dualRole:true, note:"Specialty combo" },
      { id:"chicken",    name:"Chicken",      category:CATEGORIES.PROTEIN, price:1500, satiety:9, maxPortions:1, note:"Specialty" },
    ],
    overrides:{ sausage:{ price:400 }, pounded_yam:{ price:250 } },
  },
  { id:3, name:"Blessed",   location:"Hostel Block", code:"Caf C", additions:[], overrides:{} },
  { id:4, name:"Y2k",       location:"Commons",      code:"Caf D", additions:[], overrides:{ sausage:{ price:300 } } },
  {
    id:5, name:"Divine", location:"Main Campus", code:"Caf E",
    additions:[
      { id:"big_beef",      name:"Big Beef",         category:CATEGORIES.PROTEIN, price:500,  satiety:9,  maxPortions:1, note:"Specialty" },
      { id:"chicken",       name:"Chicken",          category:CATEGORIES.PROTEIN, price:1500, satiety:9,  maxPortions:1, note:"Specialty" },
      { id:"chicken_large", name:"Chicken (Large)",  category:CATEGORIES.PROTEIN, price:2000, satiety:11, maxPortions:1, note:"Specialty" },
    ],
    overrides:{},
  },
  {
    id:6, name:"Kemi Bee", location:"Main Campus", code:"Caf F",
    additions:[
      { id:"big_chicken", name:"Big Chicken", category:CATEGORIES.PROTEIN, price:2000, satiety:11, maxPortions:1, note:"Specialty" },
      { id:"gbegiri",     name:"Gbegiri",     category:CATEGORIES.SOUP,   price:0,    satiety:2,  maxPortions:1, isFree:true, note:"Free extra soup" },
    ],
    overrides:{ small_fish:{ price:300 } },
  },
  { id:7, name:"Forza",     location:"Main Campus", code:"Caf G", additions:[], overrides:{} },
  { id:8, name:"Sumptuous", location:"Main Campus", code:"Caf H", additions:[], overrides:{} },
];

export function getMenuForCafeteria(cafeId) {
  const cafe = CAFETERIAS.find((c) => c.id === cafeId) || CAFETERIAS[0];
  const base = STANDARD_MENU.map((item) => {
    const ov = cafe.overrides[item.id];
    return ov ? { ...item, ...ov } : { ...item };
  });
  return [...base, ...cafe.additions.map((a) => ({ ...a }))];
}

export const APPETITE = {
  Light:  { label:"Light",  staplePortions:1 },
  Normal: { label:"Normal", staplePortions:2 },
  Large:  { label:"Large",  staplePortions:3 },
};
