
/*
 * DrugMaker.js — v5.0
 * Infinite Chef
 *
 * Funzioni:
 * - Combina due microorganismi.
 * - Permette più trattamenti chimici.
 * - Permette 1 o 2 apparati industriali.
 * - Una combinazione canonica corrisponde a una sola pillola.
 * - L'ordine dei microorganismi, trattamenti e apparati non conta.
 * - Colore uniforme deterministico per ogni ricetta.
 * - Salvataggio delle ricette in localStorage.
 *
 * Integrazione prevista:
 * window.microorganismRegistry
 * window.addTool(...)
 * window.addIngredient(...)
 */

(function () {
    "use strict";

    const VERSION = "5.0";
    const MOD_ID = "drug_maker";
    const STORAGE_KEY = "drug_maker_v5";

    if (window.__drugMakerV5Loaded) {
        console.warn("[DrugMaker] Questa versione è già caricata.");
        return;
    }

    // ---------------------------------------------------------
    // 1. CATALOGO DEI TRATTAMENTI
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 2. CATALOGO DEGLI APPARATI INDUSTRIALI
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 3. CREAZIONE DEI CATALOGHI CON ID STABILI
    // ---------------------------------------------------------

    function slug(text) {
        return String(text)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function buildCatalog(names) {
        const catalog = {};
        const normalizedNames = {};

        names.forEach(function (name) {
            const id = slug(name);

            if (!catalog[id]) {
                catalog[id] = {
                    id: id,
                    name: name
                };
            }

            normalizedNames[normalize(name)] = id;
            normalizedNames[normalize(id)] = id;
        });

        return {
            items: catalog,
            names: normalizedNames
        };
    }

    function normalize(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[\s-]+/g, "_");
    }

    const treatmentCatalog = buildCatalog(TREATMENT_NAMES);
    const apparatusCatalog = buildCatalog(APPARATUS_NAMES);

    const TREATMENTS = treatmentCatalog.items;
    const APPARATUS = apparatusCatalog.items;

    // ---------------------------------------------------------
    // 4. REGISTRY DEI MICROORGANISMI
    // ---------------------------------------------------------

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

        const direct = registry.microorganisms[id];
        if (direct) return direct;

        const wanted = String(id).trim();

        const keys = Object.keys(registry.microorganisms);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const microbe = registry.microorganisms[key];

            if (
                String(key) === wanted ||
                String(microbe.id || "") === wanted
            ) {
                return microbe;
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
            placed.type,
            placed.name,
            placed.ingredient && placed.ingredient.id,
            placed.data && placed.data.id
        ];

        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];

            if (
                candidate !== undefined &&
                candidate !== null &&
                findMicroorganism(String(candidate))
            ) {
                return String(candidate);
            }
        }

        return null;
    }

    // ---------------------------------------------------------
    // 5. NORMALIZZAZIONE DELLE SELEZIONI
    // ---------------------------------------------------------

    function parseSelections(input, catalog, label) {
        const values = String(input || "")
            .split(",")
            .map(function (part) {
                return part.trim();
            })
            .filter(Boolean);

        const result = [];

        values.forEach(function (value) {
            const id =
                catalog.names[normalize(value)] ||
                catalog.names[slug(value)];

            if (!id || !catalog.items[id]) {
                throw new Error(
                    'Voce "' + value + '" non riconosciuta per ' +
                    label + "."
                );
            }

            if (result.indexOf(id) === -1) {
                result.push(id);
            }
        });

        return result.sort();
    }

    // ---------------------------------------------------------
    // 6. CHIAVE CANONICA DELLA RICETTA
    // ---------------------------------------------------------

    function canonicalKey(
        microorganismIds,
        treatmentIds,
        apparatusIds
    ) {
        const microbes = microorganismIds
            .map(String)
            .sort();

        const treatments = Array.from(
            new Set(treatmentIds.map(String))
        ).sort();

        const apparatus = Array.from(
            new Set(apparatusIds.map(String))
        ).sort();

        return JSON.stringify({
            microorganisms: microbes,
            treatments: treatments,
            apparatus: apparatus
        });
    }

    // ---------------------------------------------------------
    // 7. HASH E ID DETERMINISTICO
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 8. COLORE UNIFORME DETERMINISTICO
    // ---------------------------------------------------------

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
        const hash = parseInt(hash32(key), 16);

        // Saturazione e luminosità fisse:
        // cambia la tonalità, ma il colore resta uniforme.
        const hue = hash % 360;

        return hslToHex(hue, 72, 48);
    }

    // ---------------------------------------------------------
    // 9. ARCHIVIO PERSISTENTE
    // ---------------------------------------------------------

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
                "[DrugMaker] Impossibile leggere il salvataggio.",
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
                "[DrugMaker] Impossibile salvare le ricette.",
                error
            );
        }
    }

    // ---------------------------------------------------------
    // 10. NOMI DELLE PILLOLE
    // ---------------------------------------------------------

    function getMicrobeName(id) {
        const microbe = findMicroorganism(id);

        if (!microbe) return id;

        return microbe.name || microbe.label || microbe.id || id;
    }

    function makeDrugName(microbes, id) {
        const first = getMicrobeName(microbes[0]);
        const second = getMicrobeName(microbes[1]);

        return "Pillola " + first + " + " + second +
            " [" + id.slice(-6) + "]";
    }

    // ---------------------------------------------------------
    // 11. REGISTRAZIONE DELL'INGREDIENTE NEL GIOCO
    // ---------------------------------------------------------

    function registerIngredient(drug) {
        if (typeof window.addIngredient !== "function") {
            console.warn(
                "[DrugMaker] addIngredient non è disponibile."
            );
            return;
        }

        try {
            // L'icona viene lasciata al renderer standard del gioco.
            // Il colore è un unico valore esadecimale.
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
                "[DrugMaker] Registrazione ingrediente fallita:",
                error
            );
        }
    }

    // ---------------------------------------------------------
    // 12. RICERCA E RIUTILIZZO DELLE RICETTE
    // ---------------------------------------------------------

    function findExistingDrug(key) {
        const registry = getRegistry();

        if (registry.drugRecipes[key]) {
            const recipe = registry.drugRecipes[key];

            if (recipe.drugId && registry.drugs[recipe.drugId]) {
                return registry.drugs[recipe.drugId];
            }
        }

        if (savedRecipes[key]) {
            const saved = savedRecipes[key];

            if (saved.id) {
                return saved;
            }
        }

        const expectedId = idForKey(key);

        if (registry.drugs[expectedId]) {
            return registry.drugs[expectedId];
        }

        return null;
    }

    // ---------------------------------------------------------
    // 13. CREAZIONE O RIUTILIZZO DELLA PILLOLA
    // ---------------------------------------------------------

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
                "Seleziona due microorganismi differenti."
            );
        }

        const microbes = [firstId, secondId].sort();

        const treatments = Array.from(
            new Set((treatmentIds || []).map(String))
        ).sort();

        const apparatus = Array.from(
            new Set((apparatusIds || []).map(String))
        ).sort();

        if (treatments.length === 0) {
            throw new Error(
                "Seleziona almeno un trattamento."
            );
        }

        if (apparatus.length < 1 || apparatus.length > 2) {
            throw new Error(
                "Devi selezionare uno o due apparati."
            );
        }

        treatments.forEach(function (id) {
            if (!TREATMENTS[id]) {
                throw new Error(
                    "Trattamento non valido: " + id
                );
            }
        });

        apparatus.forEach(function (id) {
            if (!APPARATUS[id]) {
                throw new Error(
                    "Apparato non valido: " + id
                );
            }
        });

        const key = canonicalKey(
            microbes,
            treatments,
            apparatus
        );

        // Se la combinazione esiste, restituisci la stessa pillola.
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

        // L'ID è deterministico: stesso insieme di componenti,
        // stesso ID anche se cambia l'ordine di inserimento.
        const id = idForKey(key);
        const color = colorForRecipe(key);

        const treatmentNames = treatments.map(function (treatmentId) {
            return TREATMENTS[treatmentId].name;
        });

        const apparatusNames = apparatus.map(function (apparatusId) {
            return APPARATUS[apparatusId].name;
        });

        const name = makeDrugName(microbes, id);

        const drug = {
            id: id,
            name: name,
            color: color,
            type: "pill",
            shape: "pill",
            emoji: "💊",

            microorganisms: microbes,
            microorganismNames: microbes.map(getMicrobeName),

            treatments: treatments,
            treatmentNames: treatmentNames,

            apparatus: apparatus,
            apparatusNames: apparatusNames,

            recipeKey: key,

            description:
                "Pillola ottenuta da " +
                microbes.map(getMicrobeName).join(" + ") +
                ". Trattamenti: " +
                treatmentNames.join(", ") +
                ". Apparati: " +
                apparatusNames.join(", ") +
                ".",

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
            name: name,
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
        } catch (_) {
            // L'evento è facoltativo.
        }

        console.info(
            "[DrugMaker] Nuova pillola:",
            id,
            color,
            drug
        );

        return {
            drug: drug,
            created: true
        };
    }

    // ---------------------------------------------------------
    // 14. FLUSSO INTERATTIVO DEL TOOL
    // ---------------------------------------------------------

    function startCreation(placed) {
        const firstId = getClickedId(placed);

        if (!firstId) {
            alert(
                "DrugMaker: clicca il tool mentre selezioni " +
                "un microorganismo riconosciuto."
            );
            return;
        }

        const firstMicrobe = findMicroorganism(firstId);

        const secondInput = window.prompt(
            "DRUG MAKER\n\n" +
            "Primo microorganismo: " +
            (firstMicrobe.name || firstId) +
            "\n\nInserisci l'ID del secondo microorganismo:"
        );

        if (secondInput === null) return;

        const secondId = secondInput.trim();

        if (!findMicroorganism(secondId)) {
            alert(
                "Secondo microorganismo non trovato.\n" +
                "Controlla l'ID e riprova."
            );
            return;
        }

        if (secondId === firstId) {
            alert(
                "Devi scegliere due microorganismi differenti."
            );
            return;
        }

        const treatmentList = Object.keys(TREATMENTS)
            .map(function (id) {
                return id + " = " + TREATMENTS[id].name;
            })
            .join("\n");

        const treatmentInput = window.prompt(
            "TRATTAMENTI\n\n" +
            "Inserisci uno o più ID o nomi separati da virgole.\n\n" +
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

        if (treatments.length === 0) {
            alert("Seleziona almeno un trattamento.");
            return;
        }

        const apparatusList = Object.keys(APPARATUS)
            .map(function (id) {
                return id + " = " + APPARATUS[id].name;
            })
            .join("\n");

        const apparatusInput = window.prompt(
            "APPARATI INDUSTRIALI\n\n" +
            "Inserisci uno o due ID o nomi separati da virgole.\n\n" +
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
            alert(
                "Devi scegliere uno o due apparati differenti."
            );
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
                    : "COMBINAZIONE GIÀ SCOPERTA") +
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

    // ---------------------------------------------------------
    // 15. REGISTRO DELLE PILLOLE SCOPERTE
    // ---------------------------------------------------------

    function getDrugs() {
        const registry = getRegistry();
        const combined = {};

        Object.keys(savedRecipes).forEach(function (key) {
            const drug = savedRecipes[key];

            if (drug && drug.id) {
                combined[drug.id] = drug;
            }
        });

        Object.keys(registry.drugs).forEach(function (id) {
            combined[id] = registry.drugs[id];
        });

        return Object.keys(combined)
            .map(function (id) {
                return combined[id];
            })
            .sort(function (a, b) {
                return String(a.name).localeCompare(String(b.name));
            });
    }

    function showRegistry() {
        const drugs = getDrugs();

        if (drugs.length === 0) {
            alert("Non hai ancora scoperto nessuna pillola.");
            return;
        }

        const text = drugs.map(function (drug, index) {
            return (
                (index + 1) + ". " + drug.name +
                "\n   ID: " + drug.id +
                "\n   Colore: " + drug.color +
                "\n   Trattamenti: " +
                (drug.treatmentNames || []).join(", ") +
                "\n   Apparati: " +
                (drug.apparatusNames || []).join(", ")
            );
        }).join("\n\n");

        alert(
            "REGISTRO DRUG MAKER\n\n" +
            "Pillole registrate: " + drugs.length +
            "\n\n" + text
        );
    }

    // ---------------------------------------------------------
    // 16. REGISTRAZIONE DEI TOOL
    // ---------------------------------------------------------

    if (typeof window.addTool === "function") {
        window.addTool(MOD_ID, {
            name: "Drug Maker",
            shape: "pill",
            func: function (placed) {
                startCreation(placed);
            }
        });

        window.addTool("drug_maker_registry", {
            name: "Registro pillole",
            shape: "pill",
            func: function () {
                showRegistry();
            }
        });
    } else {
        console.warn(
            "[DrugMaker] window.addTool non è disponibile."
        );
    }

    // ---------------------------------------------------------
    // 17. API PUBBLICA PER ALTRE MOD
    // ---------------------------------------------------------

    window.DrugMaker = {
        version: VERSION,

        treatments: TREATMENTS,
        apparatus: APPARATUS,

        createDrug: createDrug,

        getDrug: function (id) {
            const registry = getRegistry();

            return registry.drugs[id] || null;
        },

        getDrugs: getDrugs,

        getRecipeId: function (
            microorganismIds,
            treatmentIds,
            apparatusIds
        ) {
            const key = canonicalKey(
                microorganismIds,
                treatmentIds,
                apparatusIds
            );

            return idForKey(key);
        },

        colorForRecipe: colorForRecipe,

        showRegistry: showRegistry
    };

    window.__drugMakerV5Loaded = true;

    console.info(
        "[DrugMaker] v" + VERSION +
        " caricata. Trattamenti: " +
        Object.keys(TREATMENTS).length +
        "; apparati: " +
        Object.keys(APPARATUS).length + "."
    );
})();
