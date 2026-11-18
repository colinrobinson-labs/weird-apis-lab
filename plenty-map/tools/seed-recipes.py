# One-time seed: converts the Potful prototype data into Plenty Map's data/food.json
# and i18n/recipes/{en,es}.json, and adds the new cuisine recipes.
# Kept in the repo so the provenance of every number is clear.
import json, sys

P = json.load(open("/tmp/proto.json"))
ROOT = sys.argv[1] if len(sys.argv) > 1 else "."

AISLE = {"rice":"pantry","pasta":"pantry","flour":"pantry","oats":"pantry","lentils":"pantry","dbeans":"pantry","peas_d":"pantry","mungb":"pantry","buckwheat":"pantry",
  "cbeans":"cans","chick":"cans","ctom":"cans","tpaste":"cans","tsauce":"cans","tuna":"cans","coco":"cans","corn":"cans","salsa":"cans","pb":"cans","mayo":"cans","soy":"cans","vinegar":"cans","oil":"pantry","ramen":"pantry","beets":"cans",
  "eggs":"dairy","milk":"dairy","cheddar":"dairy","yogurt":"dairy","butter":"dairy","tofu":"dairy","kimchi":"dairy","chleg":"meat","chbr":"meat","beef":"meat","bread":"bread","ftort":"bread","ctort":"bread",
  "potato":"prod","sweetp":"prod","onion":"prod","carrot":"prod","cabbage":"prod","garlic":"prod","celery":"prod","pepper":"prod","gonion":"prod","cilantro":"prod","lime":"prod","banana":"prod","ginger":"prod",
  "fmix":"frozen","fpeas":"frozen","fspin":"frozen","fbroc":"frozen","sugar":"spice","bpowder":"spice","bouil":"spice","cumin":"spice","chili":"spice","curry":"spice","paprika":"spice","italian":"spice","garpow":"spice","cinn":"spice"}

# Package sizes as numbers + a unit we can translate.
PKG = {"rice":[2,"lb"],"pasta":[1,"lb"],"flour":[5,"lb"],"oats":[42,"oz"],"lentils":[1,"lb"],"dbeans":[1,"lb"],"peas_d":[1,"lb"],"cbeans":[15,"oz"],"chick":[15,"oz"],
 "ctom":[14.5,"oz"],"tpaste":[6,"oz"],"tsauce":[15,"oz"],"tuna":[5,"oz"],"coco":[13.5,"oz"],"corn":[15,"oz"],"eggs":[12,"egg"],"milk":[1,"gal"],"cheddar":[8,"oz"],
 "yogurt":[32,"oz"],"butter":[1,"lb"],"oil":[48,"floz"],"pb":[16,"oz"],"mayo":[30,"oz"],"chleg":[3,"lb"],"chbr":[1,"lb"],"beef":[1,"lb"],"tofu":[14,"oz"],
 "bread":[20,"oz"],"ftort":[10,"tortilla"],"ctort":[30,"tortilla"],"ramen":[6,"pack"],"potato":[5,"lb"],"sweetp":[1,"lb"],"onion":[3,"lb"],"carrot":[2,"lb"],
 "cabbage":[1,"head"],"garlic":[1,"head"],"celery":[1,"bunch"],"pepper":[1,"each"],"gonion":[1,"bunch"],"cilantro":[1,"bunch"],"lime":[1,"each"],"banana":[1,"each"],
 "fmix":[12,"oz"],"fpeas":[12,"oz"],"fspin":[10,"oz"],"fbroc":[12,"oz"],"salsa":[16,"oz"],"soy":[15,"floz"],"vinegar":[32,"floz"],"sugar":[4,"lb"],"bpowder":[8,"oz"],
 "bouil":[25,"cube"],"cumin":[1,"jar"],"chili":[1,"jar"],"curry":[1,"jar"],"paprika":[1,"jar"],"italian":[1,"jar"],"garpow":[1,"jar"],"cinn":[1,"jar"],
 "mungb":[1,"lb"],"buckwheat":[2,"lb"],"beets":[15,"oz"],"kimchi":[16,"oz"],"ginger":[4,"oz"]}

UNITS_EN = {"lb":"lb","oz":"oz","floz":"fl oz","gal":"gallon","can":{"one":"can","other":"cans"},"egg":{"one":"egg","other":"eggs"},"cup":{"one":"cup","other":"cups"},
 "tbsp":"tbsp","tsp":"tsp","slice":{"one":"slice","other":"slices"},"tortilla":{"one":"tortilla","other":"tortillas"},"pack":{"one":"pack","other":"packs"},
 "onion":{"one":"onion","other":"onions"},"clove":{"one":"clove","other":"cloves"},"bunch":{"one":"bunch","other":"bunches"},"pepper":{"one":"pepper","other":"peppers"},
 "lime":{"one":"lime","other":"limes"},"banana":{"one":"banana","other":"bananas"},"bag":{"one":"bag","other":"bags"},"box":{"one":"box","other":"boxes"},
 "block":{"one":"block","other":"blocks"},"cube":{"one":"cube","other":"cubes"},"head":{"one":"head","other":"heads"},"each":"each","jar":{"one":"jar","other":"jars"},
 "piece":{"one":"piece","other":"pieces"}}
