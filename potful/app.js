/* Potful. No tracking, no accounts. Everything you enter stays in this browser. */
(() => {
"use strict";
const I = window.POT_ING, R = window.POT_RECIPES, RX = Object.fromEntries(R.map(r => [r.id, r]));
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- storage (device only) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("potful." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("potful." + k, JSON.stringify(v)); } catch (e) {} },
  clear() { try { Object.keys(localStorage).filter(k => k.startsWith("potful.")).forEach(k => localStorage.removeItem(k)); } catch (e) {} }
};
const navLang = (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
const S = {
  lang: store.get("lang", navLang),
  loc: store.get("loc", null),
  prices: store.get("prices", {}),
  have: new Set(store.get("have", [])),
  got: new Set(store.get("got", [])),
  hh: store.get("hh", { a: 2, k: 2 }),
  meals: store.get("meals", { b: 1, l: 1, d: 1 }),
  diet: store.get("diet", "all"),
  eq: store.get("eq", "any"),
  plan: store.get("plan", null),
  cook: { q: "", diet: "all", eq: "any", sort: "cheap", pantry: new Set(), showPantry: false },
  near: { cat: "all", radius: 8000, data: null, at: null, err: null, loading: false, limit: 30 },
  scr: store.get("scr", null)
};
const L = () => S.lang === "es" ? 1 : 0;

/* ---------- strings ---------- */
const T = {
en: {
  home:"Home", cook:"Recipes", plan:"My week", near:"Near me", help:"Get help", about:"About",
  setLoc:"Add your ZIP", heroA:"Good food for less.", heroB:"Help", heroC:"close by.",
  heroLede:"Cheap, filling recipes priced to the cent, a week of meals that fits your budget, and real food help near you.",
  p1:"Free, always", p2:"No sign-up", p3:"Nothing tracked", p4:"English y español",
  locLabel:"Where are you? ZIP code or address", locPh:"e.g. 91942", go:"Go", useMine:"Use my location",
  locPriv:"Your location stays on this device.", locClear:"Forget it",
  locErr:"We couldn't find that. Try a 5-digit ZIP code.", locErrGeo:"Location isn't available. Type a ZIP instead.",
  d1:"Cook for less", d1s:"Recipes from about 40¢ a serving", d2:"Plan my week", d2s:"Meals and a shopping list for your budget",
  d3:"Find food near me", d3s:"Food banks, free meals, cheap groceries", d4:"Get help paying", d4s:"SNAP, WIC, school meals, real discounts",
  stirH:"Can't decide? Stir the pot.", stirS:"We'll pick a cheap dinner for you.", stir:"Stir the pot", another:"Another one",
  cheapH:"The cheapest dinners right now", seeAll:"See all recipes",
  urgentH:"Need food today?", urgentP:"Call or text 211 any time to reach local help. The USDA National Hunger Hotline answers weekdays, 8 AM to 8 PM Eastern.",
  call211:"Call 211", call211s:"Local help, 24/7", hotline:"1-866-3-HUNGRY", hotlines:"English", hotlineEs:"1-877-8-HAMBRE", hotlineEss:"Español",
  serving:"a serving", perServ:"per serving", mins:"min", serves:"Serves", servings:"servings",
  eq_stove:"Stovetop", eq_oven:"Oven", eq_micro:"Microwave", eq_none:"No cooking", eq_any:"Any kitchen",
  diet_all:"Everything", diet_veg:"Vegetarian", diet_vegan:"Vegan", diet_gf:"Gluten-free", diet_df:"Dairy-free", diet_hp:"High protein", diet_kid:"Kid favorites", diet_frz:"Freezer friendly",
  cookH:"Recipes that cost less", cookLede:"Every price is what the ingredients you use cost, at typical store-brand prices. Tap a card to cook.",
  search:"Search recipes or ingredients", kitchen:"What do you cook with?", diet:"Eating style", sort_cheap:"Cheapest first", sort_fast:"Fastest first", sort_prot:"Most protein",
  haveQ:"Cook with what I have", haveS:"Tap what's in your kitchen or your food bank box.", haveClear:"Clear", uses:"Uses {n} of yours",
  none:"Nothing matches yet. Try fewer filters.",
  kcal:"calories", protein:"protein", ingredients:"Ingredients", steps:"Steps", stepsHint:"Tap a step when it's done.",
  tip:"Tip:", addList:"Add to my list", share:"Share", copied:"Copied", added:"Added to your list", keepOn:"Keep screen on", keepOnOn:"Screen stays on",
  pantryItem:"pantry", total:"Total", oatsGF:"For gluten-free, use oats labeled gluten-free.", soyGF:"For gluten-free, use tamari instead of soy sauce.",
  planH:"A week of meals, priced", planLede:"Tell us who's eating. We'll plan cheap, filling meals and write the shopping list.",
  adults:"Adults and teens", kids:"Kids under 12", mealsQ:"Which meals?", b:"Breakfast", l:"Lunch", d:"Dinner",
  weekCost:"for the week", monthCost:"About {m} a month", perPerson:"{p} per person per day",
  snapRef:"For reference, the most SNAP pays a household of {n} is {m} a month.", snapRef2:"This plan uses about {pct} of that.",
  kcalDay:"These meals give each person about {k} calories a day. Most adults and teens need more, so add bread, rice, fruit or seconds. A pound of rice adds about 1,600 calories for $1.10.",
  reshuffle:"Shuffle the week", swap:"Swap", days:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
  shopH:"Shopping list", shopS:"Rounded up to the packages you'd actually buy. Tap to check off.", trip:"This trip", have:"I have it", needIt:"Need it",
  copyList:"Copy list", print:"Print", lasts:"Spices, oil and sugar last for weeks, so the first trip costs more than the weeks after.",
  aisle_prod:"Produce", aisle_pantry:"Pantry", aisle_cans:"Cans and jars", aisle_dairy:"Dairy and eggs", aisle_meat:"Meat", aisle_frozen:"Frozen", aisle_bread:"Bread and tortillas", aisle_spice:"Spices and baking",
  nearH:"Food near you", nearLede:"Free food, free meals, cheaper groceries and farmers markets around you.",
  needLoc:"Add your ZIP code to see places near you.", cat_all:"Everything", cat_free:"Free food", cat_meal:"Free meals", cat_grocery:"Groceries", cat_market:"Farmers markets",
  within:"Within", loading:"Looking around you…", found:"{n} places", nothing:"We didn't find any in this area on the map. That doesn't mean there aren't any. Try a wider area or the official finders below.",
  mapErr:"The map service is busy right now. The official finders below still work.", retry:"Try again", showMore:"Show more",
  t_foodbank:"Food bank or pantry", t_fridge:"Community fridge or free pantry", t_soup:"Free meals", t_langar:"Gurdwara · free langar meal, open to all", t_super:"Grocery store", t_discount:"Discount grocer", t_green:"Produce market", t_whole:"Warehouse store", t_market:"Market", t_farm:"Farm stand",
  directions:"Directions", callp:"Call", web:"Website", hours:"Hours",
  osmNote:"Places come from OpenStreetMap, which volunteers keep up. Hours change, so call ahead when you can.",
  langarNote:"Most gurdwaras serve a free vegetarian meal to anyone who comes, no questions asked. Cover your head and take off your shoes inside. Call first to check the times.",
  officialH:"Official finders", officialS:"These are the most complete lists, run by the people who run the programs.",
  f_fa:"Feeding America food bank finder", f_fas:"Every member food bank in the U.S.",
  f_fh:"findhelp.org", f_fhs:"Pantries, meals and more by ZIP. Free.",
  f_211:"211", f_211s:"Call, text or chat with a local helper.",
  f_snap:"USDA SNAP store map", f_snaps:"Every store that takes EBT. Filter for stores that match produce dollars.",
  f_mow:"Meals on Wheels", f_mows:"Meals delivered for older adults and people with disabilities.",
  f_hud:"HUD Find Shelter", f_huds:"Food pantries, shelters and clinics.",
  f_online:"SNAP online stores in {s}", f_onlines:"Stores that take EBT for online grocery orders and delivery.",
  helpH:"Help paying for food", helpLede:"Answer a few questions to see what you may qualify for. It all stays on this phone and we never see it. Only the program office can say yes for sure, so if in doubt, apply.",
  hhSize:"People in your home", income:"Monthly income before taxes", incomeS:"Add up pay, benefits and support for everyone. A guess is fine.",
  whoQ:"Anyone in your home who is…", w_preg:"Pregnant, breastfeeding, or a child under 5", w_school:"In school (K–12)", w_senior:"60 or older", w_dis:"Living with a disability", w_student:"A college student", w_home:"Without a stable place to live",
  check:"Show my options", likely:"Looks likely", maybe:"Worth applying", ask:"Still worth asking",
  yourState:"in {s}", apply:"How to apply", learn:"Learn more", phone:"Call",
  snapH:"SNAP food benefits", snapP:"Money for groceries each month on an EBT card. Use it at most grocery stores, many farmers markets and online.",
  snapMax:"For {n} people, the most it pays is {m} a month.", snapNote:"Rules changed in 2025: adults 18 to 64 without kids under 14 may need to work or train 80 hours a month. Some non-citizens lost eligibility. The office will tell you what applies to you.",
  snapExp:"If you have almost no money this month, ask for expedited SNAP. It can arrive within 7 days.",
  wicH:"WIC", wicP:"Healthy food, formula, breastfeeding help and nutrition support for pregnant people, new parents and kids under 5. Dads, grandparents and foster parents can apply for kids too.",
  wicNote:"If you get SNAP or Medicaid, you usually already meet WIC's income rule. WIC does not ask about immigration status.",
  schoolH:"Free school meals", schoolP:"Breakfast and lunch at school.", schoolU:"{s} gives free school meals to every student, no application needed.", schoolF:"At your income, kids likely get free meals. Ask the school for the meal form.", schoolR:"At your income, kids likely get reduced-price meals (40¢ or less).", schoolA:"Many schools serve free meals to every student anyway. Ask your school.",
  sebtH:"Summer EBT (SUN Bucks)", sebtP:"$120 per school-age child for groceries over the summer, on a card.", sebtNo:"{s} did not offer Summer EBT in 2026. Free summer meal sites for kids still run in most towns.", sebtYes:"{s} offered it in 2026. Kids on SNAP or free school meals are often enrolled automatically.",
  csfpH:"Senior food box (CSFP)", csfpP:"A free box of groceries each month for adults 60 and older with low income.",
  mowH:"Meals on Wheels and senior meals", mowP:"Hot meals delivered at home, or shared meals at senior centers. Usually free or by donation for 60+ and people with disabilities.",
  rmpH:"Use SNAP at restaurants", rmpP:"{s} lets SNAP households where everyone is 60+, disabled or without a home buy hot meals at approved restaurants.",
  stuH:"Help for college students", stuP:"Most campuses have a free food pantry, and many have emergency meal swipes. College students can get SNAP if they work 20 hours a week, do work-study, or care for a young child, among other reasons.",
  homeH:"Food without a kitchen", homeP:"Soup kitchens, free meal programs and gurdwara langar serve hot meals. SNAP has no address requirement, and you can use a shelter or office address.",
  fbH:"Food banks and pantries", fbP:"Free groceries, usually once a week or month. Most pantries just ask for your name and ZIP code, and many don't ask about income at all.",
  hotH:"Talk to someone", hotP:"The USDA National Hunger Hotline, run by Hunger Free America, helps you find food near you. Weekdays 8 AM to 8 PM Eastern.",
  saveH:"Discounts that are real", saveLede:"Every one of these is legit. We note what each one asks you to share, so you can decide.",
  priv_g:"Shares little", priv_y:"Needs an account", priv_r:"Tracks what you buy",
  flagsH:"Skip these", flagsList:["Anyone who charges a fee to help you apply for SNAP, WIC or school meals. Applying is always free.","Ads or texts promising a \"$500 grocery card\" or \"free food stamps\" in exchange for your Social Security number.","Texts or calls saying your EBT card is locked and asking for your PIN. Your state will never ask for your PIN.","Payday loans or \"cash for your EBT\" offers. Selling benefits can get you disqualified."],
  ebtH:"Protect your EBT card", ebtList:["Change your PIN often and never write it on the card.","Lock your card between shopping trips in your state's EBT app (often ebtEDGE or ConnectEBT) or at the number on the back.","Check card readers for loose or bulky parts before you swipe.","Stolen benefits are no longer replaced by the federal government in most states, so locking the card matters."],
  aboutH:"About Potful", privacyH:"Your privacy",
  footA:"Potful is free and always will be. No ads, no accounts, no tracking.", footB:"Prices: U.S. Bureau of Labor Statistics (Oct 2026) and typical store-brand prices. Programs: USDA. Places: OpenStreetMap contributors.",
  footC:"Made with care in San Diego.", resetAll:"Erase everything Potful saved on this device", erased:"Erased",
  editPrice:"Your price", editHint:"Prices where you shop differ. Tap any price on your list to change it. We'll use your price everywhere.",
  priceFor:"What do you pay for {pkg}?", reset:"Reset", save:"Save", cancel:"Cancel",
  langName:"Español"
},
es: {
  home:"Inicio", cook:"Recetas", plan:"Mi semana", near:"Cerca de mí", help:"Ayuda", about:"Acerca de",
  setLoc:"Pon tu código postal", heroA:"Buena comida por menos.", heroB:"Ayuda", heroC:"cerca de ti.",
  heroLede:"Recetas baratas y llenadoras con su precio exacto, una semana de comidas a tu presupuesto y ayuda real con comida cerca de ti.",
  p1:"Gratis, siempre", p2:"Sin registrarte", p3:"No rastreamos nada", p4:"English y español",
  locLabel:"¿Dónde estás? Código postal o dirección", locPh:"ej. 91942", go:"Ir", useMine:"Usar mi ubicación",
  locPriv:"Tu ubicación se queda en este aparato.", locClear:"Olvidarla",
  locErr:"No lo encontramos. Prueba con un código postal de 5 dígitos.", locErrGeo:"No hay acceso a la ubicación. Escribe tu código postal.",
  d1:"Cocina por menos", d1s:"Recetas desde unos 40¢ por porción", d2:"Planea mi semana", d2s:"Comidas y lista del súper a tu presupuesto",
  d3:"Comida cerca de mí", d3s:"Bancos de comida, comidas gratis, súper barato", d4:"Ayuda para pagar", d4s:"SNAP, WIC, comida escolar, descuentos reales",
  stirH:"¿No sabes qué hacer? Menea la olla.", stirS:"Te escogemos una cena barata.", stir:"Menear la olla", another:"Otra",
  cheapH:"Las cenas más baratas ahora", seeAll:"Ver todas las recetas",
  urgentH:"¿Necesitas comida hoy?", urgentP:"Llama o manda mensaje al 211 a cualquier hora para recibir ayuda local. La línea nacional contra el hambre del USDA atiende entre semana de 8 AM a 8 PM, hora del Este.",
  call211:"Llama al 211", call211s:"Ayuda local, 24/7", hotline:"1-866-3-HUNGRY", hotlines:"Inglés", hotlineEs:"1-877-8-HAMBRE", hotlineEss:"Español",
  serving:"la porción", perServ:"por porción", mins:"min", serves:"Porciones", servings:"porciones",
  eq_stove:"Estufa", eq_oven:"Horno", eq_micro:"Microondas", eq_none:"Sin cocinar", eq_any:"Cualquier cocina",
  diet_all:"Todo", diet_veg:"Vegetariano", diet_vegan:"Vegano", diet_gf:"Sin gluten", diet_df:"Sin lácteos", diet_hp:"Alto en proteína", diet_kid:"Favoritas de niños", diet_frz:"Para congelar",
  cookH:"Recetas que cuestan menos", cookLede:"Cada precio es lo que cuestan los ingredientes que usas, a precios típicos de marca de la tienda. Toca una tarjeta para cocinar.",
  search:"Busca recetas o ingredientes", kitchen:"¿Con qué cocinas?", diet:"Forma de comer", sort_cheap:"Más baratas", sort_fast:"Más rápidas", sort_prot:"Más proteína",
  haveQ:"Cocina con lo que tienes", haveS:"Toca lo que hay en tu cocina o en tu caja del banco de comida.", haveClear:"Borrar", uses:"Usa {n} de lo tuyo",
  none:"Nada coincide todavía. Quita algunos filtros.",
  kcal:"calorías", protein:"proteína", ingredients:"Ingredientes", steps:"Pasos", stepsHint:"Toca cada paso cuando lo termines.",
  tip:"Consejo:", addList:"Agregar a mi lista", share:"Compartir", copied:"Copiado", added:"Agregado a tu lista", keepOn:"Pantalla encendida", keepOnOn:"La pantalla no se apaga",
  pantryItem:"despensa", total:"Total", oatsGF:"Para sin gluten, usa avena que diga sin gluten.", soyGF:"Para sin gluten, usa tamari en vez de soya.",
  planH:"Una semana de comidas, con precio", planLede:"Dinos quién come. Planeamos comidas baratas y llenadoras y te hacemos la lista del súper.",
  adults:"Adultos y adolescentes", kids:"Niños menores de 12", mealsQ:"¿Qué comidas?", b:"Desayuno", l:"Almuerzo", d:"Cena",
  weekCost:"por la semana", monthCost:"Unos {m} al mes", perPerson:"{p} por persona al día",
  snapRef:"Como referencia, lo máximo que SNAP da a un hogar de {n} es {m} al mes.", snapRef2:"Este plan usa como el {pct} de eso.",
  kcalDay:"Estas comidas dan a cada persona unas {k} calorías al día. Casi todos los adultos y adolescentes necesitan más: agrega pan, arroz, fruta o repetir plato. Una libra de arroz agrega unas 1,600 calorías por $1.10.",
  reshuffle:"Revolver la semana", swap:"Cambiar", days:["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"],
  shopH:"Lista del súper", shopS:"Redondeado a los paquetes que de verdad comprarías. Toca para tachar.", trip:"Esta compra", have:"Ya tengo", needIt:"Me falta",
  copyList:"Copiar lista", print:"Imprimir", lasts:"Las especias, el aceite y el azúcar duran semanas, así que la primera compra cuesta más que las siguientes.",
  aisle_prod:"Frutas y verduras", aisle_pantry:"Despensa", aisle_cans:"Latas y frascos", aisle_dairy:"Lácteos y huevo", aisle_meat:"Carne", aisle_frozen:"Congelados", aisle_bread:"Pan y tortillas", aisle_spice:"Especias y repostería",
  nearH:"Comida cerca de ti", nearLede:"Comida gratis, comidas gratis, súper más barato y mercados de agricultores a tu alrededor.",
  needLoc:"Pon tu código postal para ver lugares cerca.", cat_all:"Todo", cat_free:"Comida gratis", cat_meal:"Comidas gratis", cat_grocery:"Súper", cat_market:"Mercados",
  within:"A menos de", loading:"Buscando a tu alrededor…", found:"{n} lugares", nothing:"No encontramos ninguno en el mapa de esta zona. Eso no quiere decir que no haya. Prueba un área más grande o los buscadores oficiales de abajo.",
  mapErr:"El servicio del mapa está ocupado. Los buscadores oficiales de abajo sí funcionan.", retry:"Intentar otra vez", showMore:"Ver más",
  t_foodbank:"Banco de comida o despensa", t_fridge:"Refri comunitario o despensa gratis", t_soup:"Comidas gratis", t_langar:"Gurdwara · comida langar gratis, abierta a todos", t_super:"Supermercado", t_discount:"Súper de descuento", t_green:"Frutería", t_whole:"Tienda de mayoreo", t_market:"Mercado", t_farm:"Puesto de granja",
  directions:"Cómo llegar", callp:"Llamar", web:"Sitio web", hours:"Horario",
  osmNote:"Los lugares vienen de OpenStreetMap, que mantienen voluntarios. Los horarios cambian, así que llama antes si puedes.",
  langarNote:"Casi todos los gurdwaras sirven comida vegetariana gratis a quien llegue, sin preguntas. Cúbrete la cabeza y quítate los zapatos adentro. Llama antes para saber los horarios.",
  officialH:"Buscadores oficiales", officialS:"Son las listas más completas, de quienes manejan los programas.",
  f_fa:"Buscador de Feeding America", f_fas:"Todos los bancos de comida miembros en EE. UU.",
  f_fh:"findhelp.org", f_fhs:"Despensas, comidas y más por código postal. Gratis.",
  f_211:"211", f_211s:"Llama, manda mensaje o chatea con alguien de tu zona.",
  f_snap:"Mapa de tiendas SNAP del USDA", f_snaps:"Todas las tiendas que aceptan EBT. Filtra las que duplican dinero para frutas y verduras.",
  f_mow:"Meals on Wheels", f_mows:"Comidas a domicilio para adultos mayores y personas con discapacidad.",
  f_hud:"HUD Find Shelter", f_huds:"Despensas, albergues y clínicas.",
  f_online:"Tiendas SNAP en línea en {s}", f_onlines:"Tiendas que aceptan EBT para compras en línea y a domicilio.",
  helpH:"Ayuda para pagar la comida", helpLede:"Contesta unas preguntas para ver a qué podrías calificar. Todo se queda en este teléfono y nunca lo vemos. Solo la oficina del programa puede decir que sí, así que si tienes duda, aplica.",
  hhSize:"Personas en tu hogar", income:"Ingreso mensual antes de impuestos", incomeS:"Suma sueldos, beneficios y apoyos de todos. Un cálculo está bien.",
  whoQ:"¿Alguien en tu hogar que esté…", w_preg:"Embarazada, amamantando, o un niño menor de 5", w_school:"En la escuela (K–12)", w_senior:"Tenga 60 años o más", w_dis:"Viva con una discapacidad", w_student:"Estudie en universidad", w_home:"Sin un lugar estable para vivir",
  check:"Ver mis opciones", likely:"Es probable", maybe:"Vale la pena aplicar", ask:"Pregunta de todos modos",
  yourState:"en {s}", apply:"Cómo aplicar", learn:"Más información", phone:"Llamar",
  snapH:"Beneficios de comida SNAP", snapP:"Dinero para el súper cada mes en una tarjeta EBT. Se usa en casi todos los supermercados, muchos mercados de agricultores y en línea.",
  snapMax:"Para {n} personas, lo máximo es {m} al mes.", snapNote:"Las reglas cambiaron en 2025: adultos de 18 a 64 años sin hijos menores de 14 podrían tener que trabajar o capacitarse 80 horas al mes. Algunos no ciudadanos perdieron el derecho. La oficina te dirá qué aplica en tu caso.",
  snapExp:"Si este mes casi no tienes dinero, pide SNAP urgente (expedited). Puede llegar en 7 días.",
  wicH:"WIC", wicP:"Comida saludable, fórmula, apoyo para amamantar y nutrición para embarazadas, mamás y papás recientes y niños menores de 5. Papás, abuelos y padres de crianza también pueden aplicar por los niños.",
  wicNote:"Si recibes SNAP o Medicaid, casi siempre ya cumples con el ingreso de WIC. WIC no pregunta por estatus migratorio.",
  schoolH:"Comida escolar gratis", schoolP:"Desayuno y almuerzo en la escuela.", schoolU:"{s} da comida escolar gratis a todos los alumnos, sin solicitud.", schoolF:"Con tu ingreso, los niños probablemente reciben comida gratis. Pide el formulario en la escuela.", schoolR:"Con tu ingreso, los niños probablemente pagan precio reducido (40¢ o menos).", schoolA:"Muchas escuelas dan comida gratis a todos de todos modos. Pregunta en tu escuela.",
  sebtH:"Summer EBT (SUN Bucks)", sebtP:"$120 por niño en edad escolar para el súper durante el verano, en una tarjeta.", sebtNo:"{s} no ofreció Summer EBT en 2026. En casi todos los pueblos sigue habiendo comidas de verano gratis para niños.", sebtYes:"{s} lo ofreció en 2026. Los niños con SNAP o comida escolar gratis muchas veces quedan inscritos solos.",
  csfpH:"Caja de comida para mayores (CSFP)", csfpP:"Una caja gratis de alimentos cada mes para adultos de 60 o más con bajos ingresos.",
  mowH:"Meals on Wheels y comidas para mayores", mowP:"Comidas calientes a domicilio o en centros para mayores. Casi siempre gratis o por donativo para mayores de 60 y personas con discapacidad.",
  rmpH:"Usa SNAP en restaurantes", rmpP:"{s} permite a hogares con SNAP donde todos tienen 60+, alguna discapacidad o no tienen vivienda comprar comida caliente en restaurantes aprobados.",
  stuH:"Ayuda para universitarios", stuP:"Casi todos los campus tienen una despensa gratis y muchos dan comidas de emergencia. Los universitarios pueden recibir SNAP si trabajan 20 horas a la semana, tienen work-study o cuidan a un niño pequeño, entre otras razones.",
  homeH:"Comida sin cocina", homeP:"Comedores, programas de comida gratis y el langar de los gurdwaras sirven comida caliente. SNAP no exige domicilio: puedes usar la dirección de un albergue u oficina.",
  fbH:"Bancos de comida y despensas", fbP:"Despensa gratis, normalmente cada semana o cada mes. Casi siempre solo piden tu nombre y código postal, y muchos no preguntan tu ingreso.",
  hotH:"Habla con alguien", hotP:"La línea nacional contra el hambre del USDA, operada por Hunger Free America, te ayuda a encontrar comida cerca. Entre semana de 8 AM a 8 PM, hora del Este.",
  saveH:"Descuentos que sí son reales", saveLede:"Todos son legítimos. Te decimos qué te pide cada uno, para que tú decidas.",
  priv_g:"Pide muy poco", priv_y:"Necesita cuenta", priv_r:"Registra lo que compras",
  flagsH:"Evita esto", flagsList:["Quien te cobre por ayudarte a aplicar a SNAP, WIC o comida escolar. Aplicar siempre es gratis.","Anuncios o mensajes que prometen una \"tarjeta de $500 para el súper\" o \"estampillas gratis\" a cambio de tu número de Seguro Social.","Mensajes o llamadas que dicen que tu tarjeta EBT está bloqueada y piden tu NIP. Tu estado nunca te pedirá tu NIP.","Préstamos rápidos u ofertas de \"efectivo por tu EBT\". Vender beneficios te puede descalificar."],
  ebtH:"Protege tu tarjeta EBT", ebtList:["Cambia tu NIP seguido y nunca lo escribas en la tarjeta.","Bloquea tu tarjeta entre compras con la app EBT de tu estado (muchas veces ebtEDGE o ConnectEBT) o al número de atrás.","Revisa que el lector de tarjetas no tenga piezas flojas o abultadas.","En casi todos los estados el gobierno federal ya no repone beneficios robados, así que bloquear la tarjeta importa."],
  aboutH:"Acerca de Potful", privacyH:"Tu privacidad",
  footA:"Potful es gratis y siempre lo será. Sin anuncios, sin cuentas, sin rastreo.", footB:"Precios: Oficina de Estadísticas Laborales de EE. UU. (oct 2026) y precios típicos de marca de la tienda. Programas: USDA. Lugares: colaboradores de OpenStreetMap.",
  footC:"Hecho con cariño en San Diego.", resetAll:"Borrar todo lo que Potful guardó en este aparato", erased:"Borrado",
  editPrice:"Tu precio", editHint:"Los precios cambian según dónde compras. Toca cualquier precio en tu lista para cambiarlo. Usaremos tu precio en todo.",
  priceFor:"¿Cuánto pagas por {pkg}?", reset:"Restablecer", save:"Guardar", cancel:"Cancelar",
  langName:"English"
}};
const t = (k, v) => { let s = (T[S.lang][k] ?? T.en[k] ?? k); if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; };

/* ---------- icons ---------- */
const P = {
  home:'<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  spoon:'<ellipse cx="9" cy="7" rx="3.4" ry="4.4"/><path d="M9 11.4V20"/><path d="M16 3v6.5a2 2 0 0 0 2 2M20 3v6.5a2 2 0 0 1-2 2v8.5M18 3v6"/>',
  cal:'<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M8 14h2M12 14h2M8 17h2"/>',
  pin:'<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/>',
  heart:'<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/>',
  check:'<path d="M5 12.5 10 17l9-10"/>', x:'<path d="M6 6l12 12M18 6 6 18"/>', clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/>',
  people:'<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="17" cy="9.5" r="2.3"/><path d="M15.5 14.3c2.4-.3 4.4 1.2 5 4.2"/>',
  flame:'<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 3-5.4 3.6-9.4 2.4 1.4 3.2 3.6 3 5.4 1-.6 1.7-1.8 1.8-3 2 1.6 3.6 4 3.6 7 0 3.2-2.4 5.6-6 5.6z"/>',
  bolt:'<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>', search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  swap:'<path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5"/>', share:'<path d="M12 4v11M7.5 8.5 12 4l4.5 4.5"/><path d="M5 13v6h14v-6"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  print:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 14h10v6H7z"/>',
  phone:'<path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>', ext:'<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  shield:'<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z"/><path d="m9 12 2 2 4-4"/>', basket:'<path d="M3 10h18l-2 9.5H5z"/><path d="M8 10l3-6M16 10l-3-6M9 14v2.5M12 14v2.5M15 14v2.5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  locate:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
  /* recipe icons */
  pot:'<path d="M4 10h16v5.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5z"/><path d="M4 12H2M20 12h2M7 7.2c.8-1 .8-2 0-3M12 7.2c.8-1 .8-2 0-3M17 7.2c.8-1 .8-2 0-3"/>',
  pan:'<ellipse cx="10" cy="13" rx="7.5" ry="4.5"/><path d="M17.2 11.5 22 9.5"/><circle cx="8" cy="12.5" r="1.6"/><circle cx="12" cy="13.5" r="1.3"/>',
  tray:'<rect x="3" y="8" width="18" height="10" rx="2"/><circle cx="8" cy="13" r="2"/><path d="M13 11.5h4M13 14.5h3"/>',
  noodle:'<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 11c0-3 1.5-5 1.5-7M12 11c0-3 1.5-5 1.5-7M16 11V4"/>',
  mug:'<path d="M5 8h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M9 5c.6-.8.6-1.6 0-2.4M12 5c.6-.8.6-1.6 0-2.4"/>',
  jar:'<path d="M7 4h10v3H7z"/><path d="M6.5 7h11l-.5 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M8 12h8"/>',
  wrap:'<path d="M5 17.5 15.5 7a3.5 3.5 0 0 1 5 5L10 22.5"/><path d="M5 17.5c1.5 1.5 3.5 3.5 5 5M3.5 19.5l2.5-1M8 22l1-2.5"/>',
  bowl:'<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 8.5c1-1.5 3-1.5 4 0M13 8c1-1.2 2.6-1.2 3.6 0"/>',
  sandwich:'<path d="M3 10 12 4l9 6z"/><path d="M3 13.5h18M3 17h18l-1 2.5H4z"/>',
  taco:'<path d="M3 17a9 9 0 0 1 18 0z"/><path d="M6 13c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 2 .8 3 0"/>'
};
const ico = (n, c = "i") => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;

/* ---------- money + quantities ---------- */
const money = (v, cents = true) => {
  if (!cents || v >= 100) return "$" + Math.round(v).toLocaleString("en-US");
  return "$" + v.toFixed(2);
};
const tagPrice = v => v < 1 ? `<b>${Math.round(v * 100)}<sup>¢</sup></b>` : `<b><sup>$</sup>${v.toFixed(2)}</b>`;
const FR = [[0,""],[.125,"⅛"],[.25,"¼"],[.333,"⅓"],[.5,"½"],[.667,"⅔"],[.75,"¾"],[1,""]];
function fq(q) {
  if (q >= 10) return String(Math.round(q));
  let w = Math.floor(q), f = q - w, best = FR[0], d = 9;
  for (const x of FR) { const dd = Math.abs(f - x[0]); if (dd < d) { d = dd; best = x; } }
  if (d > .07) return (Math.round(q * 10) / 10).toString();
  if (best[0] === 1) { w += 1; best = FR[0]; }
  if (!w && !best[1]) return (Math.round(q * 100) / 100).toString();
  return (w ? w : "") + best[1];
}
const CUPS = { rice: 2.25, lentils: 2.3, flour: 3.6, oats: 5.3, dbeans: 2.3, peas_d: 2.25 };
const NOUNIT = new Set(["onion","egg","banana","lime","pepper","tortilla"]);
function plural(u, q) {
  if (q <= 1 || ["lb","oz","tbsp","tsp","cda","cdita"].includes(u)) return u;
  if (S.lang === "es") return u === "limón" ? "limones" : /[aeiou]$/.test(u) ? u + "s" : u + "es";
  return u === "bunch" ? "bunches" : u === "box" ? "boxes" : u + "s";
}
const pr = id => S.prices[id] ?? I[id][4];
const iname = id => I[id][L()];
const iunit = id => I[id][2 + L()];
function qtyLabel(id, q) {
  const u = I[id][2];
  if (CUPS[id]) {
    const c = q * CUPS[id];
    return `${fq(c)} ${S.lang === "es" ? (c > 1 ? "tazas" : "taza") : (c > 1 ? "cups" : "cup")}`;
  }
  if (u === "lb" && q < 0.5) return `${fq(q * 16)} oz`;
  if (u === "cup" && q < 0.24) return `${fq(q * 16)} ${S.lang === "es" ? "cda" : "tbsp"}`;
  if (u === "tbsp" && q < 1 && q > 0) return `${fq(q * 3)} ${S.lang === "es" ? "cdita" : "tsp"}`;
  return `${fq(q)} ${plural(iunit(id), q)}`;
}

/* ---------- recipe facts ---------- */
const flagsOf = r => r.ing.map(([id]) => I[id][12]).join("");
function facts(r) {
  if (r._f) return r._f;
  let k = 0, p = 0; for (const [id, q] of r.ing) { const x = I[id]; k += x[9] * q * x[10] / 100; p += x[9] * q * x[11] / 100; }
  const fl = flagsOf(r);
  const veg = !/[mf]/.test(fl), vegan = veg && !/[edx]/.test(fl);
  return (r._f = { kcal: Math.round(k / r.serves), prot: Math.round(p / r.serves), veg, vegan, gf: !/g/.test(fl), df: !/d/.test(fl), hp: p / r.serves >= 20 });
}
const cost = (r, servings) => r.ing.reduce((s, [id, q]) => s + pr(id) * q, 0) * (servings ?? 1) / r.serves;
function dietOk(r, d) {
  const f = facts(r);
  return d === "all" || (d === "veg" && f.veg) || (d === "vegan" && f.vegan) || (d === "gf" && f.gf) || (d === "df" && f.df) || (d === "hp" && f.hp) || (d === "kid" && r.kid) || (d === "frz" && r.freeze);
}
const eqOk = (r, e) => e === "any" || r.eq === e || (e === "stove" && ["micro","none"].includes(r.eq)) || (e === "oven" && r.eq === "none") || (e === "micro" && r.eq === "none");
const title = r => r.t[L()];

/* ---------- small UI helpers ---------- */
function toast(msg) { const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }
const chip = (label, on, attrs = "", icon = "") => `<button class="chip" type="button" aria-pressed="${on ? "true" : "false"}" ${attrs}>${icon ? ico(icon) : ""}${esc(label)}</button>`;
function badges(r) {
  const f = facts(r), b = [];
  if (f.vegan) b.push(`<span class="bdg">${t("diet_vegan")}</span>`); else if (f.veg) b.push(`<span class="bdg">${t("diet_veg")}</span>`);
  if (f.gf) b.push(`<span class="bdg y">${t("diet_gf")}</span>`);
  if (f.hp) b.push(`<span class="bdg r">${t("diet_hp")}</span>`);
  if (r.freeze) b.push(`<span class="bdg y">${t("diet_frz")}</span>`);
  return b.join("");
}
function card(r, extra = "") {
  const f = facts(r);
  return `<button class="rcard" type="button" data-r="${r.id}">
    <div class="lines" aria-hidden="true"></div>
    <div class="tag" aria-label="${money(cost(r))} ${t("perServ")}">${tagPrice(cost(r))}<small>${t("serving")}</small></div>
    <div class="body">${ico(r.icon, "i ico")}
      <h3>${esc(title(r))}</h3>
      <div class="badges">${badges(r)}</div>${extra}
      <div class="meta"><span>${ico("clock")}${r.mins} ${t("mins")}</span><span>${ico("flame")}${t("eq_" + r.eq)}</span><span>${f.prot} g ${t("protein")}</span></div>
    </div></button>`;
}

/* ---------- location ---------- */
function zipState(z) { const n = parseInt(String(z).slice(0, 3), 10); for (const [a, b, s] of window.POT_ZIP3) if (n >= a && n <= b) return s; return null; }
async function getJSON(url, opts = {}, ms = 12000) {
  const c = new AbortController(); const tm = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { ...opts, signal: c.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(tm); }
}
async function locate(text) {
  text = text.trim();
  if (/^\d{5}$/.test(text)) {
    const st = zipState(text);
    try {
      const j = await getJSON("https://api.zippopotam.us/us/" + text);
      const p = j.places[0];
      return { zip: text, label: `${p["place name"]}, ${p["state abbreviation"]}`, lat: +p.latitude, lon: +p.longitude, state: p["state abbreviation"] };
    } catch (e) {
      try {
        const j = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&country=us&postalcode=${text}&limit=1`);
        if (j[0]) return { zip: text, label: `${text}${st ? ", " + st : ""}`, lat: +j[0].lat, lon: +j[0].lon, state: st };
      } catch (e2) {}
      if (st) return { zip: text, label: `${text}, ${st}`, lat: null, lon: null, state: st };
      throw new Error("nf");
    }
  }
  const j = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=us&addressdetails=1&limit=1&q=${encodeURIComponent(text)}`);
  if (!j[0]) throw new Error("nf");
  return fromNominatim(j[0]);
}
function fromNominatim(o) {
  const a = o.address || {}, iso = a["ISO3166-2-lvl4"] || "", st = iso.startsWith("US-") ? iso.slice(3) : (a.postcode ? zipState(a.postcode) : null);
  const town = a.city || a.town || a.village || a.suburb || a.county || "";
  return { zip: (a.postcode || "").slice(0, 5), label: [town, st].filter(Boolean).join(", ") || o.display_name.split(",")[0], lat: +o.lat, lon: +o.lon, state: st };
}
function setLoc(loc) { S.loc = loc; store.set("loc", loc); S.near.data = null; paintWhere(); }
function locForm() {
  return `<form class="locbox" id="locf" autocomplete="on">
    <label for="locin">${t("locLabel")}</label>
    <div class="locrow"><input id="locin" name="postal-code" inputmode="text" autocomplete="postal-code" placeholder="${t("locPh")}" value="${esc(S.loc?.zip || "")}"><button class="btn red" type="submit">${t("go")}</button></div>
    <div class="locmeta"><button type="button" class="linkbtn" id="geo">${ico("locate")} ${t("useMine")}</button>
    <span class="muted">${S.loc ? `<b>${esc(S.loc.label)}</b> · <button type="button" class="linkbtn" id="forget">${t("locClear")}</button>` : t("locPriv")}</span></div>
    <div class="err" id="locerr" role="alert"></div></form>`;
}
function bindLoc(after) {
  const f = $("#locf"); if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault(); const v = $("#locin").value; if (!v.trim()) return;
    $("#locerr").textContent = ""; f.querySelector("button[type=submit]").textContent = "…";
    try { setLoc(await locate(v)); after ? after() : render(); }
    catch (err) { $("#locerr").textContent = t("locErr"); f.querySelector("button[type=submit]").textContent = t("go"); }
  };
  $("#geo").onclick = () => {
    if (!navigator.geolocation) { $("#locerr").textContent = t("locErrGeo"); return; }
    $("#geo").textContent = "…";
    navigator.geolocation.getCurrentPosition(async p => {
      const { latitude: lat, longitude: lon } = p.coords;
      let loc = { zip: "", label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon, state: null };
      try { loc = { ...fromNominatim(await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=16&lat=${lat}&lon=${lon}`)), lat, lon }; } catch (e) {}
      setLoc(loc); after ? after() : render();
    }, () => { $("#locerr").textContent = t("locErrGeo"); $("#geo").innerHTML = `${ico("locate")} ${t("useMine")}`; }, { timeout: 10000, maximumAge: 600000 });
  };
  const fg = $("#forget"); if (fg) fg.onclick = () => { S.loc = null; store.set("loc", null); S.near.data = null; paintWhere(); render(); };
}
function paintWhere() {
  $("#where").innerHTML = `${ico("pin")}<span>${S.loc ? esc(S.loc.zip ? `${S.loc.zip} · ${S.loc.label}` : S.loc.label) : t("setLoc")}</span>`;
}

/* ---------- views ---------- */
const VIEWS = ["home", "cook", "plan", "near", "help"];
const NAVI = { home: "home", cook: "spoon", plan: "cal", near: "pin", help: "heart" };
function paintNav(cur) {
  const html = VIEWS.map(v => `<a href="#${v}" ${v === cur ? 'aria-current="page"' : ""}>${ico(NAVI[v])}<span>${t(v)}</span></a>`).join("");
  $("#nav").innerHTML = html; $("#tabs").innerHTML = html;
}
function route() { const h = location.hash.slice(1); const [v, a] = h.split("/"); return { v: VIEWS.includes(v) || v === "about" ? v : (v === "r" ? "cook" : "home"), r: v === "r" ? a : null }; }
let curView = null;
function render() {
  const { v, r } = route();
  document.documentElement.lang = S.lang;
  $("#lang").textContent = S.lang === "es" ? "EN" : "ES";
  paintNav(v); paintWhere(); paintFoot();
  const m = $("#main");
  const fn = { home: vHome, cook: vCook, plan: vPlan, near: vNear, help: vHelp, about: vAbout }[v];
  m.innerHTML = `<div class="view">${fn()}</div>`;
  ({ home: bHome, cook: bCook, plan: bPlan, near: bNear, help: bHelp, about: bAbout })[v]();
  bindCards(m);
  if (curView !== v) { window.scrollTo(0, 0); curView = v; }
  if (r && RX[r]) openRecipe(r, true);
}
function bindCards(root) { $$(".rcard[data-r]", root).forEach(b => b.onclick = () => openRecipe(b.dataset.r)); }

/* HOME */
const potArt = `<svg class="pot-art" id="potart" viewBox="0 0 300 250" aria-hidden="true">
  <g class="steam" fill="none" stroke="var(--mute)" stroke-width="5" stroke-linecap="round"><path d="M108 92c-14-16 14-26 0-44"/><path d="M150 86c-14-16 14-26 0-46"/><path d="M192 92c-14-16 14-26 0-44"/></g>
  <g class="bob">
    <ellipse cx="150" cy="236" rx="96" ry="9" fill="var(--line)"/>
    <path d="M58 122h184v54c0 30-24 54-54 54h-76c-30 0-54-24-54-54z" fill="#D8452B"/>
    <path d="M58 140h184" stroke="#B8361F" stroke-width="5"/>
    <path d="M58 132H32M242 132h26" stroke="var(--ink)" stroke-width="10" stroke-linecap="round"/>
    <path d="M48 114h204" stroke="var(--ink)" stroke-width="9" stroke-linecap="round"/>
    <circle cx="150" cy="102" r="9" fill="var(--ink)"/>
    <g fill="#FFFDF8" opacity=".9"><circle cx="104" cy="178" r="7"/><circle cx="124" cy="194" r="4.5"/><circle cx="196" cy="170" r="5"/><circle cx="176" cy="198" r="7"/><circle cx="150" cy="176" r="4"/></g>
    <g fill="#F3B63F"><path d="M210 52l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z"/></g>
    <g fill="#3D7A4B"><path d="M74 64c10-12 26-12 30-4-8 10-22 12-30 4z"/></g>
  </g></svg>`;
function vHome() {
  const dinners = R.filter(r => r.serves >= 4 && !S_SLOTS_B.has(r.id)).sort((a, b) => cost(a) - cost(b)).slice(0, 4);
  return `<section class="hero">
    <div>
      <h1>${t("heroA")}<br>${t("heroB")} <em>${t("heroC")}</em></h1>
      <p class="lede">${t("heroLede")}</p>
      <ul class="promise"><li>${ico("check")}${t("p1")}</li><li>${ico("check")}${t("p2")}</li><li>${ico("check")}${t("p3")}</li><li>${ico("check")}${t("p4")}</li></ul>
      ${locForm()}
    </div>
    <div>${potArt}</div>
  </section>
  <section class="sec"><div class="doors">
    <a class="door d1" href="#cook"><div><b>${t("d1")}</b><span>${t("d1s")}</span></div>${ico("spoon", "i big")}</a>
    <a class="door d2" href="#plan"><div><b>${t("d2")}</b><span>${t("d2s")}</span></div>${ico("cal", "i big")}</a>
    <a class="door d3" href="#near"><div><b>${t("d3")}</b><span>${t("d3s")}</span></div>${ico("basket", "i big")}</a>
    <a class="door d4" href="#help"><div><b>${t("d4")}</b><span>${t("d4s")}</span></div>${ico("heart", "i big")}</a>
  </div></section>
  <section class="sec"><div class="sec-h"><div><h2>${t("stirH")}</h2><p class="muted" style="margin:6px 0 0">${t("stirS")}</p></div></div>
    <div class="roul"><div id="roulcard"></div><button class="btn red" id="stir" type="button">${ico("bolt")} ${t("stir")}</button></div></section>
  <section class="sec"><div class="sec-h"><h2>${t("cheapH")}</h2><a class="linkbtn" href="#cook">${t("seeAll")} →</a></div>
    <div class="strip">${dinners.map(r => card(r)).join("")}</div></section>
  ${urgent()}`;
}
const urgent = () => `<section class="urgent"><div><h3>${t("urgentH")}</h3><p>${t("urgentP")}</p></div>
  <div class="calls"><a class="call" href="tel:211">${t("call211")}<small>${t("call211s")}</small></a><a class="call" href="tel:18663486479">${t("hotline")}<small>${t("hotlines")}</small></a><a class="call" href="tel:18778426273">${t("hotlineEs")}<small>${t("hotlineEss")}</small></a></div></section>`;
const S_SLOTS_B = new Set(window.POT_SLOTS.breakfast);
let lastStir = null;
function bHome() {
  bindLoc(() => render());
  const pool = R.filter(r => r.serves >= 4 && !S_SLOTS_B.has(r.id) && cost(r) < 1.6);
  const show = () => {
    let r; do { r = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && r.id === lastStir);
    lastStir = r.id; $("#roulcard").innerHTML = card(r); bindCards($("#roulcard"));
  };
  show();
  $("#stir").onclick = () => { const p = $("#potart"); p.classList.remove("stir"); void p.offsetWidth; p.classList.add("stir"); show(); $("#stir").innerHTML = `${ico("bolt")} ${t("another")}`; };
}

/* COOK */
const PANTRY = ["rice","pasta","dbeans","cbeans","chick","lentils","oats","ctom","tuna","pb","eggs","potato","ftort","ctort","fmix","onion","cheddar","milk","bread","ramen","chleg","tofu","cabbage","banana"];
function vCook() {
  const c = S.cook, diets = ["all","veg","vegan","gf","df","hp","kid","frz"], eqs = ["any","stove","oven","micro","none"];
  return `<div class="kicker">${t("cook")}</div><h1 style="font-size:clamp(34px,6vw,54px);margin-top:6px">${t("cookH")}</h1><p class="lede">${t("cookLede")}</p>
  <div class="toolbar"><label class="search">${ico("search")}<span class="sr">${t("search")}</span><input id="q" type="search" placeholder="${t("search")}" value="${esc(c.q)}"></label>
    <select class="sel" id="sort" aria-label="Sort">${["cheap","fast","prot"].map(s => `<option value="${s}" ${c.sort === s ? "selected" : ""}>${t("sort_" + s)}</option>`).join("")}</select></div>
  <div class="filt-label">${t("diet")}</div><div class="chips" id="diets">${diets.map(d => chip(t("diet_" + d), c.diet === d, `data-d="${d}"`)).join("")}</div>
  <div class="filt-label">${t("kitchen")}</div><div class="chips" id="eqs">${eqs.map(e => chip(t("eq_" + e), c.eq === e, `data-e="${e}"`)).join("")}</div>
  <div style="margin-top:10px">${chip(t("haveQ"), c.showPantry, 'id="tgp"', "basket")}</div>
  <div id="pantrybox"></div>
  <div class="grid" id="rgrid"></div>`;
}
function paintPantry() {
  const c = S.cook, box = $("#pantrybox");
  box.innerHTML = c.showPantry ? `<div class="pantry"><div class="small muted" style="margin-bottom:8px">${t("haveS")} ${c.pantry.size ? `<button class="linkbtn" id="pclear">${t("haveClear")}</button>` : ""}</div>
    <div class="chips">${PANTRY.map(id => chip(iname(id), c.pantry.has(id), `data-p="${id}"`)).join("")}</div></div>` : "";
  $$("[data-p]", box).forEach(b => b.onclick = () => { c.pantry.has(b.dataset.p) ? c.pantry.delete(b.dataset.p) : c.pantry.add(b.dataset.p); paintPantry(); paintGrid(); });
  const pc = $("#pclear"); if (pc) pc.onclick = () => { c.pantry.clear(); paintPantry(); paintGrid(); };
}
function paintGrid() {
  const c = S.cook, q = c.q.trim().toLowerCase();
  let list = R.filter(r => dietOk(r, c.diet) && eqOk(r, c.eq) && (!q || title(r).toLowerCase().includes(q) || r.t[0].toLowerCase().includes(q) || r.ing.some(([id]) => I[id][0].toLowerCase().includes(q) || I[id][1].toLowerCase().includes(q))));
  const matches = r => r.ing.filter(([id]) => c.pantry.has(id)).length;
  const sorter = { cheap: (a, b) => cost(a) - cost(b), fast: (a, b) => a.mins - b.mins, prot: (a, b) => facts(b).prot - facts(a).prot }[c.sort];
  list.sort(c.pantry.size ? (a, b) => (matches(b) - matches(a)) || sorter(a, b) : sorter);
  const g = $("#rgrid");
  g.innerHTML = list.length ? list.map(r => card(r, c.pantry.size && matches(r) ? `<div class="match">${ico("check")} ${t("uses", { n: matches(r) })}</div>` : "")).join("") : `<div class="empty" style="grid-column:1/-1">${t("none")}</div>`;
  bindCards(g);
}
function bCook() {
  const c = S.cook;
  $("#q").oninput = e => { c.q = e.target.value; paintGrid(); };
  $("#sort").onchange = e => { c.sort = e.target.value; paintGrid(); };
  $$("[data-d]").forEach(b => b.onclick = () => { c.diet = b.dataset.d; $$("[data-d]").forEach(x => x.setAttribute("aria-pressed", x === b)); paintGrid(); });
  $$("[data-e]").forEach(b => b.onclick = () => { c.eq = b.dataset.e; $$("[data-e]").forEach(x => x.setAttribute("aria-pressed", x === b)); paintGrid(); });
  $("#tgp").onclick = () => { c.showPantry = !c.showPantry; $("#tgp").setAttribute("aria-pressed", c.showPantry); paintPantry(); };
  paintPantry(); paintGrid();
}

/* RECIPE SHEET */
let wake = null;
function openRecipe(id, fromRoute) {
  const r = RX[id]; if (!r) return;
  closeSheet(true);
  let sv = r.serves;
  const prev = location.hash;
  if (!fromRoute) history.pushState({ sheet: 1, prev }, "", "#r/" + id);
  const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.id = "sbg";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.id = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", title(r));
  document.body.append(bg, sh); document.body.style.overflow = "hidden";
  const f = facts(r), oats = r.ing.some(([i]) => i === "oats"), soy = r.ing.some(([i]) => i === "soy");
  const paint = () => {
    sh.innerHTML = `<div class="grab" aria-hidden="true"></div><button class="x" type="button" aria-label="Close">${ico("x")}</button>
    <div class="in">
      <div class="rhead"><div><div class="kicker">${t("eq_" + r.eq)} · ${r.mins} ${t("mins")}</div><h2 style="margin-top:6px">${esc(title(r))}</h2><div class="badges">${badges(r)}</div></div>
        <div class="tag big">${tagPrice(cost(r))}<small>${t("perServ")}</small></div></div>
      <div class="rfacts"><span>${ico("people")}<span class="stepper" role="group" aria-label="${t("servings")}"><button type="button" data-s="-1" aria-label="−">−</button><output>${sv}</output><button type="button" data-s="1" aria-label="+">+</button></span> ${t("servings")}</span>
        <span>${t("total")} ${money(cost(r, sv))}</span></div>
      <div class="rcols">
        <div><h3>${t("ingredients")}</h3><ul class="inglist">${r.ing.map(([id, q]) => { const qq = q * sv / r.serves; return `<li class="${/s/.test(I[id][12]) ? "s" : ""}"><span class="q">${qtyLabel(id, qq)}</span><span class="n">${NOUNIT.has(I[id][2]) ? "" : esc(iname(id))}</span><span class="c">${money(pr(id) * qq)}</span></li>`; }).join("")}</ul>
          <div class="nut"><div><b>${f.kcal}</b>${t("kcal")}</div><div><b>${f.prot} g</b>${t("protein")}</div><div><b>${money(cost(r) / Math.max(f.kcal, 1) * 100)}</b>/ 100 ${t("kcal")}</div></div>
          ${oats ? `<p class="note">${t("oatsGF")}</p>` : ""}${soy ? `<p class="note">${t("soyGF")}</p>` : ""}</div>
        <div><h3>${t("steps")}</h3><p class="note" style="margin-top:4px">${t("stepsHint")}</p><ol class="steps">${r.s.map(s => `<li tabindex="0">${esc(s[L()])}</li>`).join("")}</ol>
          ${r.tip ? `<div class="tipbox"><b>${t("tip")}</b> ${esc(r.tip[L()])}</div>` : ""}
          <div class="ractions"><button class="btn" id="addl" type="button">${ico("basket")} ${t("addList")}</button><button class="btn ghost" id="shr" type="button">${ico("share")} ${t("share")}</button>${"wakeLock" in navigator ? `<button class="btn ghost" id="wk" type="button">${ico("sun")} ${wake ? t("keepOnOn") : t("keepOn")}</button>` : ""}</div></div>
      </div></div>`;
    $(".x", sh).onclick = () => history.state?.sheet ? history.back() : closeSheet();
    $$("[data-s]", sh).forEach(b => b.onclick = () => { sv = Math.min(24, Math.max(1, sv + +b.dataset.s)); paint(); });
    $$(".steps li", sh).forEach(li => { const tg = () => li.classList.toggle("done"); li.onclick = tg; li.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tg(); } }; });
    $("#addl", sh).onclick = () => { addToList(r.id, sv); toast(t("added")); };
    $("#shr", sh).onclick = async () => {
      const url = location.origin + location.pathname + "#r/" + r.id, txt = `${title(r)} · ${money(cost(r))} ${t("perServ")}`;
      try { if (navigator.share) await navigator.share({ title: title(r), text: txt, url }); else { await navigator.clipboard.writeText(txt + "\n" + url); toast(t("copied")); } } catch (e) {}
    };
    const wk = $("#wk", sh); if (wk) wk.onclick = async () => {
      try { if (wake) { await wake.release(); wake = null; } else { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) {}
      paint();
    };
  };
  paint();
  bg.onclick = () => history.state?.sheet ? history.back() : closeSheet();
  sh.querySelector(".x").focus({ preventScroll: true });
}
function closeSheet(silent) {
  $("#sheet")?.remove(); $("#sbg")?.remove(); document.body.style.overflow = "";
  if (wake) { wake.release().catch(() => {}); wake = null; }
  if (!silent && location.hash.startsWith("#r/")) history.replaceState(null, "", "#cook");
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#sheet")) history.state?.sheet ? history.back() : closeSheet(); });

/* PLAN */
const AISLE = { rice:"pantry",pasta:"pantry",flour:"spice",oats:"pantry",lentils:"pantry",dbeans:"pantry",peas_d:"pantry",cbeans:"cans",chick:"cans",ctom:"cans",tpaste:"cans",tsauce:"cans",tuna:"cans",coco:"cans",corn:"cans",salsa:"cans",pb:"cans",mayo:"cans",soy:"cans",vinegar:"cans",oil:"pantry",ramen:"pantry",
  eggs:"dairy",milk:"dairy",cheddar:"dairy",yogurt:"dairy",butter:"dairy",tofu:"dairy",chleg:"meat",chbr:"meat",beef:"meat",bread:"bread",ftort:"bread",ctort:"bread",
  potato:"prod",sweetp:"prod",onion:"prod",carrot:"prod",cabbage:"prod",garlic:"prod",celery:"prod",pepper:"prod",gonion:"prod",cilantro:"prod",lime:"prod",banana:"prod",
  fmix:"frozen",fpeas:"frozen",fspin:"frozen",fbroc:"frozen",sugar:"spice",bpowder:"spice",bouil:"spice",cumin:"spice",chili:"spice",curry:"spice",paprika:"spice",italian:"spice",garpow:"spice",cinn:"spice" };
const AISLES = ["prod","pantry","cans","dairy","meat","frozen","bread","spice"];
const portions = () => S.hh.a + S.hh.k * 0.7;
function pools() {
  const ok = r => dietOk(r, S.diet) && eqOk(r, S.eq);
  return {
    b: window.POT_SLOTS.breakfast.map(i => RX[i]).filter(ok),
    l: window.POT_SLOTS.lunch.map(i => RX[i]).filter(ok),
    d: R.filter(r => r.serves >= 4 && !S_SLOTS_B.has(r.id) && !["rollup","mugmac","ramenup"].includes(r.id)).filter(ok)
  };
}
function pick(pool, avoid) {
  if (!pool.length) return null;
  const sorted = [...pool].sort((a, b) => cost(a) - cost(b));
  let cand = sorted.filter(r => !avoid.has(r.id)); if (!cand.length) cand = sorted;
  const w = cand.map((r, i) => 1 / (i + 1.6)), tot = w.reduce((a, b) => a + b, 0);
  let x = Math.random() * tot; for (let i = 0; i < cand.length; i++) { x -= w[i]; if (x <= 0) return cand[i].id; }
  return cand[0].id;
}
function makePlan() {
  const p = pools(), days = [], used = { b: new Set(), l: new Set(), d: new Set() };
  for (let i = 0; i < 7; i++) {
    const day = {};
    for (const m of ["b", "l", "d"]) {
      if (!S.meals[m]) continue;
      if (used[m].size >= p[m].length) used[m].clear();
      const id = pick(p[m], used[m]); if (id) { day[m] = id; used[m].add(id); }
    }
    days.push(day);
  }
  S.plan = { days, key: planKey() }; store.set("plan", S.plan);
}
const planKey = () => [S.diet, S.eq, S.meals.b, S.meals.l, S.meals.d].join("|");
function planTotals() {
  const need = {}, por = portions();
  for (const day of S.plan.days) for (const m in day) { const r = RX[day[m]]; if (!r) continue; for (const [id, q] of r.ing) need[id] = (need[id] || 0) + q * por / r.serves; }
  let eat = 0, trip = 0, kcal = 0; const items = [];
  for (const day of S.plan.days) for (const m of ["b","l","d"]) if (day[m]) kcal += facts(RX[day[m]]).kcal;
  for (const id in need) {
    const q = need[id], pk = I[id][6], n = Math.max(1, Math.ceil(q / pk - 0.03));
    const have = S.have.has(id), c = n * pk * pr(id);
    eat += q * pr(id); if (!have) trip += c;
    items.push({ id, q, n, c, have });
  }
  return { eat, trip, items, kcal: Math.round(kcal / 7 / 10) * 10 };
}
function vPlan() {
  const st = (k, v, lab, sub) => `<div class="row"><div class="l"><b>${lab}</b>${sub ? `<small>${sub}</small>` : ""}</div><span class="stepper"><button type="button" data-hh="${k}" data-v="-1" aria-label="−">−</button><output>${v}</output><button type="button" data-hh="${k}" data-v="1" aria-label="+">+</button></span></div>`;
  return `<div class="kicker">${t("plan")}</div><h1 style="font-size:clamp(34px,6vw,54px);margin-top:6px">${t("planH")}</h1><p class="lede">${t("planLede")}</p>
  <div class="plan-top">
    <div class="panel no-print">${st("a", S.hh.a, t("adults"))}${st("k", S.hh.k, t("kids"))}
      <div class="row" style="display:block"><div class="l"><b>${t("mealsQ")}</b></div><div class="chips" style="margin-top:8px">${["b","l","d"].map(m => chip(t(m), S.meals[m], `data-m="${m}"`)).join("")}</div></div>
      <div class="row" style="display:block"><div class="l"><b>${t("diet")}</b></div><div class="chips" style="margin-top:8px">${["all","veg","vegan","gf","df","hp"].map(d => chip(t("diet_" + d), S.diet === d, `data-pd="${d}"`)).join("")}</div></div>
      <div class="row" style="display:block"><div class="l"><b>${t("kitchen")}</b></div><div class="chips" style="margin-top:8px">${["any","stove","micro","none"].map(e => chip(t("eq_" + e), S.eq === e, `data-pe="${e}"`)).join("")}</div></div>
    </div>
    <div class="panel" id="ptotal"></div>
  </div>
  <div class="sec-h sec" style="margin-top:28px"><h2>${S.lang === "es" ? "Tu semana" : "Your week"}</h2><button class="btn ghost sm no-print" id="shuf" type="button">${ico("swap")} ${t("reshuffle")}</button></div>
  <div class="week" id="week"></div>
  <section class="sec"><div class="sec-h"><div><h2>${t("shopH")}</h2><p class="muted" style="margin:6px 0 0">${t("shopS")}</p></div>
    <div class="no-print" style="display:flex;gap:8px"><button class="btn ghost sm" id="copyl" type="button">${ico("copy")} ${t("copyList")}</button><button class="btn ghost sm" id="printl" type="button">${ico("print")} ${t("print")}</button></div></div>
    <div class="shop" id="shop"></div><p class="note">${t("lasts")} ${t("editHint")}</p></section>`;
}
function paintPlan() {
  if (!S.plan || S.plan.key !== planKey()) makePlan();
  const tot = planTotals(), people = S.hh.a + S.hh.k, days = Math.max(1, people) * 7;
  const snapMax = people <= 8 ? window.POT_SNAP.max[Math.max(0, people - 1)] : window.POT_SNAP.max[7] + (people - 8) * window.POT_SNAP.maxAdd;
  const month = tot.eat * 4.33, pct = Math.min(100, Math.round(month / snapMax * 100));
  const mealsOn = S.meals.b + S.meals.l + S.meals.d;
  $("#ptotal").innerHTML = `<div class="total"><div class="tag big" style="transform:rotate(-2deg)"><b class="big" id="wk$">${money(tot.eat, false)}</b><small>${t("weekCost")}</small></div>
    <div><div class="per">${t("monthCost", { m: money(month, false) })}</div><div class="muted small">${people ? t("perPerson", { p: money(tot.eat / days) }) : ""}</div></div></div>
    ${people && mealsOn === 3 ? `<div class="bar" aria-hidden="true"><i style="width:0%"></i></div><p class="small" style="margin:10px 0 0">${t("snapRef", { n: people, m: money(snapMax, false) })} ${t("snapRef2", { pct: pct + "%" })}</p>` : ""}
    ${mealsOn === 3 ? `<p class="small" style="margin:10px 0 0">${t("kcalDay", { k: tot.kcal.toLocaleString("en-US") })}</p>` : ""}
    <p class="small muted" style="margin:10px 0 0">${t("trip")}: <b>${money(tot.trip)}</b>. ${t("lasts")}</p>`;
  requestAnimationFrame(() => { const b = $("#ptotal .bar i"); if (b) b.style.width = pct + "%"; });
  $("#week").innerHTML = S.plan.days.map((d, i) => `<div class="day"><h4>${t("days")[i]}<small>${money(["b","l","d"].filter(m => d[m]).reduce((s, m) => s + cost(RX[d[m]], portions()), 0))}</small></h4>
    ${["b","l","d"].filter(m => d[m]).map(m => `<div class="meal"><span class="k">${t(m)}</span><button class="name" type="button" data-r2="${d[m]}">${esc(title(RX[d[m]]))}</button><button class="swap no-print" type="button" data-sw="${i}${m}" aria-label="${t("swap")}">${ico("swap")}</button></div>`).join("")}</div>`).join("");
  $$("[data-r2]").forEach(b => b.onclick = () => openRecipe(b.dataset.r2));
  $$("[data-sw]").forEach(b => b.onclick = () => {
    const i = +b.dataset.sw[0], m = b.dataset.sw[1], p = pools()[m];
    const avoid = new Set(S.plan.days.map(d => d[m]).filter(Boolean));
    S.plan.days[i][m] = pick(p, avoid) || S.plan.days[i][m]; store.set("plan", S.plan);
    paintPlan(); const nb = $(`[data-sw="${i}${m}"]`); if (nb) { nb.classList.add("spin"); nb.focus({ preventScroll: true }); }
  });
  paintShop(tot);
}
function paintShop(tot) {
  const by = {}; for (const it of tot.items) (by[AISLE[it.id]] ||= []).push(it);
  $("#shop").innerHTML = AISLES.filter(a => by[a]).map(a => `<div class="aisle"><h4>${t("aisle_" + a)}</h4>${by[a].sort((x, y) => iname(x.id).localeCompare(iname(y.id))).map(it => {
    const pk = I[it.id][7 + L()];
    return `<label class="item ${S.got.has(it.id) ? "got" : ""} ${it.have ? "have" : ""}"><input type="checkbox" data-got="${it.id}" ${S.got.has(it.id) ? "checked" : ""}>
      <span class="n">${esc(iname(it.id))}<small>${it.n} × ${esc(pk)} · <button type="button" class="havebtn" data-have="${it.id}">${it.have ? t("needIt") : t("have")}</button></small></span>
      <button type="button" class="havebtn c" data-price="${it.id}" title="${t("editPrice")}">${it.have ? "—" : money(it.c)}</button></label>`;
  }).join("")}</div>`).join("");
  $$("[data-got]").forEach(c => c.onchange = () => { c.checked ? S.got.add(c.dataset.got) : S.got.delete(c.dataset.got); store.set("got", [...S.got]); c.closest(".item").classList.toggle("got", c.checked); });
  $$("[data-have]").forEach(b => b.onclick = e => { e.preventDefault(); const id = b.dataset.have; S.have.has(id) ? S.have.delete(id) : S.have.add(id); store.set("have", [...S.have]); paintPlan(); });
  $$("[data-price]").forEach(b => b.onclick = e => { e.preventDefault(); editPrice(b.dataset.price); });
}
function editPrice(id) {
  const x = I[id], btn = $(`[data-price="${id}"]`); if (!btn) return;
  const wrap = document.createElement("span"); wrap.className = "pedit";
  wrap.innerHTML = `<span class="money" style="display:inline-flex;width:92px;padding:0 6px"><span>$</span><input inputmode="decimal" aria-label="${esc(t("priceFor", { pkg: x[7 + L()] }))}" value="${(pr(id) * x[6]).toFixed(2)}" style="padding:6px 4px;font-size:15px;width:100%"></span><button type="button" class="havebtn" data-ok>${t("save")}</button>${S.prices[id] != null ? `<button type="button" class="havebtn" data-rs>${t("reset")}</button>` : ""}`;
  btn.replaceWith(wrap); const inp = $("input", wrap); inp.focus(); inp.select();
  const done = v => { if (v === "reset") delete S.prices[id]; else { const n = parseFloat(String(v).replace(/[^0-9.]/g, "")); if (n > 0 && n < 500) S.prices[id] = n / x[6]; } store.set("prices", S.prices); paintPlan(); };
  wrap.onclick = e => { e.preventDefault(); e.stopPropagation(); if (e.target.matches("[data-ok]")) done(inp.value); if (e.target.matches("[data-rs]")) done("reset"); if (e.target === inp) inp.focus(); };
  inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); done(inp.value); } if (e.key === "Escape") paintPlan(); };
}
function addToList(id, sv) {
  // put this recipe into the next free dinner slot of the plan
  if (!S.plan || S.plan.key !== planKey()) makePlan();
  const r = RX[id]; const slot = S_SLOTS_B.has(id) ? "b" : (window.POT_SLOTS.lunch.includes(id) && r.serves === 1 ? "l" : "d");
  S.meals[slot] = 1; store.set("meals", S.meals); S.plan.key = planKey();
  const days = S.plan.days; let i = days.findIndex(d => !d._added || !d._added[slot]); if (i < 0) i = 0;
  days[i][slot] = id; (days[i]._added ||= {})[slot] = 1; store.set("plan", S.plan);
}
function bPlan() {
  $$("[data-hh]").forEach(b => b.onclick = () => { const k = b.dataset.hh; S.hh[k] = Math.max(k === "a" ? 1 : 0, Math.min(12, S.hh[k] + +b.dataset.v)); store.set("hh", S.hh); b.parentElement.querySelector("output").textContent = S.hh[k]; paintPlan(); });
  $$("[data-m]").forEach(b => b.onclick = () => { const m = b.dataset.m; S.meals[m] = S.meals[m] ? 0 : 1; if (!S.meals.b && !S.meals.l && !S.meals.d) S.meals[m] = 1; store.set("meals", S.meals); b.setAttribute("aria-pressed", !!S.meals[m]); paintPlan(); });
  $$("[data-pd]").forEach(b => b.onclick = () => { S.diet = b.dataset.pd; store.set("diet", S.diet); $$("[data-pd]").forEach(x => x.setAttribute("aria-pressed", x === b)); paintPlan(); });
  $$("[data-pe]").forEach(b => b.onclick = () => { S.eq = b.dataset.pe; store.set("eq", S.eq); $$("[data-pe]").forEach(x => x.setAttribute("aria-pressed", x === b)); paintPlan(); });
  $("#shuf").onclick = () => { makePlan(); paintPlan(); };
  $("#printl").onclick = () => window.print();
  $("#copyl").onclick = async () => {
    const tot = planTotals(), by = {}; for (const it of tot.items) if (!it.have) (by[AISLE[it.id]] ||= []).push(it);
    const txt = `Potful · ${t("shopH")}\n` + AISLES.filter(a => by[a]).map(a => `\n${t("aisle_" + a).toUpperCase()}\n` + by[a].map(it => `☐ ${iname(it.id)} · ${it.n} × ${I[it.id][7 + L()]} · ${money(it.c)}`).join("\n")).join("\n") + `\n\n${t("total")}: ${money(tot.trip)}`;
    try { await navigator.clipboard.writeText(txt); toast(t("copied")); } catch (e) { prompt("", txt); }
  };
  paintPlan();
}

/* NEAR ME */
const DISCOUNT = /\b(aldi|lidl|winco|grocery outlet|save[- ]?a[- ]?lot|food 4 less|foods co|walmart|smart ?& ?final|dollar general|market basket|food lion|cardenas|vallarta|northgate|99 ranch|h-?e-?b|price rite|pricerite|shoprite|fiesta|el super|superior grocers|food maxx|foodmaxx|win ?co|costco|sam'?s club|bj'?s|piggly|cub foods|meijer|kroger|fred meyer|ralphs|fry'?s|hy-?vee|winn-dixie|grocery depot|dollar tree|family dollar)\b/i;
const CAT = { free: "#D8452B", meal: "#6B3E5C", grocery: "#3D7A4B", market: "#E39B19" };
function classify(tg) {
  const sf = tg.social_facility || "", n = tg.name || tg.brand || "";
  if (sf === "food_bank" || tg.amenity === "food_bank") return ["free", "t_foodbank"];
  if (tg.amenity === "food_sharing" || tg.amenity === "give_box") return ["free", "t_fridge"];
  if (sf === "soup_kitchen" || tg.amenity === "soup_kitchen") return ["meal", "t_soup"];
  if (tg.amenity === "place_of_worship" && tg.religion === "sikh") return ["meal", "t_langar"];
  if (tg.shop === "supermarket") return ["grocery", DISCOUNT.test(n) ? "t_discount" : "t_super"];
  if (tg.shop === "wholesale") return ["grocery", "t_whole"];
  if (tg.shop === "greengrocer") return ["grocery", "t_green"];
  if (tg.shop === "farm") return ["market", "t_farm"];
  if (tg.amenity === "marketplace") return /farm|produce|certified|mercado|market|harvest/i.test(n) ? ["market", "t_market"] : null;
  return null;
}
function dist(a, b, c, d) { const R0 = 6371e3, p = Math.PI / 180, x = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 2 * R0 * Math.asin(Math.sqrt(x)); }
const fmtDist = m => m < 160 ? (S.lang === "es" ? "aquí cerca" : "nearby") : (m / 1609.34).toFixed(m < 16000 ? 1 : 0) + " mi";
async function overpass(lat, lon, rad) {
  const a = `(around:${rad},${lat},${lon})`;
  const q = `[out:json][timeout:25];(nwr["social_facility"~"^(food_bank|soup_kitchen)$"]${a};nwr["amenity"~"^(food_bank|food_sharing|give_box|soup_kitchen)$"]${a};nwr["amenity"="place_of_worship"]["religion"="sikh"]${a};nwr["shop"~"^(supermarket|greengrocer|wholesale|farm)$"]${a};nwr["amenity"="marketplace"]${a};);out center tags 600;`;
  const eps = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
  let lastErr;
  for (const ep of eps) {
    try { return await getJSON(ep, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }, 26000); }
    catch (e) { lastErr = e; }
  }
  throw lastErr;
}
async function loadNear() {
  const n = S.near, loc = S.loc;
  if (!loc || loc.lat == null) return;
  const key = `${loc.lat},${loc.lon},${n.radius}`;
  if (n.data && n.at === key) return;
  n.loading = true; n.err = null; paintNear();
  try {
    const j = await overpass(loc.lat, loc.lon, n.radius), seen = new Set(), out = [];
    for (const e of j.elements || []) {
      const tg = e.tags || {}, c = classify(tg); if (!c) continue;
      const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon; if (la == null) continue;
      const nm = tg.name || tg.brand || ""; if (!nm && c[0] === "grocery") continue;
      const k = (nm + c[1]).toLowerCase() + Math.round(la * 500) + Math.round(lo * 500); if (seen.has(k)) continue; seen.add(k);
      const addr = [tg["addr:housenumber"], tg["addr:street"]].filter(Boolean).join(" ") + (tg["addr:city"] ? ", " + tg["addr:city"] : "");
      out.push({ cat: c[0], type: c[1], name: nm, lat: la, lon: lo, d: dist(loc.lat, loc.lon, la, lo), addr: addr.replace(/^, /, ""), hours: tg.opening_hours || "", phone: tg.phone || tg["contact:phone"] || "", web: tg.website || tg["contact:website"] || "" });
    }
    out.sort((a, b) => (a.cat === "free" || a.cat === "meal" ? 0 : 1) - (b.cat === "free" || b.cat === "meal" ? 0 : 1) || a.d - b.d);
    n.data = out; n.at = key; n.limit = 30;
  } catch (e) { n.err = e; }
  n.loading = false; paintNear();
}
function official() {
  const z = S.loc?.zip || "", st = S.loc?.state, sn = st && window.POT_STATES[st];
  const L1 = (href, b, s, i = "ext") => `<a class="lk" href="${href}" target="_blank" rel="noopener">${ico(i)}<div><b>${b}</b><span>${s}</span></div></a>`;
  return `<section class="sec"><div class="sec-h"><div><h2>${t("officialH")}</h2><p class="muted" style="margin:6px 0 0">${t("officialS")}</p></div></div>
  <div class="links three">
    ${L1("https://www.feedingamerica.org/find-your-local-foodbank", t("f_fa"), t("f_fas"), "basket")}
    ${L1("https://www.findhelp.org/", t("f_fh"), t("f_fhs"), "search")}
    ${L1("https://www.211.org/", t("f_211"), t("f_211s"), "phone")}
    ${L1("https://usda-fns.maps.arcgis.com/apps/webappviewer/index.html?id=15e1c457b56c4a729861d015cd626a23", t("f_snap"), t("f_snaps"), "pin")}
    ${L1("https://www.mealsonwheelsamerica.org/find-meals-and-services/" + (z ? "?pc=" + z : ""), t("f_mow"), t("f_mows"), "heart")}
    ${sn ? L1("https://www.fna.usda.gov/snap/snap-online-retailers/" + encodeURIComponent(sn), t("f_online", { s: sn }), t("f_onlines"), "basket") : L1("https://www.hud.gov/findshelter", t("f_hud"), t("f_huds"), "home")}
  </div></section>`;
}
function vNear() {
  const n = S.near, cats = ["all", "free", "meal", "grocery", "market"];
  return `<div class="kicker">${t("near")}</div><h1 style="font-size:clamp(34px,6vw,54px);margin-top:6px">${t("nearH")}</h1><p class="lede">${t("nearLede")}</p>
  ${S.loc && S.loc.lat != null ? `<div class="near-top"><div class="chips" id="cats" style="flex:1">${cats.map(c => chip(t("cat_" + c), n.cat === c, `data-c="${c}"`)).join("")}</div>
    <label class="small"><b>${t("within")}</b> <select class="sel" id="rad">${[[3000,"2 mi"],[8000,"5 mi"],[16000,"10 mi"],[32000,"20 mi"]].map(([v, l]) => `<option value="${v}" ${n.radius === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div id="map" role="region" aria-label="Map"></div><div id="nlist"></div>` : `<p style="margin-top:18px">${t("needLoc")}</p>${locForm()}`}
  ${official()}${urgent()}`;
}
let map = null, layer = null, leafletP = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletP) return leafletP;
  leafletP = new Promise((res, rej) => {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(l);
    const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return leafletP;
}
const isDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
async function paintMap(list) {
  const el = $("#map"); if (!el) return;
  try { await loadLeaflet(); } catch (e) { el.style.display = "none"; return; }
  if (!$("#map")) return;
  if (map && map.getContainer() !== el) { map.remove(); map = null; }
  if (!map) {
    map = window.L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    window.L.tileLayer(`https://{s}.basemaps.cartocdn.com/${isDark() ? "dark_all" : "rastertiles/voyager"}/{z}/{x}/{y}{r}.png`, { maxZoom: 19, subdomains: "abcd", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' }).addTo(map);
  }
  if (layer) layer.remove();
  layer = window.L.layerGroup().addTo(map);
  const you = [S.loc.lat, S.loc.lon];
  window.L.marker(you, { icon: window.L.divIcon({ className: "", html: '<div class="you"></div>', iconSize: [18, 18] }), keyboard: false }).addTo(layer);
  const pts = [you];
  list.forEach((p, i) => {
    const m = window.L.marker([p.lat, p.lon], { icon: window.L.divIcon({ className: "", html: `<div class="pin ${p.cat}"></div>`, iconSize: [30, 30], iconAnchor: [15, 30] }), title: p.name || t(p.type) }).addTo(layer);
    m.bindPopup(`<b>${esc(p.name || t(p.type))}</b><br>${esc(t(p.type))}<br>${fmtDist(p.d)}`);
    m.on("click", () => { const c = document.getElementById("pl" + i); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); });
    pts.push([p.lat, p.lon]);
  });
  if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 }); else map.setView(you, 13);
  setTimeout(() => map && map.invalidateSize(), 60);
}
function dirLink(p) { return /iPhone|iPad|Mac/.test(navigator.userAgent) ? `https://maps.apple.com/?daddr=${p.lat},${p.lon}` : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`; }
function paintNear() {
  const n = S.near, box = $("#nlist"); if (!box) return;
  if (n.loading) { box.innerHTML = `<div class="loader" aria-label="${t("loading")}"><i></i><i></i><i></i></div><p class="muted" style="text-align:center">${t("loading")}</p>`; return; }
  if (n.err) { box.innerHTML = `<div class="empty" style="margin-top:14px">${t("mapErr")} <button class="linkbtn" id="retry">${t("retry")}</button></div>`; $("#retry").onclick = () => { n.data = null; loadNear(); }; return; }
  if (!n.data) return;
  const list = n.data.filter(p => n.cat === "all" || p.cat === n.cat);
  const shown = list.slice(0, n.limit), hasLangar = shown.some(p => p.type === "t_langar");
  paintMap(shown);
  box.innerHTML = `<p class="small muted" style="margin:12px 0 0">${t("found", { n: list.length })} · ${t("osmNote")}</p>
   ${hasLangar ? `<div class="tipbox">${t("langarNote")}</div>` : ""}
   ${list.length ? `<div class="places">${shown.map((p, i) => `<div class="place" id="pl${i}"><span class="dot" style="background:${CAT[p.cat]}"></span>
      <div><div class="nm">${esc(p.name || t(p.type))}</div><div class="ty">${esc(t(p.type))}</div></div><div class="ds">${fmtDist(p.d)}</div>
      ${p.addr || p.hours ? `<div class="more">${esc(p.addr)}${p.addr && p.hours ? "<br>" : ""}${p.hours ? `${t("hours")}: ${esc(p.hours)}` : ""}</div>` : ""}
      <div class="acts"><a href="${dirLink(p)}" target="_blank" rel="noopener">${t("directions")}</a>${p.phone ? `<a href="tel:${esc(p.phone.replace(/[^\d+]/g, ""))}">${t("callp")}</a>` : ""}${p.web && /^https?:/.test(p.web) ? `<a href="${esc(p.web)}" target="_blank" rel="noopener">${t("web")}</a>` : ""}</div></div>`).join("")}</div>
      ${list.length > n.limit ? `<p style="text-align:center"><button class="btn ghost" id="more">${t("showMore")}</button></p>` : ""}` : `<div class="empty" style="margin-top:14px">${t("nothing")}</div>`}`;
  const mb = $("#more"); if (mb) mb.onclick = () => { n.limit += 30; paintNear(); };
}
function bNear() {
  bindLoc(() => render());
  $$("[data-c]").forEach(b => b.onclick = () => { S.near.cat = b.dataset.c; $$("[data-c]").forEach(x => x.setAttribute("aria-pressed", x === b)); paintNear(); });
  const rd = $("#rad"); if (rd) rd.onchange = () => { S.near.radius = +rd.value; loadNear(); };
  if (S.loc && S.loc.lat != null) { if (S.near.data && S.near.at === `${S.loc.lat},${S.loc.lon},${S.near.radius}`) paintNear(); else loadNear(); }
}

/* HELP */
function fpl(n, st) { const f = window.POT_FPL, [b, a] = st === "AK" ? f.ak : st === "HI" ? f.hi : [f.base, f.add]; return b + a * (Math.max(1, n) - 1); }
function vHelp() {
  const s = S.scr || { n: Math.max(1, S.hh.a + S.hh.k), inc: "", w: {} };
  const ck = (k) => `<label class="ck"><input type="checkbox" data-w="${k}" ${s.w[k] ? "checked" : ""}>${t("w_" + k)}</label>`;
  return `<div class="kicker">${t("help")}</div><h1 style="font-size:clamp(34px,6vw,54px);margin-top:6px">${t("helpH")}</h1><p class="lede">${t("helpLede")}</p>
  <div class="screener">
    <form class="panel" id="scr">
      <div class="field"><div class="lab">${t("hhSize")}</div><span class="stepper"><button type="button" data-n="-1" aria-label="−">−</button><output id="scrn">${s.n}</output><button type="button" data-n="1" aria-label="+">+</button></span></div>
      <div class="field"><label for="inc">${t("income")}</label><div class="money"><span>$</span><input id="inc" inputmode="numeric" pattern="[0-9,]*" value="${esc(s.inc)}" placeholder="0"></div><div class="note" style="margin-top:6px">${t("incomeS")}</div></div>
      <div class="field"><div class="lab">${t("whoQ")}</div><div class="checks">${["preg","school","senior","dis","student","home"].map(ck).join("")}</div></div>
      ${S.loc?.state ? "" : `<div class="field"><label for="stsel">${S.lang === "es" ? "Estado" : "State"}</label><select class="sel" id="stsel" style="width:100%"><option value="">—</option>${Object.entries(window.POT_STATES).map(([k, v]) => `<option value="${k}" ${s.st === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>`}
      <button class="btn red" type="submit" style="width:100%">${t("check")}</button>
    </form>
    <div id="results"></div>
  </div>
  <section class="sec" id="save"><h2>${t("saveH")}</h2><p class="lede" style="font-size:17px">${t("saveLede")}</p>${savings()}</section>
  ${urgent()}`;
}
function savings() {
  const sv = (h, price, p, priv, href) => `<div class="sv"><h4>${h}</h4>${price ? `<div class="price">${price}</div>` : ""}<p>${p}</p><span class="priv ${priv}">${ico(priv === "g" ? "shield" : priv === "y" ? "people" : "search")}${t("priv_" + priv)}</span>${href ? ` · <a class="small" href="${href}" target="_blank" rel="noopener">${t("learn")}</a>` : ""}</div>`;
  const es = S.lang === "es";
  const st = S.loc?.state, match = st && window.POT_MATCH[st];
  return `<div class="save">
   ${sv(es ? "Dinero doble para frutas y verduras" : "Double your SNAP on fruits and vegetables", match ? (es ? `En tu estado: ${match}` : `In your state: ${match}`) : (es ? "En muchos estados" : "In many states"), es ? "Muchos mercados de agricultores y algunos supermercados te igualan cada dólar de SNAP en frutas y verduras. Busca el letrero o pregunta en la caja." : "Many farmers markets and some grocery stores match every SNAP dollar you spend on produce. Look for the sign or ask at the register.", "g", "https://www.nutritionincentivehub.org/")}
   ${sv("Amazon Prime Access", es ? "$6.99/mes (normal $14.99)" : "$6.99/mo (normally $14.99)", es ? "Para quienes tienen EBT, Medicaid y otros apoyos. Amazon acepta EBT en artículos elegibles. Puedes cancelar cuando quieras." : "For people with EBT, Medicaid and some other benefits. Amazon takes EBT on eligible groceries. Cancel any time.", "r", "https://www.aboutamazon.com/news/retail/amazon-prime-access-discounted-membership")}
   ${sv("Walmart+", es ? "$6.47/mes con EBT o Medicaid" : "$6.47/mo with EBT or Medicaid", es ? "Entrega a domicilio gratis en pedidos grandes. EBT paga la comida, no la cuota ni la entrega." : "Free delivery on larger orders. EBT pays for the food, not the fee or delivery.", "r", "")}
   ${sv("Instacart+", es ? "$4.99/mes por un año con SNAP" : "$4.99/mo for a year with SNAP", es ? "Muchas tiendas locales que aceptan EBT en línea. Las propinas y cuotas no se pagan con SNAP." : "Lots of local stores that take EBT online. Tips and fees can't be paid with SNAP.", "r", "")}
   ${sv(es ? "Bolsas sorpresa (Too Good To Go)" : "Surprise bags (Too Good To Go)", es ? "Como un tercio del precio" : "About a third of the price", es ? "Panaderías y tiendas venden lo que sobra del día a precio bajo. Recoges en una hora fija." : "Bakeries, cafés and grocers sell the day's extras cheap. You pick up in a set window.", "y", "https://www.toogoodtogo.com/")}
   ${sv(es ? "Marca de la tienda y precio por unidad" : "Store brands and the unit price", es ? "Ahorra 20 a 30%" : "Often 20 to 30% less", es ? "La etiqueta del anaquel muestra el precio por onza o libra. Compara ese número, no el precio grande. Casi siempre gana la marca de la tienda." : "The shelf tag shows the price per ounce or pound in small print. Compare that number, not the big one. Store brands win most of the time.", "g", "")}
   ${sv(es ? "Apps de lealtad del súper" : "Grocery loyalty apps", es ? "Ahorros reales" : "Real savings", es ? "Las ofertas digitales pueden ahorrar mucho, pero la tienda guarda todo lo que compras. Úsalas si te parece bien." : "Digital deals can save a lot, but the store keeps a record of everything you buy. Use them if you're comfortable with that.", "r", "")}
   ${sv(es ? "Clases gratis de cocina y nutrición" : "Free cooking and nutrition classes", "SNAP-Ed", es ? "Clases gratuitas en tu comunidad para cocinar rico con poco dinero. A veces regalan utensilios." : "Free classes in your community on cooking well for less. Some give away kitchen tools.", "g", "https://snaped.fns.usda.gov/")}
  </div>
  <div class="flags"><h3>${t("flagsH")}</h3><ul>${t("flagsList").map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <div class="panel" style="margin-top:16px"><h3>${t("ebtH")}</h3><ul style="margin:10px 0 0;padding-left:20px">${t("ebtList").map(x => `<li style="margin:6px 0">${esc(x)}</li>`).join("")}</ul></div>`;
}
function results() {
  const s = S.scr; if (!s) return "";
  const st = S.loc?.state || s.st || null, sn = st ? window.POT_STATES[st] : null;
  const inc = parseFloat(String(s.inc).replace(/[^0-9.]/g, "")) || 0, n = Math.max(1, s.n), pct = inc * 12 / fpl(n, st), w = s.w;
  const odds = k => `<span class="odds ${k}">${t(k)}</span>`;
  const a = (href, label, i = "arrow") => `<a class="btn sm" href="${href}" target="_blank" rel="noopener">${label} ${ico(i)}</a>`;
  const tel = (num, label) => `<a class="btn ghost sm" href="tel:${num}">${ico("phone")} ${label}</a>`;
  const card = (h, o, p, acts, note) => `<div class="prog"><div class="ph"><h3>${h}</h3>${o ? odds(o) : ""}</div><p>${p}</p>${note ? `<p class="note">${note}</p>` : ""}${acts ? `<div class="acts">${acts}</div>` : ""}</div>`;
  const out = [];
  const snapName = st && window.POT_SNAPNAME[st] ? ` (${window.POT_SNAPNAME[st]})` : "";
  const elder = w.senior || w.dis;
  const so = pct <= 1.3 ? "likely" : (pct <= 2 || elder) ? "maybe" : "ask";
  const max = n <= 8 ? window.POT_SNAP.max[n - 1] : window.POT_SNAP.max[7] + (n - 8) * window.POT_SNAP.maxAdd;
  const slug = sn ? sn.toLowerCase().replace(/ /g, "-").replace("district-of-columbia", "district-columbia") : "";
  out.push(card(t("snapH") + snapName, so, `${t("snapP")} ${t("snapMax", { n, m: money(max, false) })}`,
    (sn ? a(`https://www.fna.usda.gov/snap-directory-entry/${slug}`, t("apply") + " " + t("yourState", { s: sn })) : a("https://www.fna.usda.gov/snap/state-directory", t("apply"))),
    (inc < 150 * n ? t("snapExp") + " " : "") + t("snapNote")));
  if (w.preg) out.push(card(t("wicH"), pct <= 1.85 ? "likely" : "ask", t("wicP"), a("https://wic.fns.usda.gov/wps/pages/preScreenTool.xhtml", t("apply")), t("wicNote")));
  if (w.school) {
    const uni = st && window.POT_UNIVERSAL.includes(st);
    out.push(card(t("schoolH"), uni || pct <= 1.3 ? "likely" : pct <= 1.85 ? "likely" : "ask", `${t("schoolP")} ${uni ? t("schoolU", { s: sn }) : pct <= 1.3 ? t("schoolF") : pct <= 1.85 ? t("schoolR") : t("schoolA")}`, ""));
    const no = st && window.POT_NOSEBT.includes(st);
    out.push(card(t("sebtH"), st ? (no ? "ask" : pct <= 1.85 ? "likely" : "ask") : "maybe", `${t("sebtP")} ${st ? (no ? t("sebtNo", { s: sn }) : t("sebtYes", { s: sn })) : ""}`, a("https://www.fna.usda.gov/sebt/participating", t("learn"))));
  }
  if (w.senior) out.push(card(t("csfpH"), pct <= 1.3 ? "likely" : "ask", t("csfpP"), a("https://www.fns.usda.gov/csfp", t("learn"))));
  if (w.senior || w.dis) out.push(card(t("mowH"), "maybe", t("mowP"), a("https://www.mealsonwheelsamerica.org/find-meals-and-services/" + (S.loc?.zip ? "?pc=" + S.loc.zip : ""), t("learn")) + tel("18006771116", "Eldercare Locator")));
  if (st && window.POT_RMP.includes(st) && (w.senior || w.dis || w.home)) out.push(card(t("rmpH"), so === "likely" ? "likely" : "maybe", t("rmpP", { s: sn }) + (st === "IL" ? (S.lang === "es" ? " (Solo en los condados de Cook y Franklin.)" : " (Cook and Franklin counties only.)") : ""), a("https://www.fns.usda.gov/snap/retailer/restaurant-meals-program", t("learn"))));
  if (w.student) out.push(card(t("stuH"), "maybe", t("stuP"), ""));
  if (w.home) out.push(card(t("homeH"), "likely", t("homeP"), `<a class="btn sm" href="#near">${t("near")} ${ico("arrow")}</a>`));
  out.push(card(t("fbH"), "likely", t("fbP"), `<a class="btn sm" href="#near">${t("near")} ${ico("arrow")}</a>` + a("https://www.feedingamerica.org/find-your-local-foodbank", "Feeding America")));
  out.push(card(t("hotH"), "", t("hotP"), tel("18663486479", "1-866-3-HUNGRY") + tel("18778426273", "1-877-8-HAMBRE") + tel("211", "211")));
  return out.join("");
}
function bHelp() {
  const s = S.scr || { n: Math.max(1, S.hh.a + S.hh.k), inc: "", w: {} };
  $$("[data-n]").forEach(b => b.onclick = () => { s.n = Math.max(1, Math.min(16, s.n + +b.dataset.n)); $("#scrn").textContent = s.n; });
  $("#scr").onsubmit = e => {
    e.preventDefault(); s.inc = $("#inc").value; s.w = {}; $$("[data-w]").forEach(c => { if (c.checked) s.w[c.dataset.w] = 1; });
    const ss = $("#stsel"); if (ss) s.st = ss.value || null;
    S.scr = s; store.set("scr", s); $("#results").innerHTML = results();
    if (innerWidth < 880) $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  if (S.scr) $("#results").innerHTML = results();
}

/* ABOUT */
function vAbout() {
  const es = S.lang === "es";
  return `<div class="prose"><div class="kicker">${t("about")}</div><h1 style="font-size:clamp(34px,6vw,54px);margin-top:6px">${t("aboutH")}</h1>
  <p class="lede">${es ? "Potful existe para que cualquier persona, en cualquier cocina, pueda comer bien con poco dinero y encontrar ayuda sin sentirse juzgada." : "Potful exists so anyone, in any kitchen, can eat well on very little and find help without feeling judged."}</p>
  <h3>${t("privacyH")}</h3><ul>
   <li>${es ? "No hay cuentas, anuncios, cookies de rastreo ni analíticas." : "No accounts, ads, tracking cookies or analytics."}</li>
   <li>${es ? "Lo que escribes (código postal, lista, respuestas) se guarda solo en este navegador. Puedes borrarlo abajo." : "What you enter (ZIP, list, answers) is saved only in this browser. You can erase it below."}</li>
   <li>${es ? "Para buscar lugares, tu código postal o dirección se envía a Zippopotam.us u OpenStreetMap Nominatim, y las coordenadas a Overpass (OpenStreetMap). Las imágenes del mapa vienen de CARTO. Nada de eso lleva tu nombre." : "To find places, your ZIP or address goes to Zippopotam.us or OpenStreetMap Nominatim, and the coordinates go to Overpass (OpenStreetMap). Map images come from CARTO. None of that includes your name."}</li>
   <li>${es ? "La revisión de beneficios se calcula en tu teléfono. No se envía a nadie." : "The benefits check is worked out on your phone. It is never sent anywhere."}</li></ul>
  <h3>${es ? "De dónde salen los números" : "Where the numbers come from"}</h3><ul>
   <li>${es ? "Precios: promedio de EE. UU. de la Oficina de Estadísticas Laborales (octubre 2026) para arroz, pasta, frijol seco, harina, pan, huevo, leche, queso, papa, plátano, pollo y carne molida. Lo demás es un precio típico de marca de la tienda en súper de descuento, noviembre 2026. Puedes poner tus propios precios en la lista." : "Prices: U.S. Bureau of Labor Statistics city averages (October 2026) for rice, pasta, dried beans, flour, bread, eggs, milk, cheese, potatoes, bananas, chicken and ground beef. Everything else is a typical store-brand price at discount grocers, November 2026. You can set your own prices on the list."}</li>
   <li>${es ? "Nutrición: valores de USDA FoodData Central, redondeados." : "Nutrition: USDA FoodData Central values, rounded."}</li>
   <li>${es ? "Programas y límites: USDA (SNAP año fiscal 2027, Summer EBT 2026, Restaurant Meals Program) y las guías de pobreza 2026 de HHS." : "Programs and limits: USDA (SNAP fiscal 2027, Summer EBT 2026, Restaurant Meals Program) and HHS 2026 poverty guidelines."}</li>
   <li>${es ? "Todas las recetas son originales de Potful." : "Every recipe is an original Potful recipe."}</li></ul>
  <p style="margin-top:26px"><button class="btn ghost" id="wipe">${t("resetAll")}</button></p></div>`;
}
function bAbout() { $("#wipe").onclick = () => { store.clear(); S.loc = null; S.plan = null; S.prices = {}; S.have.clear(); S.got.clear(); S.scr = null; toast(t("erased")); render(); }; }
function paintFoot() { $("#foot").innerHTML = `<p>${t("footA")} <a href="#about">${t("about")} · ${t("privacyH")}</a></p><p>${t("footB")}</p><p>${t("footC")}</p>`; }

/* ---------- boot ---------- */
$("#lang").onclick = () => { S.lang = S.lang === "es" ? "en" : "es"; store.set("lang", S.lang); const sh = $("#sheet"); const id = location.hash.startsWith("#r/") ? location.hash.slice(3) : null; render(); if (sh && id) openRecipe(id, true); };
$("#where").onclick = () => { if (route().v !== "home") location.hash = "#home"; setTimeout(() => { const i = $("#locin"); if (i) { i.focus(); i.select(); } }, 60); };
window.addEventListener("hashchange", () => { const { r } = route(); if (!r) closeSheet(true); if (r && $("#sheet")) return; render(); });
window.addEventListener("popstate", () => { if (!location.hash.startsWith("#r/")) closeSheet(true); });
render();
})();
