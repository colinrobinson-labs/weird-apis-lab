/* Potful data. Prices in USD.
   src "bls" = U.S. Bureau of Labor Statistics average retail price, U.S. city average, Oct 2026.
   src "est" = typical store-brand shelf price at U.S. discount grocers, Nov 2026 (our estimate).
   Nutrition per 100 g from USDA FoodData Central (SR Legacy / label averages), rounded.
   Fields: [en, es, unit en, unit es, price per unit, src, units per package, package en, package es,
            grams per unit, kcal/100g, protein g/100g, flags]
   flags: m meat, f fish, e egg, d dairy, g gluten, x not vegan (other), s pantry staple (you may already have it) */
window.POT_ING = {
  rice:    ["White rice","Arroz blanco","lb","lb",1.10,"bls",2,"2 lb bag","bolsa de 2 lb",454,365,7.1,""],
  pasta:   ["Pasta","Pasta","lb","lb",1.38,"bls",1,"1 lb box","caja de 1 lb",454,371,13,"g"],
  flour:   ["All-purpose flour","Harina de trigo","lb","lb",0.54,"bls",5,"5 lb bag","bolsa de 5 lb",454,364,10.3,"gs"],
  oats:    ["Rolled oats","Avena en hojuelas","lb","lb",1.65,"est",2.6,"42 oz canister","bote de 42 oz",454,379,13.2,""],
  lentils: ["Dried lentils","Lentejas secas","lb","lb",1.70,"est",1,"1 lb bag","bolsa de 1 lb",454,352,24.6,""],
  dbeans:  ["Dried beans (pinto or black)","Frijoles secos (pintos o negros)","lb","lb",1.68,"bls",1,"1 lb bag","bolsa de 1 lb",454,345,21.5,""],
  peas_d:  ["Dried split peas","Chícharos secos partidos","lb","lb",1.50,"est",1,"1 lb bag","bolsa de 1 lb",454,341,24.6,""],
  cbeans:  ["Canned beans (black, pinto or kidney)","Frijoles de lata (negros, pintos o rojos)","can","lata",0.95,"est",1,"15 oz can","lata de 15 oz",250,136,8.4,""],
  chick:   ["Canned chickpeas","Garbanzos de lata","can","lata",1.00,"est",1,"15 oz can","lata de 15 oz",255,139,7.0,""],
  ctom:    ["Canned diced tomatoes","Tomate picado de lata","can","lata",1.05,"est",1,"14.5 oz can","lata de 14.5 oz",411,18,0.9,""],
  tpaste:  ["Tomato paste","Pasta de tomate","can","lata",0.85,"est",1,"6 oz can","lata de 6 oz",170,82,4.3,""],
  tsauce:  ["Tomato sauce","Salsa de tomate","can","lata",0.90,"est",1,"15 oz can","lata de 15 oz",425,24,1.2,""],
  tuna:    ["Canned tuna","Atún de lata","can","lata",1.10,"est",1,"5 oz can","lata de 5 oz",113,90,19.5,"f"],
  coco:    ["Coconut milk","Leche de coco","can","lata",1.60,"est",1,"13.5 oz can","lata de 13.5 oz",400,197,2.0,""],
  corn:    ["Canned corn","Elote de lata","can","lata",0.85,"est",1,"15 oz can","lata de 15 oz",290,64,2.0,""],
  eggs:    ["Eggs","Huevos","egg","huevo",0.193,"bls",12,"dozen","docena",50,143,12.6,"e"],
  milk:    ["Milk","Leche","cup","taza",0.256,"bls",16,"1 gallon","1 galón",244,61,3.2,"d"],
  cheddar: ["Cheddar cheese","Queso cheddar","oz","oz",0.383,"bls",8,"8 oz block","bloque de 8 oz",28.35,403,22.9,"d"],
  yogurt:  ["Plain yogurt","Yogur natural","cup","taza",0.80,"est",4,"32 oz tub","bote de 32 oz",245,61,3.5,"d"],
  butter:  ["Butter","Mantequilla","tbsp","cda",0.14,"est",32,"1 lb","1 lb",14.2,717,0.9,"d"],
  oil:     ["Vegetable oil","Aceite vegetal","tbsp","cda",0.047,"est",96,"48 oz bottle","botella de 48 oz",13.6,884,0,"s"],
  pb:      ["Peanut butter","Crema de cacahuate","tbsp","cda",0.086,"est",28,"16 oz jar","frasco de 16 oz",16,588,25,""],
  mayo:    ["Mayonnaise","Mayonesa","tbsp","cda",0.058,"est",60,"30 oz jar","frasco de 30 oz",14,680,1,"e"],
  chleg:   ["Chicken legs or thighs, bone-in","Piernas o muslos de pollo con hueso","lb","lb",1.75,"bls",3,"3 lb family pack","paquete familiar de 3 lb",318,172,18.1,"m"],
  chbr:    ["Boneless chicken breast","Pechuga de pollo sin hueso","lb","lb",4.10,"bls",1,"1 lb","1 lb",454,120,22.5,"m"],
  beef:    ["Ground beef","Carne molida de res","lb","lb",6.76,"bls",1,"1 lb","1 lb",454,254,17.2,"m"],
  tofu:    ["Firm tofu","Tofu firme","block","bloque",2.00,"est",1,"14 oz block","bloque de 14 oz",396,94,10,""],
  bread:   ["Bread","Pan de caja","slice","rebanada",0.12,"bls",20,"20 oz loaf","pan de 20 oz",28,266,8.9,"g"],
  ftort:   ["Flour tortillas","Tortillas de harina","tortilla","tortilla",0.25,"est",10,"pack of 10","paquete de 10",45,304,8.2,"g"],
  ctort:   ["Corn tortillas","Tortillas de maíz","tortilla","tortilla",0.08,"est",30,"pack of 30","paquete de 30",26,218,5.7,""],
  ramen:   ["Instant ramen","Sopa instantánea (ramen)","pack","paquete",0.35,"est",6,"6-pack","paquete de 6",85,447,9.4,"gx"],
  potato:  ["Potatoes","Papas","lb","lb",0.99,"bls",5,"5 lb bag","bolsa de 5 lb",454,77,2.0,""],
  sweetp:  ["Sweet potatoes","Camotes","lb","lb",1.30,"est",1,"by the lb","por libra",454,86,1.6,""],
  onion:   ["Onion","Cebolla","onion","cebolla",0.30,"est",6,"3 lb bag","bolsa de 3 lb",150,40,1.1,""],
  carrot:  ["Carrots","Zanahorias","lb","lb",1.00,"est",2,"2 lb bag","bolsa de 2 lb",454,41,0.9,""],
  cabbage: ["Green cabbage","Repollo","lb","lb",0.85,"est",2.5,"1 head","1 cabeza",454,25,1.3,""],
  garlic:  ["Garlic","Ajo","clove","diente",0.06,"est",10,"1 head","1 cabeza",3,149,6.4,""],
  celery:  ["Celery","Apio","bunch","manojo",1.40,"est",1,"1 bunch","1 manojo",450,16,0.7,""],
  pepper:  ["Bell pepper","Pimiento morrón","pepper","pimiento",0.90,"est",1,"each","pieza",120,26,1.0,""],
  gonion:  ["Green onions","Cebollitas de cambray","bunch","manojo",0.80,"est",1,"1 bunch","1 manojo",100,32,1.8,""],
  cilantro:["Cilantro","Cilantro","bunch","manojo",0.70,"est",1,"1 bunch","1 manojo",50,23,2.1,""],
  lime:    ["Lime","Limón","lime","limón",0.30,"est",1,"each","pieza",44,30,0.7,""],
  banana:  ["Bananas","Plátanos","banana","plátano",0.26,"bls",1,"each","pieza",118,89,1.1,""],
  fmix:    ["Frozen mixed vegetables","Verduras mixtas congeladas","bag","bolsa",1.25,"est",1,"12 oz bag","bolsa de 12 oz",340,65,3.3,""],
  fpeas:   ["Frozen peas","Chícharos congelados","bag","bolsa",1.25,"est",1,"12 oz bag","bolsa de 12 oz",340,77,5.2,""],
  fspin:   ["Frozen spinach","Espinaca congelada","box","caja",1.25,"est",1,"10 oz box","caja de 10 oz",284,29,3.6,""],
  fbroc:   ["Frozen broccoli","Brócoli congelado","bag","bolsa",1.50,"est",1,"12 oz bag","bolsa de 12 oz",340,28,2.8,""],
  salsa:   ["Salsa","Salsa","cup","taza",1.12,"est",2,"16 oz jar","frasco de 16 oz",259,36,1.5,""],
  soy:     ["Soy sauce","Salsa de soya","tbsp","cda",0.067,"est",30,"15 oz bottle","botella de 15 oz",16,53,8,"gs"],
  vinegar: ["Vinegar","Vinagre","tbsp","cda",0.03,"est",64,"32 oz bottle","botella de 32 oz",15,18,0,"s"],
  sugar:   ["Sugar","Azúcar","tbsp","cda",0.028,"bls",144,"4 lb bag","bolsa de 4 lb",12.5,387,0,"s"],
  bpowder: ["Baking powder","Polvo para hornear","tsp","cdita",0.04,"est",40,"8 oz can","lata de 8 oz",4.6,53,0,"s"],
  bouil:   ["Bouillon cubes","Cubos de consomé","cube","cubo",0.10,"est",25,"jar of 25","frasco de 25",4,200,10,"s"],
  cumin:   ["Ground cumin","Comino molido","tsp","cdita",0.06,"est",20,"small jar","frasco chico",2.1,375,18,"s"],
  chili:   ["Chili powder","Chile en polvo","tsp","cdita",0.06,"est",20,"small jar","frasco chico",2.7,282,13,"s"],
  curry:   ["Curry powder","Curry en polvo","tsp","cdita",0.07,"est",20,"small jar","frasco chico",2,325,14,"s"],
  paprika: ["Paprika","Pimentón","tsp","cdita",0.06,"est",20,"small jar","frasco chico",2.3,282,14,"s"],
  italian: ["Italian seasoning","Hierbas italianas","tsp","cdita",0.06,"est",20,"small jar","frasco chico",1,265,9,"s"],
  garpow:  ["Garlic powder","Ajo en polvo","tsp","cdita",0.05,"est",20,"small jar","frasco chico",3.1,331,17,"s"],
  cinn:    ["Cinnamon","Canela molida","tsp","cdita",0.05,"est",20,"small jar","frasco chico",2.6,247,4,"s"]
};