UNITS_ES = {"lb":"lb","oz":"oz","floz":"oz líq.","gal":"galón","can":{"one":"lata","other":"latas"},"egg":{"one":"huevo","other":"huevos"},"cup":{"one":"taza","other":"tazas"},
 "tbsp":"cda","tsp":"cdita","slice":{"one":"rebanada","other":"rebanadas"},"tortilla":{"one":"tortilla","other":"tortillas"},"pack":{"one":"paquete","other":"paquetes"},
 "onion":{"one":"cebolla","other":"cebollas"},"clove":{"one":"diente","other":"dientes"},"bunch":{"one":"manojo","other":"manojos"},"pepper":{"one":"pimiento","other":"pimientos"},
 "lime":{"one":"limón","other":"limones"},"banana":{"one":"plátano","other":"plátanos"},"bag":{"one":"bolsa","other":"bolsas"},"box":{"one":"caja","other":"cajas"},
 "block":{"one":"bloque","other":"bloques"},"cube":{"one":"cubo","other":"cubos"},"head":{"one":"cabeza","other":"cabezas"},"each":"pieza","jar":{"one":"frasco","other":"frascos"},
 "piece":{"one":"trozo","other":"trozos"}}
UMAP = {"lb":"lb","can":"can","egg":"egg","cup":"cup","oz":"oz","tbsp":"tbsp","slice":"slice","tortilla":"tortilla","pack":"pack","onion":"onion","clove":"clove",
 "bunch":"bunch","pepper":"pepper","lime":"lime","banana":"banana","bag":"bag","box":"box","block":"block","cube":"cube","tsp":"tsp"}

NEW_ING = {
 # id: [en, es, unit, price, src, unitsPerPkg, grams/unit, kcal/100g, protein/100g, flags]
 "mungb":["Dried mung beans","Frijol mungo seco","lb",2.29,"est",1,454,347,23.9,""],
 "buckwheat":["Buckwheat groats (kasha)","Trigo sarraceno (alforfón)","lb",3.49,"est",2,454,343,13.3,""],
 "beets":["Canned beets","Betabel de lata","can",1.15,"est",1,250,31,0.9,""],
 "kimchi":["Kimchi","Kimchi","cup",2.50,"est",2,150,15,1.1,"f"],
 "ginger":["Fresh ginger","Jengibre fresco","piece",0.25,"est",8,14,80,1.8,""],
}

ing = {}; ing_en = {}; ing_es = {}
for k, v in P["ing"].items():
    en, es, u, ues, price, src, per, pen, pes, g, kcal, prot, fl = v
    ing[k] = {"u": UMAP[u], "p": price, "src": src, "per": per, "pkg": PKG[k], "g": g, "kcal": kcal, "pro": prot, "fl": fl, "aisle": AISLE[k]}
    ing_en[k] = en; ing_es[k] = es
for k, v in NEW_ING.items():
    en, es, u, price, src, per, g, kcal, prot, fl = v
    ing[k] = {"u": u, "p": price, "src": src, "per": per, "pkg": PKG[k], "g": g, "kcal": kcal, "pro": prot, "fl": fl, "aisle": AISLE[k]}
    ing_en[k] = en; ing_es[k] = es

DROP = {"fagioli","sloppy","chkcab","savoats","potegg"}
# req: none | micro | burner | oven.  lvl: 1 easy, 2 some cooking, 3 a project.  cu: cuisines it fits.
META = {
 "dal":("burner",2,["afghan","somali","world"]), "bbrice":("burner",1,["latin"]), "sheetchk":("oven",1,["american"]),
 "friedrice":("burner",2,["chinese","vietnamese","korean","filipino"]), "pbnoodle":("burner",1,["world","american"]),
 "mugegg":("micro",1,["american","latin"]), "onoats":("none",1,["american"]), "burritos":("burner",2,["latin","american"]),
 "chickcurry":("burner",2,["world","somali"]), "tunapasta":("burner",2,["american"]), "splitpea":("burner",2,["american","easteuro"]),
 "chili":("burner",2,["american"]), "pancakes":("burner",2,["american","easteuro"]), "arrozpollo":("burner",2,["latin","brazilian","haitian"]),
 "ramenup":("micro",1,["korean","american"]), "potato":("micro",1,["american"]), "rollup":("none",1,["american"]),
 "quesadilla":("burner",1,["latin","american"]), "minestrone":("burner",1,["american","world"]), "sptacos":("oven",2,["latin"]),
 "shakshuka":("burner",2,["middleeast"]), "tofubowl":("burner",2,["chinese","vietnamese","korean"]), "chknoodle":("burner",2,["american","easteuro"]),
 "pinto":("burner",2,["latin","brazilian"]), "tunasalad":("none",1,["american"]), "chicksmash":("none",1,["american","middleeast"]),
 "mugmac":("micro",1,["american"]), "beanpot":("burner",3,["latin","brazilian","haitian"]), "bftacos":("burner",1,["latin"]),
}

