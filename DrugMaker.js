
;(function () {
  "use strict";

  const MOD_ID = "drug_maker";
  const VERSION = "1.0";
  const REGISTRY_KEY = "microorganismRegistry";
  const STORAGE_KEY = "drug_maker_discoveries_v1";

  if (typeof window === "undefined") return;

  // Evita la doppia registrazione della mod.
  if (window.__drugMakerLoaded) {
    console.warn("[DrugMaker] Mod già caricata.");
    return;
  }
  window.__drugMakerLoaded = true;

  const state = {
    firstMicroorganismId: null,
    busy: false
  };

  // --------------------------------------------------
  // Utilità
  // --------------------------------------------------

  function log(...args) {
    console.log("[DrugMaker]", ...args);
  }

  function cleanId(value) {
    return String(value == null ? "" : value).trim();
  }

  function safeSlug(value) {
    return String(value || "compound")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "compound";
  }

  function uniqueId(prefix, seed) {
    const random = Math.random().toString(36).slice(2, 8);
    const time = Date.now().toString(36);
    return prefix + "_" + safeSlug(seed) + "_" + time + "_" + random;
  }

  function getRegistry() {
    const registry = window[REGISTRY_KEY];

    if (!registry || typeof registry !== "object") {
      return null;
    }

    registry.microorganisms ||= {};
    registry.eggs ||= {};
    registry.discoveries ||= {};
    registry.drugs ||= {};

    return registry;
  }

  function getMicroorganism(id) {
    const registry = getRegistry();
    if (!registry) return null;

    return registry.microorganisms[id] || null;
  }

  function getMicroorganismName(id) {
    const organism = getMicroorganism(id);

    return organism
      ? String(organism.name || organism.label || id)
      : id;
  }

  function ask(message, defaultValue) {
    if (typeof window.prompt !== "function") return null;

    const answer = window.prompt(message, defaultValue || "");
    if (answer === null) return null;

    return answer.trim();
  }

  function notify(message) {
    if (typeof window.alert === "function") {
      window.alert(message);
    }
    log(message);
  }

  function saveDiscovery(drug) {
    try {
      const oldData = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) || "[]"
      );

      const list = Array.isArray(oldData) ? oldData : [];
      list.push({
        id: drug.id,
        name: drug.name,
        microorganisms: drug.microorganisms,
        treatments: drug.treatments,
        apparatus: drug.apparatus,
        createdAt: drug.createdAt
      });

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(list.slice(-500))
      );
    } catch (error) {
      log("Registro persistente non disponibile:", error);
    }
  }

  // --------------------------------------------------
  // Trattamenti chimici selezionabili
  // --------------------------------------------------

  const TREATMENTS = {
    cristallizzazione: {
      name: "Cristallizzazione",
      description: "Forma cristalli immaginari del composto.",
      bonus: 2,
      color: "#74D8E8"
    },

    estrazione: {
      name: "Estrazione",
      description: "Seleziona componenti immaginari del composto.",
      bonus: 2,
      color: "#7DCB91"
    },

    catalisi: {
      name: "Catalisi",
      description: "Aumenta l'efficienza simulata della sintesi.",
      bonus: 4,
      color: "#E5B64D"
    },

    distillazione: {
      name: "Distillazione",
      description: "Aggiunge un bonus simulato di purezza.",
      bonus: 3,
      color: "#85B7F0"
    },

    filtrazione: {
      name: "Filtrazione",
      description: "Aggiunge un bonus simulato di pulizia.",
      bonus: 2,
      color: "#A7D4B3"
    },

    polimerizzazione: {
      name: "Polimerizzazione",
      description: "Aggiunge un bonus simulato di stabilità.",
      bonus: 4,
      color: "#C19BE8"
    },

    fermentazione: {
      name: "Fermentazione",
      description: "Usa il profilo metabolico dei microorganismi.",
      bonus: 3,
      color: "#D7A15D"
    },

    ossidazione: {
      name: "Ossidazione",
      description: "Aggiunge un modificatore chimico immaginario.",
      bonus: 2,
      color: "#E48A73"
    },

    riduzione: {
      name: "Riduzione",
      description: "Aggiunge un modificatore di reazione immaginario.",
      bonus: 2,
      color: "#82B8C9"
    },

    neutralizzazione: {
      name: "Neutralizzazione",
      description: "Bilancia il profilo simulato del composto.",
      bonus: 2,
      color: "#B8C9A0"
    },

    precipitazione: {
      name: "Precipitazione",
      description: "Aggiunge una fase solida immaginaria.",
      bonus: 2,
      color: "#D5C6A0"
    },

    essiccazione: {
      name: "Essiccazione",
      description: "Aggiunge un bonus simulato di conservazione.",
      bonus: 2,
      color: "#E3C47C"
    }
  };

  // --------------------------------------------------
  // Apparati di riferimento
  // --------------------------------------------------

  const APPARATUS = {
    reattore: {
      name: "Reattore chimico",
      bonus: 5,
      icon: "⚗️"
    },

    miscelatore: {
      name: "Miscelatore industriale",
      bonus: 2,
      icon: "🌀"
    },

    centrifuga: {
      name: "Centrifuga",
      bonus: 3,
      icon: "🔄"
    },

    cristallizzatore: {
      name: "Cristallizzatore",
      bonus: 4,
      icon: "💎"
    },

    distillatore: {
      name: "Colonna di distillazione",
      bonus: 3,
      icon: "♨️"
    },

    fermentatore: {
      name: "Fermentatore",
      bonus: 4,
      icon: "🧫"
    },

    filtro: {
      name: "Unità di filtrazione",
      bonus: 2,
      icon: "🔬"
    },

    estrattore: {
      name: "Estrattore",
      bonus: 3,
      icon: "⚙️"
    }
  };

  function parseChoices(input, dictionary) {
    const aliases = {};

    Object.keys(dictionary).forEach(function (key) {
      aliases[key.toLowerCase()] = key;
      aliases[dictionary[key].name.toLowerCase()] = key;
    });

    return Array.from(new Set(
      input
        .split(",")
        .map(function (part) {
          const normalized = part.trim().toLowerCase();
          return aliases[normalized] || null;
        })
        .filter(Boolean)
    ));
  }

  function showOptions(dictionary) {
    return Object.keys(dictionary).map(function (key) {
      return key + " = " + dictionary[key].name;
    }).join("\n");
  }

  // --------------------------------------------------
  // Generazione dell'icona tricolore
  // --------------------------------------------------

  function makeTricolorIcon() {
    // Il tricolore viene conservato anche come SVG,
    // per i sistemi che supportano icone SVG.
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
        '<defs><clipPath id="pill"><rect x="12" y="20" width="72" height="56" rx="28"/></clipPath></defs>' +
        '<g clip-path="url(#pill)">' +
          '<rect x="12" y="20" width="24" height="56" fill="#009246"/>' +
          '<rect x="36" y="20" width="24" height="56" fill="#FFFFFF"/>' +
          '<rect x="60" y="20" width="24" height="56" fill="#CE2B37"/>' +
        '</g>' +
        '<rect x="12" y="20" width="72" height="56" rx="28" fill="none" stroke="#333333" stroke-width="3"/>' +
        '<path d="M26 31 Q40 25 51 32" fill="none" stroke="#FFFFFF" stroke-opacity=".8" stroke-width="4" stroke-linecap="round"/>' +
      '</svg>';

    return {
      emoji: "🟩⬜🟥💊",
      svg: "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(svg),
      colors: ["#009246", "#FFFFFF", "#CE2B37"]
    };
  }

  // --------------------------------------------------
  // Creazione dell'ingrediente farmaco
  // --------------------------------------------------

  function createDrug(firstId, secondId, treatmentIds, apparatusId) {
    const registry = getRegistry();

    if (!registry) {
      notify(
        "Non trovo window.microorganismRegistry. " +
        "Carica prima creator_of_microorganisms.js."
      );
      return;
    }

    const first = getMicroorganism(firstId);
    const second = getMicroorganism(secondId);

    if (!first || !second) {
      notify(
        "Uno o entrambi gli ID non corrispondono a microorganismi " +
        "registrati dalla mod dei microorganismi.\n\n" +
        "Primo: " + firstId + "\n" +
        "Secondo: " + secondId
      );
      return;
    }

    const treatmentObjects = treatmentIds.map(function (id) {
      return TREATMENTS[id];
    });

    const apparatus = APPARATUS[apparatusId];

    const score = treatmentObjects.reduce(function (sum, treatment) {
      return sum + treatment.bonus;
    }, 0) + apparatus.bonus;

    const seed = firstId + "_" + secondId + "_" +
      treatmentIds.join("_") + "_" + apparatusId;

    const id = uniqueId("pill", seed);
    const name = "Pillola " +
      getMicroorganismName(firstId) + " × " +
      getMicroorganismName(secondId);

    const icon = makeTricolorIcon();

    const drug = {
      id: id,
      name: name,
      type: "drug",
      category: "pill",
      shape: "pill",
      icon: icon.emoji,
      iconSvg: icon.svg,
      colors: icon.colors,
      color: "#FFFFFF",
      tricolor: true,

      microorganisms: [firstId, secondId],
      microorganismNames: [
        getMicroorganismName(firstId),
        getMicroorganismName(secondId)
      ],

      treatments: treatmentIds.slice(),
      treatmentNames: treatmentObjects.map(function (item) {
        return item.name;
      }),

      apparatus: apparatusId,
      apparatusName: apparatus.name,

      // Valori esclusivamente ludici, non proprietà mediche.
      quality: Math.min(100, 10 + score * 3),
      value: 5 + score * 2,
      gameEffect: {
        kind: "fictional",
        strength: Math.min(100, score),
        description:
          "Effetto di gioco generato da microorganismi e processi selezionati."
      },

      description:
        "Ingrediente immaginario creato con DrugMaker. " +
        "Microorganismi: " + firstId + ", " + secondId + ". " +
        "Processi: " + treatmentObjects.map(function (item) {
          return item.name;
        }).join(", ") + ". " +
        "Apparato: " + apparatus.name + ".",

      createdAt: new Date().toISOString(),
      mod: MOD_ID,
      version: VERSION
    };

    // Collega i dati alla registry condivisa.
    registry.drugs[id] = drug;
    registry.discoveries[id] = {
      type: "drug",
      name: name,
      id: id,
      createdAt: drug.createdAt
    };

    // Pubblica l'ingrediente nel gioco.
    if (typeof window.addIngredient === "function") {
      try {
        window.addIngredient(id, {
          name: name,
          label: name,
          type: "ingredient",
          category: "pill",
          shape: "pill",
          color: "#FFFFFF",
          colors: icon.colors,
          icon: icon.emoji,
          emoji: icon.emoji,
          iconSvg: icon.svg,
          description: drug.description,
          quality: drug.quality,
          value: drug.value,
          drugMaker: true,
          microorganismIds: [firstId, secondId],
          treatments: treatmentIds.slice(),
          apparatus: apparatusId
        });
      } catch (error) {
        log("addIngredient ha restituito un errore:", error);
        notify(
          "La pillola è stata salvata nella registry della mod, " +
          "ma addIngredient non è riuscito a registrarla nel gioco.\n\n" +
          "Errore: " + String(error)
        );
        return;
      }
    } else {
      notify(
        "Non trovo window.addIngredient. La pillola è stata salvata " +
        "nella registry della mod, ma non è stata aggiunta " +
        "all'inventario degli ingredienti."
      );
      return;
    }

    saveDiscovery(drug);

    // Evento opzionale per altre mod compatibili.
    try {
      window.dispatchEvent(new CustomEvent("drugCreated", {
        detail: drug
      }));
    } catch (error) {
      log("Evento drugCreated non disponibile:", error);
    }

    notify(
      "💊 PILLOLA CREATA!\n\n" +
      "Nome: " + name + "\n" +
      "ID: " + id + "\n\n" +
      "Microorganismi:\n" +
      "• " + firstId + "\n" +
      "• " + secondId + "\n\n" +
      "Processi: " + drug.treatmentNames.join(", ") + "\n" +
      "Apparato: " + apparatus.name + "\n\n" +
      "Icona: tricolore italiano 🇮🇹\n" +
      "Qualità di gioco: " + drug.quality + "\n\n" +
      "L'ingrediente è stato inviato ad addIngredient."
    );

    log("Farmaco creato:", drug);
  }

  // --------------------------------------------------
  // Flusso interattivo del tool
  // --------------------------------------------------

  function startDrugCreation(placed) {
    if (state.busy) {
      notify("Una creazione è già in corso.");
      return;
    }

    state.busy = true;

    try {
      const firstId = getClickedIngredientId(placed);

      if (!firstId) {
        notify(
          "Non riesco a leggere l'ID dell'ingrediente cliccato.\n" +
          "Controlla la struttura dell'oggetto passato dal tool " +
          "nella console."
        );
        log("Oggetto cliccato:", placed);
        return;
      }

      const firstOrganism = getMicroorganism(firstId);

      if (!firstOrganism) {
        notify(
          "L'ingrediente cliccato non risulta un microorganismo " +
          "creato con creator_of_microorganisms.js.\n\n" +
          "ID rilevato: " + firstId
        );
        return;
      }

      state.firstMicroorganismId = firstId;

      const secondId = ask(
        "DrugMaker — Primo microorganismo: " + firstId + "\n\n" +
        "Inserisci l'ID del SECONDO microorganismo:",
        ""
      );

      if (!secondId) return;

      if (secondId === firstId) {
        notify("Scegli due microorganismi con ID differenti.");
        return;
      }

      if (!getMicroorganism(secondId)) {
        notify(
          "Il secondo ID non è presente nella registry dei " +
          "microorganismi.\n\nID: " + secondId
        );
        return;
      }

      const treatmentText = ask(
        "Scegli uno o più trattamenti chimici, separati da virgole.\n\n" +
        showOptions(TREATMENTS) +
        "\n\nEsempio: catalisi, cristallizzazione",
        "catalisi, cristallizzazione"
      );

      if (!treatmentText) return;

      const treatmentIds = parseChoices(treatmentText, TREATMENTS);

      if (treatmentIds.length === 0) {
        notify(
          "Nessun trattamento valido riconosciuto. " +
          "Scrivi gli ID elencati, separati da virgole."
        );
        return;
      }

      const apparatusText = ask(
        "Scegli un apparato di riferimento.\n\n" +
        showOptions(APPARATUS) +
        "\n\nScrivi il suo ID:",
        "reattore"
      );

      if (!apparatusText) return;

      const apparatusIds = parseChoices(apparatusText, APPARATUS);

      if (apparatusIds.length !== 1) {
        notify(
          "Apparato non riconosciuto. Inserisci un solo ID, " +
          "per esempio: reattore."
        );
        return;
      }

      createDrug(
        firstId,
        secondId,
        treatmentIds,
        apparatusIds[0]
      );
    } finally {
      state.busy = false;
    }
  }

  // Cerca l'ID in strutture di oggetti comuni.
  // Adatta questa funzione se il gioco usa uno schema diverso.
  function getClickedIngredientId(placed) {
    if (typeof placed === "string" || typeof placed === "number") {
      return cleanId(placed);
    }

    if (!placed || typeof placed !== "object") return null;

    const keys = [
      "id",
      "ingredientId",
      "ingredient_id",
      "key",
      "uid",
      "identifier",
      "ingredientID"
    ];

    for (const key of keys) {
      if (
        placed[key] !== undefined &&
        placed[key] !== null &&
        typeof placed[key] !== "object"
      ) {
        return cleanId(placed[key]);
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
      const nested = placed[key];

      if (nested && typeof nested === "object") {
        const found = getClickedIngredientId(nested);
        if (found) return found;
      }
    }

    return null;
  }

  // --------------------------------------------------
  // Tool per creare pillole
  // --------------------------------------------------

  if (typeof window.addTool !== "function") {
    window.__drugMakerLoaded = false;
    console.error(
      "[DrugMaker] addTool non è disponibile. " +
      "Carica il file nel contesto delle mod di Infinite Chef."
    );
    return;
  }

  window.addTool(MOD_ID, {
    name: "DrugMaker — Pillola tricolore",
    shape: "pill",
    color: "#FFFFFF",
    icon: "🟩⬜🟥💊",

    func: function (placed) {
      startDrugCreation(placed);
    }
  });

  // --------------------------------------------------
  // Tool per consultare il registro
  // --------------------------------------------------

  window.addTool("drug_maker_registry", {
    name: "DrugMaker — Registro farmaci",
    shape: "pill",
    color: "#009246",
    icon: "📋",

    func: function () {
      const registry = getRegistry();

      if (!registry) {
        notify("Registry dei microorganismi non trovata.");
        return;
      }

      const drugs = Object.values(registry.drugs || {});

      const summary = drugs.length
        ? drugs.map(function (drug, index) {
            return (
              (index + 1) + ". " + drug.name + "\n" +
              "   ID: " + drug.id + "\n" +
              "   Processi: " + drug.treatmentNames.join(", ") + "\n" +
              "   Apparato: " + drug.apparatusName
            );
          }).join("\n\n")
        : "Non hai ancora creato pillole.";

      notify(
        "DRUGMAKER — REGISTRO\n\n" +
        "Pillole registrate in questa sessione: " + drugs.length +
        "\n\n" + summary
      );
    }
  });

  // API pubblica condivisa con le altre mod.
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
    }
  };

  log("DrugMaker v" + VERSION + " caricato.");
})();