/* Recipes. Quantities are for `serves` servings, in each ingredient's unit.
   eq: equipment needed. One of stove, oven, micro, none. */
window.POT_RECIPES = [
{id:"dal",icon:"pot",mins:35,eq:"stove",serves:4,kid:0,freeze:1,
 t:["Red lentil dal with rice","Dal de lentejas con arroz"],
 ing:[["lentils",0.7],["rice",0.75],["onion",1],["garlic",3],["ctom",1],["curry",2],["cumin",1],["oil",2]],
 s:[["Start the rice. Soften the chopped onion in the oil for 5 minutes, then stir in the garlic and spices for 1 minute.","Pon el arroz. Sofríe la cebolla picada en el aceite 5 minutos y agrega el ajo y las especias 1 minuto."],
    ["Add the rinsed lentils, the tomatoes and 4 cups of water. Simmer 20 to 25 minutes, stirring now and then, until soft and thick.","Agrega las lentejas enjuagadas, el tomate y 4 tazas de agua. Hierve a fuego bajo 20 a 25 minutos, moviendo de vez en cuando, hasta que espese."],
    ["Salt to taste and serve over the rice.","Sala al gusto y sirve sobre el arroz."]],
 tip:["Red lentils cook fastest. Brown or green work too: give them 10 more minutes.","Las lentejas rojas se cuecen más rápido. Las cafés o verdes también sirven: dales 10 minutos más."]},

{id:"bbrice",icon:"pan",mins:30,eq:"stove",serves:4,kid:1,freeze:0,
 t:["Black bean and rice skillet","Sartén de arroz con frijoles negros"],
 ing:[["cbeans",2],["rice",0.75],["onion",1],["pepper",1],["cumin",2],["chili",1],["salsa",1],["oil",1],["bouil",1]],
 s:[["In a wide pot, cook the chopped onion and pepper in the oil for 5 minutes.","En una olla ancha, cocina la cebolla y el pimiento picados en el aceite 5 minutos."],
    ["Stir in the rice and spices for 1 minute. Add 3 cups of water and the bouillon cube, cover and cook on low 18 minutes.","Agrega el arroz y las especias 1 minuto. Añade 3 tazas de agua y el cubo de consomé, tapa y cocina a fuego bajo 18 minutos."],
    ["Fold in the drained beans and the salsa, cover 5 more minutes, then serve.","Incorpora los frijoles escurridos y la salsa, tapa 5 minutos más y sirve."]],
 tip:["Top with a fried egg or a spoon of yogurt if you have one.","Ponle un huevo estrellado o una cucharada de yogur si tienes."]},

{id:"sheetchk",icon:"tray",mins:50,eq:"oven",serves:4,kid:1,freeze:0,
 t:["Sheet-pan chicken, potatoes and carrots","Pollo con papas y zanahorias al horno"],
 ing:[["chleg",2.5],["potato",2],["carrot",1],["onion",1],["oil",3],["garpow",1],["paprika",2]],
 s:[["Heat the oven to 425°F (220°C). Cut potatoes and carrots into chunks and the onion into wedges.","Calienta el horno a 425°F (220°C). Corta las papas y zanahorias en trozos y la cebolla en gajos."],
    ["Toss everything on a sheet pan with the oil, spices and a good pinch of salt. Chicken skin-side up on top.","Mezcla todo en una charola con el aceite, las especias y sal. El pollo encima, con la piel hacia arriba."],
    ["Roast 40 to 45 minutes, until the chicken is browned and reaches 165°F (74°C) inside.","Hornea 40 a 45 minutos, hasta que el pollo dore y llegue a 165°F (74°C) por dentro."]],
 tip:["Save the bones in the freezer for soup later.","Guarda los huesos en el congelador para hacer caldo después."]},

{id:"friedrice",icon:"pan",mins:20,eq:"stove",serves:4,kid:1,freeze:0,
 t:["Egg fried rice with vegetables","Arroz frito con huevo y verduras"],
 ing:[["rice",0.6],["eggs",6],["fmix",1],["gonion",1],["soy",3],["oil",2],["garlic",2]],
 s:[["Cook the rice ahead and let it cool. Day-old rice works best.","Cuece el arroz antes y déjalo enfriar. El arroz del día anterior queda mejor."],
    ["Scramble the eggs in half the oil, then set them aside.","Revuelve los huevos en la mitad del aceite y apártalos."],
    ["Add the rest of the oil, the garlic and the frozen vegetables. Cook 4 minutes, add the rice and soy sauce, and fry until hot.","Agrega el resto del aceite, el ajo y las verduras congeladas. Cocina 4 minutos, añade el arroz y la soya y fríe hasta que esté caliente."],
    ["Fold the eggs back in and top with sliced green onions.","Regresa el huevo y termina con cebollita picada."]],
 tip:["Any leftover meat or tofu can go in at step 3.","Puedes agregar sobras de carne o tofu en el paso 3."]},

{id:"fagioli",icon:"pot",mins:35,eq:"stove",serves:4,kid:1,freeze:1,
 t:["Pasta and bean soup (pasta e fagioli)","Sopa de pasta con frijoles"],
 ing:[["pasta",0.5],["cbeans",2],["ctom",1],["onion",1],["carrot",0.5],["celery",0.5],["garlic",3],["italian",2],["bouil",2],["oil",2]],
 s:[["Chop the onion, carrots and celery and soften them in the oil for 8 minutes. Add garlic and herbs for 1 minute.","Pica la cebolla, la zanahoria y el apio y sofríelos en el aceite 8 minutos. Agrega ajo y hierbas 1 minuto."],
    ["Add the tomatoes, the beans with their liquid, the bouillon and 6 cups of water. Bring to a boil.","Agrega el tomate, los frijoles con su caldo, el consomé y 6 tazas de agua. Deja que hierva."],
    ["Stir in the pasta and simmer until tender, about 10 minutes. Mash a few beans against the pot to thicken it.","Agrega la pasta y cocina hasta que esté suave, unos 10 minutos. Aplasta algunos frijoles para espesar."]],
 tip:["It thickens overnight. Add a splash of water when you reheat it.","Se espesa de un día para otro. Agrega un poco de agua al recalentar."]},

{id:"pbnoodle",icon:"noodle",mins:20,eq:"stove",serves:4,kid:1,freeze:0,
 t:["Peanut noodles with crunchy cabbage","Fideos con cacahuate y repollo"],
 ing:[["pasta",1],["pb",6],["soy",4],["vinegar",2],["sugar",1],["garlic",2],["cabbage",1],["carrot",0.5],["gonion",1]],
 s:[["Boil the spaghetti. Save 1 cup of the cooking water before you drain it.","Cuece el espagueti. Guarda 1 taza del agua antes de escurrir."],
    ["Whisk the peanut butter, soy sauce, vinegar, sugar and grated garlic with splashes of the hot water until smooth.","Bate la crema de cacahuate, la soya, el vinagre, el azúcar y el ajo rallado con chorritos del agua caliente hasta que quede suave."],
    ["Toss the noodles with the sauce, the shredded cabbage and carrot, and the green onions. Good warm or cold.","Mezcla los fideos con la salsa, el repollo y la zanahoria rallados y la cebollita. Se come tibio o frío."]],
 tip:["Packs well for lunch the next day.","Aguanta muy bien para el almuerzo del día siguiente."]},

{id:"mugegg",icon:"mug",mins:5,eq:"micro",serves:1,kid:1,freeze:0,
 t:["Microwave egg and spinach burrito","Burrito de huevo con espinaca en microondas"],
 ing:[["eggs",2],["cheddar",1],["salsa",0.12],["ftort",1],["fspin",0.1]],
 s:[["Beat the eggs in a mug with a pinch of salt and a small handful of frozen spinach.","Bate los huevos en una taza con sal y un puñito de espinaca congelada."],
    ["Microwave 45 seconds, stir, then 30 to 45 seconds more until just set.","Calienta 45 segundos, mueve y luego 30 a 45 segundos más, hasta que cuaje."],
    ["Spoon into the tortilla with the cheese and salsa and roll it up.","Ponlo en la tortilla con el queso y la salsa y enróllalo."]],
 tip:["Works in a dorm or a motel room with just a microwave.","Funciona en un dormitorio o un cuarto de motel con solo microondas."]},

{id:"onoats",icon:"jar",mins:5,eq:"none",serves:1,kid:1,freeze:0,
 t:["Peanut butter banana overnight oats","Avena remojada con plátano y cacahuate"],
 ing:[["oats",0.09],["milk",0.75],["pb",1],["banana",0.5],["cinn",0.25]],
 s:[["Stir the oats, milk, peanut butter and cinnamon together in a jar or bowl.","Mezcla la avena, la leche, la crema de cacahuate y la canela en un frasco o tazón."],
    ["Cover and leave it in the fridge overnight.","Tápalo y déjalo en el refri toda la noche."],
    ["In the morning, slice the banana on top. Eat cold or warm it up.","En la mañana, ponle el plátano en rodajas. Cómela fría o caliéntala."]],
 tip:["Make five jars on Sunday and breakfast is done for the week.","Prepara cinco frascos el domingo y el desayuno de la semana queda listo."]},

{id:"burritos",icon:"wrap",mins:40,eq:"stove",serves:8,kid:1,freeze:1,
 t:["Freezer bean and cheese burritos","Burritos de frijol con queso para congelar"],
 ing:[["cbeans",3],["cheddar",6],["ftort",8],["rice",0.4],["onion",1],["cumin",2],["chili",1],["salsa",1],["oil",1]],
 s:[["Cook the rice. Soften the chopped onion in the oil, add the spices and the drained beans, and mash roughly with a fork.","Cuece el arroz. Sofríe la cebolla picada, agrega las especias y los frijoles escurridos y machácalos con un tenedor."],
    ["Warm the tortillas so they bend. Fill each with rice, beans, salsa and cheese, fold in the sides and roll tight.","Calienta las tortillas para que se doblen. Rellena cada una con arroz, frijol, salsa y queso, dobla los lados y enrolla apretado."],
    ["Eat now, or wrap each one and freeze. Microwave from frozen 2 to 3 minutes, turning once.","Cómelos o envuelve cada uno y congélalo. Calienta congelado 2 a 3 minutos, volteándolo una vez."]],
 tip:["Eight lunches for about the price of one takeout meal.","Ocho almuerzos por lo que cuesta una comida para llevar."]},

{id:"chickcurry",icon:"pot",mins:30,eq:"stove",serves:4,kid:0,freeze:1,
 t:["Chickpea and spinach curry","Curry de garbanzo con espinaca"],
 ing:[["chick",2],["ctom",1],["coco",1],["fspin",1],["onion",1],["garlic",3],["curry",3],["rice",0.75],["oil",1]],
 s:[["Start the rice. Soften the chopped onion in the oil, then add garlic and curry powder for 1 minute.","Pon el arroz. Sofríe la cebolla picada y agrega el ajo y el curry 1 minuto."],
    ["Add the tomatoes, coconut milk and drained chickpeas. Simmer 15 minutes.","Agrega el tomate, la leche de coco y los garbanzos escurridos. Hierve a fuego bajo 15 minutos."],
    ["Stir in the frozen spinach until hot. Salt to taste and serve over rice.","Agrega la espinaca congelada hasta que se caliente. Sala al gusto y sirve sobre el arroz."]],
 tip:["No coconut milk? Use a cup of milk or yogurt, stirred in at the end.","¿Sin leche de coco? Usa una taza de leche o yogur al final."]},

{id:"potegg",icon:"pan",mins:35,eq:"stove",serves:4,kid:1,freeze:0,
 t:["Potato and egg skillet","Tortilla de papa y huevo"],
 ing:[["potato",1.5],["eggs",8],["onion",1],["oil",4]],
 s:[["Slice the potatoes and onion thin. Cook them in the oil in a covered pan on medium-low for 15 minutes, until soft.","Corta las papas y la cebolla en rodajas finas. Cocínalas tapadas en el aceite a fuego medio-bajo 15 minutos, hasta que estén suaves."],
    ["Beat the eggs with salt, pour over the potatoes and cover.","Bate los huevos con sal, viértelos sobre las papas y tapa."],
    ["Cook on low 10 to 12 minutes until the top is set. Cut into wedges.","Cocina a fuego bajo 10 a 12 minutos hasta que cuaje arriba. Corta en rebanadas."]],
 tip:["Just as good cold the next day, tucked into bread.","Igual de rica fría al día siguiente, en un pan."]},

{id:"chkcab",icon:"pan",mins:25,eq:"stove",serves:4,kid:1,freeze:0,
 t:["Chicken and cabbage stir-fry","Pollo salteado con repollo"],
 ing:[["chbr",1],["cabbage",1.25],["carrot",0.5],["soy",3],["garlic",3],["sugar",0.7],["oil",2],["rice",0.75]],
 s:[["Start the rice. Slice the chicken thin and the cabbage into ribbons.","Pon el arroz. Corta el pollo en tiras finas y el repollo en listones."],
    ["Brown the chicken in hot oil, 5 to 6 minutes, until cooked through. Move it to a plate.","Dora el pollo en aceite caliente 5 a 6 minutos, hasta que esté cocido. Pásalo a un plato."],
    ["Stir-fry the cabbage, carrot and garlic 5 minutes. Return the chicken, add the soy sauce and sugar, toss and serve over rice.","Saltea el repollo, la zanahoria y el ajo 5 minutos. Regresa el pollo, agrega la soya y el azúcar, mezcla y sirve con arroz."]],
 tip:["Cabbage is one of the cheapest vegetables per pound and keeps for weeks.","El repollo es de las verduras más baratas por libra y dura semanas."]},

{id:"tunapasta",icon:"pot",mins:25,eq:"stove",serves:4,kid:1,freeze:0,
 t:["Creamy tuna pasta with peas","Pasta cremosa con atún y chícharos"],
 ing:[["pasta",1],["tuna",2],["fpeas",1],["milk",1.5],["cheddar",3],["butter",2],["flour",0.04]],
 s:[["Boil the pasta. Add the frozen peas for the last 2 minutes, then drain.","Cuece la pasta. Agrega los chícharos los últimos 2 minutos y escurre."],
    ["In the same pot, melt the butter, stir in the flour for 1 minute, then whisk in the milk until it thickens.","En la misma olla, derrite la mantequilla, agrega la harina 1 minuto y luego bate la leche hasta que espese."],
    ["Stir in the cheese, then the pasta, peas and drained tuna. Season with salt and pepper.","Agrega el queso y luego la pasta, los chícharos y el atún escurrido. Sazona con sal y pimienta."]],
 tip:["Swap the tuna for a can of white beans to make it vegetarian.","Cambia el atún por una lata de frijoles blancos para hacerla vegetariana."]},

{id:"splitpea",icon:"pot",mins:75,eq:"stove",serves:6,kid:0,freeze:1,
 t:["Split pea and potato soup","Sopa de chícharo seco con papa"],
 ing:[["peas_d",1],["carrot",0.75],["onion",1],["celery",0.5],["potato",0.75],["garlic",3],["bouil",3],["oil",1]],
 s:[["Soften the chopped onion, carrot and celery in the oil for 8 minutes. Add the garlic.","Sofríe la cebolla, la zanahoria y el apio picados en el aceite 8 minutos. Agrega el ajo."],
    ["Add the rinsed split peas, diced potato, bouillon and 8 cups of water.","Agrega los chícharos enjuagados, la papa en cubos, el consomé y 8 tazas de agua."],
    ["Simmer, partly covered, about 1 hour, stirring now and then, until the peas fall apart.","Hierve a fuego bajo, medio tapado, como 1 hora, moviendo de vez en cuando, hasta que se deshagan."]],
 tip:["Freezes perfectly in single portions.","Se congela perfecto en porciones individuales."]},

{id:"chili",icon:"pot",mins:40,eq:"stove",serves:6,kid:1,freeze:1,
 t:["Stretch chili (a little beef, lots of beans)","Chili rendidor (poca carne, muchos frijoles)"],
 ing:[["beef",0.75],["cbeans",3],["ctom",2],["tpaste",1],["onion",1],["garlic",3],["chili",6],["cumin",2]],
 s:[["Brown the beef with the chopped onion, 8 minutes. Add garlic, chili powder and cumin for 1 minute.","Dora la carne con la cebolla picada 8 minutos. Agrega el ajo, el chile en polvo y el comino 1 minuto."],
    ["Add the tomato paste, tomatoes, the beans with their liquid and 1 cup of water.","Agrega la pasta de tomate, el tomate, los frijoles con su caldo y 1 taza de agua."],
    ["Simmer 25 minutes, stirring now and then. Salt to taste.","Hierve a fuego bajo 25 minutos, moviendo de vez en cuando. Sala al gusto."]],
 tip:["Skip the beef and add one more can of beans for a vegan pot.","Quita la carne y agrega otra lata de frijoles para hacerlo vegano."]},

{id:"sloppy",icon:"sandwich",mins:35,eq:"stove",serves:4,kid:1,freeze:1,
 t:["Lentil sloppy joes","Sloppy joes de lenteja"],
 ing:[["lentils",0.5],["tsauce",1],["tpaste",0.5],["onion",1],["pepper",1],["soy",1],["sugar",1],["chili",1],["bread",8],["oil",1]],
 s:[["Simmer the lentils in 3 cups of water for 20 minutes, until tender. Drain any extra water.","Cuece las lentejas en 3 tazas de agua 20 minutos, hasta que estén suaves. Escurre el agua que sobre."],
    ["Meanwhile, cook the chopped onion and pepper in the oil for 6 minutes.","Mientras, cocina la cebolla y el pimiento picados en el aceite 6 minutos."],
    ["Add the lentils, tomato sauce, paste, soy sauce, sugar and chili powder. Simmer 10 minutes and spoon onto bread.","Agrega las lentejas, la salsa y pasta de tomate, la soya, el azúcar y el chile. Hierve 10 minutos y sirve sobre pan."]],
 tip:["Kids rarely notice there's no meat.","Los niños casi nunca notan que no lleva carne."]},

{id:"pancakes",icon:"pan",mins:20,eq:"stove",serves:4,kid:1,freeze:1,
 t:["Banana pancakes","Hot cakes de plátano"],
 ing:[["flour",0.42],["eggs",2],["milk",1.25],["banana",2],["sugar",1],["bpowder",3],["oil",2]],
 s:[["Mash the bananas in a bowl. Whisk in the eggs, milk and 1 tablespoon of the oil.","Machaca los plátanos en un tazón. Bate los huevos, la leche y 1 cucharada del aceite."],
    ["Stir in the flour, sugar, baking powder and a pinch of salt until just mixed. Lumps are fine.","Agrega la harina, el azúcar, el polvo para hornear y una pizca de sal, solo hasta mezclar. Los grumos están bien."],
    ["Cook ¼ cup at a time in a lightly oiled pan on medium, flipping when bubbles appear.","Cocina ¼ de taza a la vez en un sartén con poco aceite a fuego medio, voltea cuando salgan burbujas."]],
 tip:["Very ripe, spotty bananas make the sweetest pancakes.","Los plátanos bien maduros, con manchas, dan los hot cakes más dulces."]},

{id:"arrozpollo",icon:"pot",mins:50,eq:"stove",serves:6,kid:1,freeze:1,
 t:["One-pot chicken and rice","Arroz con pollo en una olla"],
 ing:[["chleg",2],["rice",0.9],["onion",1],["pepper",1],["garlic",3],["tsauce",1],["bouil",2],["cumin",1],["paprika",1],["fpeas",0.5],["oil",2]],
 s:[["Season the chicken with salt, cumin and paprika. Brown it in the oil in a big pot, 4 minutes a side. Set aside.","Sazona el pollo con sal, comino y pimentón. Dóralo en el aceite en una olla grande, 4 minutos por lado. Apártalo."],
    ["Cook the chopped onion and pepper 5 minutes, add garlic and rice, and stir 2 minutes.","Cocina la cebolla y el pimiento picados 5 minutos, agrega el ajo y el arroz y mueve 2 minutos."],
    ["Add the tomato sauce, bouillon and 3½ cups of water. Nestle the chicken in, cover and cook on low 30 minutes.","Agrega la salsa de tomate, el consomé y 3½ tazas de agua. Acomoda el pollo, tapa y cocina a fuego bajo 30 minutos."],
    ["Scatter the peas on top, cover 5 minutes more, and check the chicken reads 165°F (74°C).","Pon los chícharos encima, tapa 5 minutos más y revisa que el pollo llegue a 165°F (74°C)."]],
 tip:["One pot means one pot to wash.","Una sola olla, una sola olla que lavar."]},

{id:"ramenup",icon:"noodle",mins:6,eq:"micro",serves:1,kid:1,freeze:0,
 t:["Upgraded microwave ramen","Ramen mejorado en microondas"],
 ing:[["ramen",1],["eggs",1],["fmix",0.2],["gonion",0.2]],
 s:[["Put the noodles and a handful of frozen vegetables in a big bowl. Cover with water and microwave 3 minutes.","Pon los fideos y un puño de verduras congeladas en un tazón grande. Cúbrelos con agua y calienta 3 minutos."],
    ["Crack in the egg, poke the yolk once, and microwave 45 to 60 seconds more until the white is set.","Rompe el huevo encima, pica la yema una vez y calienta 45 a 60 segundos más hasta que la clara cuaje."],
    ["Stir in half the seasoning packet (it's very salty) and the green onion.","Agrega la mitad del sobre de sazonador (es muy salado) y la cebollita."]],
 tip:["Using half the packet cuts the salt a lot and you won't miss it.","Usar medio sobre baja mucho la sal y no lo vas a extrañar."]},

{id:"potato",icon:"bowl",mins:10,eq:"micro",serves:1,kid:1,freeze:0,
 t:["Loaded microwave baked potato","Papa rellena en microondas"],
 ing:[["potato",0.6],["cbeans",0.33],["cheddar",1],["salsa",0.12],["yogurt",0.12]],
 s:[["Scrub the potato and poke it all over with a fork.","Lava la papa y pícala por todos lados con un tenedor."],
    ["Microwave 5 minutes, turn it over, then 3 to 5 minutes more until a knife slides in easily.","Calienta 5 minutos, voltéala y luego 3 a 5 minutos más hasta que un cuchillo entre fácil."],
    ["Split it open, top with warmed beans, cheese, salsa and a spoon of yogurt.","Ábrela y ponle frijoles calientes, queso, salsa y una cucharada de yogur."]],
 tip:["Plain yogurt is a cheaper sour cream.","El yogur natural sustituye a la crema y cuesta menos."]},

{id:"rollup",icon:"wrap",mins:3,eq:"none",serves:1,kid:1,freeze:0,
 t:["Peanut butter banana roll-up","Taco de plátano con cacahuate"],
 ing:[["ftort",1],["pb",2],["banana",1],["cinn",0.25]],
 s:[["Spread the peanut butter over the tortilla and dust with cinnamon.","Unta la crema de cacahuate en la tortilla y espolvorea canela."],
    ["Lay the banana at one edge and roll it up tight. Slice into rounds for small kids.","Pon el plátano en una orilla y enrolla apretado. Córtalo en rodajas para los más pequeños."]],
 tip:["No stove, no mess, about two minutes.","Sin estufa, sin desorden, como dos minutos."]},

{id:"quesadilla",icon:"wrap",mins:20,eq:"stove",serves:4,kid:1,freeze:0,
 t:["Black bean and corn quesadillas","Quesadillas de frijol negro y elote"],
 ing:[["ftort",8],["cbeans",2],["cheddar",6],["corn",1],["cumin",1],["salsa",1]],
 s:[["Mash the drained beans with the cumin and a pinch of salt. Stir in the drained corn.","Machaca los frijoles escurridos con el comino y sal. Agrega el elote escurrido."],
    ["Spread on half of each tortilla, add cheese, and fold.","Unta en la mitad de cada tortilla, ponle queso y dóblala."],
    ["Cook in a dry pan on medium, 2 to 3 minutes a side, until golden. Serve with salsa.","Cocina en un sartén sin aceite a fuego medio, 2 a 3 minutos por lado, hasta que doren. Sirve con salsa."]],
 tip:["Fast enough for a weeknight, fun enough for kids to help.","Rápidas entre semana y divertidas para que los niños ayuden."]},

{id:"minestrone",icon:"pot",mins:30,eq:"stove",serves:6,kid:1,freeze:1,
 t:["Freezer-aisle minestrone","Minestrone con verduras congeladas"],
 ing:[["fmix",2],["cbeans",1],["ctom",1],["pasta",0.25],["onion",1],["garlic",2],["italian",2],["bouil",3],["oil",2]],
 s:[["Soften the chopped onion in the oil 5 minutes, then add the garlic and herbs.","Sofríe la cebolla picada en el aceite 5 minutos y agrega el ajo y las hierbas."],
    ["Add the tomatoes, frozen vegetables, beans, bouillon and 7 cups of water. Bring to a boil.","Agrega el tomate, las verduras congeladas, los frijoles, el consomé y 7 tazas de agua. Deja que hierva."],
    ["Add the pasta and simmer 10 minutes until tender.","Agrega la pasta y cocina 10 minutos hasta que esté suave."]],
 tip:["Frozen vegetables are picked ripe and often cost less than fresh.","Las verduras congeladas se cosechan maduras y muchas veces cuestan menos que las frescas."]},

{id:"sptacos",icon:"taco",mins:35,eq:"oven",serves:4,kid:0,freeze:0,
 t:["Sweet potato and black bean tacos","Tacos de camote y frijol negro"],
 ing:[["sweetp",1.5],["cbeans",2],["ctort",12],["onion",1],["chili",2],["cumin",1],["oil",2],["cabbage",0.5],["lime",2]],
 s:[["Heat the oven to 425°F (220°C). Dice the sweet potatoes and onion, toss with oil, spices and salt, and roast 25 minutes.","Calienta el horno a 425°F (220°C). Pica el camote y la cebolla, mézclalos con aceite, especias y sal, y hornea 25 minutos."],
    ["Warm the beans. Toss the shredded cabbage with lime juice and a pinch of salt.","Calienta los frijoles. Mezcla el repollo rallado con jugo de limón y sal."],
    ["Warm the tortillas in a dry pan and fill with everything.","Calienta las tortillas en un sartén y rellénalas con todo."]],
 tip:["Double up two corn tortillas per taco so they don't tear.","Usa dos tortillas de maíz por taco para que no se rompan."]},

{id:"shakshuka",icon:"pan",mins:30,eq:"stove",serves:4,kid:0,freeze:0,
 t:["Eggs in spiced tomato sauce (shakshuka)","Huevos en salsa de tomate especiada"],
 ing:[["eggs",8],["ctom",2],["onion",1],["pepper",1],["garlic",3],["cumin",1],["paprika",2],["oil",2],["bread",8]],
 s:[["Cook the sliced onion and pepper in the oil 8 minutes. Add the garlic and spices for 1 minute.","Cocina la cebolla y el pimiento en tiras en el aceite 8 minutos. Agrega el ajo y las especias 1 minuto."],
    ["Add the tomatoes and simmer 10 minutes until thick. Salt to taste.","Agrega el tomate y cocina 10 minutos hasta que espese. Sala al gusto."],
    ["Make 8 little wells, crack in the eggs, cover and cook on low 6 to 8 minutes. Serve with bread for dipping.","Haz 8 huequitos, rompe los huevos ahí, tapa y cocina a fuego bajo 6 a 8 minutos. Sirve con pan para remojar."]],
 tip:["Breakfast, lunch or dinner. It works for all three.","Desayuno, comida o cena. Funciona para las tres."]},

{id:"tofubowl",icon:"bowl",mins:30,eq:"stove",serves:4,kid:0,freeze:0,
 t:["Crispy tofu and broccoli rice bowls","Tazones de tofu dorado con brócoli"],
 ing:[["tofu",2],["fbroc",2],["rice",0.75],["soy",4],["garlic",3],["sugar",1],["oil",3]],
 s:[["Start the rice. Press the tofu between towels for 10 minutes, then cut into cubes.","Pon el arroz. Presiona el tofu entre trapos 10 minutos y córtalo en cubos."],
    ["Fry the tofu in the oil on medium-high, turning, until golden on most sides, about 10 minutes.","Fríe el tofu en el aceite a fuego medio-alto, volteándolo, hasta que dore, unos 10 minutos."],
    ["Add the frozen broccoli and garlic and cook 5 minutes. Stir in the soy sauce and sugar until glossy. Serve over rice.","Agrega el brócoli congelado y el ajo y cocina 5 minutos. Añade la soya y el azúcar hasta que brille. Sirve sobre el arroz."]],
 tip:["Tofu is one of the cheapest proteins per gram at most stores.","El tofu es de las proteínas más baratas por gramo en casi todas las tiendas."]},

{id:"savoats",icon:"mug",mins:5,eq:"micro",serves:1,kid:0,freeze:0,
 t:["Savory microwave oats with egg","Avena salada con huevo en microondas"],
 ing:[["oats",0.09],["eggs",1],["soy",0.33],["gonion",0.2],["fspin",0.1]],
 s:[["Stir the oats with ¾ cup of water and a little frozen spinach in a big mug. Microwave 90 seconds.","Mezcla la avena con ¾ de taza de agua y un poco de espinaca congelada en una taza grande. Calienta 90 segundos."],
    ["Stir in the beaten egg and microwave 45 to 60 seconds more, stirring halfway, until set.","Agrega el huevo batido y calienta 45 a 60 segundos más, moviendo a la mitad, hasta que cuaje."],
    ["Finish with soy sauce and green onion.","Termina con soya y cebollita."]],
 tip:["Oats aren't only for sweet breakfasts. Think of them as quick rice.","La avena no es solo para desayunos dulces. Piénsala como un arroz rápido."]},

{id:"chknoodle",icon:"pot",mins:60,eq:"stove",serves:6,kid:1,freeze:1,
 t:["Chicken noodle soup","Sopa de pollo con fideos"],
 ing:[["chleg",1.5],["pasta",0.4],["carrot",0.75],["celery",0.5],["onion",1],["garlic",2],["bouil",3],["italian",1]],
 s:[["Put the chicken, the bouillon, half the onion and 10 cups of water in a big pot. Simmer 35 minutes.","Pon el pollo, el consomé, media cebolla y 10 tazas de agua en una olla grande. Hierve a fuego bajo 35 minutos."],
    ["Lift out the chicken. When it's cool enough, pull the meat off the bones and shred it.","Saca el pollo. Cuando se enfríe un poco, quita la carne de los huesos y deshébrala."],
    ["Add the sliced carrots, celery, the rest of the onion, the garlic and herbs to the broth. Cook 10 minutes, add the noodles and cook until tender. Return the chicken.","Agrega al caldo la zanahoria, el apio, el resto de la cebolla, el ajo y las hierbas. Cocina 10 minutos, añade los fideos hasta que estén suaves y regresa el pollo."]],
 tip:["Cook the noodles separately if you plan to freeze it.","Cuece los fideos aparte si lo vas a congelar."]},

{id:"pinto",icon:"bowl",mins:30,eq:"stove",serves:4,kid:1,freeze:0,
 t:["Costa Rican rice and beans (gallo pinto) with eggs","Gallo pinto con huevo"],
 ing:[["cbeans",2],["rice",0.75],["onion",1],["pepper",1],["cilantro",1],["garlic",2],["oil",2],["eggs",4]],
 s:[["Cook the rice ahead. Day-old rice is best.","Cuece el arroz antes. El del día anterior es mejor."],
    ["Soften the chopped onion and pepper in the oil, add garlic, then the beans with a few spoons of their liquid.","Sofríe la cebolla y el pimiento picados, agrega el ajo y luego los frijoles con unas cucharadas de su caldo."],
    ["Fold in the rice until it's speckled and hot. Stir in chopped cilantro and top each plate with a fried egg.","Incorpora el arroz hasta que quede pintito y caliente. Agrega cilantro picado y sirve cada plato con un huevo estrellado."]],
 tip:["Black beans are traditional, but use whatever beans you have.","Lo tradicional es frijol negro, pero usa el que tengas."]},

{id:"tunasalad",icon:"bowl",mins:10,eq:"none",serves:4,kid:0,freeze:0,
 t:["White bean and tuna salad on toast","Ensalada de atún con frijol sobre pan"],
 ing:[["cbeans",2],["tuna",2],["gonion",1],["vinegar",2],["oil",3],["bread",8]],
 s:[["Drain and rinse the beans. Drain the tuna.","Escurre y enjuaga los frijoles. Escurre el atún."],
    ["Mix with the sliced green onions, vinegar, oil, salt and pepper.","Mézclalos con la cebollita picada, el vinagre, el aceite, sal y pimienta."],
    ["Pile onto bread or toast.","Sírvelo sobre pan o pan tostado."]],
 tip:["No cooking at all, and it keeps 3 days in the fridge.","Nada de cocinar, y dura 3 días en el refri."]},

{id:"chicksmash",icon:"sandwich",mins:10,eq:"none",serves:4,kid:1,freeze:0,
 t:["Smashed chickpea sandwiches","Sándwiches de garbanzo machacado"],
 ing:[["chick",2],["mayo",4],["celery",0.3],["vinegar",1],["bread",8]],
 s:[["Drain the chickpeas and mash them with a fork, leaving some chunky.","Escurre los garbanzos y machácalos con un tenedor, dejando algunos en trozos."],
    ["Stir in the mayo, finely chopped celery, vinegar, salt and pepper.","Agrega la mayonesa, el apio bien picado, el vinagre, sal y pimienta."],
    ["Spread thick on bread.","Úntalo bien grueso en el pan."]],
 tip:["It's like a tuna sandwich without the tuna.","Es como un sándwich de atún, pero sin atún."]},

{id:"mugmac",icon:"mug",mins:6,eq:"micro",serves:1,kid:1,freeze:0,
 t:["Mug mac and cheese","Macarrones con queso en taza"],
 ing:[["pasta",0.12],["milk",0.25],["cheddar",1]],
 s:[["Put the pasta in a big mug with water to cover by 1 inch and a pinch of salt.","Pon la pasta en una taza grande con agua que la cubra por 2 cm y una pizca de sal."],
    ["Microwave in 1-minute bursts, stirring each time, 4 to 5 minutes, until tender. Add a splash of water if it gets dry.","Calienta en tandas de 1 minuto, moviendo cada vez, 4 a 5 minutos, hasta que esté suave. Agrega agua si se seca."],
    ["Stir in the milk and cheese and microwave 30 seconds more.","Agrega la leche y el queso y calienta 30 segundos más."]],
 tip:["Set the mug on a plate in case it bubbles over.","Pon la taza sobre un plato por si se desborda."]},

{id:"beanpot",icon:"pot",mins:120,eq:"stove",serves:10,kid:1,freeze:1,
 t:["The big pot of beans","La gran olla de frijoles"],
 ing:[["dbeans",2],["onion",1],["garlic",4],["bouil",2],["cumin",1]],
 s:[["Rinse the beans and pick out any stones. Soak them overnight in plenty of water if you can.","Enjuaga los frijoles y quita las piedritas. Remójalos toda la noche en mucha agua si puedes."],
    ["Drain, then cover with fresh water by 2 inches. Add the halved onion, garlic, bouillon and cumin.","Escúrrelos y cúbrelos con agua limpia, 5 cm arriba. Agrega la cebolla en mitades, el ajo, el consomé y el comino."],
    ["Simmer gently, partly covered, 1½ to 2 hours, until creamy. Salt at the end.","Hierve a fuego bajo, medio tapado, de 1½ a 2 horas, hasta que estén cremosos. Sala al final."]],
 tip:["Dried beans cost about half what canned do. One pot feeds a week of burritos, soups and rice bowls.","Los frijoles secos cuestan como la mitad que los de lata. Una olla rinde para una semana de burritos, sopas y arroz."]},

{id:"bftacos",icon:"taco",mins:25,eq:"stove",serves:4,kid:1,freeze:0,
 t:["Potato and egg breakfast tacos","Tacos de papa con huevo"],
 ing:[["potato",1],["eggs",6],["ctort",12],["salsa",0.5],["oil",2]],
 s:[["Dice the potatoes small and fry them in the oil, covered for 8 minutes, then uncovered until crisp.","Pica las papas chiquitas y fríelas en el aceite, tapadas 8 minutos y luego destapadas hasta que doren."],
    ["Pour in the beaten eggs with a pinch of salt and scramble gently.","Agrega los huevos batidos con sal y revuelve suave."],
    ["Fill warm tortillas and top with salsa.","Rellena tortillas calientes y ponles salsa."]],
 tip:["A dozen tacos for less than a drive-thru combo.","Una docena de tacos por menos que un combo de autoservicio."]}
];