recipes = []; rec_en = {}; rec_es = {}
for r in P["rec"]:
    if r["id"] in DROP: continue
    req, lvl, cu = META[r["id"]]
    recipes.append({"id": r["id"], "icon": r["icon"], "mins": r["mins"], "req": req, "lvl": lvl, "cu": cu, "serves": r["serves"],
                    "kid": r["kid"], "frz": r["freeze"], "ing": r["ing"]})
    rec_en[r["id"]] = {"t": r["t"][0], "s": [s[0] for s in r["s"]], "tip": r["tip"][0] if r.get("tip") else ""}
    rec_es[r["id"]] = {"t": r["t"][1], "s": [s[1] for s in r["s"]], "tip": r["tip"][1] if r.get("tip") else ""}

NEW = [
 # id, icon, mins, req, lvl, cu, serves, kid, frz, ing, EN(t, steps, tip), ES(t, steps, tip)
 ("canhcai","pot",20,"burner",1,["vietnamese","chinese"],4,1,0,[["cabbage",0.6],["tofu",1],["gonion",0.5],["garlic",2],["bouil",2],["soy",1],["oil",1]],
  ("Cabbage and tofu soup (canh)",["Cut the cabbage into bite-size pieces and the tofu into cubes. Slice the green onion.","Warm the oil in a pot, fry the garlic 30 seconds, then add 6 cups of water and the bouillon. Bring to a boil.","Add the cabbage and simmer 6 minutes. Add the tofu and soy sauce and simmer 3 minutes more. Top with green onion and serve with rice."],"A light soup that goes with any rice meal. Add a few shrimp or some ground pork if you have them."),
  ("Sopa de repollo con tofu (canh)",["Corta el repollo en trozos chicos y el tofu en cubos. Rebana la cebollita.","Calienta el aceite en una olla, fríe el ajo 30 segundos y agrega 6 tazas de agua y el consomé. Deja que hierva.","Agrega el repollo y cocina 6 minutos. Añade el tofu y la soya y cocina 3 minutos más. Termina con cebollita y sirve con arroz."],"Una sopa ligera que acompaña cualquier comida con arroz. Si tienes camarones o un poco de carne molida, agrégalos.")),
 ("chaoga","pot",50,"burner",2,["vietnamese","filipino","chinese","korean"],6,1,1,[["chleg",1.5],["rice",0.5],["ginger",2],["onion",0.5],["garlic",3],["gonion",1],["bouil",2],["oil",1]],
  ("Chicken and ginger rice porridge (cháo gà, arroz caldo)",["In a big pot, fry the chopped onion, garlic and sliced ginger in the oil for 3 minutes. Add the rice and stir 1 minute.","Add the chicken, the bouillon and 10 cups of water. Simmer, stirring now and then, for 40 minutes, until the rice is soft and creamy.","Lift out the chicken, pull the meat off the bones and stir it back in. Salt to taste and top with green onion."],"Gentle on the stomach and good for anyone who is sick. A squeeze of lime or a dash of fish sauce at the table is great."),
  ("Arroz caldoso de pollo con jengibre (cháo gà, arroz caldo)",["En una olla grande, fríe la cebolla picada, el ajo y el jengibre rebanado en el aceite 3 minutos. Agrega el arroz y mueve 1 minuto.","Añade el pollo, el consomé y 10 tazas de agua. Cocina a fuego bajo 40 minutos, moviendo de vez en cuando, hasta que el arroz quede suave y espeso.","Saca el pollo, deshebra la carne sin hueso y regrésala a la olla. Sala al gusto y termina con cebollita."],"Suave para el estómago y bueno para quien está enfermo. Un chorrito de limón en la mesa le queda muy bien.")),
 ("tomatoegg","pan",15,"burner",1,["chinese"],4,1,0,[["eggs",6],["ctom",1],["gonion",0.5],["sugar",1],["oil",2],["rice",0.6]],
  ("Tomato and egg stir-fry",["Start the rice. Beat the eggs with a pinch of salt. Slice the green onion.","Scramble the eggs in half the oil until just set, then move them to a plate.","Add the rest of the oil and the tomatoes with their juice and the sugar. Cook 4 minutes, mashing a little. Fold the eggs back in, top with green onion and serve over rice."],"Fresh tomatoes are great here in summer. Use 4 chopped ones instead of the can."),
  ("Huevo revuelto con tomate al estilo chino",["Pon el arroz. Bate los huevos con una pizca de sal. Rebana la cebollita.","Revuelve los huevos en la mitad del aceite hasta que apenas cuajen y pásalos a un plato.","Agrega el resto del aceite, el tomate con su jugo y el azúcar. Cocina 4 minutos aplastando un poco. Regresa el huevo, termina con cebollita y sirve sobre arroz."],"En verano queda muy rico con 4 tomates frescos picados en lugar de la lata.")),
 ("scallion","noodle",20,"burner",1,["chinese"],4,1,0,[["pasta",1],["gonion",2],["soy",4],["sugar",1],["oil",4]],
  ("Scallion oil noodles",["Boil the noodles or thin spaghetti until tender and drain.","Meanwhile, cut the green onions into short pieces. Cook them in the oil on low for 8 to 10 minutes, until dark and crisp.","Stir the soy sauce and sugar into the hot oil, then toss with the noodles."],"Top with a fried egg to make it a full meal."),
  ("Fideos con aceite de cebollita",["Cuece los fideos o espagueti delgado hasta que estén suaves y escúrrelos.","Mientras, corta la cebollita en trozos cortos. Cocínala en el aceite a fuego bajo 8 a 10 minutos, hasta que esté oscura y crujiente.","Mezcla la soya y el azúcar con el aceite caliente y revuelve con los fideos."],"Ponle un huevo estrellado encima para una comida completa.")),
 ("monggo","pot",50,"burner",2,["filipino"],6,1,1,[["mungb",1],["onion",1],["garlic",4],["ctom",0.5],["fspin",1],["bouil",2],["oil",2],["rice",0.75]],
  ("Mung bean stew with spinach (ginisang monggo)",["Rinse the mung beans and simmer them in 6 cups of water for 30 to 35 minutes, until soft and splitting.","In another pan, fry the garlic, chopped onion and tomatoes in the oil for 5 minutes. Start the rice.","Stir the onion mix and bouillon into the beans. Add the frozen spinach and cook 5 minutes. Salt to taste and serve with rice."],"Traditionally served on Fridays. A little fried fish or pork on top is common when there's extra money."),
  ("Guiso de frijol mungo con espinaca (ginisang monggo)",["Enjuaga el frijol mungo y cocínalo en 6 tazas de agua 30 a 35 minutos, hasta que esté suave y se abra.","En otra sartén, fríe el ajo, la cebolla picada y el tomate en el aceite 5 minutos. Pon el arroz.","Agrega la mezcla de cebolla y el consomé a los frijoles. Añade la espinaca congelada y cocina 5 minutos. Sala al gusto y sirve con arroz."],"Se come tradicionalmente los viernes. Si alcanza, se le pone encima un poco de pescado frito o puerco.")),
 ("tofuadobo","pot",35,"burner",2,["filipino"],4,1,0,[["tofu",2],["potato",1],["soy",4],["vinegar",4],["garlic",6],["sugar",1],["oil",2],["rice",0.75]],
  ("Tofu and potato adobo",["Start the rice. Cut the tofu and potatoes into cubes and smash the garlic.","Brown the tofu in the oil on medium-high, about 8 minutes, then push it aside and fry the garlic 1 minute.","Add the potatoes, soy sauce, vinegar, sugar, a few cracks of black pepper and 1 cup of water. Cover and simmer 15 minutes, until the potatoes are soft and the sauce is glossy."],"Don't stir for the first few minutes after adding the vinegar. It mellows as it cooks."),
  ("Adobo de tofu con papa",["Pon el arroz. Corta el tofu y las papas en cubos y machaca el ajo.","Dora el tofu en el aceite a fuego medio-alto unos 8 minutos, hazlo a un lado y fríe el ajo 1 minuto.","Agrega las papas, la soya, el vinagre, el azúcar, pimienta negra y 1 taza de agua. Tapa y cocina 15 minutos, hasta que las papas estén suaves y la salsa brille."],"No muevas los primeros minutos después de agregar el vinagre. Se suaviza al cocinarse.")),
 ("mujaddara","pot",45,"burner",2,["middleeast","afghan"],4,1,1,[["lentils",0.6],["rice",0.6],["onion",3],["oil",4],["cumin",1],["yogurt",1]],
  ("Lentils and rice with crispy onions (mujaddara)",["Slice the onions thin. Cook them in the oil on medium, stirring often, 20 to 25 minutes until deep brown. Lift half out for the top.","Meanwhile, simmer the rinsed brown lentils in 4 cups of water for 15 minutes. Don't drain.","Add the rice, cumin, 1 teaspoon of salt and the onions left in the pot to the lentils. Cover and cook on low 20 minutes. Serve topped with the crispy onions and a spoon of yogurt."],"The browned onions are the flavor, so take your time with them."),
  ("Lentejas con arroz y cebolla dorada (mujaddara)",["Rebana la cebolla delgada. Cocínala en el aceite a fuego medio, moviendo seguido, 20 a 25 minutos hasta que esté bien dorada. Aparta la mitad para el final.","Mientras, cuece las lentejas cafés enjuagadas en 4 tazas de agua 15 minutos. No las escurras.","Agrega a las lentejas el arroz, el comino, 1 cucharadita de sal y la cebolla que quedó en la olla. Tapa y cocina a fuego bajo 20 minutos. Sirve con la cebolla crujiente y una cucharada de yogur."],"La cebolla dorada da todo el sabor. Tómate tu tiempo.")),
 ("adas","pot",35,"burner",1,["middleeast","somali","afghan"],6,1,1,[["lentils",0.75],["onion",1],["carrot",0.5],["garlic",3],["cumin",2],["bouil",2],["lime",1],["oil",2]],
  ("Red lentil soup (shorbat adas)",["Chop the onion and carrot. Soften them in the oil for 6 minutes, then add the garlic and cumin for 1 minute.","Add the rinsed red lentils, the bouillon and 8 cups of water. Simmer 20 minutes, until the lentils fall apart.","Mash or blend until smooth. Salt to taste and squeeze in the lime juice. Serve with bread."],"Thick and filling for very little money. It thickens as it sits, so add water when you reheat."),
  ("Sopa de lentejas rojas (shorbat adas)",["Pica la cebolla y la zanahoria. Sofríelas en el aceite 6 minutos y agrega el ajo y el comino 1 minuto.","Añade las lentejas rojas enjuagadas, el consomé y 8 tazas de agua. Cocina 20 minutos, hasta que se deshagan.","Machaca o licúa hasta que quede suave. Sala al gusto y exprime el limón. Sirve con pan."],"Espesa y llenadora por muy poco dinero. Se espesa al reposar, así que agrega agua al recalentar.")),
 ("ful","bowl",10,"micro",1,["middleeast","somali"],4,1,0,[["cbeans",2],["garlic",2],["lime",1],["cumin",1],["oil",3],["bread",8]],
  ("Warm mashed beans with lime and garlic (ful)",["Put the beans with half their liquid in a bowl or pot and warm them, 3 minutes in the microwave or 5 on the stove.","Mash roughly with the crushed garlic, cumin, lime juice and a pinch of salt.","Drizzle with the oil and eat with bread. Add chopped tomato, onion or a boiled egg if you have them."],"Fava beans are traditional. Pinto, kidney or chickpeas all work."),
  ("Frijoles machacados con limón y ajo (ful)",["Pon los frijoles con la mitad de su caldo en un plato o una olla y caliéntalos, 3 minutos en microondas o 5 en la estufa.","Machácalos un poco con el ajo machacado, el comino, el jugo de limón y una pizca de sal.","Rocía el aceite y come con pan. Si tienes, agrega tomate picado, cebolla o un huevo cocido."],"Lo tradicional es con habas. También sirven frijol pinto, rojo o garbanzo.")),
 ("kichiri","pot",40,"burner",2,["afghan"],4,1,0,[["rice",0.75],["mungb",0.4],["onion",1],["garlic",2],["cumin",1],["oil",3],["yogurt",1]],
  ("Mung bean and rice (kichiri)",["Rinse the mung beans and the rice. Simmer the mung beans in 3 cups of water for 15 minutes.","Fry the chopped onion in the oil until golden, then add the garlic and cumin for 1 minute.","Add the rice, the onions, 1 teaspoon of salt and 2 more cups of water to the beans. Cover and cook on low 20 minutes until soft and a little sticky. Serve with yogurt."],"Stir a little dried mint or garlic into the yogurt the way it's served at home."),
  ("Arroz con frijol mungo (kichiri)",["Enjuaga el frijol mungo y el arroz. Cuece el frijol en 3 tazas de agua 15 minutos.","Fríe la cebolla picada en el aceite hasta dorar y agrega el ajo y el comino 1 minuto.","Añade a los frijoles el arroz, la cebolla, 1 cucharadita de sal y 2 tazas más de agua. Tapa y cocina a fuego bajo 20 minutos hasta que esté suave y un poco pegajoso. Sirve con yogur."],"Mezcla un poco de hierbabuena seca o ajo con el yogur, como se sirve en casa.")),
 ("shorwa","pot",40,"burner",2,["afghan","middleeast"],6,1,1,[["chick",2],["potato",1.5],["onion",1],["ctom",1],["garlic",3],["curry",1],["bouil",2],["oil",2],["cilantro",0.5],["bread",6]],
  ("Chickpea and potato soup (shorwa)",["Soften the chopped onion in the oil 6 minutes. Add the garlic and curry powder for 1 minute.","Add the tomatoes, the diced potatoes, the drained chickpeas, the bouillon and 7 cups of water.","Simmer 25 minutes until the potatoes are soft. Salt to taste, top with cilantro and serve with bread for dipping."],"Tear the bread into the bowl and pour the soup over it, the traditional way."),
  ("Sopa de garbanzo con papa (shorwa)",["Sofríe la cebolla picada en el aceite 6 minutos. Agrega el ajo y el curry 1 minuto.","Añade el tomate, las papas en cubos, los garbanzos escurridos, el consomé y 7 tazas de agua.","Cocina 25 minutos hasta que las papas estén suaves. Sala al gusto, pon cilantro y sirve con pan para remojar."],"Lo tradicional es partir el pan en el plato y servir la sopa encima.")),
 ("bariis","pot",60,"burner",2,["somali"],5,1,1,[["chleg",2],["rice",0.75],["onion",1],["garlic",3],["tpaste",0.5],["cumin",1],["cinn",0.5],["curry",1],["bouil",1],["oil",2],["banana",3]],
  ("Spiced rice with chicken (bariis iskukaris)",["Season the chicken with salt, cumin and curry powder. Brown it in the oil in a big pot, 4 minutes a side. Set aside.","Cook the chopped onion 6 minutes, then add the garlic, tomato paste and cinnamon for 1 minute. Stir in the rinsed rice.","Add 3 cups of water and the bouillon, set the chicken on top, cover and cook on low 30 minutes, until the chicken reads 165°F (74°C). Serve with a banana on the side."],"A banana with rice is how many Somali families eat it. Try it before you skip it."),
  ("Arroz especiado con pollo (bariis iskukaris)",["Sazona el pollo con sal, comino y curry. Dóralo en el aceite en una olla grande, 4 minutos por lado. Apártalo.","Cocina la cebolla picada 6 minutos y agrega el ajo, la pasta de tomate y la canela 1 minuto. Añade el arroz enjuagado.","Agrega 3 tazas de agua y el consomé, pon el pollo encima, tapa y cocina a fuego bajo 30 minutos, hasta que el pollo llegue a 165°F (74°C). Sirve con un plátano al lado."],"Muchas familias somalíes comen el arroz con plátano. Pruébalo antes de saltártelo.")),
 ("diripwa","pot",45,"burner",2,["haitian"],6,1,1,[["cbeans",2],["rice",1],["onion",1],["garlic",4],["gonion",1],["bouil",1],["lime",1],["oil",2]],
  ("Haitian rice and beans (diri ak pwa)",["Drain the beans but keep their liquid. Blend or mash the garlic, half the green onions and a pinch of salt with the lime juice. This is a quick epis.","Fry the chopped onion and the epis in the oil 3 minutes. Add the beans and fry 3 more minutes.","Add the bean liquid plus water to make 4 cups, and the bouillon. Bring to a boil, stir in the rinsed rice, cover and cook on low 20 minutes. Top with the rest of the green onions."],"Red kidney beans are classic. Black or pinto beans work too."),
  ("Arroz con frijoles haitiano (diri ak pwa)",["Escurre los frijoles pero guarda su caldo. Licúa o machaca el ajo, la mitad de la cebollita y una pizca de sal con el jugo de limón. Es un epis rápido.","Fríe la cebolla picada y el epis en el aceite 3 minutos. Agrega los frijoles y fríe 3 minutos más.","Añade el caldo de los frijoles más agua hasta completar 4 tazas, y el consomé. Cuando hierva, agrega el arroz enjuagado, tapa y cocina a fuego bajo 20 minutos. Termina con el resto de la cebollita."],"Lo clásico es con frijol rojo. Con frijol negro también queda muy bien.")),
 ("legim","pot",45,"burner",2,["haitian"],6,1,1,[["cabbage",0.6],["carrot",1],["fspin",1],["onion",1],["garlic",3],["tpaste",0.5],["bouil",2],["oil",2],["rice",1]],
  ("Haitian vegetable stew (legim)",["Start the rice. Chop the cabbage, carrots and onion.","Fry the onion and garlic in the oil 4 minutes, then stir in the tomato paste for 1 minute.","Add the cabbage, carrots, spinach, bouillon and 1½ cups of water. Cover and simmer 25 minutes, mashing the vegetables as they soften. Salt to taste and serve over rice."],"Add a little chicken or beef if you have it. It's just as good without."),
  ("Guiso haitiano de verduras (legim)",["Pon el arroz. Pica el repollo, las zanahorias y la cebolla.","Fríe la cebolla y el ajo en el aceite 4 minutos y agrega la pasta de tomate 1 minuto.","Añade el repollo, las zanahorias, la espinaca, el consomé y 1½ tazas de agua. Tapa y cocina 25 minutos, machacando las verduras cuando se ablanden. Sala al gusto y sirve sobre arroz."],"Si tienes, agrega un poco de pollo o res. Sin carne queda igual de rico.")),
 ("grechka","pot",25,"burner",1,["easteuro"],4,1,0,[["buckwheat",0.75],["onion",1],["carrot",0.5],["butter",2],["eggs",4]],
  ("Buckwheat with onion, carrot and egg (grechka)",["Rinse the buckwheat. Put it in a pot with 2½ cups of water and a pinch of salt. Bring to a boil, cover and cook on low 15 minutes.","Meanwhile, fry the chopped onion and grated carrot in the butter until soft and golden. Boil or fry the eggs.","Stir the vegetables into the buckwheat and serve with an egg on each plate."],"Leftover buckwheat with milk and a little sugar is a classic breakfast."),
  ("Trigo sarraceno con cebolla, zanahoria y huevo (grechka)",["Enjuaga el trigo sarraceno. Ponlo en una olla con 2½ tazas de agua y sal. Cuando hierva, tapa y cocina a fuego bajo 15 minutos.","Mientras, fríe la cebolla picada y la zanahoria rallada en la mantequilla hasta que se doren. Cuece o fríe los huevos.","Mezcla las verduras con el trigo y sirve con un huevo en cada plato."],"El que sobra, con leche y un poco de azúcar, es un desayuno clásico.")),
 ("borscht","pot",50,"burner",2,["easteuro"],6,1,1,[["beets",2],["cabbage",0.6],["potato",1],["carrot",0.5],["onion",1],["tpaste",0.5],["garlic",2],["bouil",2],["vinegar",1],["oil",2],["yogurt",1]],
  ("Beet and cabbage soup (borscht)",["Soften the chopped onion and grated carrot in the oil 6 minutes. Stir in the tomato paste for 1 minute.","Add 8 cups of water, the bouillon and the diced potatoes. Simmer 10 minutes, then add the shredded cabbage and simmer 10 more.","Add the beets cut into strips with their juice, the garlic and the vinegar. Simmer 5 minutes. Salt to taste and serve with a spoon of yogurt."],"Plain yogurt stands in for sour cream. Borscht tastes even better the next day."),
  ("Sopa de betabel y repollo (borsch)",["Sofríe la cebolla picada y la zanahoria rallada en el aceite 6 minutos. Agrega la pasta de tomate 1 minuto.","Añade 8 tazas de agua, el consomé y las papas en cubos. Cocina 10 minutos, agrega el repollo picado fino y cocina 10 más.","Agrega el betabel en tiras con su jugo, el ajo y el vinagre. Cocina 5 minutos. Sala al gusto y sirve con una cucharada de yogur."],"El yogur natural sustituye a la crema agria. Al día siguiente sabe todavía mejor.")),
 ("kimchirice","pan",15,"burner",1,["korean"],3,0,0,[["kimchi",1],["rice",0.5],["eggs",3],["gonion",0.5],["soy",1],["sugar",0.3],["oil",2]],
  ("Kimchi fried rice with egg (kimchi bokkeumbap)",["Cook the rice ahead. Cold, day-old rice fries best. Chop the kimchi.","Fry the kimchi in the oil 3 minutes. Add the rice, the soy sauce, the sugar and a splash of kimchi juice and fry until hot.","Fry the eggs. Serve each bowl with an egg on top and sliced green onion."],"Older, sour kimchi is the best kind for this."),
  ("Arroz frito con kimchi y huevo (kimchi bokkeumbap)",["Cuece el arroz antes. El arroz frío del día anterior se fríe mejor. Pica el kimchi.","Fríe el kimchi en el aceite 3 minutos. Agrega el arroz, la soya, el azúcar y un chorrito del jugo del kimchi y fríe hasta que esté caliente.","Fríe los huevos. Sirve cada plato con un huevo encima y cebollita rebanada."],"El kimchi más viejo y ácido es el mejor para esto.")),
 ("gyeranjjim","mug",6,"micro",1,["korean"],1,1,0,[["eggs",2],["gonion",0.15],["soy",0.5]],
  ("Microwave steamed egg (gyeran-jjim)",["Beat the eggs in a large mug or bowl with ⅓ cup of water, the soy sauce and a little sliced green onion.","Cover loosely and microwave 1 minute. Stir gently.","Microwave 30 to 60 seconds more, until puffed and just set. Eat with rice."],"Use a big bowl. It rises a lot, then settles."),
  ("Huevo al vapor en microondas (gyeran-jjim)",["Bate los huevos en una taza grande o un plato hondo con ⅓ de taza de agua, la soya y un poco de cebollita.","Tapa sin apretar y calienta 1 minuto. Mueve con cuidado.","Calienta 30 a 60 segundos más, hasta que se infle y apenas cuaje. Come con arroz."],"Usa un recipiente grande. Sube mucho y luego baja.")),
 ("caldoverde","pot",35,"burner",1,["brazilian"],6,1,1,[["potato",2],["onion",1],["garlic",3],["cabbage",0.4],["bouil",2],["oil",3]],
  ("Potato and greens soup (caldo verde)",["Soften the chopped onion and garlic in 2 tablespoons of the oil for 5 minutes.","Add the diced potatoes, the bouillon and 7 cups of water. Simmer 20 minutes, then mash until mostly smooth.","Stir in the very finely shredded cabbage or kale and cook 5 minutes. Salt to taste and drizzle with the last of the oil."],"Slice in a little sausage if you have some. That's how it's served at parties."),
  ("Sopa de papa con verdura (caldo verde)",["Sofríe la cebolla picada y el ajo en 2 cucharadas del aceite 5 minutos.","Añade las papas en cubos, el consomé y 7 tazas de agua. Cocina 20 minutos y machaca hasta que esté casi suave.","Agrega el repollo o col rizada picada muy fina y cocina 5 minutos. Sala al gusto y rocía el resto del aceite."],"Si tienes, rebana un poco de chorizo. Así se sirve en las fiestas.")),
 ("fideo","pot",20,"burner",1,["latin"],4,1,0,[["pasta",0.5],["tsauce",1],["onion",0.5],["garlic",2],["bouil",2],["oil",2]],
  ("Toasted noodle soup (sopa de fideo)",["Break the thin noodles into short pieces. Fry them in the oil on medium, stirring, until golden brown, about 4 minutes.","Blend or finely chop the onion and garlic and add them with the tomato sauce. Cook 2 minutes.","Add 6 cups of water and the bouillon. Simmer 8 to 10 minutes until the noodles are soft."],"Squeeze in lime and add a little chopped cilantro at the table."),
  ("Sopa de fideo",["Parte los fideos en trozos cortos. Fríelos en el aceite a fuego medio, moviendo, hasta que estén dorados, unos 4 minutos.","Licúa o pica fino la cebolla y el ajo y agrégalos con la salsa de tomate. Cocina 2 minutos.","Añade 6 tazas de agua y el consomé. Cocina 8 a 10 minutos hasta que el fideo esté suave."],"Exprime limón y ponle cilantro picado en la mesa.")),
]
for (rid, icon, mins, req, lvl, cu, serves, kid, frz, ings, en, es) in NEW:
    recipes.append({"id": rid, "icon": icon, "mins": mins, "req": req, "lvl": lvl, "cu": cu, "serves": serves, "kid": kid, "frz": frz, "ing": ings})
    rec_en[rid] = {"t": en[0], "s": en[1], "tip": en[2]}
    rec_es[rid] = {"t": es[0], "s": es[1], "tip": es[2]}

