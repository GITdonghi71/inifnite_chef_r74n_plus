
/*
 * Creator of Microorganisms — Infinite Chef
 * Versione 11.0
 *
 * Supporta:
 * - ingredienti base e ingredienti registrati dalle mod
 * - ingredienti personalizzati
 * - ingredienti derivati tramite type
 * - salsa, innesto, affumicatura e caramellatura
 * - due ingredienti distinti
 * - tratti, combinazioni, sapori, consistenze e colori
 *
 * Nota: l'archivio interno di Infinite Chef può variare tra versioni.
 * Il codice prova più fonti e non crea ingredienti fittizi se non trova l'ID.
 */

(function () {
  "use strict";

  const VERSION = "11.0";
  const TOOL_ID = "creator_of_microorganisms";
  const REGISTRY_KEY = "__microorganismIngredientRegistry";

  if (window.__microorganismCreatorLoaded === VERSION) return;
  window.__microorganismCreatorLoaded = VERSION;

  if (typeof window.addIngredient !== "function") {
    console.error(
      "[Microorganismi] addIngredient non è disponibile. " +
      "Controlla che il mod venga caricato dopo Infinite Chef."
    );
    return;
  }

  if (typeof window.addTool !== "function") {
    console.error("[Microorganismi] addTool non è disponibile.");
    return;
  }

  if (typeof window.addRecipe !== "function") {
    console.warn("[Microorganismi] addRecipe non è disponibile.");
  }

  const originalAddIngredient = window.addIngredient;
  const registry = window[REGISTRY_KEY] ||=
    Object.create(null);

  /*
   * Intercetta gli ingredienti registrati dopo questo mod.
   * Non sostituisce l'archivio originale del gioco.
   */
  if (!window.__microorganismAddIngredientPatched) {
    window.addIngredient = function (id, properties, ...rest) {
      const result = originalAddIngredient.call(
        this, id, properties, ...rest
      );

      if (id != null) {
        registry[String(id)] = {
          id: String(id),
          ...(properties && typeof properties === "object"
            ? properties
            : {})
        };
      }

      return result;
    };

    window.__microorganismAddIngredientPatched = true;
  }

  window.microorganismRegistry ||= Object.create(null);

  const SPECIES = {
    bacterium: {
      name: "Batterio",
      type: "microbe",
      color: "#78C878",
      cell: "procariote",
      base: 55
    },
    yeast: {
      name: "Lievito",
      type: "fungus",
      color: "#E7C56D",
      cell: "eucariote",
      base: 62
    },
    mold: {
      name: "Muffa",
      type: "fungus",
      color: "#A88BD0",
      cell: "eucariote",
      base: 58
    },
    archaea: {
      name: "Archeo",
      type: "microbe",
      color: "#E28D60",
      cell: "procariote",
      base: 72
    },
    microalgae: {
      name: "Microalga",
      type: "algae",
      color: "#4DBA91",
      cell: "eucariote",
      base: 65
    },
    hybrid: {
      name: "Ibrido",
      type: "double_helix",
      color: "#5AB8CE",
      cell: "misto",
      base: 80
    }
  };

  /*
   * Tratti:
   * id: [etichetta, qualità, valore, tag, sapori, consistenza, colore]
   */
  const RAW_TRAITS = {
    divisione_binaria: ["Divisione binaria",2,3,["riproduzione rapida"],["neutro"],null,"#8BD18B"],
    crescita: ["Crescita rapida",1,3,["crescita rapida"],["delicato"],null,"#A5D77B"],
    sporulazione: ["Sporulazione",3,5,["formazione di spore"],["terroso"],["granuloso"],"#B69B7D"],
    dormienza: ["Dormienza",2,4,["dormienza"],["delicato"],null,"#9CA7B4"],
    rigenerazione: ["Rigenerazione",4,7,["rigenerazione"],["fresco"],null,"#61C5A1"],
    mutazione: ["Mutabilità",1,6,["mutabilità elevata"],["complesso"],null,"#BD83D5"],
    ricombinazione: ["Ricombinazione",4,8,["ricombinazione genetica"],["complesso"],null,"#5AB8CE"],
    fotosintesi: ["Fotosintesi",4,7,["fotosintesi"],["vegetale","fresco"],null,"#43B978"],
    clorofilla: ["Clorofilla",2,4,["pigmento verde"],["erbaceo"],null,"#68B85C"],
    fermentazione: ["Fermentazione",4,8,["fermentazione"],["fermentato","acidulo"],["effervescente"],"#D7A24B"],
    chemosintesi: ["Chemiosintesi",5,9,["produzione energetica chimica"],["minerale"],null,"#C59D68"],
    bioluminescenza: ["Bioluminescenza",6,14,["luminescenza simulata"],["minerale"],null,"#42E5D4"],
    termoresistenza: ["Termoresistenza",4,7,["resistenza al calore"],["tostato"],null,"#D86D36"],
    adattamento_al_freddo: ["Adattamento al freddo",3,6,["tolleranza al freddo"],["fresco"],null,"#73D8EA"],
    acidofilia: ["Acidofilia",3,5,["tolleranza all'acidità"],["acido"],null,"#D5A4E8"],
    alcalofilia: ["Alcalofilia",3,5,["tolleranza all'alcalinità"],["minerale"],null,"#8BB9A2"],
    resistenza_siccita: ["Resistenza alla siccità",3,6,["resistenza alla siccità"],["concentrato"],null,"#C9A66B"],
    resistenza_sale: ["Resistenza al sale",3,5,["tolleranza salina"],["salato","minerale"],null,"#85B7C9"],
    resistenza_tossine: ["Resistenza alle tossine",4,7,["resistenza alle tossine"],["amaro"],null,"#8D7AB6"],
    produzione_enzimi: ["Produzione di enzimi",4,8,["produzione enzimatica"],["umami"],null,"#D6B65D"],
    produzione_vitamine: ["Produzione di vitamine",5,10,["produzione vitaminica simulata"],["vegetale","dolce"],null,"#E6C85C"],
    biodegradazione: ["Biodegradazione",3,6,["decomposizione organica"],["terroso"],null,"#9B875E"],
    motilita: ["Motilità",2,5,["mobilità"],["fresco"],null,"#55B9C8"],
    biofilm: ["Biofilm",3,6,["formazione di biofilm"],["cremoso"],["viscoso"],"#8BBCA6"],
    ife: ["Ife",2,4,["struttura ifale"],["terroso"],["filamentoso"],"#B39AD0"],
    capsula_protettiva: ["Capsula protettiva",4,7,["capsula protettiva"],["neutro"],["gelatinoso"],"#9CC7D7"],
    pigmentazione: ["Pigmentazione",2,5,["pigmentazione speciale"],["vegetale"],null,"#D88FB3"],
    simbiosi: ["Simbiosi",5,10,["simbiosi"],["armonico"],null,"#8BCB9B"],
    parassitismo: ["Parassitismo",1,5,["parassitismo simulato"],["amaro"],null,"#8C719B"],
    predazione: ["Predazione microbica",2,7,["predazione simulata"],["intenso"],null,"#BA7777"],
    produzione_tossine: ["Produzione di tossine",-2,4,["produzione di tossine simulata"],["amaro"],null,"#80699B"],
    riparazione_dna: ["Riparazione del DNA",6,11,["riparazione genetica"],["neutro"],null,"#83A5D4"],
    resistenza_antibiotici: ["Resistenza agli antibiotici",1,5,["resistenza simulata"],["amaro"],null,"#918A72"],
    produzione_proteine: ["Produzione proteica",3,7,["sintesi proteica"],["umami"],null,"#B6A76D"],
    assorbimento_minerali: ["Assorbimento minerale",3,6,["assorbimento minerale"],["minerale"],null,"#9EB4B9"],
    accumulo_energia: ["Accumulo energetico",4,8,["riserva energetica"],["dolce"],null,"#E0B75B"],
    tolleranza_osmotica: ["Tolleranza osmotica",3,6,["tolleranza osmotica"],["salato"],null,"#8FB9C5"],
    chemotassi: ["Chemotassi",2,5,["chemotassi simulata"],["fresco"],null,"#5DB9AE"],
    sporulazione_resistente: ["Spore resistenti",5,9,["spore resistenti"],["terroso"],["granuloso"],"#A88B64"],
    produzione_acidi: ["Produzione di acidi",2,5,["metaboliti acidi"],["acido"],null,"#D8A0D1"],
    produzione_alcoli: ["Produzione di alcoli",3,6,["metaboliti alcolici simulati"],["fruttato","fermentato"],null,"#D8B45C"],
    aroma_fruttato: ["Aroma fruttato",3,7,["profilo aromatico fruttato"],["fruttato"],null,"#D77C9D"],
    aroma_floreale: ["Aroma floreale",3,7,["profilo aromatico floreale"],["floreale"],null,"#D6A4D8"],
    aroma_tostato: ["Aroma tostato",2,5,["profilo aromatico tostato"],["tostato"],null,"#A77B59"],
    umami: ["Profilo umami",4,8,["profilo umami"],["umami","sapido"],null,"#B98C62"],
    dolcezza: ["Profilo dolce",2,5,["profilo dolce"],["dolce"],null,"#E5C56D"],
    acidita: ["Profilo acidulo",2,5,["profilo acidulo"],["acido","acidulo"],null,"#D6D36A"],
    amarezza: ["Profilo amaro",1,3,["profilo amaro"],["amaro"],null,"#8F805C"],
    sapidita: ["Profilo sapido",2,5,["profilo sapido"],["salato","sapido"],null,"#8FAEBB"],
    cremosita: ["Consistenza cremosa",3,6,["consistenza cremosa"],["cremoso"],["cremoso"],"#E1D2A4"],
    viscosita: ["Consistenza viscosa",2,5,["consistenza viscosa"],["neutro"],["viscoso"],"#9DB9A4"],
    croccantezza: ["Consistenza granulosa",1,3,["consistenza granulosa"],["tostato"],["granuloso"],"#C4A47A"],
    adattamento: ["Adattamento ambientale",4,8,["adattabilità"],["complesso"],null,"#7CA6C8"],
    stabilita_genetica: ["Stabilità genetica",6,12,["stabilità genetica"],["pulito"],null,"#80B6C8"],
    metabolismo_estremo: ["Metabolismo estremo",5,10,["metabolismo estremo"],["minerale"],null,"#D18A5E"],
    assorbimento_nutrienti: ["Assorbimento nutrienti",3,6,["assorbimento nutrienti"],["vegetale"],null,"#9CCB78"],
    divisione_lenta: ["Divisione lenta",1,3,["crescita lenta"],["concentrato"],null,"#9BA9A5"],
    resistenza_radiazioni: ["Resistenza alle radiazioni",5,10,["resistenza simulata alle radiazioni"],["minerale"],null,"#B58DCB"],
    aggregazione: ["Aggregazione cellulare",2,5,["aggregazione"],["cremoso"],["aggregato"],"#9FC4B0"],
    secrezione_polimeri: ["Secrezione di polimeri",3,7,["secrezione di polimeri"],["neutro"],["gelatinoso"],"#85B6B5"],
    profilo_neutro: ["Profilo neutro",1,2,["profilo neutro"],["neutro"],null,"#B9B9B0"],
    rigenerazione_avanzata: ["Rigenerazione avanzata",5,9,["rigenerazione avanzata"],["fresco","pulito"],null,"#50C7A5"],
    efficienza_metabolica: ["Efficienza metabolica",4,8,["efficienza metabolica"],["pulito"],null,"#C4C96C"],
    resistenza_pressione: ["Resistenza alla pressione",4,7,["tolleranza alla pressione"],["minerale"],null,"#7196B7"],
    resistenza_uv: ["Resistenza UV",4,8,["resistenza UV simulata"],["minerale"],null,"#A78AD1"],
    crioprotezione: ["Crioprotezione",4,8,["protezione dal congelamento"],["fresco"],null,"#80D5ED"],
    termoregolazione: ["Adattamento termico",4,8,["adattamento termico"],["neutro"],null,"#D98B56"],
    produzione_lipidi: ["Produzione di lipidi",3,7,["produzione lipidica"],["untuoso"],null,"#B6BC69"],
    produzione_pigmenti: ["Produzione di pigmenti",3,7,["produzione di pigmenti"],["vegetale"],null,"#D78CA5"],
    quorum_sensing: ["Comunicazione cellulare",4,8,["comunicazione cellulare simulata"],["armonico"],null,"#6DB8C1"],
    simbiosi_avanzata: ["Simbiosi avanzata",5,10,["simbiosi avanzata"],["armonico","complesso"],null,"#7AC99C"],
    filtrazione: ["Filtrazione ambientale",3,6,["filtrazione simulata"],["pulito"],null,"#9DC6B0"],
    accumulo_risorse: ["Accumulo di risorse",3,7,["accumulo di risorse"],["concentrato"],null,"#C9A65B"],
    fermentazione_lenta: ["Fermentazione lenta",3,7,["fermentazione lenta"],["fermentato","complesso"],null,"#C99B5D"],
    profilo_balsamico: ["Profilo balsamico",3,7,["profilo balsamico"],["balsamico","fresco"],null,"#7AAE85"],
    aroma_legnoso: ["Aroma legnoso",2,5,["profilo aromatico legnoso"],["legnoso"],null,"#997456"],
    aroma_speziato: ["Aroma speziato",3,6,["profilo aromatico speziato"],["speziato"],null,"#C27E53"],
    equilibrio_metabolico: ["Equilibrio metabolico",4,8,["equilibrio metabolico"],["armonico","pulito"],null,"#8ABDA0"],
    membrana_rinforzata: ["Membrana rinforzata",4,8,["membrana rinforzata"],["neutro"],null,"#83A6C4"]
  };

  function T(row) {
    return {
      label: row[0],
      q: row[1],
      v: row[2],
      tags: row[3] || [],
      flavors: row[4] || [],
      textures: row[5] || [],
      color: row[6] || "#A8B8B0"
    };
  }

  const TRAITS = Object.fromEntries(
    Object.entries(RAW_TRAITS).map(([id, row]) => [id, T(row)])
  );

  /*
   * Ingredienti: i pattern riconoscono sia ID sia nomi descrittivi.
   */
  const INGREDIENT_RULES = [
    {
      pattern: /sugar|honey|syrup|zuccher|miele|glucose|glucosio|sciroppo/i,
      traits: ["dolcezza","accumulo_energia"],
      flavors: ["dolce","caramellato"],
      color: "#E5B94E",
      value: 4
    },
    {
      pattern: /lemon|lime|vinegar|citric|limone|aceto|acid|acido|agrum/i,
      traits: ["acidita","produzione_acidi"],
      flavors: ["acido","agrumato"],
      color: "#D7D95D",
      value: 4
    },
    {
      pattern: /berry|strawberry|apple|grape|fruit|frutta|mela|fragola|pera|pesca|banana|arancia|orange|uva|lampone|raspberry|mirtillo|blueberry/i,
      traits: ["aroma_fruttato"],
      flavors: ["fruttato","dolce"],
      color: "#D77C9D",
      value: 7
    },
    {
      pattern: /salt|sale|brine|salamoia/i,
      traits: ["sapidita","resistenza_sale"],
      flavors: ["salato","minerale"],
      color: "#9AC7D9",
      value: 3
    },
    {
      pattern: /mushroom|fungus|truffle|fungo|tartufo/i,
      traits: ["umami","biodegradazione"],
      flavors: ["terroso","umami"],
      color: "#A58B70",
      value: 8
    },
    {
      pattern: /meat|beef|chicken|fish|carne|pesce|pollo|manzo|maiale/i,
      traits: ["umami","produzione_proteine"],
      flavors: ["umami","sapido"],
      color: "#B96E62",
      value: 7
    },
    {
      pattern: /coffee|cocoa|chocolate|caffe|cacao|cioccolato|espresso/i,
      traits: ["aroma_tostato","amarezza"],
      flavors: ["amaro","tostato"],
      color: "#93664F",
      value: 7
    },
    {
      pattern: /milk|cream|butter|cheese|latte|panna|burro|formaggio|yogurt|yoghurt/i,
      traits: ["cremosita","produzione_acidi"],
      flavors: ["cremoso","lattico"],
      color: "#E5D6A8",
      value: 6
    },
    {
      pattern: /smok|affumicat|fumo/i,
      traits: ["aroma_tostato","aroma_legnoso"],
      flavors: ["affumicato","legnoso"],
      color: "#9B7258",
      value: 5
    },
    {
      pattern: /caramel|caramell/i,
      traits: ["dolcezza","aroma_tostato"],
      flavors: ["caramellato","tostato"],
      color: "#D99A45",
      value: 6
    },
    {
      pattern: /vitamin|vitamina/i,
      traits: ["produzione_vitamine"],
      flavors: ["vegetale"],
      color: "#E6C85C",
      value: 8
    },
    {
      pattern: /mineral|minerale|calcium|iron|ferro|calcio|magnesio|magnesium/i,
      traits: ["assorbimento_minerali"],
      flavors: ["minerale"],
      color: "#9EB4B9",
      value: 5
    },
    {
      pattern: /oil|olio|olive|oliva|grasso|fat/i,
      traits: ["accumulo_energia","produzione_lipidi"],
      flavors: ["untuoso"],
      color: "#A7B95A",
      value: 4
    },
    {
      pattern: /flower|floral|fiore|lavender|rosa|lavanda|gelsomino|jasmine/i,
      traits: ["aroma_floreale"],
      flavors: ["floreale"],
      color: "#C99BD5",
      value: 8
    },
    {
      pattern: /bread|pane|wheat|grano|farina|flour|cereal|orzo|barley|riso|rice/i,
      traits: ["fermentazione","assorbimento_nutrienti"],
      flavors: ["cereale","fermentato"],
      color: "#C7AD7B",
      value: 5
    },
    {
      pattern: /herb|erba|basil|basilico|mint|menta|rosemary|rosmarino|thyme|timo/i,
      traits: ["profilo_balsamico","aroma_floreale"],
      flavors: ["erbaceo","balsamico"],
      color: "#79B27B",
      value: 6
    },
    {
      pattern: /spice|spezi|pepper|pepe|chili|peperoncino|ginger|zenzero|cinnamon|cannella/i,
      traits: ["aroma_speziato"],
      flavors: ["speziato"],
      color: "#C27E53",
      value: 6
    },
    {
      pattern: /protein|proteina|legume|bean|fagiolo|lentil|lenticchia|soy|soia/i,
      traits: ["produzione_proteine","assorbimento_nutrienti"],
      flavors: ["umami"],
      color: "#A5A86E",
      value: 6
    },
    {
      pattern: /algae|alga|seaweed|kelp|spirulina/i,
      traits: ["fotosintesi","clorofilla","assorbimento_minerali"],
      flavors: ["vegetale","minerale"],
      color: "#4DBA91",
      value: 8
    },
    {
      pattern: /salsa|sauce|condiment|dressing/i,
      traits: ["umami","produzione_enzimi"],
      flavors: ["sapido","complesso"],
      color: "#B98C62",
      value: 5
    }
  ];

  const TREATMENTS = {
    normale: {
      aliases: ["normale","normal","plain"],
      traits: [],
      flavors: [],
      textures: [],
      color: null,
      value: 0
    },
    innesto: {
      aliases: ["innesto","graft","grafting","innestato","innestata","ibridazione","hybridization","hybridisation"],
      traits: ["ricombinazione","adattamento","simbiosi"],
      flavors: ["complesso","armonico"],
      textures: [],
      color: "#78BDA8",
      value: 8
    },
    affumicato: {
      aliases: ["affumicato","affumicata","affumicatura","smoked","smoking","smoke","fumo"],
      traits: ["aroma_tostato","aroma_legnoso"],
      flavors: ["affumicato","legnoso","tostato"],
      textures: [],
      color: "#9B7258",
      value: 5
    },
    caramellato: {
      aliases: ["caramellato","caramellata","caramellatura","caramello","caramelized","caramelised","caramel"],
      traits: ["dolcezza","aroma_tostato"],
      flavors: ["caramellato","tostato","dolce"],
      textures: [],
      color: "#D99A45",
      value: 6
    },
    salsa: {
      aliases: ["salsa","sauce","salsato","condimento","condiment","dressing","sauced"],
      traits: ["umami","produzione_enzimi"],
      flavors: ["sapido","complesso"],
      textures: ["cremoso"],
      color: "#B98C62",
      value: 5
    },
    essiccato: {
      aliases: ["essiccato","essiccata","essiccazione","dried","drying"],
      traits: ["resistenza_siccita","accumulo_risorse"],
      flavors: ["concentrato"],
      textures: [],
      color: "#C9A66B",
      value: 4
    },
    raffreddato: {
      aliases: ["raffreddato","raffreddamento","cooled","cooling"],
      traits: ["adattamento_al_freddo","crioprotezione"],
      flavors: ["fresco"],
      textures: [],
      color: "#80D5ED",
      value: 4
    },
    riscaldato: {
      aliases: ["riscaldato","riscaldamento","heated","heating"],
      traits: ["termoresistenza","termoregolazione"],
      flavors: ["tostato"],
      textures: [],
      color: "#D98B56",
      value: 4
    },
    fermentato: {
      aliases: ["fermentato","fermentata","fermentazione","fermented","fermenting"],
      traits: ["fermentazione","produzione_alcoli","produzione_acidi"],
      flavors: ["fermentato","acidulo","complesso"],
      textures: ["effervescente"],
      color: "#D7A24B",
      value: 8
    },
    purificato: {
      aliases: ["purificato","purificata","purificazione","purified","purification"],
      traits: ["filtrazione","efficienza_metabolica"],
      flavors: ["pulito"],
      textures: [],
      color: "#9DC6B0",
      value: 5
    },
    irradiato: {
      aliases: ["irradiato","irradiata","irradiazione","irradiated","irradiation"],
      traits: ["resistenza_radiazioni","riparazione_dna","mutazione"],
      flavors: ["minerale"],
      textures: [],
      color: "#B58DCB",
      value: 6
    },
    mineralizzato: {
      aliases: ["mineralizzato","mineralizzata","mineralizzazione","mineralized","mineralized"],
      traits: ["assorbimento_minerali","metabolismo_estremo"],
      flavors: ["minerale"],
      textures: [],
      color: "#9EB4B9",
      value: 5
    },
    inoculato: {
      aliases: ["inoculato","inoculata","inoculazione","inoculated","inoculation"],
      traits: ["crescita","produzione_enzimi","assorbimento_nutrienti"],
      flavors: ["vegetale"],
      textures: [],
      color: "#9CCB78",
      value: 5
    },
    stabilizzato: {
      aliases: ["stabilizzato","stabilizzata","stabilizzazione","stabilized","stabilised"],
      traits: ["stabilita_genetica","equilibrio_metabolico"],
      flavors: ["pulito","armonico"],
      textures: [],
      color: "#80B6C8",
      value: 7
    },
    restauro: {
      aliases: ["restaurato","restaurata","restauro","restored","restoration"],
      traits: ["rigenerazione","riparazione_dna"],
      flavors: ["fresco","pulito"],
      textures: [],
      color: "#61C5A1",
      value: 6
    }
  };

  const COMBINATIONS = [
    { id: "fotoluminescenza", traits: ["fotosintesi","bioluminescenza"] },
    { id: "fermentazione_zuccherina", traits: ["fermentazione","dolcezza"] },
    { id: "sopravvivenza_estrema", traits: ["termoresistenza","resistenza_siccita"] },
    { id: "barriera_cellulare", traits: ["biofilm","capsula_protettiva"] },
    { id: "genoma_stabile", traits: ["riparazione_dna","stabilita_genetica"] },
    { id: "fermentazione_aromatica", traits: ["fermentazione","produzione_alcoli"] },
    { id: "rete_simbiotica", traits: ["simbiosi","quorum_sensing"] },
    { id: "resistenza_climatica", traits: ["crioprotezione","resistenza_siccita"] },
    { id: "pigmentazione_fotosintetica", traits: ["produzione_pigmenti","fotosintesi"] }
  ];

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getId(item) {
    if (item == null) return null;
    if (typeof item === "string" || typeof item === "number") {
      return String(item);
    }

    for (const key of [
      "id", "ingredientId", "ingredient_id",
      "key", "uid", "identifier"
    ]) {
      if (item[key] != null) return String(item[key]);
    }

    return null;
  }

  /*
   * Ricerca ingrediente:
   * 1. registro di questo mod;
   * 2. raccolte globali note;
   * 3. oggetti annidati nel contesto globale.
   *
   * Le ricerche sono limitate per evitare cicli e scansioni infinite.
   */
  function resolveIngredient(ingredientId) {
    if (ingredientId == null) return null;

    const id = String(ingredientId).trim();
    if (!id) return null;

    if (Object.prototype.hasOwnProperty.call(registry, id)) {
      return registry[id];
    }

    const sources = [
      window.foodData,
      window.fooddata,
      window.ingredients,
      window.ingredientData,
      window.ingredientDatabase,
      window.ingredientRegistry,
      window.ingredientList,
      window.items,
      window.foods,
      window.game?.ingredients,
      window.game?.foodData,
      window.gameState?.ingredients,
      window.gameState?.foodData,
      window
    ];

    const visited = new Set();
    let nodes = 0;

    function search(source, depth) {
      if (!source || typeof source !== "object") return null;
      if (visited.has(source) || depth > 5 || nodes > 12000) return null;

      visited.add(source);
      nodes++;

      if (source instanceof Map) {
        if (source.has(id)) {
          const direct = source.get(id);
          if (direct && typeof direct === "object") return direct;
        }

        for (const [key, value] of source.entries()) {
          if (String(key) === id && value && typeof value === "object") {
            return value;
          }

          if (value && typeof value === "object" && getId(value) === id) {
            return value;
          }
        }

        for (const value of source.values()) {
          const found = search(value, depth + 1);
          if (found) return found;
        }

        return null;
      }

      if (Array.isArray(source)) {
        for (const item of source) {
          if (!item || typeof item !== "object") continue;
          if (getId(item) === id) return item;
        }

        for (const item of source) {
          const found = search(item, depth + 1);
          if (found) return found;
        }

        return null;
      }

      if (Object.prototype.hasOwnProperty.call(source, id)) {
        const direct = source[id];
        if (direct && typeof direct === "object") return direct;
      }

      let entries;

      try {
        entries = Object.entries(source);
      } catch (_) {
        return null;
      }

      for (const [key, value] of entries) {
        if (String(key) === id && value && typeof value === "object") {
          return value;
        }

        if (value && typeof value === "object" && getId(value) === id) {
          return value;
        }
      }

      for (const [, value] of entries) {
        if (!value || typeof value !== "object") continue;

        const found = search(value, depth + 1);
        if (found) return found;
      }

      return null;
    }

    for (const source of sources) {
      const found = search(source, 0);
      if (found) return found;
    }

    console.warn(
      "[Microorganismi] ID ingrediente non trovato:",
      id,
      "Verificare l'archivio ingredienti della versione del gioco."
    );

    return null;
  }

  function describeIngredient(id, resolved) {
    const parts = [String(id)];

    if (resolved && typeof resolved === "object") {
      for (const key of ["name", "label", "displayName", "title"]) {
        if (resolved[key] && String(resolved[key]) !== String(id)) {
          parts.push(String(resolved[key]));
        }
      }

      // type è incluso per riconoscere ingredienti derivati,
      // ma non viene mai usato come sostituto dell'ID.
      if (resolved.type) parts.push(String(resolved.type));
    }

    return parts.join(" ");
  }

  function findTreatment(text) {
    const normalized = normalize(text);

    for (const [id, treatment] of Object.entries(TREATMENTS)) {
      if (
        treatment.aliases.some(alias =>
          normalized.includes(normalize(alias))
        )
      ) {
        return { id, ...treatment };
      }
    }

    return null;
  }

  function analyzeIngredient(id, resolved, treatmentInput) {
    const description = describeIngredient(id, resolved);
    const searchText = normalize(description);
    const traits = new Set();
    const flavors = new Set();
    const textures = new Set();
    let color = resolved?.color || null;
    let value = 0;

    for (const rule of INGREDIENT_RULES) {
      if (!rule.pattern.test(searchText)) continue;

      rule.traits.forEach(trait => traits.add(trait));
      rule.flavors.forEach(flavor => flavors.add(flavor));
      value += rule.value;

      if (!color) color = rule.color;
    }

    const treatment =
      findTreatment(treatmentInput || "") ||
      findTreatment(description);

    if (treatment) {
      treatment.traits.forEach(trait => traits.add(trait));
      treatment.flavors.forEach(flavor => flavors.add(flavor));
      treatment.textures.forEach(texture => textures.add(texture));
      value += treatment.value;

      if (treatment.color) color = treatment.color;
    }

    /*
     * Se il gioco espone un ID, lo conserviamo esattamente.
     * Non deduciamo il nome reale dal solo type.
     */
    return {
      id: String(id),
      resolved,
      description,
      traits: [...traits],
      flavors: [...flavors],
      textures: [...textures],
      color: color || "#A8B8B0",
      value,
      treatment: treatment?.id || null
    };
  }

  function getSelectedIngredient() {
    if (
      typeof window.getSelectedIngredientForMicroorganism === "function"
    ) {
      const selected =
        window.getSelectedIngredientForMicroorganism();

      if (selected != null) {
        return typeof selected === "object"
          ? getId(selected)
          : String(selected);
      }
    }

    const candidates = [
      window.selectedIngredient,
      window.currentIngredient,
      window.ingredientSelected,
      window.selectedItem,
      window.placedIngredient
    ];

    for (const candidate of candidates) {
      if (candidate != null) {
        const id = getId(candidate);
        if (id) return id;
      }
    }

    const elements = [
      "[data-ingredient-id][aria-selected='true']",
      "[data-ingredient-id].selected",
      ".ingredient.selected",
      ".selected-ingredient"
    ];

    for (const selector of elements) {
      const element = document.querySelector(selector);
      if (element) {
        const id =
          element.dataset?.ingredientId ||
          element.dataset?.id ||
          element.getAttribute("data-ingredient-id");

        if (id) return id;
      }
    }

    return null;
  }

  function askIngredient(promptText, excludedId) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const input = window.prompt(promptText);

      if (input == null) return null;

      const id = input.trim();
      if (!id) {
        window.alert("Inserisci un ID ingrediente.");
        continue;
      }

      if (excludedId != null && id === String(excludedId)) {
        window.alert(
          "Hai inserito lo stesso ID del primo ingrediente. " +
          "Inserisci il secondo ingrediente."
        );
        continue;
      }

      const resolved = resolveIngredient(id);

      if (!resolved) {
        window.alert(
          `Non riesco a trovare l'ingrediente "${id}".\n\n` +
          "Controlla l'ID esatto. Se è un ingrediente aggiunto da una mod, " +
          "l'archivio della mod potrebbe non essere esposto globalmente."
        );
        continue;
      }

      return { id, resolved };
    }

    return null;
  }

  function chooseSpecies() {
    const menu = Object.entries(SPECIES)
      .map(([id, item]) => `${id} — ${item.name}`)
      .join("\n");

    const input = window.prompt(
      "Scegli la specie:\n" + menu,
      "bacterium"
    );

    if (input == null) return null;

    const id = normalize(input);
    const match = SPECIES[id] ? id :
      Object.keys(SPECIES).find(key =>
        normalize(SPECIES[key].name) === id
      );

    if (!match) {
      window.alert("Specie non riconosciuta.");
      return null;
    }

    return { id: match, ...SPECIES[match] };
  }

  function blendColors(colors) {
    const valid = colors.filter(color =>
      typeof color === "string" &&
      /^#[0-9a-f]{6}$/i.test(color)
    );

    if (!valid.length) return "#78C878";

    const channels = [0, 0, 0];

    for (const color of valid) {
      channels[0] += parseInt(color.slice(1, 3), 16);
      channels[1] += parseInt(color.slice(3, 5), 16);
      channels[2] += parseInt(color.slice(5, 7), 16);
    }

    const avg = channels.map(value =>
      Math.round(value / valid.length)
        .toString(16)
        .padStart(2, "0")
    );

    return "#" + avg.join("");
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function createMicroorganism() {
    const species = chooseSpecies();
    if (!species) return;

    const firstId = getSelectedIngredient();

    let first;
    if (firstId) {
      const firstResolved = resolveIngredient(firstId);

      if (firstResolved) {
        first = { id: firstId, resolved: firstResolved };
      }
    }

    if (!first) {
      first = askIngredient(
        "Inserisci l'ID esatto del primo ingrediente."
      );
      if (!first) return;
    }

    const second = askIngredient(
      "Inserisci l'ID esatto del SECONDO ingrediente.\n" +
      "Può essere base, di una mod, salsa, innesto, affumicato " +
      "o caramellato.",
      first.id
    );

    if (!second) return;

    const firstTreatmentInput = window.prompt(
      "Trattamento del primo ingrediente (facoltativo):\n" +
      "normale, innesto, affumicato, caramellato, salsa, essiccato,\n" +
      "raffreddato, riscaldato, fermentato, purificato, irradiato,\n" +
      "mineralizzato, inoculato, stabilizzato, restauro",
      "normale"
    );

    if (firstTreatmentInput == null) return;

    const secondTreatmentInput = window.prompt(
      "Trattamento del secondo ingrediente (facoltativo):\n" +
      "normale, innesto, affumicato, caramellato, salsa, essiccato,\n" +
      "raffreddato, riscaldato, fermentato, purificato, irradiato,\n" +
      "mineralizzato, inoculato, stabilizzato, restauro",
      "normale"
    );

    if (secondTreatmentInput == null) return;

    const cellType = window.prompt(
      "Tipo cellulare: procariote, eucariote oppure misto",
      species.cell
    );

    if (cellType == null) return;

    const temperatureInput = window.prompt(
      "Temperatura simulata in °C:",
      "25"
    );

    if (temperatureInput == null) return;

    const temperature = Number(temperatureInput);

    if (!Number.isFinite(temperature)) {
      window.alert("Temperatura non valida.");
      return;
    }

    const extraInput = window.prompt(
      "ID di eventuali tratti extra separati da virgole.\n" +
      "Lascia vuoto per nessun tratto extra.\n\n" +
      Object.keys(TRAITS).join(", "),
      ""
    );

    if (extraInput == null) return;

    const extraTraits = extraInput
      .split(",")
      .map(value => normalize(value))
      .filter(id => Object.prototype.hasOwnProperty.call(TRAITS, id));

    const firstAnalysis = analyzeIngredient(
      first.id, first.resolved, firstTreatmentInput
    );

    const secondAnalysis = analyzeIngredient(
      second.id, second.resolved, secondTreatmentInput
    );

    const ingredientAnalyses = [firstAnalysis, secondAnalysis];

    const traitIds = new Set(extraTraits);

    for (const ingredient of ingredientAnalyses) {
      ingredient.traits.forEach(id => {
        if (TRAITS[id]) traitIds.add(id);
      });
    }

    const combos = COMBINATIONS.filter(combo =>
      combo.traits.every(id => traitIds.has(id))
    );

    const comboIds = combos.map(combo => combo.id);

    const traitList = [...traitIds]
      .filter(id => TRAITS[id])
      .map(id => ({ id, ...TRAITS[id] }));

    let quality = species.base;

    quality += traitList.reduce((sum, trait) => sum + trait.q, 0);
    quality += combos.length * 7;
    quality += Math.min(12, ingredientAnalyses.length * 2);

    if (
      cellType.trim().toLowerCase() !== species.cell &&
      cellType.trim().toLowerCase() !== "misto"
    ) {
      quality -= 3;
    }

    if (temperature < 0 || temperature > 80) quality -= 3;
    if (temperature > 45) quality += 4;

    quality = Math.max(1, Math.min(100, Math.round(quality)));

    let value = species.base * 0.55;

    value += ingredientAnalyses.reduce(
      (sum, ingredient) => sum + ingredient.value, 0
    );

    value += traitList.reduce((sum, trait) => sum + trait.v, 0);
    value += combos.length * 12;
    value += ingredientAnalyses.length * 2;

    value = Math.round(value * (0.65 + quality / 100));

    const flavors = unique([
      ...ingredientAnalyses.flatMap(item => item.flavors),
      ...traitList.flatMap(item => item.flavors)
    ]);

    const textures = unique([
      ...ingredientAnalyses.flatMap(item => item.textures),
      ...traitList.flatMap(item => item.textures)
    ]);

    const color = blendColors([
      species.color,
      ...ingredientAnalyses.map(item => item.color),
      ...traitList.map(item => item.color)
    ]);

    const signature = [
      species.id,
      first.id,
      second.id,
      ...ingredientAnalyses.map(item => item.treatment || "normale"),
      ...[...traitIds].sort(),
      ...comboIds.sort(),
      cellType.trim().toLowerCase(),
      temperature
    ].join("|");

    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
      hash = ((hash << 5) - hash + signature.charCodeAt(i)) | 0;
    }

    const id = `microorganism_${Math.abs(hash).toString(36)}`;
    const name = `${species.name} ${id.slice(-5)}`;

    const microorganism = {
      id,
      name,
      type: species.type,
      color,
      shape: "microbe",
      cellType: cellType.trim().toLowerCase(),
      species: species.id,
      ingredients: [first.id, second.id],
      treatments: ingredientAnalyses.map(item => item.treatment),
      traits: [...traitIds],
      combinations: comboIds,
      quality,
      value,
      temperature,
      flavors,
      textures,
      version: VERSION
    };

    /*
     * Registra i dati del microorganismo in un archivio pubblico del mod.
     */
    window.microorganismRegistry[id] = microorganism;

    /*
     * Crea un ingrediente riconosciuto da Infinite Chef.
     * L'ID generato è unico e usa soltanto caratteri sicuri.
     */
    try {
      window.addIngredient(id, {
        color: microorganism.color,
        type: species.type,
        shape: "microbe",
        value: microorganism.value,
        microorganism: true,
        species: microorganism.species,
        quality: microorganism.quality,
        traits: microorganism.traits,
        ingredients: microorganism.ingredients
      });
    } catch (error) {
      console.error(
        "[Microorganismi] Errore durante la registrazione:",
        error
      );

      window.alert(
        "Il microorganismo è stato calcolato, ma Infinite Chef " +
        "ha rifiutato la registrazione dell'ingrediente. " +
        "Controlla la console."
      );
      return;
    }

    /*
     * Crea l'uovo contenente il microorganismo.
     */
    const eggId = `${id}_egg`;

    try {
      window.addIngredient(eggId, {
        color: microorganism.color,
        type: "egg",
        shape: "egg",
        value: microorganism.value,
        microorganismEgg: true,
        microorganismId: id
      });
    } catch (error) {
      console.warn(
        "[Microorganismi] Impossibile registrare l'uovo:",
        error
      );
    }

    window.dispatchEvent(new CustomEvent(
      "microorganismCreated",
      { detail: microorganism }
    ));

    const traitNames = traitList.map(trait => trait.label);

    window.alert(
      `Microorganismo creato!\n\n` +
      `Nome: ${name}\n` +
      `ID: ${id}\n` +
      `Specie: ${species.name}\n` +
      `Primo ingrediente: ${first.id}\n` +
      `Secondo ingrediente: ${second.id}\n` +
      `Tratti: ${traitNames.join(", ") || "nessuno"}\n` +
      `Combinazioni: ${comboIds.join(", ") || "nessuna"}\n` +
      `Qualità: ${quality}/100\n` +
      `Valore: ${value}\n` +
      `Colore: ${color}\n` +
      `Uovo: ${eggId}`
    );

    console.info(
      "[Microorganismi] Creato:",
      microorganism
    );
  }

  /*
   * API pubblica utile per altre mod o per il debug.
   */
  window.resolveMicroorganismIngredient = resolveIngredient;

  window.createMicroorganism = createMicroorganism;

  window.getMicroorganismIngredientRegistry = function () {
    return registry;
  };

  /*
   * Registra il tool nel gioco.
   */
  try {
    window.addTool(TOOL_ID, {
      name: "Creator of Microorganisms",
      shape: "microbe",
      func: function () {
        createMicroorganism();
      },
      onSelect: function () {
        console.info(
          `[Microorganismi ${VERSION}] Tool selezionato.`
        );
      },
      onClick: function () {
        createMicroorganism();
      }
    });
  } catch (error) {
    console.error(
      "[Microorganismi] Registrazione del tool non riuscita:",
      error
    );
  }

  console.info(
    `[Microorganismi] Creator of Microorganisms v${VERSION} caricato.`
  );
})();