/* Meal slots for the week planner */
window.POT_SLOTS = {
  breakfast:["onoats","savoats","pancakes","bftacos","mugegg","rollup"],
  lunch:["rollup","tunasalad","chicksmash","quesadilla","potato","mugmac","ramenup","burritos","pbnoodle"]
};

/* FY2027 SNAP (Oct 1 2026 - Sep 30 2027), 48 states + DC. USDA FNA COLA memo. */
window.POT_SNAP = {
  max:[306,562,808,1023,1217,1463,1616,1841], maxAdd:225,
  gross:[1729,2345,2960,3575,4191,4806,5421,6037], grossAdd:616
};
/* 2026 HHS poverty guidelines, annual, 48 states + DC (AK and HI higher) */
window.POT_FPL = {base:15960, add:5680, ak:[19950,7100], hi:[18360,6530]};

/* States */
window.POT_STATES = {
AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};
window.POT_SNAPNAME = {CA:"CalFresh",WI:"FoodShare",WA:"Basic Food",MI:"Food Assistance Program",AZ:"Nutrition Assistance",ME:"Food Supplement",MD:"Food Supplement Program",DE:"Food Supplement Program"};
/* Statewide free school meals for all students, 2025-26 */
window.POT_UNIVERSAL = ["CA","CO","ME","MA","MI","MN","NM","NY","VT"];
/* Summer EBT not offered in summer 2026 (USDA participating map) */
window.POT_NOSEBT = ["AK","FL","GA","ID","IN","MS","SC","SD","TN","TX","UT"];
/* SNAP Restaurant Meals Program (USDA, Aug 2026). IL: Cook and Franklin counties only */
window.POT_RMP = ["AZ","CA","IL","MD","MA","MI","NY","RI","VA"];
/* Known state produce-match names */
window.POT_MATCH = {CA:"Market Match",MA:"HIP (Healthy Incentives Program)",MI:"Double Up Food Bucks",CO:"SNAP Produce Bonus",WA:"SNAP Market Match",NY:"Health Bucks (NYC) and Double Up"};

