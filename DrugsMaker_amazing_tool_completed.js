
/*
 * DrugMaker.js v6.0
 * Infinite Chef
 *
 * - Due microorganismi per ricetta.
 * - Uno o più trattamenti.
 * - Da uno a due apparati.
 * - Stessa combinazione = stessa pillola.
 * - Ordine dei componenti irrilevante.
 * - Colore uniforme deterministico.
 * - Salvataggio locale delle ricette.
 * - Registrazione separata dei due tool.
 */

(function () {
    "use strict";

    const VERSION = "6.0";
    const STORAGE_KEY = "drug_maker_v6";

    // Evita di inizializzare due volte questa versione.
    if (window.__drugMakerV6Loaded) {
        console.warn("[DrugMaker] v6.0 già caricata.");
        return;
    }

    // --------------------------------------------------
    // CATALOGO TRATTAMENTI
    // --------------------------------------------------

    const TREATMENT_NAMES = [
        "Ossidazione",
        "Riduzione",
        "Idrogenazione",
        "Deidrogenazione",
        "Idratazione",
        "Disidratazione",
        "Idrolisi",
        "Alogenazione",
        "Clorurazione",
        "Fluorurazione",
        "Bromurazione",
        "Nitrazione",
        "Solfonazione",
        "Solfatazione",
        "Amminazione",
        "Alchilazione",
        "Dealchilazione",
        "Esterificazione",
        "Transesterificazione",
        "Amidazione",
        "Condensazione",
        "Polimerizzazione",
        "Policondensazione",
        "Depolimerizzazione",
        "Isomerizzazione",
        "Acilazione",
        "Diazotazione",
        "Neutralizzazione",
        "Saponificazione",
        "Cracking",
        "Steam cracking",
        "Reforming catalitico",
        "Steam reforming",
        "Pirolisi",
        "Gassificazione",
        "Carbonilazione",
        "Idroformilazione",
        "Fermentazione",
        "Bioconversione",
        "Processo Haber-Bosch",
        "Processo Ostwald",
        "Processo Contact",
        "Processo Solvay",
        "Processo Claus",
        "Processo Fischer-Tropsch",
        "Processo Monsanto",
        "Processo Wacker",
        "Processo Leblanc",
        "Processo cumene",
        "Processo cloro-soda",
        "Processo Bayer",
        "Processo Ziegler-Natta",
        "Processo Bergius",
        "Processo Cativa",
        "Distillazione",
        "Distillazione frazionata",
        "Distillazione sotto vuoto",
        "Distillazione azeotropica",
        "Estrazione liquido-liquido",
        "Estrazione solido-liquido",
        "Cristallizzazione",
        "Ricristallizzazione",
        "Filtrazione",
        "Ultrafiltrazione",
        "Nanofiltrazione",
        "Osmosi inversa",
        "Adsorbimento",
        "Desorbimento",
        "Assorbimento",
        "Stripping",
        "Decantazione",
        "Sedimentazione",
        "Centrifugazione",
        "Evaporazione",
        "Essiccazione",
        "Sublimazione",
        "Separazione a membrana",
        "Cromatografia",
        "Raffinazione",
        "Demineralizzazione",
        "Deionizzazione",
        "Purificazione catalitica",
        "Riscaldamento",
        "Raffreddamento",
        "Congelamento",
        "Fusione",
        "Pastorizzazione",
        "Sterilizzazione",
        "Trattamento termico",
        "Calcinazione",
        "Sinterizzazione",
        "Essiccazione sotto vuoto",
        "Liofilizzazione",
        "Macinazione",
        "Frantumazione",
        "Omogeneizzazione",
        "Miscelazione",
        "Emulsificazione",
        "Flocculazione",
        "Coagulazione",
        "Aerazione",
        "Degasaggio",
        "Precipitazione",
        "Dissoluzione",
        "Vulcanizzazione",
        "Reticolazione",
        "Galvanizzazione",
        "Elettrodeposizione",
        "Anodizzazione",
        "Passivazione",
        "Fosfatazione",
        "Decapaggio",
        "Lucidatura chimica",
        "Incisione chimica",
        "Deposizione chimica da fase vapore",
        "Processo sol-gel",
        "Impregnazione",
        "Rivestimento polimerico",
        "Reticolazione UV",
        "Fermentazione aerobica",
        "Fermentazione anaerobica",
        "Digestione anaerobica",
        "Biodegradazione",
        "Bioremediation",
        "Trattamento biologico delle acque",
        "Depurazione",
        "Nitrificazione",
        "Denitrificazione",
        "Compostaggio",
        "Trattamento enzimatico",
        "Biocatalisi",
        "Coltura microbica",
        "Trattamento con enzimi"
    ];

    // --------------------------------------------------
    // CATALOGO APPARATI
    // --------------------------------------------------

    const APPARATUS_NAMES = [
        "Reattore chimico",
        "Reattore batch",
        "Reattore continuo",
        "Reattore CSTR",
        "Reattore tubolare",
        "Reattore catalitico",
        "Bioreattore",
        "Fermentatore",
        "Autoclave",
        "Camera di sterilizzazione",
        "Forno industriale",
        "Forno rotativo",
        "Forno di calcinazione",
        "Essiccatore",
        "Liofilizzatore",
        "Scambiatore di calore",
        "Colonna di distillazione",
        "Colonna di frazionamento",
        "Colonna di assorbimento",
        "Colonna di stripping",
        "Colonna cromatografica",
        "Centrifuga",
        "Filtro industriale",
        "Filtropressa",
        "Filtro a tamburo",
        "Filtro a membrana",
        "Separatore centrifugo",
        "Decantatore",
        "Sedimentatore",
        "Cristallizzatore",
        "Evaporatore",
        "Evaporatore a film",
        "Essiccatore a spruzzo",
        "Unità di osmosi inversa",
        "Miscelatore industriale",
        "Agitatore",
        "Omogeneizzatore",
        "Emulsionatore",
        "Macinatore",
        "Mulino a sfere",
        "Frantoio",
        "Pompa industriale",
        "Compressore",
        "Soffiante",
        "Trasportatore a coclea",
        "Nastro trasportatore",
        "Tramoggia",
        "Dosatore",
        "Serbatoio di stoccaggio",
        "Serbatoio di miscelazione",
        "Elettrolizzatore",
        "Cella elettrochimica",
        "Torre di raffreddamento",
        "Condensatore",
        "Caldaia industriale",
        "Bruciatore",
        "Scrubber",
        "Torre di lavaggio gas",
        "Unità di adsorbimento",
        "Letto catalitico",
        "Impianto di trattamento acque",
        "Impianto di depurazione",
        "Impianto di fermentazione",
        "Unità di cristallizzazione",
        "Unità di estrazione",
        "Reattore ad alta pressione",
        "Reattore sottovuoto",
        "Colonna di estrazione",
        "Reattore fotochimico",
        "Reattore enzimatico",
        "Filtro sottovuoto",
        "Essiccatore rotativo",
        "Essiccatore a letto fluido",
        "Scambiatore a piastre",
        "Scambiatore a fascio tubiero",
        "Serbatoio pressurizzato",
        "Serbatoio criogenico",
        "Unità di desalinizzazione",
        "Unità di distillazione molecolare",
        "Unità di filtrazione tangenziale",
        "Separatore gas-liquido",
        "Separatore solido-liquido",
        "Reattore a letto fluido",
        "Reattore a letto fisso",
        "Reattore a membrana",
        "Reattore elettrochimico",
        "Vasca di precipitazione",
        "Vasca di flocculazione",
        "Vasca di sedimentazione",
        "Unità di flottazione",
        "Impianto di compostaggio",
        "Unità di trattamento biologico",
        "Sistema di dosaggio chimico",
        "Sistema di controllo della temperatura",
        "Unità di recupero solventi"
    ];

    // --------------------------------------------------
    // UTILITÀ E CATALOGHI
    // --------------------------------------------------

    function normalize(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function buildCatalog(names) {
        const items = {};
        const aliases = {};

        names.forEach(function (name) {
            const id = normalize(name);

            if (!items[id]) {
                items[id] = {
                    id: id,
                    name: name
                };
            }

            aliases[normalize(name)] = id;
            aliases[id] = id;
        });

        return {
            items: items,
            aliases: aliases
        };
    }

    const treatmentCatalog = buildCatalog(TREATMENT_NAMES);
    const apparatusCatalog = buildCatalog(APPARATUS_NAMES);

    const TREATMENTS = treatmentCatalog.items;
    const APPARATUS = apparatusCatalog.items;

    // --------------------------------------------------
    // REGISTRY
    // --------------------------------------------------

    function getRegistry() {
        if (!window.microorganismRegistry) {
            window.microorganismRegistry = {
                microorganisms: {},
                eggs: {},
                discoveries: {},
                drugs: {},
                drugRecipes: {}
            };
        }

        const registry = window.microorganismRegistry;

        registry.microorganisms =
            registry.microorganisms || {};
        registry.eggs = registry.eggs || {};
        registry.discoveries = registry.discoveries || {};
        registry.drugs = registry.drugs || {};
        registry.drugRecipes = registry.drugRecipes || {};

        return registry;
    }

    function findMicroorganism(id) {
        const registry = getRegistry();

        if (!id) return null;

        if (registry.microorganisms[id]) {
            return registry.microorganisms[id];
        }

        const keys = Object.keys(registry.microorganisms);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const item = registry.microorganisms[key];

            if (
                String(key) === String(id) ||
                String(item.id || "") === String(id)
            ) {
                return item;
            }
        }

        return null;
    }

    function getClickedId(placed) {
        if (!placed) return null;

        const candidates = [
            placed.id,
            placed.ingredientId,
            placed.ingredient_id,
            placed.microorganismId,
            placed.microorganism_id,
            placed.ingredient && placed.ingredient.id,
            placed.data && placed.data.id
        ];

        for (let i = 0; i < candidates.length; i++) {
            const id = candidates[i];

            if (
                id !== undefined &&
                id !== null &&
                findMicroorganism(String(id))
            ) {
                return String(id);
            }
        }

        return null;
    }

    // --------------------------------------------------
    // SELEZIONE DI TRATTAMENTI E APPARATI
    // --------------------------------------------------

    function parseSelections(input, catalog, label) {
        const parts = String(input || "")
            .split(",")
            .map(function (item) {
                return item.trim();
            })
            .filter(Boolean);

        const result = [];

        parts.forEach(function (part) {
            const id = catalog.aliases[normalize(part)];

            if (!id || !catalog.items[id]) {
                throw new Error(
                    'Voce non riconosciuta per ' +
                    label + ': "' + part + '"'
                );
            }

            if (!result.includes(id)) {
                result.push(id);
            }
        });

        return result.sort();
    }

    // --------------------------------------------------
    // CHIAVE CANONICA
    // --------------------------------------------------

    function canonicalKey(microbes, treatments, apparatus) {
        return JSON.stringify({
            microorganisms: Array.from(
                new Set(microbes.map(String))
            ).sort(),

            treatments: Array.from(
                new Set(treatments.map(String))
            ).sort(),

            apparatus: Array.from(
                new Set(apparatus.map(String))
            ).sort()
        });
    }

    // --------------------------------------------------
    // HASH E ID
    // --------------------------------------------------

    function hash32(text) {
        let hash = 2166136261;

        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return (hash >>> 0).toString(16).padStart(8, "0");
    }

    function idForKey(key) {
        return "drug_" + hash32(key);
    }

    // --------------------------------------------------
    // COLORE SOLIDO DETERMINISTICO
    // --------------------------------------------------

    function hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        const k = function (n) {
            return (n + h / 30) % 12;
        };

        const a = s * Math.min(l, 1 - l);

        const f = function (n) {
            const value = l - a * Math.max(
                -1,
                Math.min(
                    k(n) - 3,
                    Math.min(9 - k(n), 1)
                )
            );

            return Math.round(255 * value);
        };

        return "#" + [f(0), f(8), f(4)]
            .map(function (value) {
                return value.toString(16).padStart(2, "0");
            })
            .join("");
    }

    function colorForRecipe(key) {
        const hue = parseInt(hash32(key), 16) % 360;

        return hslToHex(hue, 72, 48);
    }

    // --------------------------------------------------
    // SALVATAGGIO
    // --------------------------------------------------

    function loadSavedRecipes() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return {};

            const parsed = JSON.parse(raw);

            return parsed && typeof parsed === "object"
                ? parsed
                : {};
        } catch (error) {
            console.warn(
                "[DrugMaker] Lettura salvataggio fallita.",
                error
            );

            return {};
        }
    }

    let savedRecipes = loadSavedRecipes();

    function persistRecipes() {
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(savedRecipes)
            );
        } catch (error) {
            console.warn(
                "[DrugMaker] Salvataggio fallito.",
                error
            );
        }
    }

    // --------------------------------------------------
    // NOMI
    // --------------------------------------------------

    function microbeName(id) {
        const item = findMicroorganism(id);

        return item
            ? (item.name || item.label || item.id || id)
            : id;
    }

    function makeDrugName(microbes, id) {
        return "Pillola " +
            microbeName(microbes[0]) +
            " + " +
            microbeName(microbes[1]) +
            " [" + id.slice(-6) + "]";
    }

    // --------------------------------------------------
    // REGISTRAZIONE INGREDIENTE
    // --------------------------------------------------

    function registerIngredient(drug) {
        if (typeof window.addIngredient !== "function") {
            console.warn(
                "[DrugMaker] addIngredient non disponibile."
            );
            return;
        }

        try {
            window.addIngredient(drug.id, {
                name: drug.name,
                color: drug.color,
                type: "pill",
                shape: "pill",
                emoji: "💊",
                description: drug.description,
                drugMaker: true,
                recipeKey: drug.recipeKey
            });
        } catch (error) {
            console.error(
                "[DrugMaker] Errore addIngredient:",
                error
            );
        }
    }

    // --------------------------------------------------
    // TROVA RICETTA ESISTENTE
    // --------------------------------------------------

    function findExistingDrug(key) {
        const registry = getRegistry();
        const recipe = registry.drugRecipes[key];

        if (recipe && recipe.drugId) {
            const found = registry.drugs[recipe.drugId];

            if (found) return found;
        }

        if (savedRecipes[key] && savedRecipes[key].id) {
            return savedRecipes[key];
        }

        const expectedId = idForKey(key);

        if (registry.drugs[expectedId]) {
            return registry.drugs[expectedId];
        }

        return null;
    }

    // --------------------------------------------------
    // CREA O RIUTILIZZA PILLOLA
    // --------------------------------------------------

    function createDrug(
        firstId,
        secondId,
        treatmentIds,
        apparatusIds
    ) {
        const registry = getRegistry();

        firstId = String(firstId || "").trim();
        secondId = String(secondId || "").trim();

        if (!findMicroorganism(firstId)) {
            throw new Error(
                "Primo microorganismo non trovato: " + firstId
            );
        }

        if (!findMicroorganism(secondId)) {
            throw new Error(
                "Secondo microorganismo non trovato: " + secondId
            );
        }

        if (firstId === secondId) {
            throw new Error(
                "Servono due microorganismi differenti."
            );
        }

        const microbes = [firstId, secondId].sort();

        const treatments = Array.from(
            new Set((treatmentIds || []).map(String))
        ).sort();

        const apparatus = Array.from(
            new Set((apparatusIds || []).map(String))
        ).sort();

        if (!treatments.length) {
            throw new Error(
                "Seleziona almeno un trattamento."
            );
        }

        if (apparatus.length < 1 || apparatus.length > 2) {
            throw new Error(
                "Seleziona uno o due apparati."
            );
        }

        treatments.forEach(function (id) {
            if (!TREATMENTS[id]) {
                throw new Error("Trattamento non valido: " + id);
            }
        });

        apparatus.forEach(function (id) {
            if (!APPARATUS[id]) {
                throw new Error("Apparato non valido: " + id);
            }
        });

        const key = canonicalKey(
            microbes,
            treatments,
            apparatus
        );

        const existing = findExistingDrug(key);

        if (existing) {
            registry.drugs[existing.id] = existing;

            registry.drugRecipes[key] = {
                key: key,
                drugId: existing.id
            };

            registerIngredient(existing);

            return {
                drug: existing,
                created: false
            };
        }

        const id = idForKey(key);
        const color = colorForRecipe(key);

        const treatmentNames = treatments.map(function (itemId) {
            return TREATMENTS[itemId].name;
        });

        const apparatusNames = apparatus.map(function (itemId) {
            return APPARATUS[itemId].name;
        });

        const drug = {
            id: id,
            name: makeDrugName(microbes, id),
            color: color,
            type: "pill",
            shape: "pill",
            emoji: "💊",

            microorganisms: microbes,
            microorganismNames: microbes.map(microbeName),

            treatments: treatments,
            treatmentNames: treatmentNames,

            apparatus: apparatus,
            apparatusNames: apparatusNames,

            recipeKey: key,

            description:
                "Pillola ottenuta da " +
                microbes.map(microbeName).join(" + ") +
                ". Trattamenti: " +
                treatmentNames.join(", ") +
                ". Apparati: " +
                apparatusNames.join(", ") + ".",

            createdAt: Date.now(),
            drugMakerVersion: VERSION
        };

        registry.drugs[id] = drug;

        registry.drugRecipes[key] = {
            key: key,
            drugId: id
        };

        registry.discoveries[id] = {
            id: id,
            name: drug.name,
            type: "drug",
            recipeKey: key
        };

        savedRecipes[key] = drug;
        persistRecipes();
        registerIngredient(drug);

        try {
            window.dispatchEvent(
                new CustomEvent("drugCreated", {
                    detail: {
                        drug: drug,
                        created: true
                    }
                })
            );
        } catch (error) {
            // L'evento non è essenziale.
        }

        console.info(
            "[DrugMaker] Creata:",
            drug.id,
            drug.color
        );

        return {
            drug: drug,
            created: true
        };
    }

    // --------------------------------------------------
    // FLUSSO DI CREAZIONE
    // --------------------------------------------------

    function startCreation(placed) {
        const firstId = getClickedId(placed);

        if (!firstId) {
            alert(
                "Drug Maker: seleziona un microorganismo " +
                "riconosciuto prima di avviare la creazione."
            );
            return;
        }

        const secondInput = window.prompt(
            "DRUG MAKER\n\n" +
            "Primo microorganismo: " + microbeName(firstId) +
            "\n\nInserisci l'ID del secondo microorganismo:"
        );

        if (secondInput === null) return;

        const secondId = secondInput.trim();

        if (!findMicroorganism(secondId)) {
            alert("Secondo microorganismo non trovato.");
            return;
        }

        if (secondId === firstId) {
            alert("Scegli due microorganismi differenti.");
            return;
        }

        const treatmentList = Object.keys(TREATMENTS)
            .map(function (id) {
                return id + " — " + TREATMENTS[id].name;
            })
            .join("\n");

        const treatmentInput = window.prompt(
            "TRATTAMENTI\n\n" +
            "Inserisci uno o più nomi o ID separati da virgole.\n\n" +
            treatmentList
        );

        if (treatmentInput === null) return;

        let treatments;

        try {
            treatments = parseSelections(
                treatmentInput,
                treatmentCatalog,
                "trattamento"
            );
        } catch (error) {
            alert(error.message);
            return;
        }

        if (!treatments.length) {
            alert("Devi scegliere almeno un trattamento.");
            return;
        }

        const apparatusList = Object.keys(APPARATUS)
            .map(function (id) {
                return id + " — " + APPARATUS[id].name;
            })
            .join("\n");

        const apparatusInput = window.prompt(
            "APPARATI INDUSTRIALI\n\n" +
            "Inserisci uno o due nomi o ID separati da virgole.\n\n" +
            apparatusList
        );

        if (apparatusInput === null) return;

        let apparatus;

        try {
            apparatus = parseSelections(
                apparatusInput,
                apparatusCatalog,
                "apparato"
            );
        } catch (error) {
            alert(error.message);
            return;
        }

        if (apparatus.length < 1 || apparatus.length > 2) {
            alert("Scegli uno o due apparati differenti.");
            return;
        }

        try {
            const result = createDrug(
                firstId,
                secondId,
                treatments,
                apparatus
            );

            const drug = result.drug;

            alert(
                (result.created
                    ? "NUOVA PILLOLA CREATA"
                    : "PILLOLA GIÀ ESISTENTE") +

                "\n\nNome: " + drug.name +
                "\nID: " + drug.id +
                "\nColore: " + drug.color +
                "\n\nMicroorganismi: " +
                drug.microorganismNames.join(" + ") +
                "\nTrattamenti: " +
                drug.treatmentNames.join(", ") +
                "\nApparati: " +
                drug.apparatusNames.join(", ")
            );
        } catch (error) {
            console.error("[DrugMaker]", error);
            alert("Errore: " + error.message);
        }
    }

    // --------------------------------------------------
    // REGISTRO PILLOLE
    // --------------------------------------------------

    function getDrugs() {
        const registry = getRegistry();
        const all = {};

        Object.keys(savedRecipes).forEach(function (key) {
            const drug = savedRecipes[key];

            if (drug && drug.id) {
                all[drug.id] = drug;
            }
        });

        Object.keys(registry.drugs).forEach(function (id) {
            all[id] = registry.drugs[id];
        });

        return Object.keys(all)
            .map(function (id) {
                return all[id];
            })
            .sort(function (a, b) {
                return String(a.name).localeCompare(String(b.name));
            });
    }

    function showRegistry() {
        const drugs = getDrugs();

        if (!drugs.length) {
            alert("Nessuna pillola scoperta.");
            return;
        }

        const output = drugs.map(function (drug, index) {
            return (
                (index + 1) + ". " + drug.name +
                "\nID: " + drug.id +
                "\nColore: " + drug.color +
                "\nTrattamenti: " +
                (drug.treatmentNames || []).join(", ") +
                "\nApparati: " +
                (drug.apparatusNames || []).join(", ")
            );
        }).join("\n\n");

        alert(
            "REGISTRO DRUG MAKER\n" +
            "Pillole: " + drugs.length +
            "\n\n" + output
        );
    }

    // --------------------------------------------------
    // REGISTRAZIONE TOOL
    // --------------------------------------------------

    function registerTools() {
        if (typeof window.addTool !== "function") {
            console.error(
                "[DrugMaker] window.addTool non disponibile. " +
                "Carica DrugMaker.js dopo il sistema dei tool."
            );
            return false;
        }

        try {
            window.addTool("drug_maker", {
                name: "Drug Maker",
                shape: "microbe",
                func: function (placed) {
                    startCreation(placed);
                }
            });

            window.addTool("drug_maker_registry", {
                name: "Drug Maker Registry",
                shape: "microbe",
                func: function () {
                    showRegistry();
                }
            });

            console.info("[DrugMaker] Tool registrati.");
            return true;
        } catch (error) {
            console.error(
                "[DrugMaker] Errore durante la registrazione dei tool:",
                error
            );
            return false;
        }
    }

    // --------------------------------------------------
    // API PUBBLICA
    // --------------------------------------------------

    window.DrugMaker = {
        version: VERSION,
        treatments: TREATMENTS,
        apparatus: APPARATUS,

        createDrug: createDrug,
        getDrugs: getDrugs,
        showRegistry: showRegistry,
        colorForRecipe: colorForRecipe,

        getDrug: function (id) {
            return getRegistry().drugs[id] || null;
        },

        getRecipeId: function (microbes, treatments, apparatus) {
            return idForKey(
                canonicalKey(microbes, treatments, apparatus)
            );
        },

        registerTools: registerTools
    };

    // Flag impostato solo dopo aver preparato l'API.
    window.__drugMakerV6Loaded = true;

    // Registra i tool dopo aver definito tutte le funzioni.
    registerTools();

    console.info(
        "[DrugMaker] v" + VERSION + " inizializzata. " +
        "Trattamenti: " + Object.keys(TREATMENTS).length +
        "; apparati: " + Object.keys(APPARATUS).length
    );
})();

