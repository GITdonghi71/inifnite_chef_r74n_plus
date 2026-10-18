/*
 * creator_of_microorganisms.js
 * v8.0 - Identita univoca, genetica, tratti estesi, qualita e valore
 *
 * API previste dal repository: addIngredient, addRecipe, addTool.
 * L'integrazione con Restoration Simulator avviene tramite
 * window.microorganismRegistry[id].
 *
 * NOTA: qualita/prezzo sono valori ludici, non dati biologici reali.
 */
(function () {
  "use strict";

  if (typeof addIngredient !== "function" ||
      typeof addRecipe !== "function" ||
      typeof addTool !== "function") {
    console.error("[Microorganisms v8] Mancano addIngredient/addRecipe/addTool.");
    return;
  }

  const VERSION = "8.0";
  const TOOL_ID = "creator_of_microorganisms";

  const SPECIES = {
    bacterium: {
      label: "Batterio",
      shape: "microbe",
      color: "#78C878",
      cell: "procariote",
      base: 55
    },
    yeast: {
      label: "Lievito",
      shape: "fungus",
      color: "#E7C56D",
      cell: "eucariote",
      base: 62
    },
    mold: {
      label: "Muffa",
      shape: "fungus",
      color: "#A88BD0",
      cell: "eucariote",
      base: 58
    },
    archaea: {
      label: "Archeo",
      shape: "microbe",
      color: "#E28D60",
      cell: "procariote",
      base: 72
    },
    microalgae: {
      label: "Microalga",
      shape: "algae",
      color: "#4DBA91",
      cell: "eucariote",
      base: 65
    },
    hybrid: {
      label: "Ibrido",
      shape: "double_helix",
      color: "#5AB8CE",
      cell: "misto",
      base: 80
    }
  };

  // Ogni tratto influenza le caratteristiche simulate del microrganismo.
  const TRAITS = {
    divisione_binaria: {
      label: "Divisione binaria", q: 2, v: 3,
      p: ["riproduzione rapida"], f: ["neutro"], c: "#8BD18B"
    },
    crescita: {
      label: "Crescita rapida", q: 1, v: 3,
      p: ["crescita rapida"], f: ["delicato"], c: "#A5D77B"
    },
    sporulazione: {
      label: "Sporulazione", q: 3, v: 5,
      p: ["formazione di spore"], f: ["terroso"],
      t: ["granuloso"], c: "#B69B7D"
    },
    dormienza: {
      label: "Dormienza", q: 2, v: 4,
      p: ["dormienza"], f: ["delicato"], c: "#9CA7B4"
    },
    rigenerazione: {
      label: "Rigenerazione", q: 4, v: 7,
      p: ["rigenerazione"], f: ["fresco"], c: "#61C5A1"
    },
    mutazione: {
      label: "Mutabilità", q: 1, v: 6,
      p: ["mutabilità elevata"], f: ["complesso"], c: "#BD83D5"
    },
    ricombinazione: {
      label: "Ricombinazione", q: 4, v: 8,
      p: ["ricombinazione genetica"], f: ["complesso"], c: "#5AB8CE"
    },
    fotosintesi: {
      label: "Fotosintesi", q: 4, v: 7,
      p: ["fotosintesi"], f: ["vegetale", "fresco"], c: "#43B978"
    },
    clorofilla: {
      label: "Clorofilla", q: 2, v: 4,
      p: ["pigmento verde"], f: ["erbaceo"], c: "#68B85C"
    },
    fermentazione: {
      label: "Fermentazione", q: 4, v: 8,
      p: ["fermentazione"], f: ["fermentato", "acidulo"],
      t: ["effervescente"], c: "#D7A24B"
    },
    chemosintesi: {
      label: "Chemiosintesi", q: 5, v: 9,
      p: ["produzione energetica chimica"], f: ["minerale"], c: "#C59D68"
    },
    bioluminescenza: {
      label: "Bioluminescenza", q: 6, v: 14,
      p: ["luminescenza simulata"], f: ["minerale"], c: "#42E5D4"
    },
    termoresistenza: {
      label: "Termoresistenza", q: 4, v: 7,
      p: ["resistenza al calore"], f: ["tostato"], c: "#D86D36"
    },
    adattamento_al_freddo: {
      label: "Adattamento al freddo", q: 3, v: 6,
      p: ["tolleranza al freddo"], f: ["fresco"], c: "#73D8EA"
    },
    acidofilia: {
      label: "Acidofilia", q: 3, v: 5,
      p: ["tolleranza all'acidità"], f: ["acido"], c: "#D5A4E8"
    },
    alcalofilia: {
      label: "Alcalofilia", q: 3, v: 5,
      p: ["tolleranza all'alcalinità"], f: ["minerale"], c: "#8BB9A2"
    },
    resistenza_siccita: {
      label: "Resistenza alla siccità", q: 3, v: 6,
      p: ["resistenza alla siccità"], f: ["concentrato"], c: "#C9A66B"
    },
    resistenza_sale: {
      label: "Resistenza al sale", q: 3, v: 5,
      p: ["tolleranza salina"], f: ["salato", "minerale"], c: "#85B7C9"
    },
    resistenza_tossine: {
      label: "Resistenza alle tossine", q: 4, v: 7,
      p: ["resistenza alle tossine"], f: ["amaro"], c: "#8D7AB6"
    },
    produzione_enzimi: {
      label: "Produzione di enzimi", q: 4, v: 8,
      p: ["produzione enzimatica"], f: ["umami"], c: "#D6B65D"
    },
    produzione_vitamine: {
      label: "Produzione di vitamine", q: 5, v: 10,
      p: ["produzione vitaminica simulata"],
      f: ["vegetale", "dolce"], c: "#E6C85C"
    },
    biodegradazione: {
      label: "Biodegradazione", q: 3, v: 6,
      p: ["decomposizione organica"], f: ["terroso"], c: "#9B875E"
    },
    motilita: {
      label: "Motilità", q: 2, v: 5,
      p: ["mobilità"], f: ["fresco"], c: "#55B9C8"
    },
    biofilm: {
      label: "Biofilm", q: 3, v: 6,
      p: ["formazione di biofilm"], f: ["cremoso"],
      t: ["viscoso"], c: "#8BBCA6"
    },
    ife: {
      label: "Ife", q: 2, v: 4,
      p: ["struttura ifale"], f: ["terroso"],
      t: ["filamentoso"], c: "#B39AD0"
    },
    capsula_protettiva: {
      label: "Capsula protettiva", q: 4, v: 7,
      p: ["capsula protettiva"], f: ["neutro"],
      t: ["gelatinoso"], c: "#9CC7D7"
    },
    pigmentazione: {
      label: "Pigmentazione", q: 2, v: 5,
      p: ["pigmentazione speciale"], f: ["vegetale"], c: "#D88FB3"
    },
    simbiosi: {
      label: "Simbiosi", q: 5, v: 10,
      p: ["simbiosi"], f: ["armonico"], c: "#8BCB9B"
    },
    parassitismo: {
      label: "Parassitismo", q: 1, v: 5,
      p: ["parassitismo simulato"], f: ["amaro"], c: "#8C719B"
    },
    predazione: {
      label: "Predazione microbica", q: 2, v: 7,
      p: ["predazione simulata"], f: ["intenso"], c: "#BA7777"
    },
    produzione_tossine: {
      label: "Produzione di tossine", q: -2, v: 4,
      p: ["produzione di tossine simulata"], f: ["amaro"], c: "#80699B"
    },
    riparazione_dna: {
      label: "Riparazione del DNA", q: 6, v: 11,
      p: ["riparazione genetica"], f: ["neutro"], c: "#83A5D4"
    },
    resistenza_antibiotici: {
      label: "Resistenza agli antibiotici", q: 1, v: 5,
      p: ["resistenza simulata"], f: ["amaro"], c: "#918A72"
    },
    produzione_proteine: {
      label: "Produzione proteica", q: 3, v: 7,
      p: ["sintesi proteica"], f: ["umami"], c: "#B6A76D"
    },
    assorbimento_minerali: {
      label: "Assorbimento minerale", q: 3, v: 6,
      p: ["assorbimento minerale"], f: ["minerale"], c: "#9EB4B9"
    },
    accumulo_energia: {
      label: "Accumulo energetico", q: 4, v: 8,
      p: ["riserva energetica"], f: ["dolce"], c: "#E0B75B"
    },
    tolleranza_osmotica: {
      label: "Tolleranza osmotica", q: 3, v: 6,
      p: ["tolleranza osmotica"], f: ["salato"], c: "#8FB9C5"
    },
    chemotassi: {
      label: "Chemotassi", q: 2, v: 5,
      p: ["chemotassi simulata"], f: ["fresco"], c: "#5DB9AE"
    },
    sporulazione_resistente: {
      label: "Spore resistenti", q: 5, v: 9,
      p: ["spore resistenti"], f: ["terroso"],
      t: ["granuloso"], c: "#A88B64"
    },
    produzione_acidi: {
      label: "Produzione di acidi", q: 2, v: 5,
      p: ["metaboliti acidi"], f: ["acido"], c: "#D8A0D1"
    },
    produzione_alcoli: {
      label: "Produzione di alcoli", q: 3, v: 6,
      p: ["metaboliti alcolici simulati"],
      f: ["fruttato", "fermentato"], c: "#D8B45C"
    },
    aroma_fruttato: {
      label: "Aroma fruttato", q: 3, v: 7,
      p: ["profilo aromatico fruttato"], f: ["fruttato"], c: "#D77C9D"
    },
    aroma_floreale: {
      label: "Aroma floreale", q: 3, v: 7,
      p: ["profilo aromatico floreale"], f: ["floreale"], c: "#D6A4D8"
    },
    aroma_tostato: {
      label: "Aroma tostato", q: 2, v: 5,
      p: ["profilo aromatico tostato"], f: ["tostato"], c: "#A77B59"
    },
    umami: {
      label: "Profilo umami", q: 4, v: 8,
      p: ["profilo umami"], f: ["umami", "sapido"], c: "#B98C62"
    },
    dolcezza: {
      label: "Profilo dolce", q: 2, v: 5,
      p: ["profilo dolce"], f: ["dolce"], c: "#E5C56D"
    },
    acidita: {
      label: "Profilo acidulo", q: 2, v: 5,
      p: ["profilo acidulo"], f: ["acido", "acidulo"], c: "#D6D36A"
    },
    amarezza: {
      label: "Profilo amaro", q: 1, v: 3,
      p: ["profilo amaro"], f: ["amaro"], c: "#8F805C"
    },
    sapidita: {
      label: "Profilo sapido", q: 2, v: 5,
      p: ["profilo sapido"], f: ["salato", "sapido"], c: "#8FAEBB"
    },
    cremosita: {
      label: "Consistenza cremosa", q: 3, v: 6,
      p: ["consistenza cremosa"], f: ["cremoso"],
      t: ["cremoso"], c: "#E1D2A4"
    },
    viscosita: {
      label: "Consistenza viscosa", q: 2, v: 5,
      p: ["consistenza viscosa"], f: ["neutro"],
      t: ["viscoso"], c: "#9DB9A4"
    },
    croccantezza: {
      label: "Consistenza granulosa", q: 1, v: 3,
      p: ["consistenza granulosa"], f: ["tostato"],
      t: ["granuloso"], c: "#C4A47A"
    },
    adattamento: {
      label: "Adattamento ambientale", q: 4, v: 8,
      p: ["adattabilità"], f: ["complesso"], c: "#7CA6C8"
    },
    stabilita_genetica: {
      label: "Stabilità genetica", q: 6, v: 12,
      p: ["stabilità genetica"], f: ["pulito"], c: "#80B6C8"
    },
    metabolismo_estremo: {
      label: "Metabolismo estremo", q: 5, v: 10,
      p: ["metabolismo estremo"], f: ["minerale"], c: "#D18A5E"
    },
    assorbimento_nutrienti: {
      label: "Assorbimento nutrienti", q: 3, v: 6,
      p: ["assorbimento nutrienti"], f: ["vegetale"], c: "#9CCB78"
    },
    divisione_lenta: {
      label: "Divisione lenta", q: 1, v: 3,
      p: ["crescita lenta"], f: ["concentrato"], c: "#9BA9A5"
    },
    resistenza_radiazioni: {
      label: "Resistenza alle radiazioni", q: 5, v: 10,
      p: ["resistenza simulata alle radiazioni"], f: ["minerale"], c: "#B58DCB"
    },
    aggregazione: {
      label: "Aggregazione cellulare", q: 2, v: 5,
      p: ["aggregazione"], f: ["cremoso"],
      t: ["aggregato"], c: "#9FC4B0"
    },
    secrezione_polimeri: {
      label: "Secrezione di polimeri", q: 3, v: 7,
      p: ["secrezione di polimeri"], f: ["neutro"],
      t: ["gelatinoso"], c: "#85B6B5"
    },
    profilo_neutro: {
      label: "Profilo neutro", q: 1, v: 2,
      p: ["profilo neutro"], f: ["neutro"], c: "#B9B9B0"
    }
  };

  const INGREDIENT_RULES = [
    {
      re: /sugar|honey|syrup|zucchero|miele|glucose/,
      traits: ["dolcezza", "accumulo_energia"],
      flavors: ["dolce", "caramellato"],
      color: "#E5B94E",
      value: 4
    },
    {
      re: /lemon|lime|vinegar|citric|limone|aceto|acid/,
      traits: ["acidita", "produzione_acidi"],
      flavors: ["acido", "agrumato"],
      color: "#D7D95D",
      value: 4
    },
    {
      re: /berry|strawberry|apple|grape|fruit|frutta|mela|fragola/,
      traits: ["aroma_fruttato"],
      flavors: ["fruttato", "dolce"],
      color: "#D77C9D",
      value: 7
    },
    {
      re: /salt|sale|brine/,
      traits: ["sapidita", "resistenza_sale"],
      flavors: ["salato", "minerale"],
      color: "#9AC7D9",
      value: 3
    },
    {
      re: /mushroom|fungus|truffle|fungo|tartufo/,
      traits: ["umami", "biodegradazione"],
      flavors: ["terroso", "umami"],
      color: "#A58B70",
      value: 8
    },
    {
      re: /meat|beef|chicken|fish|carne|pesce/,
      traits: ["umami", "produzione_proteine"],
      flavors: ["umami", "sapido"],
      color: "#B96E62",
      value: 7
    },
    {
      re: /coffee|cocoa|chocolate|caffe|cacao|cioccolato/,
      traits: ["aroma_tostato", "amarezza"],
      flavors: ["amaro", "tostato"],
      color: "#93664F",
      value: 7
    },
    {
      re: /milk|cream|butter|cheese|latte|panna|burro|formaggio/,
      traits: ["cremosita", "produzione_acidi"],
      flavors: ["cremoso", "lattico"],
      color: "#E5D6A8",
      value: 6
    },
    {
      re: /smok|affumicat/,
      traits: ["aroma_tostato"],
      flavors: ["affumicato", "legnoso"],
      color: "#9B7258",
      value: 5
    },
    {
      re: /caramel|caramell/,
      traits: ["dolcezza", "aroma_tostato"],
      flavors: ["caramellato", "tostato"],
      color: "#D99A45",
      value: 6
    },
    {
      re: /vitamin|vitamina/,
      traits: ["produzione_vitamine"],
      flavors: ["vegetale"],
      color: "#E6C85C",
      value: 8
    },
    {
      re: /mineral|minerale|calcium|iron|ferro/,
      traits: ["assorbimento_minerali"],
      flavors: ["minerale"],
      color: "#9EB4B9",
      value: 5
    },
    {
      re: /oil|olio|olive/,
      traits: ["accumulo_energia"],
      flavors: ["untuoso"],
      color: "#A7B95A",
      value: 4
    },
    {
      re: /flower|floral|fiore|lavender|rosa/,
      traits: ["aroma_floreale"],
      flavors: ["floreale"],
      color: "#C99BD5",
      value: 8
    }
  ];

  let productionCounter = 0;
  const registry = window.microorganismRegistry || Object.create(null);
  window.microorganismRegistry = registry;

  function slug(v) {
    return String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 70) || "input";
  }

  function hash(s) {
    let h = 2166136261;

    for (let i = 0; i < String(s).length; i++) {
      h ^= String(s).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }

    return (h >>> 0).toString(36);
  }

  function unique(a) {
    return [...new Set(a.filter(Boolean).map(String))];
  }

  function ask(msg, initial) {
    const r = prompt(msg, initial || "");
    return r === null ? null : r.trim();
  }

  function choose(msg, options, initial) {
    const answer = ask(
      msg + "\n\n" +
      options.map((x, i) => `${i + 1}. ${x.label}`).join("\n") +
      "\n\nNumero:",
      String(initial || 1)
    );

    if (answer === null) return null;

    const n = Number(answer);

    return Number.isInteger(n) && n >= 1 && n <= options.length
      ? options[n - 1].id
      : null;
  }

  function parseTraits(text) {
    return unique(
      String(text)
        .split(",")
        .map(slug)
        .filter(t => TRAITS[t])
    );
  }

  function readIngredients() {
    const a = ask("Ingrediente 1 (nome o ID):", "bread");

    if (a === null || !a) return null;

    const b = ask("Ingrediente 2 (nome o ID):", "sugar");

    if (b === null || !b) return null;

    const extra = ask(
      "Altri ingredienti/ingredienti di salsa, separati da virgole (facoltativo):",
      ""
    );

    if (extra === null) return null;

    return unique([
      a,
      b,
      ...extra.split(",").map(x => x.trim()).filter(Boolean)
    ]);
  }

  function deriveIngredientEffects(ingredients) {
    const traits = [];
    const flavors = [];
    const colors = [];
    let value = 0;

    for (const name of ingredients) {
      const id = slug(name);

      for (const rule of INGREDIENT_RULES) {
        if (rule.re.test(id)) {
          traits.push(...rule.traits);
          flavors.push(...rule.flavors);
          colors.push(rule.color);
          value += rule.value;
        }
      }
    }

    return {
      traits: unique(traits),
      flavors: unique(flavors),
      colors,
      value
    };
  }

  function rgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");

    if (!m) return [120, 200, 120];

    const n = parseInt(m[1], 16);

    return [
      (n >> 16) & 255,
      (n >> 8) & 255,
      n & 255
    ];
  }

  function blend(colors) {
    const cs = unique(colors).map(rgb);

    if (!cs.length) return "#78C878";

    const c = [0, 0, 0];

    cs.forEach(x => {
      c[0] += x[0];
      c[1] += x[1];
      c[2] += x[2];
    });

    return "#" + c
      .map(v => Math.round(v / cs.length).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  function createIngredient(id, data) {
    try {
      addIngredient(id, data);
      return true;
    } catch (e) {
      console.error("[Microorganisms] addIngredient fallito", id, e);
      return false;
    }
  }

  function createRecipe(input, output) {
    try {
      addRecipe(input, output);
      return true;
    } catch (e) {
      console.warn(
        "[Microorganisms] Ricetta non registrata",
        input,
        output,
        e
      );
      return false;
    }
  }

  function createMicroorganism() {
    const speciesId = choose(
      "Seleziona il tipo di organismo",
      Object.keys(SPECIES).map(id => ({
        id,
        label: SPECIES[id].label
      })),
      1
    );

    if (!speciesId) return;

    const species = SPECIES[speciesId];

    const cell = choose(
      "Tipo cellulare",
      [
        { id: "procariote", label: "Procariote" },
        { id: "eucariote", label: "Eucariote" },
        { id: "misto", label: "Misto / ibrido" }
      ],
      species.cell === "eucariote" ? 2 : 1
    );

    if (!cell) return;

    const mode = choose(
      "Condizione di produzione",
      [
        { id: "normale", label: "Normale" },
        { id: "caldo", label: "Caldo" },
        { id: "freddo", label: "Freddo" },
        { id: "stress", label: "Stress ambientale" }
      ],
      1
    );

    if (!mode) return;

    const tempRaw = ask(
      "Temperatura di produzione in °C:",
      mode === "caldo" ? "37" : mode === "freddo" ? "4" : "20"
    );

    if (
      tempRaw === null ||
      tempRaw === "" ||
      !Number.isFinite(Number(tempRaw))
    ) {
      return;
    }

    const temperature = Math.max(
      -50,
      Math.min(200, Number(tempRaw))
    );

    const ingredients = readIngredients();

    if (!ingredients) return;

    const traitText = ask(
      "Tratti aggiuntivi (scrivi gli ID separati da virgole).\n" +
      "Lascia vuoto per nessun tratto manuale.\n\n" +
      "Tratti disponibili:\n" +
      Object.entries(TRAITS)
        .map(([k, v]) => `${k} = ${v.label}`)
        .join("\n"),
      "fermentazione, crescita"
    );

    if (traitText === null) return;

    const selectedTraits = parseTraits(traitText);
    const ingredientEffects = deriveIngredientEffects(ingredients);

    const allTraits = unique([
      ...selectedTraits,
      ...ingredientEffects.traits,
      ...(mode === "caldo" ? ["termoresistenza"] : []),
      ...(mode === "freddo" ? ["adattamento_al_freddo"] : []),
      ...(mode === "stress"
        ? ["adattamento", "stabilita_genetica"]
        : [])
    ]);

    // Interazioni tra tratti: generano combinazioni speciali.
    const combos = [];
    const properties = [];

    if (
      allTraits.includes("fotosintesi") &&
      allTraits.includes("bioluminescenza")
    ) {
      combos.push("fotoluminescenza");
      properties.push("conversione luminosa combinata");
    }

    if (
      allTraits.includes("fermentazione") &&
      allTraits.includes("dolcezza")
    ) {
      combos.push("fermentazione_zuccherina");
      properties.push("metabolismo zuccherino avanzato");
    }

    if (
      allTraits.includes("termoresistenza") &&
      allTraits.includes("resistenza_siccita")
    ) {
      combos.push("sopravvivenza_estrema");
      properties.push("resistenza combinata caldo-siccità");
    }

    if (
      allTraits.includes("biofilm") &&
      allTraits.includes("capsula_protettiva")
    ) {
      combos.push("barriera_cellulare");
      properties.push("barriera protettiva avanzata");
    }

    if (
      allTraits.includes("riparazione_dna") &&
      allTraits.includes("stabilita_genetica")
    ) {
      combos.push("genoma_stabile");
      properties.push("genoma ad alta stabilità");
    }

    if (
      allTraits.includes("fermentazione") &&
      allTraits.includes("produzione_alcoli")
    ) {
      combos.push("fermentazione_aromatica");
      properties.push("profilo fermentativo aromatico");
    }

    const treatmentRaw = ask(
      "Trattamenti ricevuti (normale, affumicato, caramellato, innesto, restoration; separati da virgole):",
      "normale"
    );

    if (treatmentRaw === null) return;

    const treatments = unique(
      treatmentRaw.split(",").map(slug)
    );

    if (treatments.includes("affumicato")) {
      allTraits.push("aroma_tostato");
    }

    if (treatments.includes("caramellato")) {
      allTraits.push("dolcezza");
    }

    if (treatments.includes("innesto")) {
      allTraits.push("ricombinazione");
    }

    if (treatments.includes("restoration")) {
      allTraits.push("stabilita_genetica");
    }

    const traits = unique(allTraits);

    let quality =
      species.base +
      traits.reduce((s, t) => s + (TRAITS[t]?.q || 0), 0) +
      combos.length * 7 +
      Math.min(12, ingredients.length * 2);

    if (cell !== species.cell) quality -= 3;
    if (mode === "stress") quality += 4;
    if (temperature < 0 || temperature > 80) quality -= 3;

    quality = Math.max(1, Math.min(100, Math.round(quality)));

    let value =
      species.base * 0.55 +
      ingredientEffects.value +
      traits.reduce((s, t) => s + (TRAITS[t]?.v || 0), 0) +
      combos.length * 12 +
      ingredients.length * 2;

    if (treatments.includes("affumicato")) value += 5;
    if (treatments.includes("caramellato")) value += 6;
    if (treatments.includes("innesto")) value += 8;

    value = Math.max(
      1,
      Math.round(value * (0.65 + quality / 100))
    );

    const flavors = unique([
      ...ingredientEffects.flavors,
      ...traits.flatMap(t => TRAITS[t]?.f || []),
      ...(treatments.includes("affumicato")
        ? ["affumicato", "legnoso"]
        : []),
      ...(treatments.includes("caramellato")
        ? ["caramellato", "tostato"]
        : [])
    ]);

    const textures = unique(
      traits.flatMap(t => TRAITS[t]?.t || [])
    );

    const traitColors = traits
      .map(t => TRAITS[t]?.c)
      .filter(Boolean);

    const color = blend([
      species.color,
      ...ingredientEffects.colors,
      ...traitColors
    ]);

    // Stessa combinazione di input = stessa firma genetica.
    // Ogni singola produzione riceve comunque un ID distinto.
    const canonical = JSON.stringify({
      speciesId,
      cell,
      mode,
      temperature,
      ingredients: ingredients.map(slug).sort(),
      traits: traits.slice().sort(),
      treatments: treatments.slice().sort(),
      combos: combos.slice().sort()
    });

    const geneticId = hash(canonical);

    productionCounter += 1;

    const serial =
      Date.now().toString(36) +
      "-" +
      productionCounter.toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8);

    const id =
      "microorganism_" +
      speciesId +
      "_" +
      geneticId +
      "_" +
      serial;

    const data = {
      version: VERSION,
      id,
      geneticId,
      productionSerial: serial,
      species: speciesId,
      cellType: cell,
      mode,
      temperature,
      ingredients,
      traits,
      combinations: combos,
      properties,
      flavors: flavors.length ? flavors : ["neutro"],
      textures,
      quality,
      qualityLabel:
        quality >= 90 ? "Leggendaria" :
        quality >= 75 ? "Eccellente" :
        quality >= 55 ? "Buona" :
        quality >= 35 ? "Comune" :
        "Bassa",
      price: value,
      estimatedCost: Math.max(1, Math.round(value * 0.35)),
      color,
      shape: species.shape,
      generation: 1,
      treatments,
      parents: [],
      egg: false,
      signature: canonical
    };

    const description = [
      `Specie: ${species.label}`,
      `ID genetico: ${geneticId}`,
      `Qualità: ${data.quality}/100 (${data.qualityLabel})`,
      `Valore stimato: €${data.price}`,
      `Colore: ${color}`,
      `Tratti: ${traits.join(", ")}`,
      `Gusti: ${data.flavors.join(", ")}`
    ].join(" | ");

    const definition = {
      name: `${species.label} ${geneticId}`,
      type: "life",
      color,
      shape: species.shape,
      description,
      microorganism: true,
      microorganismData: data,
      quality,
      price: value
    };

    if (!createIngredient(id, definition)) {
      alert(
        "Il gioco non ha registrato il microrganismo. " +
        "Controlla la console."
      );
      return;
    }

    registry[id] = data;
    window.microorganismRegistry = registry;

    window.dispatchEvent(
      new CustomEvent("microorganism-created", {
        detail: data
      })
    );

    // Crea anche un uovo collegato al microrganismo genitore.
    const eggId =
      "microorganism_egg_" +
      geneticId +
      "_" +
      serial;

    const eggData = {
      ...data,
      id: eggId,
      egg: true,
      parentMicroorganism: id,
      parents: [id],
      inheritedTraits: [...traits],
      generation: 2
    };

    const eggDef = {
      name: `Uovo ${species.label} ${geneticId}`,
      type: "egg",
      color,
      shape: "embryo",
      description:
        `Uovo di ${species.label}. ` +
        `Qualità ereditaria ${quality}/100; ` +
        `valore stimato €${value}.`,
      microorganism: true,
      microorganismEgg: true,
      microorganismData: eggData,
      quality,
      price: value
    };

    if (createIngredient(eggId, eggDef)) {
      registry[eggId] = eggData;
    }

    alert(
      `MICRORGANISMO UNIVOCO CREATO\n\n` +
      `ID produzione: ${id}\n` +
      `ID genetico: ${geneticId}\n` +
      `Specie: ${species.label}\n` +
      `Colore: ${color}\n` +
      `Qualità: ${quality}/100 (${data.qualityLabel})\n` +
      `Prezzo stimato: €${value}\n` +
      `Costo stimato: €${data.estimatedCost}\n\n` +
      `Tratti:\n${traits.join(", ")}\n\n` +
      `Combinazioni:\n${combos.join(", ") || "Nessuna"}\n\n` +
      `Proprietà:\n${properties.join(", ") || "Nessuna combinazione speciale"}\n\n` +
      `Gusti:\n${data.flavors.join(", ")}\n\n` +
      `Consistenze:\n${textures.join(", ") || "cellulare"}\n\n` +
      `Uovo: ${eggId}`
    );
  }

  function showTraitDatabase() {
    const lines = Object.entries(TRAITS).map(([id, t]) =>
      `${id} — ${t.label} | qualità ${t.q >= 0 ? "+" : ""}${t.q} | valore +${t.v}`
    );

    alert(
      "DATABASE TRATTI (" +
      lines.length +
      ")\n\n" +
      lines.join("\n")
    );
  }

  const toolDef = {
    func: function () {
      try {
        createMicroorganism();
      } catch (e) {
        console.error(
          "[Microorganisms] Errore creazione:",
          e
        );
        alert("Errore: " + (e.message || e));
      }
    },
    shape: "microbe"
  };

  try {
    addTool(TOOL_ID, toolDef);
  } catch (e) {
    console.error(
      "[Microorganisms] addTool fallito:",
      e
    );
  }

  try {
    addTool("microorganism_trait_database", {
      func: showTraitDatabase,
      shape: "double_helix"
    });
  } catch (e) {
    console.warn(
      "[Microorganisms] Tool database tratti non registrato:",
      e
    );
  }

  console.log(
    `[Microorganisms] v${VERSION} caricato. ` +
    `Tratti disponibili: ${Object.keys(TRAITS).length}.`
  );
})();