/* ZIP3 ranges to state (offline fallback) */
window.POT_ZIP3 = [[10,27,"MA"],[28,29,"RI"],[30,38,"NH"],[39,49,"ME"],[50,54,"VT"],[55,55,"MA"],[56,59,"VT"],[60,69,"CT"],[70,89,"NJ"],[100,149,"NY"],[150,196,"PA"],[197,199,"DE"],[200,200,"DC"],[201,201,"VA"],[202,205,"DC"],[206,219,"MD"],[220,246,"VA"],[247,268,"WV"],[270,289,"NC"],[290,299,"SC"],[300,319,"GA"],[320,339,"FL"],[341,349,"FL"],[350,369,"AL"],[370,385,"TN"],[386,397,"MS"],[398,399,"GA"],[400,427,"KY"],[430,459,"OH"],[460,479,"IN"],[480,499,"MI"],[500,528,"IA"],[530,549,"WI"],[550,567,"MN"],[569,569,"DC"],[570,577,"SD"],[580,588,"ND"],[590,599,"MT"],[600,629,"IL"],[630,658,"MO"],[660,679,"KS"],[680,693,"NE"],[700,714,"LA"],[716,729,"AR"],[730,732,"OK"],[733,733,"TX"],[734,749,"OK"],[750,799,"TX"],[800,816,"CO"],[820,831,"WY"],[832,838,"ID"],[840,847,"UT"],[850,865,"AZ"],[870,884,"NM"],[885,885,"TX"],[889,898,"NV"],[900,961,"CA"],[967,968,"HI"],[970,979,"OR"],[980,994,"WA"],[995,999,"AK"]];
