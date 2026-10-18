
/*
 * creator_of_microorganisms.js
 * v10.0 - Selezione automatica, trattamenti rilevati, genetica e tratti estesi
 *
 * API previste:
 *   addIngredient, addRecipe, addTool
 *
 * Registry:
 *   window.microorganismRegistry[id]
 *
 * Nota:
 * Il recupero dell'ingrediente selezionato usa più fonti comuni.
 * Se il gioco usa una variabile/API differente, adeguare
 * getSelectedIngredient() all'implementazione reale del gioco.
 */
(function () {
  "use strict";

  if (
    typeof addIngredient !== "function" ||
    typeof addRecipe !== "function" ||
    typeof addTool !== "function"
  ) {
    console.error("[Microorganisms v10] API del repository mancanti.");
    return;
  }

  const VERSION = "10.0";
  const TOOL_ID = "creator_of_microorganisms";

  const SPECIES = {
    bacterium: {
      label: "Batterio", shape: "microbe",
      color: "#78C878", cell: "procariote", base: 55
    },
    yeast: {
      label: "Lievito", shape: "fungus",
      color: "#E7C56D", cell: "eucariote", base: 62
    },
    mold: {
      label: "Muffa", shape: "fungus",
      color: "#A88BD0", cell: "eucariote", base: 58
    },
    archaea: {
      label: "Archeo", shape: "microbe",
      color: "#E28D60", cell: "procariote", base: 72
    },
    microalgae: {
      label: "Microalga", shape: "algae",
      color: "#4DBA91", cell: "eucariote", base: 65
    },
    hybrid: {
      label: "Ibrido", shape: "double_helix",
      color: "#5AB8CE", cell: "misto", base: 80
    }
  };

  // Helper compatto per mantenere leggibili tutti i tratti.
  const T = (label, q, v, p, f, t, c) => ({
    label, q, v, p, f, ...(t ? { t } : {}), c
  });

  // Tutti i 78 tratti della versione 9.0 sono mantenuti.
  const TRAITS = {
    divisione_binaria: T("Divisione binaria", 2, 3,
      ["riproduzione rapida"], ["neutro"], null, "#8BD18B"),
    crescita: T("Crescita rapida", 1, 3,
      ["crescita rapida"], ["delicato"], null, "#A5D77B"),
    sporulazione: T("Sporulazione", 3, 5,
      ["formazione di spore"], ["terroso"], ["granuloso"], "#B69B7D"),
    dormienza: T("Dormienza", 2, 4,
      ["dormienza"], ["delicato"], null, "#9CA7B4"),
    rigenerazione: T("Rigenerazione", 4, 7,
      ["rigenerazione"], ["fresco"], null, "#61C5A1"),
    mutazione: T("Mutabilità", 1, 6,
      ["mutabilità elevata"], ["complesso"], null, "#BD83D5"),
    ricombinazione: T("Ricombinazione", 4, 8,
      ["ricombinazione genetica"], ["complesso"], null, "#5AB8CE"),
    fotosintesi: T("Fotosintesi", 4, 7,
      ["fotosintesi"], ["vegetale", "fresco"], null, "#43B978"),
    clorofilla: T("Clorofilla", 2, 4,
      ["pigmento verde"], ["erbaceo"], null, "#68B85C"),
    fermentazione: T("Fermentazione", 4, 8,
      ["fermentazione"], ["fermentato", "acidulo"],
      ["effervescente"], "#D7A24B"),
    chemosintesi: T("Chemiosintesi", 5, 9,
      ["produzione energetica chimica"], ["minerale"], null, "#C59D68"),
    bioluminescenza: T("Bioluminescenza", 6, 14,
      ["luminescenza simulata"], ["minerale"], null, "#42E5D4"),
    termoresistenza: T("Termoresistenza", 4, 7,
      ["resistenza al calore"], ["tostato"], null, "#D86D36"),
    adattamento_al_freddo: T("Adattamento al freddo", 3, 6,
      ["tolleranza al freddo"], ["fresco"], null, "#73D8EA"),
    acidofilia: T("Acidofilia", 3, 5,
      ["tolleranza all'acidità"], ["acido"], null, "#D5A4E8"),
    alcalofilia: T("Alcalofilia", 3, 5,
      ["tolleranza all'alcalinità"], ["minerale"], null, "#8BB9A2"),
    resistenza_siccita: T("Resistenza alla siccità", 3, 6,
      ["resistenza alla siccità"], ["concentrato"], null, "#C9A66B"),
    resistenza_sale: T("Resistenza al sale", 3, 5,
      ["tolleranza salina"], ["salato", "minerale"], null, "#85B7C9"),
    resistenza_tossine: T("Resistenza alle tossine", 4, 7,
      ["resistenza alle tossine"], ["amaro"], null, "#8D7AB6"),
    produzione_enzimi: T("Produzione di enzimi", 4, 8,
      ["produzione enzimatica"], ["umami"], null, "#D6B65D"),
    produzione_vitamine: T("Produzione di vitamine", 5, 10,
      ["produzione vitaminica simulata"], ["vegetale", "dolce"], null, "#E6C85C"),
    biodegradazione: T("Biodegradazione", 3, 6,
      ["decomposizione organica"], ["terroso"], null, "#9B875E"),
    motilita: T("Motilità", 2, 5,
      ["mobilità"], ["fresco"], null, "#55B9C8"),
    biofilm: T("Biofilm", 3, 6,
      ["formazione di biofilm"], ["cremoso"], ["viscoso"], "#8BBCA6"),
    ife: T("Ife", 2, 4,
      ["struttura ifale"], ["terroso"], ["filamentoso"], "#B39AD0"),
    capsula_protettiva: T("Capsula protettiva", 4, 7,
      ["capsula protettiva"], ["neutro"], ["gelatinoso"], "#9CC7D7"),
    pigmentazione: T("Pigmentazione", 2, 5,
      ["pigmentazione speciale"], ["vegetale"], null, "#D88FB3"),
    simbiosi: T("Simbiosi", 5, 10,
      ["simbiosi"], ["armonico"], null, "#8BCB9B"),
    parassitismo: T("Parassitismo", 1, 5,
      ["parassitismo simulato"], ["amaro"], null, "#8C719B"),
    predazione: T("Predazione microbica", 2, 7,
      ["predazione simulata"], ["intenso"], null, "#BA7777"),
    produzione_tossine: T("Produzione di tossine", -2, 4,
      ["produzione di tossine simulata"], ["amaro"], null, "#80699B"),
    riparazione_dna: T("Riparazione del DNA", 6, 11,
      ["riparazione genetica"], ["neutro"], null, "#83A5D4"),
    resistenza_antibiotici: T("Resistenza agli antibiotici", 1, 5,
      ["resistenza simulata"], ["amaro"], null, "#918A72"),
    produzione_proteine: T("Produzione proteica", 3, 7,
      ["sintesi proteica"], ["umami"], null, "#B6A76D"),
    assorbimento_minerali: T("Assorbimento minerale", 3, 6,
      ["assorbimento minerale"], ["minerale"], null, "#9EB4B9"),
    accumulo_energia: T("Accumulo energetico", 4, 8,
      ["riserva energetica"], ["dolce"], null, "#E0B75B"),
    tolleranza_osmotica: T("Tolleranza osmotica", 3, 6,
      ["tolleranza osmotica"], ["salato"], null, "#8FB9C5"),
    chemotassi: T("Chemotassi", 2, 5,
      ["chemotassi simulata"], ["fresco"], null, "#5DB9AE"),
    sporulazione_resistente: T("Spore resistenti", 5, 9,
      ["spore resistenti"], ["terroso"], ["granuloso"], "#A88B64"),
    produzione_acidi: T("Produzione di acidi", 2, 5,
      ["metaboliti acidi"], ["acido"], null, "#D8A0D1"),
    produzione_alcoli: T("Produzione di alcoli", 3, 6,
      ["metaboliti alcolici simulati"], ["fruttato", "fermentato"], null, "#D8B45C"),
    aroma_fruttato: T("Aroma fruttato", 3, 7,
      ["profilo aromatico fruttato"], ["fruttato"], null, "#D77C9D"),
    aroma_floreale: T("Aroma floreale", 3, 7,
      ["profilo aromatico floreale"], ["floreale"], null, "#D6A4D8"),
    aroma_tostato: T("Aroma tostato", 2, 5,
      ["profilo aromatico tostato"], ["tostato"], null, "#A77B59"),
    umami: T("Profilo umami", 4, 8,
      ["profilo umami"], ["umami", "sapido"], null, "#B98C62"),
    dolcezza: T("Profilo dolce", 2, 5,
      ["profilo dolce"], ["dolce"], null, "#E5C56D"),
    acidita: T("Profilo acidulo", 2, 5,
      ["profilo acidulo"], ["acido", "acidulo"], null, "#D6D36A"),
    amarezza: T("Profilo amaro", 1, 3,
      ["profilo amaro"], ["amaro"], null, "#8F805C"),
    sapidita: T("Profilo sapido", 2, 5,
      ["profilo sapido"], ["salato", "sapido"], null, "#8FAEBB"),
    cremosita: T("Consistenza cremosa", 3, 6,
      ["consistenza cremosa"], ["cremoso"], ["cremoso"], "#E1D2A4"),
    viscosita: T("Consistenza viscosa", 2, 5,
      ["consistenza viscosa"], ["neutro"], ["viscoso"], "#9DB9A4"),
    croccantezza: T("Consistenza granulosa", 1, 3,
      ["consistenza granulosa"], ["tostato"], ["granuloso"], "#C4A47A"),
    adattamento: T("Adattamento ambientale", 4, 8,
      ["adattabilità"], ["complesso"], null, "#7CA6C8"),
    stabilita_genetica: T("Stabilità genetica", 6, 12,
      ["stabilità genetica"], ["pulito"], null, "#80B6C8"),
    metabolismo_estremo: T("Metabolismo estremo", 5, 10,
      ["metabolismo estremo"], ["minerale"], null, "#D18A5E"),
    assorbimento_nutrienti: T("Assorbimento nutrienti", 3, 6,
      ["assorbimento nutrienti"], ["vegetale"], null, "#9CCB78"),
    divisione_lenta: T("Divisione lenta", 1, 3,
      ["crescita lenta"], ["concentrato"], null, "#9BA9A5"),
    resistenza_radiazioni: T("Resistenza alle radiazioni", 5, 10,
      ["resistenza simulata alle radiazioni"], ["minerale"], null, "#B58DCB"),
    aggregazione: T("Aggregazione cellulare", 2, 5,
      ["aggregazione"], ["cremoso"], ["aggregato"], "#9FC4B0"),
    secrezione_polimeri: T("Secrezione di polimeri", 3, 7,
      ["secrezione di polimeri"], ["neutro"], ["gelatinoso"], "#85B6B5"),
    profilo_neutro: T("Profilo neutro", 1, 2,
      ["profilo neutro"], ["neutro"], null, "#B9B9B0"),

    rigenerazione_avanzata: T("Rigenerazione avanzata", 5, 9,
      ["rigenerazione avanzata"], ["fresco", "pulito"], null, "#50C7A5"),
    efficienza_metabolica: T("Efficienza metabolica", 4, 8,
      ["efficienza metabolica"], ["pulito"], null, "#C4C96C"),
    resistenza_pressione: T("Resistenza alla pressione", 4, 7,
      ["tolleranza alla pressione"], ["minerale"], null, "#7196B7"),
    resistenza_uv: T("Resistenza UV", 4, 8,
      ["resistenza UV simulata"], ["minerale"], null, "#A78AD1"),
    crioprotezione: T("Crioprotezione", 4, 8,
      ["protezione dal congelamento"], ["fresco"], null, "#80D5ED"),
    termoregolazione: T("Adattamento termico", 4, 8,
      ["adattamento termico"], ["neutro"], null, "#D98B56"),
    produzione_lipidi: T("Produzione di lipidi", 3, 7,
      ["produzione lipidica"], ["untuoso"], null, "#B6BC69"),
    produzione_pigmenti: T("Produzione di pigmenti", 3, 7,
      ["produzione di pigmenti"], ["vegetale"], null, "#D78CA5"),
    quorum_sensing: T("Comunicazione cellulare", 4, 8,
      ["comunicazione cellulare simulata"], ["armonico"], null, "#6DB8C1"),
    simbiosi_avanzata: T("Simbiosi avanzata", 5, 10,
      ["simbiosi avanzata"], ["armonico", "complesso"], null, "#7AC99C"),
    filtrazione: T("Filtrazione ambientale", 3, 6,
      ["filtrazione simulata"], ["pulito"], null, "#9DC6B0"),
    accumulo_risorse: T("Accumulo di risorse", 3, 7,
      ["accumulo di risorse"], ["concentrato"], null, "#C9A65B"),
    fermentazione_lenta: T("Fermentazione lenta", 3, 7,
      ["fermentazione lenta"], ["fermentato", "complesso"], null, "#C99B5D"),
    profilo_balsamico: T("Profilo balsamico", 3, 7,
      ["profilo balsamico"], ["balsamico", "fresco"], null, "#7AAE85"),
    aroma_legnoso: T("Aroma legnoso", 2, 5,
      ["profilo aromatico legnoso"], ["legnoso"], null, "#997456"),
    aroma_speziato: T("Aroma speziato", 3, 6,
      ["profilo aromatico speziato"], ["speziato"], null, "#C27E53"),
    equilibrio_metabolico: T("Equilibrio metabolico", 4, 8,
      ["equilibrio metabolico"], ["armonico", "pulito"], null, "#8ABDA0"),
    membrana_rinforzata: T("Membrana rinforzata", 4, 8,
      ["membrana rinforzata"], ["neutro"], null, "#83A6C4")
  };

  const INGREDIENT_RULES = [
    {
      re: /sugar|honey|syrup|zucchero|miele|glucose|glucosio|sciroppo/,
      traits: ["dolcezza", "accumulo_energia"],
      flavors: ["dolce", "caramellato"], color: "#E5B94E", value: 4
    },
    {
      re: /lemon|lime|vinegar|citric|limone|aceto|acid|acido|agrum/,
      traits: ["acidita", "produzione_acidi"],
      flavors: ["acido", "agrumato"], color: "#D7D95D", value: 4
    },
    {
      re: /berry|strawberry|apple|grape|fruit|frutta|mela|fragola|pera|pesca|banana|arancia|orange|uva|lampone|raspberry|mirtillo|blueberry/,
      traits: ["aroma_fruttato"],
      flavors: ["fruttato", "dolce"], color: "#D77C9D", value: 7
    },
    {
      re: /salt|sale|brine|salamoia/,
      traits: ["sapidita", "resistenza_sale"],
      flavors: ["salato", "minerale"], color: "#9AC7D9", value: 3
    },
    {
      re: /mushroom|fungus|truffle|fungo|tartufo/,
      traits: ["umami", "biodegradazione"],
      flavors: ["terroso", "umami"], color: "#A58B70", value: 8
    },
    {
      re: /meat|beef|chicken|fish|carne|pesce|pollo|manzo|maiale/,
      traits: ["umami", "produzione_proteine"],
      flavors: ["umami", "sapido"], color: "#B96E62", value: 7
    },
    {
      re: /coffee|cocoa|chocolate|caffe|cacao|cioccolato|espresso/,
      traits: ["aroma_tostato", "amarezza"],
      flavors: ["amaro", "tostato"], color: "#93664F", value: 7
    },
    {
      re: /milk|cream|butter|cheese|latte|panna|burro|formaggio|yogurt|yoghurt/,
      traits: ["cremosita", "produzione_acidi"],
      flavors: ["cremoso", "lattico"], color: "#E5D6A8", value: 6
    },
    {
      re: /smok|affumicat|fumo/,
      traits: ["aroma_tostato", "aroma_legnoso"],
      flavors: ["affumicato", "legnoso"], color: "#9B7258", value: 5
    },
    {
      re: /caramel|caramell/,
      traits: ["dolcezza", "aroma_tostato"],
      flavors: ["caramellato", "tostato"], color: "#D99A45", value: 6
    },
    {
      re: /vitamin|vitamina/,
      traits: ["produzione_vitamine"],
      flavors: ["vegetale"], color: "#E6C85C", value: 8
    },
    {
      re: /mineral|minerale|calcium|iron|ferro|calcio|magnesio|magnesium/,
      traits: ["assorbimento_minerali"],
      flavors: ["minerale"], color: "#9EB4B9", value: 5
    },
    {
      re: /oil|olio|olive|oliva|grasso|fat/,
      traits: ["accumulo_energia", "produzione_lipidi"],
      flavors: ["untuoso"], color: "#A7B95A", value: 4
    },
    {
      re: /flower|floral|fiore|lavender|rosa|lavanda|gelsomino|jasmine/,
      traits: ["aroma_floreale"],
      flavors: ["floreale"], color: "#C99BD5", value: 8
    },
    {
      re: /bread|pane|wheat|grano|farina|flour|cereal|orzo|barley|riso|rice/,
      traits: ["fermentazione", "assorbimento_nutrienti"],
      flavors: ["cereale", "fermentato"], color: "#C7AD7B", value: 5
    },
    {
      re: /herb|erba|basil|basilico|mint|menta|rosemary|rosmarino|thyme|timo/,
      traits: ["profilo_balsamico", "aroma_floreale"],
      flavors: ["erbaceo", "balsamico"], color: "#79B27B", value: 6
    },
    {
      re: /spice|spezi|pepper|pepe|chili|peperoncino|ginger|zenzero|cinnamon|cannella/,
      traits: ["aroma_speziato"],
      flavors: ["speziato"], color: "#C27E53", value: 6
    },
    {
      re: /protein|proteina|legume|bean|fagiolo|lentil|lenticchia|soy|soia/,
      traits: ["produzione_proteine", "assorbimento_nutrienti"],
      flavors: ["umami"], color: "#A5A86E", value: 6
    },
    {
      re: /algae|alga|seaweed|kelp|spirulina/,
      traits: ["fotosintesi", "clorofilla", "assorbimento_minerali"],
      flavors: ["vegetale", "minerale"], color: "#4DBA91", value: 8
    },
    {
      re: /salsa|sauce|condiment|dressing/,
      traits: ["umami", "produzione_enzimi"],
      flavors: ["sapido", "complesso"], color: "#B98C62", value: 5
    }
  ];

  const TREATMENT_RULES = [
    {
      id: "normale",
      aliases: ["normale", "normal", "standard", "nessuno", "none", "nulla"],
      traits: [], flavors: [], value: 0
    },
    {
      id: "innesto",
      aliases: ["innesto", "graft", "grafting", "innestato", "innestata",
        "ibridazione", "hybridization", "hybridisation"],
      traits: ["ricombinazione"],
      flavors: ["complesso"], value: 8
    },
    {
      id: "affumicato",
      aliases: ["affumicato", "affumicata", "affumicatura", "smoked",
        "smoking", "smoke", "fumo"],
      traits: ["aroma_tostato", "aroma_legnoso"],
      flavors: ["affumicato", "legnoso"], value: 5
    },
    {
      id: "caramellato",
      aliases: ["caramellato", "caramellata", "caramellatura",
        "caramello", "caramelized", "caramelised", "caramel"],
      traits: ["dolcezza", "aroma_tostato"],
      flavors: ["caramellato", "tostato"], value: 6
    },
    {
      id: "salsa",
      aliases: ["salsa", "sauce", "salsato", "condimento",
        "condiment", "dressing", "sauced"],
      traits: ["umami", "produzione_enzimi"],
      flavors: ["sapido", "complesso"], value: 5
    },
    {
      id: "restoration",
      aliases: ["restoration", "restauro", "restaurazione", "ripristino",
        "restoration simulator", "recupero"],
      traits: ["stabilita_genetica", "rigenerazione"],
      flavors: ["pulito", "fresco"], value: 7
    },
    {
      id: "essiccato",
      aliases: ["essiccato", "essiccata", "essiccazione", "disidratato",
        "dried", "drying", "dehydrated", "dehydration"],
      traits: ["resistenza_siccita", "dormienza"],
      flavors: ["concentrato"], value: 4
    },
    {
      id: "raffreddato",
      aliases: ["raffreddato", "raffreddata", "raffreddamento", "freddo",
        "chilled", "chilling", "cooled", "cooling"],
      traits: ["adattamento_al_freddo", "crioprotezione"],
      flavors: ["fresco"], value: 4
    },
    {
      id: "riscaldato",
      aliases: ["riscaldato", "riscaldata", "riscaldamento", "heated",
        "heating", "heat treatment", "trattamento termico"],
      traits: ["termoresistenza", "termoregolazione"],
      flavors: ["tostato"], value: 4
    },
    {
      id: "fermentato",
      aliases: ["fermentato", "fermentata", "fermentazione",
        "fermented", "fermentation"],
      traits: ["fermentazione", "fermentazione_lenta"],
      flavors: ["fermentato", "acidulo"], value: 5
    },
    {
      id: "purificato",
      aliases: ["purificato", "purificata", "purificazione", "purified",
        "purification", "raffinato", "refined"],
      traits: ["stabilita_genetica", "equilibrio_metabolico"],
      flavors: ["pulito"], value: 6
    },
    {
      id: "irradiato",
      aliases: ["irradiato", "irradiata", "irradiazione", "irradiated",
        "irradiation", "uv", "raggi uv"],
      traits: ["resistenza_uv", "riparazione_dna"],
      flavors: ["minerale"], value: 5
    },
    {
      id: "mineralizzato",
      aliases: ["mineralizzato", "mineralizzata", "mineralizzazione",
        "mineralized", "mineralised", "mineralization"],
      traits: ["assorbimento_minerali", "metabolismo_estremo"],
      flavors: ["minerale"], value: 5
    },
    {
      id: "inoculato",
      aliases: ["inoculato", "inoculata", "inoculazione",
        "inoculated", "inoculation", "coltura iniziale", "starter culture"],
      traits: ["crescita", "divisione_binaria"],
      flavors: ["neutro"], value: 3
    },
    {
      id: "stabilizzato",
      aliases: ["stabilizzato", "stabilizzata", "stabilizzazione",
        "stabilized", "stabilised", "stabilization"],
      traits: ["stabilita_genetica", "equilibrio_metabolico"],
      flavors: ["pulito"], value: 5
    }
  ];

  let productionCounter = 0;
  const registry = window.microorganismRegistry || Object.create(null);
  window.microorganismRegistry = registry;

  function slug(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 100);
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean).map(String))];
  }

  function hash(value) {
    let h = 2166136261;
    const s = String(value);

    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }

    return (h >>> 0).toString(36);
  }

  function ask(message, initial) {
    const result = prompt(message, initial ?? "");
    return result === null ? null : result.trim();
  }

  function choose(message, options, initial) {
    const answer = ask(
      message + "\n\n" +
      options.map((item, index) =>
        `${index + 1}. ${item.label}`
      ).join("\n") +
      "\n\nNumero:",
      String(initial || 1)
    );

    if (answer === null) return null;

    const number = Number(answer);

    return Number.isInteger(number) &&
      number >= 1 &&
      number <= options.length
      ? options[number - 1].id
      : null;
  }

  function parseTraits(text) {
    return unique(
      String(text || "")
        .split(",")
        .map(slug)
        .filter(id => TRAITS[id])
    );
  }

  function parseTreatments(values) {
    const raw = (Array.isArray(values) ? values : [values])
      .flatMap(value => String(value || "").split(","))
      .map(value => slug(value.replace(/_/g, " ")))
      .filter(Boolean);

    const recognized = [];
    const unknown = [];

    for (const item of raw) {
      const found = TREATMENT_RULES.find(rule =>
        slug(rule.id) === item ||
        rule.aliases.some(alias => slug(alias) === item)
      );

      if (found) {
        if (!recognized.includes(found.id)) {
          recognized.push(found.id);
        }
      } else if (!unknown.includes(item)) {
        unknown.push(item);
      }
    }

    return {
      treatments: unique([...recognized, ...unknown]),
      recognized,
      unknown
    };
  }

  /*
   * Converte possibili rappresentazioni dei metadati in stringhe.
   * Supporta array di stringhe e oggetti con id/type/name/label.
   */
  function flattenMetadata(value) {
    if (value == null) return [];

    if (typeof value === "string" || typeof value === "number") {
      return [String(value)];
    }

    if (Array.isArray(value)) {
      return value.flatMap(flattenMetadata);
    }

    if (typeof value === "object") {
      return [
        value.id,
        value.type,
        value.name,
        value.label,
        value.treatment,
        value.process,
        value.toolId,
        value.tool,
        value.appliedTool
      ].filter(item =>
        typeof item === "string" || typeof item === "number"
      ).map(String);
    }

    return [];
  }

  function getObjectTreatments(object) {
    if (!object || typeof object !== "object") return [];

    const data = object.microorganismData || object.data || {};
    const metadata = object.metadata || {};
    const processing = object.processingData || {};

    return unique([
      ...flattenMetadata(object.treatments),
      ...flattenMetadata(object.treatment),
      ...flattenMetadata(object.process),
      ...flattenMetadata(object.processing),
      ...flattenMetadata(object.appliedTreatments),
      ...flattenMetadata(object.appliedTools),
      ...flattenMetadata(object.toolsUsed),
      ...flattenMetadata(object.tags),
      ...flattenMetadata(metadata.treatments),
      ...flattenMetadata(metadata.tags),
      ...flattenMetadata(processing.treatments),
      ...flattenMetadata(data.treatments),
      ...flattenMetadata(data.recognizedTreatments)
    ]);
  }

  function matchTreatmentText(text) {
    const source = slug(text).replace(/_/g, " ");
    if (!source) return [];

    const matches = [];

    for (const rule of TREATMENT_RULES) {
      const aliases = [rule.id, ...rule.aliases];

      if (aliases.some(alias => {
        const normalized = slug(alias).replace(/_/g, " ");
        return normalized &&
          (` ${source} `).includes(` ${normalized} `);
      })) {
        matches.push(rule.id);
      }
    }

    return matches;
  }

  function detectTreatmentsFromIngredient(ingredient) {
    if (!ingredient) {
      return { treatments: [], recognized: [], unknown: [] };
    }

    const raw = getObjectTreatments(ingredient);
    const data = ingredient.microorganismData || ingredient.data || {};

    // Il nome/ID serve come fallback se il gioco codifica il trattamento lì.
    const searchable = [
      ingredient.id,
      ingredient.name,
      ingredient.label,
      data.id,
      data.name
    ].filter(Boolean);

    const inferred = searchable.flatMap(matchTreatmentText);
    const parsed = parseTreatments([...raw, ...inferred]);

    // "normale" è il valore predefinito solo se non è rilevato altro.
    if (!parsed.recognized.length) {
      parsed.recognized.push("normale");
      parsed.treatments = unique([...parsed.treatments, "normale"]);
    }

    return parsed;
  }

  function getTreatmentEffects(treatments) {
    const traits = [];
    const flavors = [];
    let value = 0;

    for (const id of treatments) {
      const rule = TREATMENT_RULES.find(item => item.id === id);
      if (!rule) continue;

      traits.push(...rule.traits);
      flavors.push(...rule.flavors);
      value += rule.value;
    }

    return {
      traits: unique(traits),
      flavors: unique(flavors),
      value
    };
  }

  /*
   * Cerca un ingrediente usando prima i dati passati dal gioco al tool,
   * poi alcune variabili globali comuni.
   *
   * Se il repository ha una propria API di selezione, questa funzione
   * è il punto da adattare. Non esiste un nome universale per tale API.
   */
  function getSelectedIngredient(toolArgs) {
    const candidates = [];

    function addCandidate(value) {
      if (value == null) return;

      if (typeof value === "string" || typeof value === "number") {
        candidates.push(value);
        return;
      }

      if (typeof value === "object") {
        candidates.push(value);

        for (const key of [
          "selectedIngredient",
          "ingredient",
          "selectedItem",
          "item",
          "ingredientId",
          "selectedIngredientId"
        ]) {
          if (value[key] != null) candidates.push(value[key]);
        }
      }
    }

    for (const arg of toolArgs || []) addCandidate(arg);

    const globals = [
      window.selectedIngredient,
      window.currentIngredient,
      window.activeIngredient,
      window.selectedItem,
      window.currentItem,
      window.game?.selectedIngredient,
      window.game?.currentIngredient,
      window.game?.selectedItem,
      window.gameState?.selectedIngredient,
      window.gameState?.selectedItem,
      window.inventory?.selectedIngredient,
      window.inventory?.selectedItem,
      window.state?.selectedIngredient,
      window.state?.selectedItem
    ];

    globals.forEach(addCandidate);

    for (const candidate of candidates) {
      const resolved = resolveIngredient(candidate);
      if (resolved) return resolved;
    }

    // Ultimo tentativo: elementi UI che dichiarano esplicitamente
    // un ingrediente selezionato tramite attributi comuni.
    try {
      const element = document.querySelector(
        '[data-selected="true"][data-ingredient-id], ' +
        '[aria-selected="true"][data-ingredient-id], ' +
        '.ingredient.selected[data-id], ' +
        '.ingredient.active[data-id]'
      );

      if (element) {
        const id =
          element.getAttribute("data-ingredient-id") ||
          element.getAttribute("data-id");

        const resolved = resolveIngredient(id);
        if (resolved) return resolved;
      }
    } catch (error) {
      console.warn("[Microorganisms] Lettura selezione UI fallita.", error);
    }

    return null;
  }

  function resolveIngredient(candidate) {
    if (candidate == null) return null;

    if (typeof candidate === "object") {
      if (
        candidate.id ||
        candidate.name ||
        candidate.label ||
        candidate.microorganismData ||
        candidate.treatments ||
        candidate.metadata
      ) {
        return candidate;
      }

      return null;
    }

    const id = String(candidate).trim();
    if (!id) return null;

    const collections = [
      window.ingredients,
      window.ingredientRegistry,
      window.ingredientDatabase,
      window.game?.ingredients,
      window.gameState?.ingredients,
      window.inventory?.items,
      registry
    ];

    for (const collection of collections) {
      if (!collection) continue;

      if (Array.isArray(collection)) {
        const found = collection.find(item =>
          item &&
          (String(item.id) === id ||
           String(item.name) === id)
        );
        if (found) return found;
      } else if (typeof collection === "object" && collection[id]) {
        return collection[id];
      }
    }

    // Se il gioco espone soltanto l'ID, conserva comunque l'identità.
    return { id, name: id };
  }

  function readSecondIngredient(firstIngredient) {
    const firstId = getIngredientId(firstIngredient);

    while (true) {
      const answer = ask(
        "ID del secondo ingrediente (facoltativo).\n" +
        "Lascia vuoto per usare soltanto il primo ingrediente.",
        ""
      );

      if (answer === null) return null;

      const secondId = answer.trim();

      if (!secondId) return [];

      if (slug(secondId) === slug(firstId)) {
        alert("Hai inserito lo stesso ingrediente selezionato. Inserisci un ID diverso.");
        continue;
      }

      return [secondId];
    }
  }

  function getIngredientId(ingredient) {
    if (ingredient == null) return "";

    if (typeof ingredient === "string" || typeof ingredient === "number") {
      return String(ingredient);
    }

    return String(
      ingredient.id ||
      ingredient.ingredientId ||
      ingredient.name ||
      ingredient.label ||
      ""
    );
  }

  function getIngredientName(ingredient) {
    if (ingredient == null) return "";

    if (typeof ingredient === "string" || typeof ingredient === "number") {
      return String(ingredient);
    }

    return String(
      ingredient.name ||
      ingredient.label ||
      ingredient.id ||
      ingredient.ingredientId ||
      ""
    );
  }

  function deriveIngredientEffects(ingredients) {
    const traits = [];
    const flavors = [];
    const colors = [];
    let value = 0;

    for (const ingredient of ingredients) {
      const name = getIngredientName(ingredient);
      const id = getIngredientId(ingredient);
      const text = slug(`${name} ${id}`);

      for (const rule of INGREDIENT_RULES) {
        if (rule.re.test(text)) {
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
      colors: unique(colors),
      value
    };
  }

  function rgb(hex) {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!match) return [120, 200, 120];

    const number = parseInt(match[1], 16);

    return [
      (number >> 16) & 255,
      (number >> 8) & 255,
      number & 255
    ];
  }

  function blend(colors) {
    const values = unique(colors).map(rgb);
    if (!values.length) return "#78C878";

    const result = [0, 0, 0];

    for (const color of values) {
      result[0] += color[0];
      result[1] += color[1];
      result[2] += color[2];
    }

    return "#" + result
      .map(value =>
        Math.round(value / values.length)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
      .toUpperCase();
  }

  function createIngredient(id, data) {
    try {
      addIngredient(id, data);
      return true;
    } catch (error) {
      console.error("[Microorganisms] addIngredient fallito:", id, error);
      return false;
    }
  }

  function createRecipe(input, output) {
    try {
      addRecipe(input, output);
      return true;
    } catch (error) {
      console.warn("[Microorganisms] Ricetta non registrata:", error);
      return false;
    }
  }

  function createMicroorganism(toolArgs) {
    const firstIngredient = getSelectedIngredient(toolArgs);

    if (!firstIngredient) {
      alert(
        "Non riesco a leggere automaticamente il primo ingrediente.\n\n" +
        "Seleziona prima un ingrediente nel gioco e riapri il tool.\n\n" +
        "Se continua a non funzionare, bisogna collegare getSelectedIngredient() " +
        "all'API di selezione specifica del repository."
      );
      console.warn(
        "[Microorganisms] Primo ingrediente non trovato.",
        "Controllare l'API di selezione del gioco."
      );
      return;
    }

    const secondIds = readSecondIngredient(firstIngredient);
    if (secondIds === null) return;

    const ingredients = [firstIngredient];

    for (const secondId of secondIds) {
      const resolved = resolveIngredient(secondId);
      ingredients.push(resolved || { id: secondId, name: secondId });
    }

    // Massimo due ingredienti distinti.
    const seen = new Set();
    const uniqueIngredients = ingredients.filter(ingredient => {
      const key = slug(getIngredientId(ingredient));
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 2);

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
    ) return;

    const temperature = Math.max(-50, Math.min(200, Number(tempRaw)));

    const traitText = ask(
      "Tratti aggiuntivi: scrivi gli ID separati da virgole.\n" +
      "Lascia vuoto per nessun tratto manuale.\n\n" +
      Object.entries(TRAITS)
        .map(([id, trait]) => `${id} = ${trait.label}`)
        .join("\n"),
      "fermentazione, crescita"
    );
    if (traitText === null) return;

    const selectedTraits = parseTraits(traitText);
    const ingredientEffects = deriveIngredientEffects(uniqueIngredients);

    // Rileva i trattamenti applicati agli ingredienti senza chiederli.
    const parsedTreatments = {
      treatments: [],
      recognized: [],
      unknown: []
    };

    for (const ingredient of uniqueIngredients) {
      const detected = detectTreatmentsFromIngredient(ingredient);

      parsedTreatments.recognized.push(...detected.recognized);
      parsedTreatments.unknown.push(...detected.unknown);
      parsedTreatments.treatments.push(...detected.treatments);
    }

    parsedTreatments.recognized = unique(parsedTreatments.recognized);
    parsedTreatments.unknown = unique(parsedTreatments.unknown);
    parsedTreatments.treatments = unique(parsedTreatments.treatments);

    const treatmentEffects = getTreatmentEffects(
      parsedTreatments.recognized
    );

    const allTraits = unique([
      ...selectedTraits,
      ...ingredientEffects.traits,
      ...treatmentEffects.traits,
      ...(mode === "caldo" ? ["termoresistenza"] : []),
      ...(mode === "freddo" ? ["adattamento_al_freddo"] : []),
      ...(mode === "stress"
        ? ["adattamento", "stabilita_genetica"]
        : [])
    ]);

    const combos = [];
    const properties = [];

    function combo(condition, id, property) {
      if (condition) {
        combos.push(id);
        properties.push(property);
      }
    }

    combo(
      allTraits.includes("fotosintesi") &&
      allTraits.includes("bioluminescenza"),
      "fotoluminescenza",
      "conversione luminosa combinata"
    );

    combo(
      allTraits.includes("fermentazione") &&
      allTraits.includes("dolcezza"),
      "fermentazione_zuccherina",
      "metabolismo zuccherino avanzato"
    );

    combo(
      allTraits.includes("termoresistenza") &&
      allTraits.includes("resistenza_siccita"),
      "sopravvivenza_estrema",
      "resistenza combinata caldo-siccità"
    );

    combo(
      allTraits.includes("biofilm") &&
      allTraits.includes("capsula_protettiva"),
      "barriera_cellulare",
      "barriera protettiva avanzata"
    );

    combo(
      allTraits.includes("riparazione_dna") &&
      allTraits.includes("stabilita_genetica"),
      "genoma_stabile",
      "genoma ad alta stabilità"
    );

    combo(
      allTraits.includes("fermentazione") &&
      allTraits.includes("produzione_alcoli"),
      "fermentazione_aromatica",
      "profilo fermentativo aromatico"
    );

    combo(
      allTraits.includes("simbiosi") &&
      allTraits.includes("quorum_sensing"),
      "rete_simbiotica",
      "rete di comunicazione simbiotica"
    );

    combo(
      allTraits.includes("crioprotezione") &&
      allTraits.includes("resistenza_siccita"),
      "resistenza_climatica",
      "adattamento combinato a freddo e siccità"
    );

    combo(
      allTraits.includes("produzione_pigmenti") &&
      allTraits.includes("fotosintesi"),
      "pigmentazione_fotosintetica",
      "pigmentazione fotosintetica avanzata"
    );

    const traits = unique(allTraits);

    let quality =
      species.base +
      traits.reduce((sum, id) => sum + (TRAITS[id]?.q || 0), 0) +
      combos.length * 7 +
      Math.min(12, uniqueIngredients.length * 2);

    if (cell !== species.cell) quality -= 3;
    if (mode === "stress") quality += 4;
    if (temperature < 0 || temperature > 80) quality -= 3;

    quality = Math.max(1, Math.min(100, Math.round(quality)));

    let value =
      species.base * 0.55 +
      ingredientEffects.value +
      treatmentEffects.value +
      traits.reduce((sum, id) => sum + (TRAITS[id]?.v || 0), 0) +
      combos.length * 12 +
      uniqueIngredients.length * 2;

    value = Math.max(
      1,
      Math.round(value * (0.65 + quality / 100))
    );

    const flavors = unique([
      ...ingredientEffects.flavors,
      ...treatmentEffects.flavors,
      ...traits.flatMap(id => TRAITS[id]?.f || [])
    ]);

    const textures = unique(
      traits.flatMap(id => TRAITS[id]?.t || [])
    );

    const traitColors = traits
      .map(id => TRAITS[id]?.c)
      .filter(Boolean);

    const color = blend([
      species.color,
      ...ingredientEffects.colors,
      ...traitColors
    ]);

    const ingredientIds = uniqueIngredients.map(getIngredientId);

    const canonical = JSON.stringify({
      speciesId,
      cell,
      mode,
      temperature,
      ingredients: ingredientIds.map(slug).sort(),
      traits: traits.slice().sort(),
      treatments: parsedTreatments.recognized.slice().sort(),
      combos: combos.slice().sort()
    });

    const geneticId = hash(canonical);

    productionCounter += 1;

    const serial =
      Date.now().toString(36) + "-" +
      productionCounter.toString(36) + "-" +
      Math.random().toString(36).slice(2, 8);

    const id =
      "microorganism_" + speciesId + "_" + geneticId + "_" + serial;

    const data = {
      version: VERSION,
      id,
      geneticId,
      productionSerial: serial,
      species: speciesId,
      cellType: cell,
      mode,
      temperature,
      ingredients: ingredientIds,
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
        quality >= 35 ? "Comune" : "Bassa",
      price: value,
      estimatedCost: Math.max(1, Math.round(value * 0.35)),
      color,
      shape: species.shape,
      generation: 1,
      treatments: parsedTreatments.treatments,
      recognizedTreatments: parsedTreatments.recognized,
      unrecognizedTreatments: parsedTreatments.unknown,
      parents: [],
      egg: false,
      signature: canonical
    };

    const description = [
      `Specie: ${species.label}`,
      `ID genetico: ${geneticId}`,
      `Qualità: ${quality}/100 (${data.qualityLabel})`,
      `Valore stimato: €${value}`,
      `Colore: ${color}`,
      `Ingredienti: ${ingredientIds.join(", ")}`,
      `Tratti: ${traits.join(", ")}`,
      `Trattamenti rilevati: ${parsedTreatments.recognized.join(", ") || "Nessuno"}`,
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

    window.dispatchEvent(new CustomEvent("microorganism-created", {
      detail: data
    }));

    const eggId = "microorganism_egg_" + geneticId + "_" + serial;

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
        `Qualità ereditaria ${quality}/100; valore stimato €${value}.`,
      microorganism: true,
      microorganismEgg: true,
      microorganismData: eggData,
      quality,
      price: value
    };

    if (createIngredient(eggId, eggDef)) {
      registry[eggId] = eggData;
    }

    window.microorganismRegistry = registry;

    const warning = parsedTreatments.unknown.length
      ? "\nMetadati di trattamento non riconosciuti: " +
        parsedTreatments.unknown.join(", ")
      : "";

    alert(
      `MICRORGANISMO UNIVOCO CREATO\n\n` +
      `ID produzione: ${id}\n` +
      `ID genetico: ${geneticId}\n` +
      `Specie: ${species.label}\n` +
      `Ingredienti (${ingredientIds.length}/2): ${ingredientIds.join(", ")}\n` +
      `Colore: ${color}\n` +
      `Qualità: ${quality}/100 (${data.qualityLabel})\n` +
      `Prezzo stimato: €${value}\n` +
      `Costo stimato: €${data.estimatedCost}\n\n` +
      `Tratti:\n${traits.join(", ")}\n\n` +
      `Trattamenti rilevati automaticamente:\n` +
      `${parsedTreatments.recognized.join(", ") || "Nessuno"}\n\n` +
      `Combinazioni:\n${combos.join(", ") || "Nessuna"}\n\n` +
      `Proprietà:\n${properties.join(", ") || "Nessuna combinazione speciale"}\n\n` +
      `Gusti:\n${data.flavors.join(", ")}\n\n` +
      `Consistenze:\n${textures.join(", ") || "cellulare"}\n\n` +
      `Uovo: ${eggId}` +
      warning
    );
  }

  function showTraitDatabase() {
    const lines = Object.entries(TRAITS).map(([id, trait]) =>
      `${id} — ${trait.label} | qualità ${trait.q >= 0 ? "+" : ""}${trait.q} | valore +${trait.v}`
    );

    const treatments = TREATMENT_RULES.map(rule =>
      `${rule.id} — alias: ${rule.aliases.join(", ")}`
    );

    alert(
      `DATABASE TRATTI (${lines.length})\n\n` +
      lines.join("\n") +
      `\n\nTRATTAMENTI RICONOSCIUTI (${TREATMENT_RULES.length})\n\n` +
      treatments.join("\n")
    );
  }

  const toolDef = {
    func: function (...args) {
      try {
        createMicroorganism(args);
      } catch (error) {
        console.error("[Microorganisms] Errore creazione:", error);
        alert("Errore: " + (error.message || error));
      }
    },
    shape: "microbe"
  };

  try {
    addTool(TOOL_ID, toolDef);
  } catch (error) {
    console.error("[Microorganisms] addTool fallito:", error);
  }

  try {
    addTool("microorganism_trait_database", {
      func: showTraitDatabase,
      shape: "double_helix"
    });
  } catch (error) {
    console.warn("[Microorganisms] Tool database tratti non registrato:", error);
  }

  console.log(
    `[Microorganisms] v${VERSION} caricato. ` +
    `Tratti: ${Object.keys(TRAITS).length}; ` +
    `trattamenti: ${TREATMENT_RULES.length}.`
  );
})();

