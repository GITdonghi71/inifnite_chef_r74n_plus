
;(function () {
  "use strict";

  if (typeof window === "undefined") return;

  const VERSION = "4.0";
  const MOD_ID = "drug_maker";
  const STORAGE_KEY = "drug_maker_v4";
  const REGISTRY_NAME = "microorganismRegistry";

  if (window.__drugMakerV4Loaded) {
    console.warn("[DrugMaker] v4 già caricata.");
    return;
  }

  if (typeof window.addTool !== "function") {
    console.error("[DrugMaker] addTool non disponibile.");
    return;
  }

  const state = { busy: false };

  // ----------------------------------------------------------
  // DATABASE TRATTAMENTI
  // Ogni ID è stabile: non rinominarlo dopo aver creato ricette.
  // ----------------------------------------------------------

  const TREATMENT_NAMES = [
    // Separazione e purificazione
    "Cristallizzazione",
    "Cristallizzazione frazionata",
    "Ricristallizzazione",
    "Precipitazione",
    "Filtrazione",
    "Microfiltrazione",
    "Ultrafiltrazione",
    "Nanofiltrazione",
    "Osmosi inversa",
    "Separazione a membrana",
    "Dialisi",
    "Elettrodialisi",
    "Centrifugazione",
    "Decantazione",
    "Sedimentazione",
    "Flottazione",
    "Flocculazione",
    "Coagulazione",
    "Setacciatura",
    "Vagliatura",
    "Separazione magnetica",
    "Distillazione",
    "Distillazione frazionata",
    "Distillazione sottovuoto",
    "Distillazione in corrente di vapore",
    "Distillazione azeotropica",
    "Estrazione",
    "Estrazione solido-liquido",
    "Estrazione liquido-liquido",
    "Estrazione supercritica",
    "Lisciviazione",
    "Sublimazione",
    "Evaporazione",
    "Concentrazione",
    "Essiccazione",
    "Essiccazione sottovuoto",
    "Essiccazione spray",
    "Liofilizzazione",
    "Adsorbimento",
    "Desorbimento",
    "Assorbimento",
    "Strippaggio",
    "Cromatografia",
    "Scambio ionico",
    "Lavaggio",
    "Chiarificazione",
    "Decolorazione",
    "Degasaggio",
    "Deumidificazione",

    // Reazioni chimiche
    "Catalisi",
    "Fotocatalisi",
    "Ossidazione",
    "Riduzione",
    "Neutralizzazione",
    "Idrolisi",
    "Idratazione",
    "Disidratazione",
    "Idrogenazione",
    "Deidrogenazione",
    "Esterificazione",
    "Transesterificazione",
    "Saponificazione",
    "Alchilazione",
    "Dealchilazione",
    "Alogenazione",
    "Solfonazione",
    "Nitrurazione",
    "Nitrazione",
    "Ammonolisi",
    "Aminazione",
    "Acilazione",
    "Condensazione chimica",
    "Policondensazione",
    "Polimerizzazione",
    "Copopolimerizzazione",
    "Reticolazione",
    "Depolimerizzazione",
    "Isomerizzazione",
    "Cracking",
    "Cracking catalitico",
    "Reforming",
    "Reforming catalitico",
    "Pirolisi",
    "Gassificazione",
    "Combustione",
    "Calcinazione",
    "Carbonatazione",
    "Carbonilazione",
    "Carbossilazione",
    "Decarbossilazione",
    "Decarbonilazione",
    "Decomposizione",
    "Dissociazione",
    "Sintesi chimica",
    "Sintesi in fase gassosa",
    "Sintesi in fase liquida",
    "Sintesi elettrochimica",
    "Elettrolisi",
    "Elettrosintesi",
    "Deposizione elettrochimica",
    "Galvanizzazione",
    "Placcatura",
    "Anodizzazione",
    "Vulcanizzazione",
    "Sinterizzazione",
    "Fusione",
    "Solidificazione",
    "Cristallizzazione reattiva",
    "Chelazione",
    "Complessazione",
    "Scambio ionico reattivo",
    "Metatesi",
    "Disproporzione",
    "Reazione redox",
    "Reazione acido-base",
    "Reazione di precipitazione",
    "Reazione fotochimica",
    "Trattamento al plasma",
    "Trattamento UV",
    "Trattamento a microonde",

    // Bioprocessi e processi enzimatici
    "Fermentazione",
    "Fermentazione lenta",
    "Fermentazione continua",
    "Fermentazione in batch",
    "Biotrasformazione",
    "Biocatalisi",
    "Trattamento enzimatico",
    "Idrolisi enzimatica",
    "Biodegradazione",
    "Digestione anaerobica",
    "Digestione aerobica",
    "Coltura cellulare",
    "Coltura microbica",
    "Bioestrazione",
    "Biolisciviazione",
    "Biosintesi",
    "Fotosintesi simulata",
    "Biorisanamento",
    "Compostaggio industriale",

    // Operazioni fisiche e termiche
    "Miscelazione",
    "Omogeneizzazione",
    "Emulsificazione",
    "Dispersione",
    "Macinazione",
    "Polverizzazione",
    "Granulazione",
    "Pellettizzazione",
    "Estrusione",
    "Fluidizzazione",
    "Pastorizzazione",
    "Sterilizzazione",
    "Riscaldamento",
    "Raffreddamento",
    "Scambio termico",
    "Congelamento",
    "Tempra",
    "Trattamento termico",
    "Trattamento criogenico",
    "Essiccazione termica",
    "Essiccazione per contatto",
    "Essiccazione a letto fluido",
    "Trattamento a ultrasuoni",
    "Sonochimica",
    "Irraggiamento",
    "Irraggiamento elettronico",
    "Trattamento a infrarossi",
    "Trattamento ad alta pressione",

    // Gas, acqua, combustibili e materiali
    "Separazione dell'aria",
    "Liquefazione dei gas",
    "Compressione dei gas",
    "Purificazione dei gas",
    "Desolforazione",
    "Desolforazione dei gas",
    "Rimozione della CO2",
    "Cattura del carbonio",
    "Produzione di idrogeno",
    "Reforming con vapore",
    "Processo Fischer-Tropsch",
    "Processo Claus",
    "Processo Haber-Bosch",
    "Processo cloro-soda",
    "Processo Bayer",
    "Processo Solvay",
    "Produzione di ammoniaca",
    "Produzione di metanolo",
    "Produzione di polietilene",
    "Raffinazione del petrolio",
    "Desasfaltazione",
    "Idrodesolforazione",
    "Trattamento delle acque",
    "Ozonizzazione",
    "Disinfezione UV",
    "Adsorbimento su carbone",
    "Scambio termico reattivo",
    "Rigenerazione del catalizzatore",
    "Passivazione",
    "Incisione chimica",
    "Mordenzatura",
    "Impregnazione",
    "Rivestimento",
    "Deposizione chimica da vapore",
    "Deposizione fisica da vapore",
    "Sintesi sol-gel",
    "Trattamento superficiale",
    "Essiccazione osmotica"
  ];

  // ----------------------------------------------------------
  // DATABASE APPARATI INDUSTRIALI
  // È possibile selezionarne uno o due.
  // ----------------------------------------------------------

  const APPARATUS_NAMES = [
    "Reattore chimico",
    "Reattore batch",
    "Reattore semibatch",
    "Reattore CSTR",
    "Reattore a flusso pistone PFR",
    "Reattore a letto fisso",
    "Reattore a letto mobile",
    "Reattore a letto fluido",
    "Reattore tubolare",
    "Reattore fotocatalitico",
    "Reattore elettrochimico",
    "Reattore a microonde",
    "Reattore ad alta pressione",
    "Reattore sottovuoto",
    "Autoclave industriale",
    "Bioreattore",
    "Fermentatore",
    "Fotobioreattore",
    "Serbatoio di processo",
    "Agitatore",
    "Miscelatore industriale",
    "Miscelatore statico",
    "Miscelatore ad alta velocità",
    "Omogeneizzatore",
    "Emulsionatore",
    "Dispersore",
    "Impastatrice industriale",
    "Mulino industriale",
    "Mulino a sfere",
    "Frantumatore",
    "Estrusore",
    "Granulatore",
    "Pellettizzatore",
    "Comprimitrice",
    "Incapsulatrice",
    "Rivestitrice di compresse",
    "Centrifuga",
    "Centrifuga a dischi",
    "Centrifuga decanter",
    "Decantatore",
    "Flottatore",
    "Separatore ciclonico",
    "Filtro industriale",
    "Filtropressa",
    "Filtro a cartucce",
    "Filtro a membrana",
    "Filtro a nastro",
    "Filtro rotativo",
    "Setacciatore",
    "Separatore magnetico",
    "Colonna di assorbimento",
    "Colonna di stripping",
    "Torre di lavaggio",
    "Adsorbitore",
    "Estrattore industriale",
    "Estrattore Soxhlet",
    "Estrattore supercritico",
    "Torre di estrazione",
    "Cromatografo industriale",
    "Colonna a scambio ionico",
    "Distillatore",
    "Colonna di distillazione",
    "Colonna impaccata",
    "Colonna a piatti",
    "Colonna di rettifica",
    "Cristallizzatore",
    "Cristallizzatore sottovuoto",
    "Evaporatore",
    "Evaporatore multieffetto",
    "Evaporatore a film",
    "Evaporatore a circolazione forzata",
    "Essiccatore industriale",
    "Essiccatore rotativo",
    "Essiccatore spray",
    "Essiccatore a letto fluido",
    "Essiccatore sottovuoto",
    "Liofilizzatore",
    "Sublimatore",
    "Condensatore",
    "Refrigeratore",
    "Scambiatore di calore",
    "Torre di raffreddamento",
    "Forno industriale",
    "Calcinatore",
    "Inceneritore industriale",
    "Elettrolizzatore",
    "Cella elettrochimica",
    "Cella fotocatalitica",
    "Camera al plasma",
    "Impianto a osmosi inversa",
    "Modulo di ultrafiltrazione",
    "Impianto di elettrodialisi",
    "Impianto di distillazione",
    "Impianto di demineralizzazione",
    "Impianto di trattamento acque",
    "Impianto di depurazione gas",
    "Impianto di desolforazione",
    "Impianto di cattura del carbonio",
    "Impianto di raffinazione",
    "Impianto di polimerizzazione",
    "Impianto di fermentazione",
    "Impianto di sterilizzazione",
    "Pompa di processo",
    "Compressore",
    "Espansore",
    "Essiccatore criogenico",
    "Generatore di vapore",
    "Scambiatore a piastre",
    "Scambiatore a fascio tubiero",
    "Reattore a letto catalitico",
    "Unità di degasaggio",
    "Unità di decolorazione",
    "Unità di cristallizzazione",
    "Unità di filtrazione",
    "Unità di confezionamento",
    "Macchina di riempimento"
  ];

  // ----------------------------------------------------------
  // Crea cataloghi con ID stabili e nomi leggibili.
  // ----------------------------------------------------------

  function slug(text) {
    return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function buildCatalog(names, category) {
    const result = Object.create(null);

    names.forEach(function (name) {
      const id = slug(name);

      if (!result[id]) {
        result[id] = Object.freeze({
          id: id,
          name: name,
          category: category,
          bonus: 1 + (id.length % 4)
        });
      }
    });

    return Object.freeze(result);
  }

  const TREATMENTS = buildCatalog(TREATMENT_NAMES, "treatment");
  const APPARATUS = buildCatalog(APPARATUS_NAMES, "apparatus");

  // ----------------------------------------------------------
  // Registry condivisa con creator_of_microorganisms.js
  // ----------------------------------------------------------

  function getRegistry() {
    const r = window[REGISTRY_NAME];

    if (!r || typeof r !== "object" ||
        !r.microorganisms ||
        typeof r.microorganisms !== "object") {
      return null;
    }

    r.drugs ||= {};
    r.drugRecipes ||= {};
    r.discoveries ||= {};

    return r;
  }

  function getOrganism(id) {
    const r = getRegistry();
    return r ? r.microorganisms[id] || null : null;
  }

  function organismName(id) {
    const o = getOrganism(id);
    return o ? String(o.name || o.label || id) : id;
  }

  function notify(message) {
    console.log("[DrugMaker]", message);
    if (typeof window.alert === "function") window.alert(message);
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function promptUser(message, fallback) {
    if (typeof window.prompt !== "function") return null;
    const answer = window.prompt(message, fallback || "");
    return answer === null ? null : answer.trim();
  }

  function optionsText(db) {
    return Object.keys(db).map(function (key) {
      return key + " — " + db[key].name;
    }).join("\n");
  }

  function parseSelections(text, db) {
    const aliases = Object.create(null);

    Object.keys(db).forEach(function (key) {
      aliases[normalize(key)] = key;
      aliases[normalize(db[key].name)] = key;
    });

    const selected = [];

    String(text || "").split(",").forEach(function (part) {
      const key = aliases[normalize(part)];
      if (key && !selected.includes(key)) selected.push(key);
    });

    return selected.sort();
  }

  function getClickedId(value, seen, depth) {
    if (depth > 5 || value == null) return "";

    if (typeof value === "string" || typeof value === "number") {
      return String(value).trim();
    }

    if (typeof value !== "object" || seen.has(value)) return "";
    seen.add(value);

    const keys = [
      "id", "ingredientId", "ingredient_id",
      "ingredientID", "key", "uid", "identifier"
    ];

    for (const key of keys) {
      if (typeof value[key] === "string" ||
          typeof value[key] === "number") {
        const id = String(value[key]).trim();
        if (id) return id;
      }
    }

    const nestedKeys = [
      "ingredient", "element", "food",
      "item", "data", "definition", "placed"
    ];

    for (const key of nestedKeys) {
      if (value[key] && typeof value[key] === "object") {
        const found = getClickedId(value[key], seen, depth + 1);
        if (found) return found;
      }
    }

    return "";
  }

  // ----------------------------------------------------------
  // Chiave canonica: 2 microorganismi + N trattamenti + 1-2
  // apparati. L'ordine non cambia l'identità.
  // ----------------------------------------------------------

  function canonicalKey(microorganisms, treatments, apparatus) {
    return JSON.stringify([
      microorganisms.map(String).sort(),
      Array.from(new Set(treatments)).sort(),
      Array.from(new Set(apparatus)).sort()
    ]);
  }

  // Hash deterministico a 2 parole; la chiave completa viene
  // comunque confrontata nel registro per rilevare collisioni.
  function hash32(text, seed) {
    let h = seed >>> 0;

    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }

    return (h >>> 0).toString(36);
  }

  function idForKey(key) {
    return "pill_" + hash32(key, 2166136261) +
      hash32(key, 2246822519);
  }

  function loadSavedRecipes() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};

      return parsed && parsed.recipes &&
        typeof parsed.recipes === "object"
        ? parsed.recipes
        : Object.create(null);
    } catch (error) {
      console.warn("[DrugMaker] Registro persistente non leggibile.", error);
      return Object.create(null);
    }
  }

  const savedRecipes = loadSavedRecipes();

  function persistRecipes() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: VERSION,
          recipes: savedRecipes
        })
      );
    } catch (error) {
      console.warn("[DrugMaker] Impossibile salvare il registro.", error);
    }
  }

  // ----------------------------------------------------------
  // Icona SVG tricolore
  // Il verde è il fallback se il gioco non supporta SVG.
  // ----------------------------------------------------------

  function makeTricolorIcon() {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 72">' +
      '<defs><clipPath id="capsule"><rect x="2" y="2" width="116" height="68" rx="34"/></clipPath></defs>' +
      '<g clip-path="url(#capsule)">' +
      '<rect x="2" y="2" width="38.67" height="68" fill="#009246"/>' +
      '<rect x="40.67" y="2" width="38.66" height="68" fill="#FFFFFF"/>' +
      '<rect x="79.33" y="2" width="38.67" height="68" fill="#CE2B37"/>' +
      '</g>' +
      '<rect x="2" y="2" width="116" height="68" rx="34" fill="none" stroke="#444444" stroke-width="3"/>' +
      '<path d="M22 18 Q42 8 59 18" fill="none" stroke="#FFFFFF" stroke-opacity=".65" stroke-width="4" stroke-linecap="round"/>' +
      '</svg>';

    const dataUri = "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(svg);

    return {
      svg: svg,
      dataUri: dataUri,
      colors: ["#009246", "#FFFFFF", "#CE2B37"]
    };
  }

  // ----------------------------------------------------------
  // Crea o recupera la pillola univoca.
  // ----------------------------------------------------------

  function createDrug(firstId, secondId, treatmentIds, apparatusIds) {
    const registry = getRegistry();

    if (!registry) {
      throw new Error(
        "Registry dei microorganismi non disponibile. " +
        "Carica prima creator_of_microorganisms.js."
      );
    }

    firstId = String(firstId || "").trim();
    secondId = String(secondId || "").trim();

    if (!firstId || !secondId || firstId === secondId) {
      throw new Error("Servono due microorganismi distinti.");
    }

    if (!getOrganism(firstId) || !getOrganism(secondId)) {
      throw new Error("Uno dei microorganismi non è registrato.");
    }

    const treatments = Array.from(new Set(treatmentIds || []))
      .filter(function (id) {
        return Object.prototype.hasOwnProperty.call(TREATMENTS, id);
      })
      .sort();

    const apparatus = Array.from(new Set(apparatusIds || []))
      .filter(function (id) {
        return Object.prototype.hasOwnProperty.call(APPARATUS, id);
      })
      .sort();

    if (!treatments.length) {
      throw new Error("Seleziona almeno un trattamento.");
    }

    if (apparatus.length < 1 || apparatus.length > 2) {
      throw new Error("Seleziona uno o due apparati.");
    }

    const key = canonicalKey(
      [firstId, secondId],
      treatments,
      apparatus
    );

    // Se già presente, riutilizza la stessa pillola.
    let drug = registry.drugs[idForKey(key)] ||
      savedRecipes[key] ||
      null;

    if (drug && drug.recipeKey === key) {
      // Ricostruisce il registro in memoria dopo un riavvio.
      registry.drugs[drug.id] = drug;
      registry.drugRecipes[key] = drug.id;

      // Ripubblica lo stesso ID per la sessione corrente.
      if (typeof window.addIngredient === "function") {
        window.addIngredient(drug.id, {
          color: "#009246",
          type: "pill",
          icon: drug.iconSvg,
          iconSvg: drug.iconSvg,
          emoji: "💊",
          colors: drug.colors,
          tricolor: true
        });
      }

      return drug;
    }

    let id = idForKey(key);

    // Se un raro hash collisionasse con una ricetta diversa,
    // prova un suffisso deterministico finché l'ID è libero.
    let suffix = 0;

    while (
      registry.drugs[id] &&
      registry.drugs[id].recipeKey !== key
    ) {
      suffix++;
      id = idForKey(key) + "_" + suffix;
    }

    const icon = makeTricolorIcon();

    const totalBonus =
      treatments.reduce(function (sum, t) {
        return sum + TREATMENTS[t].bonus;
      }, 0) +
      apparatus.reduce(function (sum, a) {
        return sum + APPARATUS[a].bonus;
      }, 0);

    drug = {
      id: id,
      recipeKey: key,
      name: "Pillola " + organismName(firstId) +
        " × " + organismName(secondId),

      type: "ingredient",
      category: "pill",
      shape: "pill",

      // SVG tricolore + colore fallback verde.
      color: "#009246",
      colors: icon.colors,
      icon: icon.dataUri,
      iconSvg: icon.dataUri,
      tricolor: true,

      microorganisms: [firstId, secondId].sort(),
      microorganismNames: [
        organismName(firstId),
        organismName(secondId)
      ],

      treatments: treatments,
      treatmentNames: treatments.map(function (t) {
        return TREATMENTS[t].name;
      }),

      apparatus: apparatus,
      apparatusNames: apparatus.map(function (a) {
        return APPARATUS[a].name;
      }),

      quality: Math.min(100, 10 + totalBonus * 3),
      value: 5 + totalBonus * 2,

      description:
        "Ingrediente immaginario tricolore creato da DrugMaker. " +
        "Processi: " + treatments.map(function (t) {
          return TREATMENTS[t].name;
        }).join(", ") +
        ". Apparati: " + apparatus.map(function (a) {
          return APPARATUS[a].name;
        }).join(", ") + ".",

      mod: MOD_ID,
      version: VERSION,
      createdAt: new Date().toISOString()
    };

    if (typeof window.addIngredient !== "function") {
      throw new Error("API addIngredient non disponibile.");
    }

    // Usa un colore valido come fallback e passa anche l'icona.
    // La visualizzazione dell'SVG dipende dal renderer del gioco.
    window.addIngredient(id, {
      color: "#009246",
      type: "pill",
      icon: icon.dataUri,
      iconSvg: icon.dataUri,
      emoji: "💊",
      colors: icon.colors,
      tricolor: true
    });

    registry.drugs[id] = drug;
    registry.drugRecipes[key] = id;

    registry.discoveries[id] = {
      id: id,
      type: "drug",
      name: drug.name,
      createdAt: drug.createdAt
    };

    savedRecipes[key] = drug;
    persistRecipes();

    try {
      if (typeof window.CustomEvent === "function") {
        window.dispatchEvent(new window.CustomEvent("drugCreated", {
          detail: drug
        }));
      }
    } catch (error) {
      console.warn("[DrugMaker] Evento opzionale non disponibile.", error);
    }

    return drug;
  }

  // ----------------------------------------------------------
  // Flusso interattivo
  // ----------------------------------------------------------

  function startCreation(placed) {
    if (state.busy) {
      notify("DrugMaker sta già elaborando una ricetta.");
      return;
    }

    state.busy = true;

    try {
      const firstId = getClickedId(placed, new WeakSet(), 0);

      if (!firstId || !getOrganism(firstId)) {
        console.warn("[DrugMaker] Oggetto cliccato:", placed);
        notify(
          "Il primo oggetto non è riconosciuto come microorganismo. " +
          "Controlla la console e la registry."
        );
        return;
      }

      const secondId = promptUser(
        "Primo microorganismo: " + firstId +
        "\nInserisci l'ID del secondo microorganismo:",
        ""
      );

      if (!secondId) return;

      if (secondId === firstId || !getOrganism(secondId)) {
        notify("Il secondo ID deve appartenere a un altro microorganismo.");
        return;
      }

      const treatmentInput = promptUser(
        "Scegli uno o più trattamenti separati da virgole.\n\n" +
        optionsText(TREATMENTS),
        "catalisi, cristallizzazione"
      );

      if (!treatmentInput) return;

      const treatments = parseSelections(treatmentInput, TREATMENTS);

      if (!treatments.length) {
        notify("Nessun trattamento valido riconosciuto.");
        return;
      }

      const apparatusInput = promptUser(
        "Scegli UNO o DUE apparati, separati da virgole.\n\n" +
        optionsText(APPARATUS) +
        "\n\nEsempio: reattore_chimico, centrifuga",
        "reattore_chimico"
      );

      if (!apparatusInput) return;

      const apparatus = parseSelections(apparatusInput, APPARATUS);

      if (!apparatus.length || apparatus.length > 2) {
        notify("Devi selezionare uno o due apparati al massimo.");
        return;
      }

      const drug = createDrug(
        firstId,
        secondId,
        treatments,
        apparatus
      );

      notify(
        "PILLOLA TRICOLORE\n\n" +
        "Nome: " + drug.name + "\n" +
        "ID: " + drug.id + "\n\n" +
        "Microorganismi: " + drug.microorganisms.join(" + ") + "\n" +
        "Trattamenti: " + drug.treatmentNames.join(", ") + "\n" +
        "Apparati: " + drug.apparatusNames.join(" + ") + "\n\n" +
        "Ricetta univoca: " + drug.recipeKey
      );
    } catch (error) {
      notify("DrugMaker: " + error.message);
    } finally {
      state.busy = false;
    }
  }

  function showRegistry() {
    const registry = getRegistry();

    if (!registry) {
      notify("Registry dei microorganismi non disponibile.");
      return;
    }

    const drugs = Object.values(registry.drugs || {});

    if (!drugs.length) {
      notify("Nessuna pillola registrata nella sessione.");
      return;
    }

    notify(
      "DRUGMAKER — REGISTRO\n\n" +
      drugs.map(function (drug, i) {
        return (i + 1) + ". " + drug.name +
          "\nID: " + drug.id +
          "\nTrattamenti: " + drug.treatmentNames.join(", ") +
          "\nApparati: " + drug.apparatusNames.join(" + ");
      }).join("\n\n")
    );
  }

  // ----------------------------------------------------------
  // Registrazione tool: formato minimo documentato
  // ----------------------------------------------------------

  try {
    window.addTool(MOD_ID, {
      func: function (placed) {
        startCreation(placed);
      }
    });

    window.addTool("drug_maker_registry", {
      func: function () {
        showRegistry();
      }
    });
  } catch (error) {
    console.error("[DrugMaker] Errore registrazione tool:", error);
    return;
  }

  // ----------------------------------------------------------
  // API pubblica
  // ----------------------------------------------------------

  window.DrugMaker = {
    version: VERSION,
    treatments: TREATMENTS,
    apparatus: APPARATUS,
    createDrug: createDrug,

    getDrug: function (id) {
      const registry = getRegistry();
      return registry ? registry.drugs[id] || null : null;
    },

    getDrugs: function () {
      const registry = getRegistry();
      return registry ? Object.values(registry.drugs) : [];
    },

    getRecipeId: function (firstId, secondId, treatments, apparatus) {
      const key = canonicalKey(
        [firstId, secondId],
        treatments,
        apparatus
      );

      const registry = getRegistry();
      const currentId = registry && registry.drugRecipes[key];

      return currentId || (savedRecipes[key] && savedRecipes[key].id) || null;
    }
  };

  window.__drugMakerV4Loaded = true;

  console.log(
    "[DrugMaker] v" + VERSION + " caricata: " +
    Object.keys(TREATMENTS).length + " trattamenti, " +
    Object.keys(APPARATUS).length + " apparati."
  );
})();

