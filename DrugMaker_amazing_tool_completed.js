
;(function () {
  "use strict";

  if (typeof window === "undefined") return;

  const VERSION = "3.0";
  const MOD_ID = "drug_maker";
  const REGISTRY_NAME = "microorganismRegistry";
  const STORAGE_KEY = "drug_maker_v3";
  const PREFIX = "pill_";

  if (window.__drugMakerV3Loaded) {
    console.warn("[DrugMaker] v3 è già caricata.");
    return;
  }

  if (typeof window.addTool !== "function") {
    console.error("[DrugMaker] API addTool non disponibile.");
    return;
  }

  const state = { busy: false };

  // ==========================================================
  // DATABASE DEI TRATTAMENTI
  // Chiavi stabili: non rinominarle dopo aver creato ricette.
  // I bonus sono esclusivamente parametri di gioco.
  // ==========================================================

  const TREATMENTS = Object.freeze({
    // Separazione e purificazione
    cristallizzazione:       { name: "Cristallizzazione", bonus: 2 },
    ricristallizzazione:     { name: "Ricristallizzazione", bonus: 3 },
    distillazione:           { name: "Distillazione", bonus: 3 },
    distillazione_frazionata:{ name: "Distillazione frazionata", bonus: 4 },
    distillazione_sottovuoto:{ name: "Distillazione sottovuoto", bonus: 4 },
    distillazione_vapore:    { name: "Distillazione in corrente di vapore", bonus: 3 },
    estrazione:              { name: "Estrazione", bonus: 2 },
    estrazione_solido_liquido:{ name: "Estrazione solido-liquido", bonus: 3 },
    estrazione_liquido_liquido:{ name: "Estrazione liquido-liquido", bonus: 3 },
    estrazione_supercritica: { name: "Estrazione supercritica", bonus: 5 },
    filtrazione:             { name: "Filtrazione", bonus: 2 },
    microfiltrazione:        { name: "Microfiltrazione", bonus: 3 },
    ultrafiltrazione:        { name: "Ultrafiltrazione", bonus: 4 },
    nanofiltrazione:         { name: "Nanofiltrazione", bonus: 4 },
    osmosi_inversa:          { name: "Osmosi inversa", bonus: 4 },
    centrifugazione:         { name: "Centrifugazione", bonus: 3 },
    decantazione:            { name: "Decantazione", bonus: 1 },
    sedimentazione:          { name: "Sedimentazione", bonus: 1 },
    flottazione:             { name: "Flottazione", bonus: 2 },
    setacciatura:            { name: "Setacciatura", bonus: 1 },
    adsorbimento:            { name: "Adsorbimento", bonus: 3 },
    desorbimento:            { name: "Desorbimento", bonus: 2 },
    assorbimento:            { name: "Assorbimento", bonus: 3 },
    stripping:               { name: "Strippaggio", bonus: 3 },
    cromatografia:           { name: "Cromatografia", bonus: 5 },
    scambio_ionico:          { name: "Scambio ionico", bonus: 4 },
    separazione_membrana:    { name: "Separazione a membrana", bonus: 4 },
    lisciviazione:           { name: "Lisciviazione", bonus: 2 },
    sublimazione:            { name: "Sublimazione", bonus: 3 },
    evaporazione:            { name: "Evaporazione", bonus: 2 },
    concentrazione:          { name: "Concentrazione", bonus: 2 },
    essiccazione:            { name: "Essiccazione", bonus: 2 },
    liofilizzazione:         { name: "Liofilizzazione", bonus: 4 },
    condensazione:           { name: "Condensazione", bonus: 2 },

    // Reazioni e trasformazioni chimiche
    catalisi:                { name: "Catalisi", bonus: 4 },
    ossidazione:             { name: "Ossidazione", bonus: 2 },
    riduzione:               { name: "Riduzione", bonus: 2 },
    neutralizzazione:        { name: "Neutralizzazione", bonus: 2 },
    precipitazione:          { name: "Precipitazione", bonus: 2 },
    polimerizzazione:        { name: "Polimerizzazione", bonus: 4 },
    policondensazione:       { name: "Policondensazione", bonus: 4 },
    idrolisi:                { name: "Idrolisi", bonus: 3 },
    idratazione:             { name: "Idratazione", bonus: 2 },
    disidratazione:          { name: "Disidratazione", bonus: 2 },
    idrogenazione:           { name: "Idrogenazione", bonus: 3 },
    deidrogenazione:         { name: "Deidrogenazione", bonus: 3 },
    esterificazione:         { name: "Esterificazione", bonus: 3 },
    saponificazione:         { name: "Saponificazione", bonus: 2 },
    alchilazione:            { name: "Alchilazione", bonus: 4 },
    dealchilazione:          { name: "Dealchilazione", bonus: 3 },
    alogenazione:            { name: "Alogenazione", bonus: 3 },
    solfonazione:            { name: "Solfonazione", bonus: 3 },
    nitrurazione:            { name: "Nitrurazione", bonus: 3 },
    ammonolisi:              { name: "Ammonolisi", bonus: 3 },
    condensazione_chimica:   { name: "Condensazione chimica", bonus: 3 },
    decomposizione:          { name: "Decomposizione", bonus: 2 },
    isomerizzazione:         { name: "Isomerizzazione", bonus: 4 },
    cracking:                { name: "Cracking", bonus: 3 },
    reforming:               { name: "Reforming", bonus: 4 },
    calcinazione:            { name: "Calcinazione", bonus: 3 },
    sinterizzazione:         { name: "Sinterizzazione", bonus: 3 },
    elettrolisi:             { name: "Elettrolisi", bonus: 4 },
    fotocatalisi:            { name: "Fotocatalisi", bonus: 5 },
    fermentazione:           { name: "Fermentazione", bonus: 3 },
    fermentazione_lenta:     { name: "Fermentazione lenta", bonus: 3 },
    biotrasformazione:       { name: "Biotrasformazione", bonus: 4 },
    chelazione:              { name: "Chelazione", bonus: 3 },
    complessazione:          { name: "Complessazione", bonus: 3 },
    reticolazione:           { name: "Reticolazione", bonus: 4 },
    vulcanizzazione:         { name: "Vulcanizzazione", bonus: 3 },
    cristallizzazione_frazionata:{ name: "Cristallizzazione frazionata", bonus: 4 },
    essiccazione_sottovuoto: { name: "Essiccazione sottovuoto", bonus: 3 },

    // Trattamenti fisici e di processo
    miscelazione:            { name: "Miscelazione", bonus: 1 },
    omogeneizzazione:        { name: "Omogeneizzazione", bonus: 2 },
    emulsificazione:         { name: "Emulsificazione", bonus: 2 },
    dispersione:             { name: "Dispersione", bonus: 1 },
    macinazione:             { name: "Macinazione", bonus: 1 },
    polverizzazione:         { name: "Polverizzazione", bonus: 2 },
    granulazione:            { name: "Granulazione", bonus: 2 },
    pellettizzazione:        { name: "Pellettizzazione", bonus: 2 },
    estrusione:              { name: "Estrusione", bonus: 3 },
    fluidizzazione:          { name: "Fluidizzazione", bonus: 2 },
    pastorizzazione:         { name: "Pastorizzazione", bonus: 2 },
    sterilizzazione:         { name: "Sterilizzazione", bonus: 3 },
    raffreddamento:          { name: "Raffreddamento", bonus: 1 },
    riscaldamento:           { name: "Riscaldamento", bonus: 1 },
    scambio_termico:         { name: "Scambio termico", bonus: 2 },
    congelamento:            { name: "Congelamento", bonus: 2 },
    tempra:                 { name: "Tempra", bonus: 3 },
    lavaggio:                { name: "Lavaggio di processo", bonus: 1 },
    depurazione:             { name: "Depurazione", bonus: 2 },
    decolorazione:           { name: "Decolorazione", bonus: 2 },
    chiarificazione:         { name: "Chiarificazione", bonus: 2 },
    degasaggio:              { name: "Degasaggio", bonus: 2 },
    impregnazione:           { name: "Impregnazione", bonus: 2 },
    essiccazione_spray:      { name: "Essiccazione spray", bonus: 3 },
    trattamento_termico:     { name: "Trattamento termico", bonus: 2 },
    trattamento_plasma:      { name: "Trattamento al plasma", bonus: 4 },
    trattamento_uv:          { name: "Trattamento UV", bonus: 3 },
    trattamento_enzimatico:  { name: "Trattamento enzimatico", bonus: 3 },
    trattamento_membrana:    { name: "Trattamento a membrana", bonus: 3 }
  });

  // ==========================================================
  // DATABASE DEGLI APPARATI INDUSTRIALI
  // ==========================================================

  const APPARATUS = Object.freeze({
    reattore:                 { name: "Reattore chimico", bonus: 5 },
    reattore_batch:           { name: "Reattore batch", bonus: 4 },
    reattore_semibatch:       { name: "Reattore semibatch", bonus: 4 },
    reattore_cstr:            { name: "Reattore CSTR", bonus: 5 },
    reattore_pfr:             { name: "Reattore a flusso pistone PFR", bonus: 5 },
    reattore_letto_fisso:     { name: "Reattore a letto fisso", bonus: 5 },
    reattore_letto_mobile:    { name: "Reattore a letto mobile", bonus: 4 },
    reattore_letto_fluido:    { name: "Reattore a letto fluido", bonus: 5 },
    reattore_fotocatalitico:  { name: "Reattore fotocatalitico", bonus: 6 },
    bioreattore:              { name: "Bioreattore", bonus: 5 },
    fermentatore:             { name: "Fermentatore industriale", bonus: 4 },
    fotobioreattore:          { name: "Fotobioreattore", bonus: 5 },

    miscelatore:              { name: "Miscelatore industriale", bonus: 2 },
    agitatore:                { name: "Agitatore", bonus: 2 },
    miscelatore_alta_velocita:{ name: "Miscelatore ad alta velocità", bonus: 3 },
    impastatrice:             { name: "Impastatrice industriale", bonus: 2 },
    omogeneizzatore:          { name: "Omogeneizzatore", bonus: 3 },
    emulsionatore:            { name: "Emulsionatore", bonus: 3 },
    dispersore:               { name: "Dispersore", bonus: 2 },
    mulino:                   { name: "Mulino industriale", bonus: 2 },
    mulino_a_sfere:           { name: "Mulino a sfere", bonus: 3 },
    frantumatore:             { name: "Frantumatore", bonus: 2 },
    estrusore:                { name: "Estrusore", bonus: 3 },
    pellettizzatore:          { name: "Pellettizzatore", bonus: 3 },
    granulatore:              { name: "Granulatore", bonus: 3 },

    centrifuga:               { name: "Centrifuga", bonus: 3 },
    centrifuga_a_dischi:      { name: "Centrifuga a dischi", bonus: 4 },
    decantatore:              { name: "Decantatore", bonus: 2 },
    flottatore:               { name: "Flottatore", bonus: 2 },
    ciclone:                  { name: "Separatore ciclonico", bonus: 3 },
    filtro:                   { name: "Filtro industriale", bonus: 2 },
    filtro_pressa:            { name: "Filtropressa", bonus: 3 },
    filtro_a_cartucce:        { name: "Filtro a cartucce", bonus: 2 },
    filtro_a_membrana:        { name: "Filtro a membrana", bonus: 4 },
    setacciatore:             { name: "Setacciatore", bonus: 1 },
    separatore_magnetico:     { name: "Separatore magnetico", bonus: 2 },
    separatore_membrana:      { name: "Separatore a membrana", bonus: 4 },
    colonna_assorbimento:     { name: "Colonna di assorbimento", bonus: 4 },
    torre_lavaggio:           { name: "Torre di lavaggio", bonus: 3 },
    adsorbitore:              { name: "Adsorbitore", bonus: 3 },
    estrattore:               { name: "Estrattore industriale", bonus: 3 },
    estrattore_soxhlet:       { name: "Estrattore Soxhlet", bonus: 3 },
    estrattore_supercritico:  { name: "Estrattore supercritico", bonus: 5 },
    cromatografo:             { name: "Cromatografo industriale", bonus: 5 },
    scambiatore_ionico:       { name: "Colonna a scambio ionico", bonus: 4 },

    distillatore:             { name: "Distillatore", bonus: 3 },
    colonna_distillazione:    { name: "Colonna di distillazione", bonus: 4 },
    colonna_impaccata:        { name: "Colonna impaccata", bonus: 4 },
    colonna_a_piatti:         { name: "Colonna a piatti", bonus: 4 },
    cristallizzatore:         { name: "Cristallizzatore", bonus: 4 },
    evaporatore:              { name: "Evaporatore", bonus: 3 },
    evaporatore_multieffetto: { name: "Evaporatore multieffetto", bonus: 4 },
    evaporatore_film:         { name: "Evaporatore a film", bonus: 4 },
    essiccatore:              { name: "Essiccatore industriale", bonus: 2 },
    essiccatore_rotativo:     { name: "Essiccatore rotativo", bonus: 3 },
    essiccatore_spray:        { name: "Essiccatore spray", bonus: 3 },
    liofilizzatore:           { name: "Liofilizzatore", bonus: 4 },
    sublimatore:              { name: "Sublimatore", bonus: 3 },
    condensatore:             { name: "Condensatore industriale", bonus: 2 },
    refrigeratore:            { name: "Refrigeratore", bonus: 2 },
    scambiatore_calore:       { name: "Scambiatore di calore", bonus: 3 },
    torre_raffreddamento:     { name: "Torre di raffreddamento", bonus: 2 },
    forno_industriale:        { name: "Forno industriale", bonus: 3 },
    calcinatore:              { name: "Calcinatore", bonus: 3 },
    essiccatore_vuoto:        { name: "Essiccatore sottovuoto", bonus: 3 },

    elettrolizzatore:         { name: "Elettrolizzatore", bonus: 4 },
    cella_fotocatalitica:     { name: "Cella fotocatalitica", bonus: 5 },
    serbatoio:                { name: "Serbatoio di processo", bonus: 1 },
    autoclave:                { name: "Autoclave industriale", bonus: 4 },
    pompa:                    { name: "Pompa di processo", bonus: 1 },
    compressore:              { name: "Compressore", bonus: 2 },
    espansore:                { name: "Espansore", bonus: 2 },
    cristallizzatore_vuoto:   { name: "Cristallizzatore sottovuoto", bonus: 5 },
    impianto_osmosi:          { name: "Impianto a osmosi inversa", bonus: 4 },
    torre_estrazione:         { name: "Torre di estrazione", bonus: 4 },
    reattore_microonde:       { name: "Reattore a microonde", bonus: 4 },
    camera_plasma:            { name: "Camera al plasma", bonus: 5 },
    macchina_riempimento:     { name: "Macchina di riempimento", bonus: 1 },
    comprimitrice:            { name: "Comprimitrice industriale", bonus: 2 },
    incapsulatrice:           { name: "Incapsulatrice", bonus: 2 },
    rivestitrice:             { name: "Rivestitrice di compresse", bonus: 2 }
  });

  // ==========================================================
  // REGISTRO E IDENTITÀ CANONICA DELLE RICETTE
  // ==========================================================

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

  function normalize(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function slug(value) {
    return normalize(value)
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "item";
  }

  function canonicalRecipeKey(microorganisms, treatments, apparatus) {
    const sortedMicroorganisms = microorganisms
      .map(String)
      .sort();

    const sortedTreatments = Array.from(new Set(treatments))
      .sort();

    // JSON codifica i confini dei campi senza ambiguità.
    return JSON.stringify([
      sortedMicroorganisms,
      sortedTreatments,
      String(apparatus)
    ]);
  }

  function deterministicId(recipeKey) {
    // Codifica reversibile: nessuna collisione da hash.
    // L'ID può essere lungo, ma due chiavi diverse non condividono
    // lo stesso suffisso codificato.
    const encoded = encodeURIComponent(recipeKey)
      .replace(/%/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    return PREFIX + encoded;
  }

  function loadPersistentRecipes() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};

      if (parsed && typeof parsed === "object" &&
          parsed.recipes && typeof parsed.recipes === "object") {
        return parsed.recipes;
      }
    } catch (error) {
      console.warn("[DrugMaker] Registro persistente non leggibile.", error);
    }

    return Object.create(null);
  }

  function savePersistentRecipes(recipes) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: VERSION, recipes: recipes })
      );
      return true;
    } catch (error) {
      console.warn("[DrugMaker] Impossibile salvare le ricette.", error);
      return false;
    }
  }

  const persistentRecipes = loadPersistentRecipes();

  function promptUser(message, defaultValue) {
    const answer = window.prompt(message, defaultValue || "");
    return answer === null ? null : answer.trim();
  }

  function notify(message) {
    console.log("[DrugMaker]", message);
    if (typeof window.alert === "function") window.alert(message);
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

    const output = [];

    String(text || "").split(",").forEach(function (part) {
      const key = aliases[normalize(part)];
      if (key && !output.includes(key)) output.push(key);
    });

    return output.sort();
  }

  function getClickedId(value, seen, depth) {
    if (depth > 5 || value == null) return "";

    if (typeof value === "string" ||
        typeof value === "number") {
      return String(value).trim();
    }

    if (typeof value !== "object" || seen.has(value)) return "";
    seen.add(value);

    const idKeys = [
      "id", "ingredientId", "ingredient_id",
      "ingredientID", "key", "uid", "identifier"
    ];

    for (const key of idKeys) {
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
        const result = getClickedId(value[key], seen, depth + 1);
        if (result) return result;
      }
    }

    return "";
  }

  // ==========================================================
  // ICONA TRICOLORE DELLA PILLOLA
  // ==========================================================

  function makeTricolorIcon() {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
      '<defs><clipPath id="pill"><rect x="12" y="20" width="72" height="56" rx="28"/></clipPath></defs>' +
      '<g clip-path="url(#pill)">' +
      '<rect x="12" y="20" width="24" height="56" fill="#009246"/>' +
      '<rect x="36" y="20" width="24" height="56" fill="#FFFFFF"/>' +
      '<rect x="60" y="20" width="24" height="56" fill="#CE2B37"/>' +
      '</g>' +
      '<rect x="12" y="20" width="72" height="56" rx="28" fill="none" stroke="#333" stroke-width="3"/>' +
      '</svg>';

    return {
      emoji: "💊",
      svg: "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(svg),
      colors: ["#009246", "#FFFFFF", "#CE2B37"]
    };
  }

  // ==========================================================
  // CREAZIONE IDEMPOTENTE
  // Stessa chiave => stessa ricetta e stesso ID.
  // ==========================================================

  function createDrug(firstId, secondId, treatmentIds, apparatusId) {
    const registry = getRegistry();

    if (!registry) {
      throw new Error(
        "Registry dei microorganismi assente. " +
        "Carica prima creator_of_microorganisms.js."
      );
    }

    firstId = String(firstId || "").trim();
    secondId = String(secondId || "").trim();

    if (!firstId || !secondId || firstId === secondId) {
      throw new Error("Servono due ID distinti e validi.");
    }

    if (!getOrganism(firstId) || !getOrganism(secondId)) {
      throw new Error("Uno dei microorganismi non è registrato.");
    }

    if (!Array.isArray(treatmentIds) || !treatmentIds.length) {
      throw new Error("Seleziona almeno un trattamento.");
    }

    const treatments = Array.from(new Set(treatmentIds))
      .filter(function (id) {
        return Object.prototype.hasOwnProperty.call(TREATMENTS, id);
      })
      .sort();

    if (!treatments.length) {
      throw new Error("Nessun trattamento valido selezionato.");
    }

    if (!Object.prototype.hasOwnProperty.call(APPARATUS, apparatusId)) {
      throw new Error("Apparato industriale non valido.");
    }

    const recipeKey = canonicalRecipeKey(
      [firstId, secondId],
      treatments,
      apparatusId
    );

    // Controlla prima la registry attiva.
    const currentId = registry.drugRecipes[recipeKey];

    if (currentId && registry.drugs[currentId]) {
      return registry.drugs[currentId];
    }

    // Poi controlla il registro persistente.
    const saved = persistentRecipes[recipeKey];

    if (saved && saved.id) {
      // Recupera l'identità esistente nella sessione corrente.
      const existing = saved;
      registry.drugRecipes[recipeKey] = existing.id;
      registry.drugs[existing.id] = existing;

      // Se la ricetta è già salvata, non la registra di nuovo.
      return existing;
    }

    const id = deterministicId(recipeKey);
    const treatmentBonus = treatments.reduce(function (sum, key) {
      return sum + TREATMENTS[key].bonus;
    }, 0);

    const score = treatmentBonus + APPARATUS[apparatusId].bonus;
    const icon = makeTricolorIcon();

    const drug = {
      id: id,
      recipeKey: recipeKey,
      name: "Pillola " + organismName(firstId) +
        " × " + organismName(secondId),
      type: "ingredient",
      category: "pill",
      shape: "pill",

      color: "#FFFFFF",
      colors: icon.colors,
      icon: icon.emoji,
      iconSvg: icon.svg,
      tricolor: true,

      microorganisms: [firstId, secondId].sort(),
      microorganismNames: [
        organismName(firstId),
        organismName(secondId)
      ],

      treatments: treatments,
      treatmentNames: treatments.map(function (key) {
        return TREATMENTS[key].name;
      }),

      apparatus: apparatusId,
      apparatusName: APPARATUS[apparatusId].name,

      // Valori simulati esclusivamente ludici.
      quality: Math.min(100, 10 + score * 3),
      value: 5 + score * 2,

      description:
        "Ingrediente immaginario generato da DrugMaker. " +
        "Processi: " + treatments.map(function (key) {
          return TREATMENTS[key].name;
        }).join(", ") +
        ". Apparato: " + APPARATUS[apparatusId].name + ".",

      mod: MOD_ID,
      version: VERSION,
      createdAt: new Date().toISOString()
    };

    if (typeof window.addIngredient !== "function") {
      throw new Error("API addIngredient non disponibile.");
    }

    // L'ID è deterministico e viene registrato una sola volta
    // per ogni chiave di ricetta conosciuta.
    window.addIngredient(id, {
      color: "#FFFFFF",
      type: "pill"
    });

    registry.drugs[id] = drug;
    registry.drugRecipes[recipeKey] = id;
    registry.discoveries[id] = {
      id: id,
      type: "drug",
      name: drug.name,
      createdAt: drug.createdAt
    };

    persistentRecipes[recipeKey] = drug;
    savePersistentRecipes(persistentRecipes);

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

  // ==========================================================
  // INTERFACCIA INTERATTIVA
  // ==========================================================

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
          "Il primo oggetto cliccato non corrisponde a un microorganismo " +
          "registrato. Controlla la console e la struttura dell'oggetto."
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
        notify("Il secondo ID deve appartenere a un altro microorganismo registrato.");
        return;
      }

      const treatmentInput = promptUser(
        "Scegli uno o più trattamenti, separati da virgole.\n\n" +
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
        "Scegli un apparato industriale.\n\n" +
        optionsText(APPARATUS),
        "reattore"
      );

      if (!apparatusInput) return;

      const apparatus = parseSelections(apparatusInput, APPARATUS);

      if (apparatus.length !== 1) {
        notify("Inserisci un solo apparato valido.");
        return;
      }

      let drug;

      try {
        drug = createDrug(
          firstId,
          secondId,
          treatments,
          apparatus[0]
        );
      } catch (error) {
        notify("Errore di creazione: " + error.message);
        return;
      }

      notify(
        "PILLOLA REGISTRATA\n\n" +
        "Nome: " + drug.name + "\n" +
        "ID: " + drug.id + "\n\n" +
        "Microorganismi: " + drug.microorganisms.join(" + ") + "\n" +
        "Trattamenti: " + drug.treatmentNames.join(", ") + "\n" +
        "Apparato: " + drug.apparatusName + "\n\n" +
        "Se la combinazione esisteva già, è stata riutilizzata " +
        "la ricetta esistente."
      );
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
      notify("Non ci sono pillole nella sessione corrente.");
      return;
    }

    notify(
      "DRUGMAKER — REGISTRO\n\n" +
      drugs.map(function (drug, index) {
        return (index + 1) + ". " + drug.name +
          "\nID: " + drug.id +
          "\nProcessi: " + drug.treatmentNames.join(", ") +
          "\nApparato: " + drug.apparatusName;
      }).join("\n\n")
    );
  }

  // ==========================================================
  // REGISTRAZIONE TOOL
  // Usa il formato minimo noto dell'API.
  // ==========================================================

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
    console.error("[DrugMaker] Errore registrando i tool:", error);
    return;
  }

  // ==========================================================
  // API PUBBLICA
  // ==========================================================

  window.DrugMaker = {
    version: VERSION,
    treatments: TREATMENTS,
    apparatus: APPARATUS,
    createDrug: createDrug,

    getDrug: function (id) {
      const registry = getRegistry();
      return registry && registry.drugs[id] || null;
    },

    getDrugs: function () {
      const registry = getRegistry();
      return registry ? Object.values(registry.drugs) : [];
    },

    getRecipeId: function (firstId, secondId, treatments, apparatus) {
      const key = canonicalRecipeKey(
        [firstId, secondId],
        treatments,
        apparatus
      );

      const registry = getRegistry();

      return registry && registry.drugRecipes[key] ||
        (persistentRecipes[key] && persistentRecipes[key].id) ||
        null;
    }
  };

  window.__drugMakerV3Loaded = true;

  console.log(
    "[DrugMaker] v" + VERSION + " caricata. " +
    Object.keys(TREATMENTS).length + " trattamenti; " +
    Object.keys(APPARATUS).length + " apparati."
  );
})();

