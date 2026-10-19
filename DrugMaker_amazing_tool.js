
;(function () {
  "use strict";

  // ============================================================
  // DRUGMAKER 2.0
  // Mod complementare a creator_of_microorganisms.js
  //
  // API utilizzate:
  //   addTool(id, { func: function(placed) {} })
  //   addIngredient(id, { color: "#RRGGBB", type: "..." })
  //
  // Nota: l'API del gioco potrebbe limitare i metadati supportati.
  // ============================================================

  if (typeof window === "undefined") return;

  const MOD_ID = "drug_maker";
  const REGISTRY_NAME = "microorganismRegistry";
  const STORAGE_KEY = "drug_maker_discoveries_v2";
  const VERSION = "2.0";

  // Evita di registrare gli stessi tool due volte.
  if (window.__drugMakerV2Loaded) {
    console.warn("[DrugMaker] Versione 2.0 già caricata.");
    return;
  }

  if (typeof window.addTool !== "function") {
    console.error(
      "[DrugMaker] API addTool non disponibile. " +
      "Carica la mod nel contesto di Infinite Chef."
    );
    return;
  }

  const state = {
    busy: false
  };

  // ============================================================
  // PROCESSI CHIMICI
  // Sono opzioni immaginarie per la generazione di ingredienti.
  // ============================================================

  const TREATMENTS = Object.freeze({
    cristallizzazione: {
      name: "Cristallizzazione",
      bonus: 2
    },
    estrazione: {
      name: "Estrazione",
      bonus: 2
    },
    catalisi: {
      name: "Catalisi",
      bonus: 4
    },
    distillazione: {
      name: "Distillazione",
      bonus: 3
    },
    filtrazione: {
      name: "Filtrazione",
      bonus: 2
    },
    polimerizzazione: {
      name: "Polimerizzazione",
      bonus: 4
    },
    fermentazione: {
      name: "Fermentazione",
      bonus: 3
    },
    ossidazione: {
      name: "Ossidazione",
      bonus: 2
    },
    riduzione: {
      name: "Riduzione",
      bonus: 2
    },
    neutralizzazione: {
      name: "Neutralizzazione",
      bonus: 2
    },
    precipitazione: {
      name: "Precipitazione",
      bonus: 2
    },
    essiccazione: {
      name: "Essiccazione",
      bonus: 2
    }
  });

  // ============================================================
  // APPARATI DI RIFERIMENTO
  // ============================================================

  const APPARATUS = Object.freeze({
    reattore: {
      name: "Reattore chimico",
      bonus: 5
    },
    miscelatore: {
      name: "Miscelatore industriale",
      bonus: 2
    },
    centrifuga: {
      name: "Centrifuga",
      bonus: 3
    },
    cristallizzatore: {
      name: "Cristallizzatore",
      bonus: 4
    },
    distillatore: {
      name: "Colonna di distillazione",
      bonus: 3
    },
    fermentatore: {
      name: "Fermentatore",
      bonus: 4
    },
    filtro: {
      name: "Unità di filtrazione",
      bonus: 2
    },
    estrattore: {
      name: "Estrattore",
      bonus: 3
    }
  });

  // ============================================================
  // UTILITÀ
  // ============================================================

  function log() {
    console.log.apply(console, ["[DrugMaker]"].concat(
      Array.from(arguments)
    ));
  }

  function notify(message) {
    log(message);

    if (typeof window.alert === "function") {
      window.alert(message);
    }
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function cleanId(value) {
    if (typeof value !== "string" &&
        typeof value !== "number") {
      return "";
    }

    return String(value).trim();
  }

  function slug(value) {
    return normalize(value)
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "compound";
  }

  function makeId(seed) {
    return "pill_" + slug(seed) + "_" +
      Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function getRegistry() {
    const registry = window[REGISTRY_NAME];

    if (!registry || typeof registry !== "object") {
      return null;
    }

    if (!registry.microorganisms ||
        typeof registry.microorganisms !== "object") {
      return null;
    }

    return registry;
  }

  function getMicroorganism(id) {
    const registry = getRegistry();

    if (!registry || !id) return null;

    const organism = registry.microorganisms[id];

    return organism &&
      typeof organism === "object"
      ? organism
      : null;
  }

  function organismName(id) {
    const organism = getMicroorganism(id);

    if (!organism) return id;

    return String(
      organism.name ||
      organism.label ||
      organism.displayName ||
      id
    );
  }

  function getOwnOrNestedId(value, seen, depth) {
    if (depth > 5 || value == null) return "";

    if (typeof value === "string" ||
        typeof value === "number") {
      return cleanId(value);
    }

    if (typeof value !== "object") return "";

    if (seen.has(value)) return "";
    seen.add(value);

    const keys = [
      "id",
      "ingredientId",
      "ingredient_id",
      "ingredientID",
      "key",
      "uid",
      "identifier"
    ];

    for (const key of keys) {
      const candidate = value[key];

      if (typeof candidate === "string" ||
          typeof candidate === "number") {
        const id = cleanId(candidate);
        if (id) return id;
      }
    }

    const nestedKeys = [
      "ingredient",
      "element",
      "food",
      "item",
      "data",
      "definition",
      "placed"
    ];

    for (const key of nestedKeys) {
      const nested = value[key];

      if (nested && typeof nested === "object") {
        const result = getOwnOrNestedId(
          nested,
          seen,
          depth + 1
        );

        if (result) return result;
      }
    }

    return "";
  }

  function getClickedId(placed) {
    return getOwnOrNestedId(placed, new WeakSet(), 0);
  }

  function ask(message, defaultValue) {
    if (typeof window.prompt !== "function") {
      notify("Il prompt non è disponibile in questo contesto.");
      return null;
    }

    const answer = window.prompt(message, defaultValue || "");

    if (answer === null) return null;

    return answer.trim();
  }

  function optionsText(dictionary) {
    return Object.keys(dictionary).map(function (key) {
      return key + " — " + dictionary[key].name;
    }).join("\n");
  }

  function parseSelections(input, dictionary) {
    const aliases = Object.create(null);

    Object.keys(dictionary).forEach(function (key) {
      aliases[normalize(key)] = key;
      aliases[normalize(dictionary[key].name)] = key;
    });

    const result = [];
    const parts = String(input || "").split(",");

    for (const part of parts) {
      const key = aliases[normalize(part)];

      if (key && !result.includes(key)) {
        result.push(key);
      }
    }

    return result;
  }

  // ============================================================
  // REGISTRO DELLE SCOPERTE
  // ============================================================

  function saveDiscovery(drug) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      const list = Array.isArray(parsed) ? parsed : [];

      list.push({
        id: drug.id,
        name: drug.name,
        microorganisms: drug.microorganisms.slice(),
        treatments: drug.treatments.slice(),
        apparatus: drug.apparatus,
        createdAt: drug.createdAt
      });

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(list.slice(-500))
      );

      return true;
    } catch (error) {
      log("Salvataggio persistente non disponibile:", error);
      return false;
    }
  }

  // ============================================================
  // ICONA TRICOLORE
  //
  // Non viene passata ad addTool: il formato delle icone dei tool
  // non è stato verificato. L'SVG è un dato dell'ingrediente e
  // potrà essere usato da un renderer che supporti SVG.
  // ============================================================

  function makeTricolorIcon() {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
      '<defs><clipPath id="pillclip"><rect x="12" y="20" width="72" height="56" rx="28"/></clipPath></defs>' +
      '<g clip-path="url(#pillclip)">' +
      '<rect x="12" y="20" width="24" height="56" fill="#009246"/>' +
      '<rect x="36" y="20" width="24" height="56" fill="#FFFFFF"/>' +
      '<rect x="60" y="20" width="24" height="56" fill="#CE2B37"/>' +
      '</g>' +
      '<rect x="12" y="20" width="72" height="56" rx="28" fill="none" stroke="#333333" stroke-width="3"/>' +
      '</svg>';

    return {
      emoji: "💊",
      svg: "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(svg),
      colors: ["#009246", "#FFFFFF", "#CE2B37"]
    };
  }

  // ============================================================
  // GENERAZIONE DELLA PILLOLA
  // ============================================================

  function createDrug(firstId, secondId, treatmentIds, apparatusId) {
    firstId = cleanId(firstId);
    secondId = cleanId(secondId);

    if (!firstId || !secondId) {
      throw new Error("ID dei microorganismi mancanti.");
    }

    if (firstId === secondId) {
      throw new Error(
        "Seleziona due microorganismi con ID differenti."
      );
    }

    const first = getMicroorganism(firstId);
    const second = getMicroorganism(secondId);

    if (!first || !second) {
      throw new Error(
        "Uno dei due ID non è presente in " +
        "microorganismRegistry.microorganisms."
      );
    }

    if (!Array.isArray(treatmentIds) ||
        treatmentIds.length === 0) {
      throw new Error("Seleziona almeno un trattamento.");
    }

    const validTreatments = Array.from(new Set(treatmentIds))
      .filter(function (id) {
        return Object.prototype.hasOwnProperty.call(
          TREATMENTS,
          id
        );
      });

    if (validTreatments.length === 0) {
      throw new Error("Non è stato selezionato alcun trattamento valido.");
    }

    if (!Object.prototype.hasOwnProperty.call(
      APPARATUS,
      apparatusId
    )) {
      throw new Error("Apparato non riconosciuto.");
    }

    const registry = getRegistry();

    if (!registry) {
      throw new Error("Registro dei microorganismi non disponibile.");
    }

    const treatmentBonus = validTreatments.reduce(
      function (sum, id) {
        return sum + TREATMENTS[id].bonus;
      },
      0
    );

    const apparatus = APPARATUS[apparatusId];
    const score = treatmentBonus + apparatus.bonus;
    const id = makeId(
      firstId + "_" + secondId + "_" +
      validTreatments.join("_") + "_" + apparatusId
    );

    const icon = makeTricolorIcon();

    const name = "Pillola " +
      organismName(firstId) + " × " +
      organismName(secondId);

    const drug = {
      id: id,
      name: name,
      type: "ingredient",
      category: "pill",
      shape: "pill",

      // Il colore bianco è compatibile con la forma minima
      // documentata di addIngredient. I campi aggiuntivi sono
      // metadati opzionali per eventuali renderer compatibili.
      color: "#FFFFFF",
      colors: icon.colors,
      icon: icon.emoji,
      iconSvg: icon.svg,
      tricolor: true,

      microorganisms: [firstId, secondId],
      microorganismNames: [
        organismName(firstId),
        organismName(secondId)
      ],

      treatments: validTreatments.slice(),
      treatmentNames: validTreatments.map(function (key) {
        return TREATMENTS[key].name;
      }),

      apparatus: apparatusId,
      apparatusName: apparatus.name,

      // Parametri puramente ludici.
      quality: Math.min(100, 10 + score * 3),
      value: 5 + score * 2,

      description:
        "Ingrediente immaginario creato da DrugMaker. " +
        "Processi: " +
        validTreatments.map(function (key) {
          return TREATMENTS[key].name;
        }).join(", ") +
        ". Apparato: " + apparatus.name + ".",

      createdAt: new Date().toISOString(),
      mod: MOD_ID,
      version: VERSION
    };

    // Registra prima l'oggetto localmente.
    // Conserva anche una copia in una struttura dedicata.
    if (!registry.drugs || typeof registry.drugs !== "object") {
      registry.drugs = {};
    }

    registry.drugs[id] = drug;

    // Registra l'ingrediente nel gioco usando l'API documentata.
    if (typeof window.addIngredient !== "function") {
      delete registry.drugs[id];

      throw new Error(
        "addIngredient non è disponibile: la pillola non può " +
        "essere registrata come ingrediente nel gioco."
      );
    }

    try {
      window.addIngredient(id, {
        color: "#FFFFFF",
        type: "pill"
      });
    } catch (error) {
      delete registry.drugs[id];

      throw new Error(
        "addIngredient ha restituito un errore: " +
        String(error && error.message ? error.message : error)
      );
    }

    // L'API può ignorare i metadati non supportati; l'oggetto
    // completo resta consultabile tramite window.DrugMaker.
    if (!registry.discoveries ||
        typeof registry.discoveries !== "object") {
      registry.discoveries = {};
    }

    registry.discoveries[id] = {
      type: "drug",
      id: id,
      name: name,
      createdAt: drug.createdAt
    };

    saveDiscovery(drug);

    try {
      if (typeof window.CustomEvent === "function") {
        window.dispatchEvent(new window.CustomEvent(
          "drugCreated",
          { detail: drug }
        ));
      }
    } catch (error) {
      log("Evento drugCreated non disponibile:", error);
    }

    log("Pillola creata:", drug);

    return drug;
  }

  // ============================================================
  // FLUSSO DEL TOOL PRINCIPALE
  // ============================================================

  function startDrugCreation(placed) {
    if (state.busy) {
      notify("DrugMaker sta già elaborando una creazione.");
      return;
    }

    state.busy = true;

    try {
      const firstId = getClickedId(placed);

      if (!firstId) {
        log("Struttura dell'ingrediente cliccato:", placed);

        notify(
          "Non riesco a leggere l'ID dell'ingrediente cliccato. " +
          "Controlla la console: la struttura dell'oggetto può " +
          "variare in base alla versione di Infinite Chef."
        );
        return;
      }

      if (!getMicroorganism(firstId)) {
        notify(
          "Il primo ingrediente non è presente nella registry " +
          "dei microorganismi.\n\nID rilevato: " + firstId
        );
        return;
      }

      const secondId = ask(
        "DRUGMAKER — Primo microorganismo: " + firstId +
        "\n\nInserisci l'ID del secondo microorganismo:",
        ""
      );

      if (!secondId) return;

      if (secondId === firstId) {
        notify("I due ID devono essere differenti.");
        return;
      }

      if (!getMicroorganism(secondId)) {
        notify(
          "Il secondo ID non è registrato come microorganismo.\n\n" +
          "ID inserito: " + secondId
        );
        return;
      }

      const treatmentInput = ask(
        "Seleziona uno o più processi, separati da virgole.\n\n" +
        optionsText(TREATMENTS) +
        "\n\nEsempio: catalisi, cristallizzazione",
        "catalisi, cristallizzazione"
      );

      if (!treatmentInput) return;

      const treatmentIds = parseSelections(
        treatmentInput,
        TREATMENTS
      );

      if (treatmentIds.length === 0) {
        notify(
          "Nessun processo valido riconosciuto. " +
          "Usa gli ID elencati, separati da virgole."
        );
        return;
      }

      const apparatusInput = ask(
        "Scegli un apparato di riferimento.\n\n" +
        optionsText(APPARATUS) +
        "\n\nInserisci l'ID dell'apparato:",
        "reattore"
      );

      if (!apparatusInput) return;

      const apparatusIds = parseSelections(
        apparatusInput,
        APPARATUS
      );

      if (apparatusIds.length !== 1) {
        notify(
          "Apparato non valido. Inserisci un solo ID, " +
          "per esempio: reattore."
        );
        return;
      }

      let drug;

      try {
        drug = createDrug(
          firstId,
          secondId,
          treatmentIds,
          apparatusIds[0]
        );
      } catch (error) {
        notify("Creazione non riuscita:\n" + error.message);
        return;
      }

      notify(
        "PILLOLA CREATA\n\n" +
        "Nome: " + drug.name + "\n" +
        "ID: " + drug.id + "\n\n" +
        "Microorganismi:\n" +
        "• " + firstId + "\n" +
        "• " + secondId + "\n\n" +
        "Processi: " + drug.treatmentNames.join(", ") + "\n" +
        "Apparato: " + drug.apparatusName + "\n" +
        "Qualità di gioco: " + drug.quality + "\n\n" +
        "La pillola è stata inviata ad addIngredient."
      );
    } finally {
      state.busy = false;
    }
  }

  // ============================================================
  // TOOL PRINCIPALE
  //
  // Usa solo func: non dichiariamo icone, colori o forme non
  // verificate nella registrazione del tool.
  // ============================================================

  try {
    window.addTool(MOD_ID, {
      func: function (placed) {
        startDrugCreation(placed);
      }
    });

    window.addTool("drug_maker_registry", {
      func: function () {
        const registry = getRegistry();

        if (!registry) {
          notify("Registry dei microorganismi non disponibile.");
          return;
        }

        const drugs = registry.drugs &&
          typeof registry.drugs === "object"
          ? Object.values(registry.drugs)
          : [];

        if (drugs.length === 0) {
          notify("Non hai ancora creato pillole con DrugMaker.");
          return;
        }

        const summary = drugs.map(function (drug, index) {
          return (
            (index + 1) + ". " + drug.name + "\n" +
            "ID: " + drug.id + "\n" +
            "Processi: " + drug.treatmentNames.join(", ") + "\n" +
            "Apparato: " + drug.apparatusName
          );
        }).join("\n\n");

        notify(
          "DRUGMAKER — REGISTRO\n\n" +
          "Pillole nella sessione: " + drugs.length +
          "\n\n" + summary
        );
      }
    });
  } catch (error) {
    console.error(
      "[DrugMaker] Errore durante la registrazione dei tool:",
      error
    );

    return;
  }

  // ============================================================
  // API PUBBLICA PER ALTRE MOD
  // ============================================================

  window.DrugMaker = {
    version: VERSION,
    treatments: TREATMENTS,
    apparatus: APPARATUS,

    createDrug: createDrug,

    getDrug: function (id) {
      const registry = getRegistry();

      return registry &&
        registry.drugs &&
        registry.drugs[id]
        ? registry.drugs[id]
        : null;
    },

    getDrugs: function () {
      const registry = getRegistry();

      if (!registry || !registry.drugs) return [];

      return Object.values(registry.drugs);
    },

    getDiscoveries: function () {
      try {
        const value = window.localStorage.getItem(STORAGE_KEY);
        const parsed = value ? JSON.parse(value) : [];

        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }
  };

  window.__drugMakerV2Loaded = true;

  log("DrugMaker v" + VERSION + " caricato.");
})();