for r in recipes:
    for i, _ in r["ing"]:
        assert i in ing, (r["id"], i)

food = {"note": "Prices in USD. src bls = U.S. Bureau of Labor Statistics average retail price, U.S. city average, Oct 2026. src est = typical store-brand shelf price at U.S. discount grocers, Nov 2026 (estimate). Nutrition per 100 g from USDA FoodData Central, rounded.",
        "pricesAsOf": "2026-11", "ing": ing, "recipes": recipes,
        "slots": {"b": ["onoats", "pancakes", "bftacos", "mugegg", "rollup", "gyeranjjim", "ful"],
                  "l": ["rollup", "tunasalad", "chicksmash", "quesadilla", "potato", "mugmac", "ramenup", "burritos", "pbnoodle", "fideo", "scallion", "adas", "canhcai", "caldoverde"]}}
json.dump(food, open(f"{ROOT}/data/food.json", "w"), ensure_ascii=False, separators=(",", ":"))
json.dump({**rec_en, "ing": ing_en, "units": UNITS_EN}, open(f"{ROOT}/i18n/recipes/en.json", "w"), ensure_ascii=False, indent=0)
json.dump({**rec_es, "ing": ing_es, "units": UNITS_ES}, open(f"{ROOT}/i18n/recipes/es.json", "w"), ensure_ascii=False, indent=0)
print(len(recipes), "recipes,", len(ing), "ingredients")
