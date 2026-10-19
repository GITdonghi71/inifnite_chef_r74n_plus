
/* ============================================================
 * DrugMaker.js — v7.0
 *
 * Funzioni:
 * - Dialoga con creator_of_microorganisms.js
 * - Il primo microorganismo viene selezionato con il tool
 * - Richiede l'ID del secondo microorganismo
 * - Permette uno o più trattamenti chimici
 * - Permette uno o due apparati industriali
 * - Accetta ID, nomi e righe complete del catalogo
 * - Genera un ID deterministico per ogni combinazione
 * - Le combinazioni non dipendono dall'ordine di inserimento
 * - Ogni pillola ha un colore uniforme deterministico
 * - Mantiene un registro delle pillole create
 *
 * NOTA: le API del gioco sono riprese dalla mod precedente.
 * ============================================================ */

(function () {
    "use strict";

    if (window.__drugMakerV7Loaded) {
        console.warn("[DrugMaker] La versione 7.0 è già caricata.");
        return;
    }

    window.__drugMakerV7Loaded = true;

    const MOD_VERSION = "7.0";
    const STORAGE_KEY = "drug_maker_registry_v7";

    /* ========================================================
       1. UTILITÀ GENERALI
       ======================================================== */

    function normalize(value) {
        return String(value == null ? "" : value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function uniqueSorted(values) {
        return Array.from(new Set(values)).sort();
    }

    function hashString(text) {
        let hash = 2166136261;

        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return hash >>> 0;
    }

    function hashHex(text) {
        return hashString(text).toString(16).padStart(8, "0");
    }

    function safePrompt(message) {
        if (typeof window.prompt !== "function") {
            throw new Error("Il prompt non è disponibile.");
        }

        return window.prompt(message);
    }

    function safeAlert(message) {
        if (typeof window.alert === "function") {
            window.alert(message);
        } else {
            console.log("[DrugMaker]", message);
        }
    }

    function cancelValue(value) {
        return value === null ||
            String(value).trim() === "";
    }

    /* ========================================================
       2. CATALOGO DEI TRATTAMENTI CHIMICI
       Nomi ispirati ai processi chimici industriali.
       ======================================================== */

    const TREATMENT_NAMES = [
        "Distillazione",
        "Distillazione frazionata",
        "Distillazione sotto vuoto",
        "Distillazione azeotropica",
        "Cristallizzazione",
        "Ricristallizzazione",
        "Filtrazione",
        "Microfiltrazione",
        "Ultrafiltrazione",
        "Nanofiltrazione",
        "Osmosi inversa",
        "Decantazione",
        "Centrifugazione",
        "Sedimentazione",
        "Evaporazione",
        "Essiccazione",
        "Liofilizzazione",
        "Sublimazione",
        "Condensazione",
        "Assorbimento",
        "Adsorbimento",
        "Desorbimento",
        "Estrazione liquido-liquido",
        "Estrazione con solvente",
        "Estrazione supercritica",
        "Lisciviazione",
        "Lavaggio chimico",
        "Separazione a membrana",
        "Scambio ionico",
        "Cromatografia",
        "Cromatografia liquida",
        "Cromatografia gassosa",
        "Elettrodialisi",
        "Elettrolisi",
        "Elettrodeposizione",
        "Ossidazione",
        "Ossidazione catalitica",
        "Riduzione",
        "Idrogenazione",
        "Deidrogenazione",
        "Alogenazione",
        "Clorurazione",
        "Fluorurazione",
        "Bromurazione",
        "Nitrazione",
        "Solfonazione",
        "Solfatazione",
        "Fosforilazione",
        "Alchilazione",
        "Acilazione",
        "Esterificazione",
        "Transesterificazione",
        "Idrolisi",
        "Saponificazione",
        "Amminazione",
        "Ammidazione",
        "Condensazione chimica",
        "Polimerizzazione",
        "Policondensazione",
        "Poliaddizione",
        "Depolimerizzazione",
        "Cracking",
        "Cracking catalitico",
        "Reforming catalitico",
        "Pirolisi",
        "Gassificazione",
        "Steam reforming",
        "Fermentazione industriale",
        "Bioconversione",
        "Neutralizzazione",
        "Precipitazione chimica",
        "Coagulazione",
        "Flocculazione",
        "Calcinazione",
        "Sinterizzazione",
        "Carbonatazione",
        "Decarbonatazione",
        "Disidratazione chimica",
        "Idratazione",
        "Essiccazione sotto vuoto",
        "Trattamento termico",
        "Trattamento con vapore",
        "Raffreddamento controllato",
        "Quenching",
        "Scambio termico",
        "Catalisi omogenea",
        "Catalisi eterogenea",
        "Fotocatalisi",
        "Biocatalisi",
        "Trattamento al plasma",
        "Trattamento con ozono",
        "Ozonolisi",
        "Perossidazione",
        "Metatesi",
        "Isomerizzazione",
        "Racemizzazione",
        "Risoluzione chirale",
        "Purificazione chimica",
        "Deionizzazione",
        "Deodorizzazione",
        "Decolorazione",
        "Stabilizzazione chimica",
        "Passivazione",
        "Incapsulamento",
        "Granulazione",
        "Pellettizzazione",
        "Miscelazione reattiva",
        "Dispersione",
        "Emulsificazione",
        "Omogeneizzazione",
        "Formazione di complessi",
        "Chelazione",
        "Amalgamazione",
        "Trattamento alcalino",
        "Trattamento acido",
        "Digestione chimica",
        "Digestione enzimatica",
        "Sintesi in fase solida",
        "Sintesi in fase gassosa",
        "Sintesi in fase liquida"
    ];

    /* ========================================================
       3. CATALOGO DEGLI APPARATI INDUSTRIALI
       ======================================================== */

    const APPARATUS_NAMES = [
        "Reattore chimico",
        "Reattore batch",
        "Reattore continuo",
        "Reattore tubolare",
        "Reattore a letto fisso",
        "Reattore a letto fluido",
        "Reattore catalitico",
        "Bioreattore",
        "Fermentatore industriale",
        "Autoclave",
        "Caldaia industriale",
        "Forno industriale",
        "Forno rotativo",
        "Forno a vuoto",
        "Essiccatore industriale",
        "Essiccatore a spruzzo",
        "Essiccatore a letto fluido",
        "Liofilizzatore",
        "Evaporatore",
        "Evaporatore a film",
        "Colonna di distillazione",
        "Colonna di frazionamento",
        "Colonna di assorbimento",
        "Colonna di estrazione",
        "Colonna cromatografica",
        "Condensatore",
        "Scambiatore di calore",
        "Raffreddatore industriale",
        "Chiller industriale",
        "Torre di raffreddamento",
        "Cristallizzatore",
        "Filtro industriale",
        "Filtropressa",
        "Filtro a membrana",
        "Centrifuga",
        "Decanter industriale",
        "Separatore centrifugo",
        "Separatore a membrana",
        "Serbatoio di miscelazione",
        "Miscelatore industriale",
        "Agitatore meccanico",
        "Omogeneizzatore",
        "Emulsionatore",
        "Mulino industriale",
        "Mulino a sfere",
        "Trituratore industriale",
        "Granulatore",
        "Pellettizzatore",
        "Estrusore",
        "Pressa industriale",
        "Pompa dosatrice",
        "Pompa peristaltica",
        "Compressore industriale",
        "Refrigeratore",
        "Elettrolizzatore",
        "Cella elettrochimica",
        "Elettrodepositore",
        "Impianto a osmosi inversa",
        "Impianto di scambio ionico",
        "Impianto di elettrodialisi",
        "Impianto di filtrazione",
        "Impianto di depurazione",
        "Impianto di gassificazione",
        "Impianto di pirolisi",
        "Impianto di cracking",
        "Impianto di reforming",
        "Impianto di idrogenazione",
        "Impianto di ossidazione",
        "Impianto di polimerizzazione",
        "Impianto di fermentazione",
        "Impianto di estrazione",
        "Impianto di purificazione",
        "Impianto di cristallizzazione",
        "Impianto di essiccazione",
        "Impianto di distillazione",
        "Impianto di trattamento termico",
        "Reattore a microonde",
        "Reattore fotochimico",
        "Reattore al plasma",
        "Generatore di ozono",
        "Reattore enzimatico",
        "Reattore ad alta pressione",
        "Reattore sottovuoto",
        "Serbatoio criogenico",
        "Vasca di precipitazione",
        "Vasca di neutralizzazione",
        "Vasca di sedimentazione",
        "Flocculatore",
        "Decantatore",
        "Adsorbitore",
        "Assorbitore",
        "Essiccatore sottovuoto",
        "Pompa da vuoto",
        "Colonna di stripping",
        "Unità di lavaggio gas",
        "Scrubber industriale",
        "Sistema di dosaggio",
        "Linea di confezionamento",
        "Incapsulatore industriale",
        "Sistema di sterilizzazione",
        "Sterilizzatore a vapore",
        "Unità di pastorizzazione",
        "Scambiatore ionico",
        "Sistema di controllo termico",
        "Reattore multifase",
        "Miscelatore statico",
        "Reattore a flusso continuo",
        "Reattore elettrochimico",
        "Reattore a membrana",
        "Reattore a tamburo",
        "Vasca di reazione",
        "Serbatoio pressurizzato",
        "Serbatoio di stoccaggio"
    ];

    /* ========================================================
       4. COSTRUZIONE DEI CATALOGHI E DEGLI ALIAS
       ======================================================== */

    function buildCatalog(names) {
        const catalog = {
            items: Object.create(null),
            aliases: Object.create(null)
        };

        names.forEach(function (name) {
            const id = normalize(name);

            if (!id) return;

            catalog.items[id] = {
                id: id,
                name: name
            };

            catalog.aliases[normalize(name)] = id;
            catalog.aliases[id] = id;
        });

        return catalog;
    }

    const treatmentCatalog = buildCatalog(TREATMENT_NAMES);
    const apparatusCatalog = buildCatalog(APPARATUS_NAMES);

    /* ========================================================
       5. PARSING ROBUSTO DELLE SELEZIONI
       Accetta:
       - reattore_chimico
       - Reattore chimico
       - reattore_chimico — Reattore chimico
       - più valori separati da virgole o punto e virgola
       ======================================================== */

    function resolveCatalogEntry(part, catalog) {
        const original = String(part || "").trim();

        if (!original) return null;

        const normalizedOriginal = normalize(original);

        if (catalog.items[normalizedOriginal]) {
            return normalizedOriginal;
        }

        if (catalog.aliases[normalizedOriginal]) {
            return catalog.aliases[normalizedOriginal];
        }

        /*
         * Se l'utente copia la riga completa del catalogo,
         * rimuove il prefisso ID e prova anche il nome.
         */
        const separators = [" — ", " – ", " - ", ":", "\t"];

        for (const separator of separators) {
            const position = original.indexOf(separator);

            if (position === -1) continue;

            const left = original.slice(0, position).trim();
            const right = original.slice(position + separator.length).trim();

            const leftNormalized = normalize(left);
            const rightNormalized = normalize(right);

            if (catalog.items[leftNormalized]) {
                return leftNormalized;
            }

            if (catalog.aliases[leftNormalized]) {
                return catalog.aliases[leftNormalized];
            }

            if (catalog.items[rightNormalized]) {
                return rightNormalized;
            }

            if (catalog.aliases[rightNormalized]) {
                return catalog.aliases[rightNormalized];
            }
        }

        /*
         * Fallback per trattini o spazi copiati in modo diverso.
         */
        const possibleParts = original
            .split(/\s+[—–-]\s+|[:\t]/)
            .map(function (value) {
                return value.trim();
            })
            .filter(Boolean);

        for (const candidate of possibleParts) {
            const id = normalize(candidate);

            if (catalog.items[id]) return id;
            if (catalog.aliases[id]) return catalog.aliases[id];
        }

        return null;
    }

    function parseSelections(input, catalog, label) {
        const parts = String(input || "")
            .split(/[;,،\n]+/)
            .map(function (part) {
                return part.trim();
            })
            .filter(Boolean);

        if (parts.length === 0) {
            throw new Error("Non hai inserito nessun " + label + ".");
        }

        const result = [];

        parts.forEach(function (part) {
            const id = resolveCatalogEntry(part, catalog);

            if (!id || !catalog.items[id]) {
                throw new Error(
                    'Voce non riconosciuta per ' + label + ': "' + part +
                    '". Inserisci il nome o l’ID mostrato nel catalogo.'
                );
            }

            if (!result.includes(id)) {
                result.push(id);
            }
        });

        return result.sort();
    }

    /* ========================================================
       6. ACCESSO AL REGISTRO DEI MICROORGANISMI
       ======================================================== */

    function getMicroorganismRegistry() {
        return window.microorganismRegistry || null;
    }

    function getMicroorganismCollection() {
        const registry = getMicroorganismRegistry();

        if (!registry) return null;

        if (registry.microorganisms) {
            return registry.microorganisms;
        }

        if (registry.microbes) {
            return registry.microbes;
        }

        return null;
    }

    function getCollectionEntry(collection, id) {
        if (!collection || id == null) return null;

        const wanted = String(id).trim();

        if (!wanted) return null;

        if (Array.isArray(collection)) {
            return collection.find(function (item) {
                if (!item) return false;

                return String(
                    item.id != null ? item.id :
                    item.ingredientId != null ? item.ingredientId :
                    item.name != null ? item.name : ""
                ) === wanted;
            }) || null;
        }

        if (typeof collection === "object") {
            if (Object.prototype.hasOwnProperty.call(collection, wanted)) {
                return collection[wanted];
            }

            const keys = Object.keys(collection);

            for (const key of keys) {
                const item = collection[key];

                if (!item) continue;

                const itemId = item.id != null ? String(item.id) : "";
                const ingredientId = item.ingredientId != null
                    ? String(item.ingredientId)
                    : "";

                if (itemId === wanted || ingredientId === wanted) {
                    return item;
                }
            }
        }

        return null;
    }

    function getMicroorganismId(placed) {
        if (placed == null) return null;

        if (typeof placed === "string" || typeof placed === "number") {
            return String(placed);
        }

        const possibleIds = [
            placed.id,
            placed.ingredientId,
            placed.microorganismId,
            placed.microbeId,
            placed.ingredient,
            placed.elementId
        ];

        for (const value of possibleIds) {
            if (typeof value === "string" || typeof value === "number") {
                const id = String(value).trim();

                if (id) return id;
            }
        }

        return null;
    }

    function getMicroorganismName(id) {
        const collection = getMicroorganismCollection();
        const entry = getCollectionEntry(collection, id);

        if (entry && typeof entry === "object") {
            return entry.name || entry.displayName || entry.label || id;
        }

        return String(id);
    }

    function isKnownMicroorganism(id) {
        const collection = getMicroorganismCollection();

        /*
         * Se il registro non è esposto con una struttura riconosciuta,
         * non blocchiamo la creazione: alcune versioni della mod
         * possono registrare i microorganismi in modo differente.
         */
        if (!collection) return true;

        return Boolean(getCollectionEntry(collection, id));
    }

    /* ========================================================
       7. REGISTRO LOCALE DELLE PILLOLE
       ======================================================== */

    const drugRegistry = Object.create(null);

    function loadSavedRegistry() {
        try {
            const raw = window.localStorage
                ? window.localStorage.getItem(STORAGE_KEY)
                : null;

            if (!raw) return;

            const saved = JSON.parse(raw);

            if (!Array.isArray(saved)) return;

            saved.forEach(function (drug) {
                if (drug && drug.id && drug.key) {
                    drugRegistry[drug.key] = drug;
                }
            });
        } catch (error) {
            console.warn(
                "[DrugMaker] Impossibile caricare il registro salvato.",
                error
            );
        }
    }

    function saveRegistry() {
        try {
            if (!window.localStorage) return;

            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(Object.keys(drugRegistry).map(function (key) {
                    return drugRegistry[key];
                }))
            );
        } catch (error) {
            console.warn(
                "[DrugMaker] Impossibile salvare il registro.",
                error
            );
        }
    }

    loadSavedRegistry();

    /* ========================================================
       8. COLORE UNIFORME DETERMINISTICO
       ======================================================== */

    function drugColor(key) {
        const hash = hashString(key);

        /*
         * Una sola tinta per ogni pillola.
         * Saturazione e luminosità sono limitate per evitare
         * colori quasi bianchi o troppo poco visibili.
         */
        const hue = hash % 360;
        const saturation = 62 + ((hash >>> 9) % 19);
        const lightness = 36 + ((hash >>> 17) % 16);

        return hslToHex(hue, saturation, lightness);
    }

    function hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r = 0;
        let g = 0;
        let b = 0;

        if (h < 60) {
            r = c; g = x; b = 0;
        } else if (h < 120) {
            r = x; g = c; b = 0;
        } else if (h < 180) {
            r = 0; g = c; b = x;
        } else if (h < 240) {
            r = 0; g = x; b = c;
        } else if (h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }

        function toHex(value) {
            return Math.round((value + m) * 255)
                .toString(16)
                .padStart(2, "0");
        }

        return "#" +
            toHex(r) +
            toHex(g) +
            toHex(b);
    }

    /* ========================================================
       9. CHIAVE CANONICA E ID
       ======================================================== */

    function canonicalKey(microorganismA, microorganismB,
                          treatmentIds, apparatusIds) {
        const microbes = uniqueSorted([
            String(microorganismA),
            String(microorganismB)
        ]);

        const treatments = uniqueSorted(treatmentIds);
        const apparatus = uniqueSorted(apparatusIds);

        return JSON.stringify({
            microorganisms: microbes,
            treatments: treatments,
            apparatus: apparatus
        });
    }

    function createDrugId(key) {
        return "drug_" + hashHex(key);
    }

    function buildDrugName(drug) {
        return "Pillola " + drug.id.slice(-8);
    }

    /* ========================================================
       10. REGISTRAZIONE DELL'INGREDIENTE NEL GIOCO
       ======================================================== */

    function registerIngredient(drug) {
        if (typeof window.addIngredient !== "function") {
            console.warn(
                "[DrugMaker] window.addIngredient non è disponibile."
            );
            return false;
        }

        const ingredient = {
    name: drug.name,
    color: drug.color,
    type: "pill",
    shape: "capsule",
    emoji: "💊",
    icon: "💊",
    description: drug.description,
    microorganisms: drug.microorganisms.slice(),
    treatments: drug.treatments.slice(),
    apparatus: drug.apparatus.slice(),
    drugMakerId: drug.id
};

        try {
            window.addIngredient(drug.id, ingredient);
            return true;
        } catch (firstError) {
            /*
             * Non tentiamo firme alternative non documentate:
             * mostriamo l'errore effettivo nella console.
             */
            console.error(
                "[DrugMaker] Errore durante addIngredient:",
                firstError
            );

            return false;
        }
    }

    /* ========================================================
       11. CREAZIONE DELLA PILLOLA
       ======================================================== */

    function createDrug(microorganismA, microorganismB,
                        treatmentIds, apparatusIds) {
        const microbes = uniqueSorted([
            String(microorganismA),
            String(microorganismB)
        ]);

        const treatments = uniqueSorted(
            (treatmentIds || []).map(String)
        );

        const apparatus = uniqueSorted(
            (apparatusIds || []).map(String)
        );

        if (microbes.length !== 2) {
            throw new Error(
                "Servono due microorganismi distinti."
            );
        }

        if (treatments.length < 1) {
            throw new Error(
                "Seleziona almeno un trattamento chimico."
            );
        }

        if (apparatus.length < 1 || apparatus.length > 2) {
            throw new Error(
                "Seleziona uno o due apparati industriali."
            );
        }

        treatments.forEach(function (id) {
            if (!treatmentCatalog.items[id]) {
                throw new Error("Trattamento non valido: " + id);
            }
        });

        apparatus.forEach(function (id) {
            if (!apparatusCatalog.items[id]) {
                throw new Error("Apparato non valido: " + id);
            }
        });

        const key = canonicalKey(
            microbes[0],
            microbes[1],
            treatments,
            apparatus
        );

        /*
         * La combinazione esiste già: restituiamo lo stesso oggetto.
         */
        if (drugRegistry[key]) {
            return {
                drug: drugRegistry[key],
                existing: true
            };
        }

        const id = createDrugId(key);

        const drug = {
            id: id,
            key: key,
            name: "Pillola " + id.slice(-8),
            color: drugColor(key),
            emoji: "💊",
            microorganisms: microbes,
            microorganismNames: microbes.map(getMicroorganismName),
            treatments: treatments,
            treatmentNames: treatments.map(function (treatmentId) {
                return treatmentCatalog.items[treatmentId].name;
            }),
            apparatus: apparatus,
            apparatusNames: apparatus.map(function (apparatusId) {
                return apparatusCatalog.items[apparatusId].name;
            }),
            description: "",
            createdAt: new Date().toISOString()
        };

        drug.description =
            "Microorganismi: " + drug.microorganismNames.join(" + ") +
            ". Trattamenti: " + drug.treatmentNames.join(", ") +
            ". Apparati: " + drug.apparatusNames.join(", ") + ".";

        drugRegistry[key] = drug;

        saveRegistry();

        drug.registeredInGame = registerIngredient(drug);

        return {
            drug: drug,
            existing: false
        };
    }

    /* ========================================================
       12. VISUALIZZAZIONE DEL CATALOGO
       ======================================================== */

    function formatCatalog(catalog) {
        return Object.keys(catalog.items)
            .sort()
            .map(function (id) {
                return id + " — " + catalog.items[id].name;
            })
            .join("\n");
    }

    function showRegistry() {
        const drugs = Object.keys(drugRegistry)
            .map(function (key) {
                return drugRegistry[key];
            })
            .sort(function (a, b) {
                return a.id.localeCompare(b.id);
            });

        if (drugs.length === 0) {
            safeAlert("Non hai ancora creato nessuna pillola.");
            return;
        }

        const lines = drugs.map(function (drug, index) {
            return [
                (index + 1) + ". " + drug.name,
                "ID: " + drug.id,
                "Colore: " + drug.color,
                "Microorganismi: " + drug.microorganismNames.join(" + "),
                "Trattamenti: " + drug.treatmentNames.join(", "),
                "Apparati: " + drug.apparatusNames.join(", ")
            ].join("\n");
        });

        safeAlert(
            "REGISTRO DRUG MAKER\n\n" +
            lines.join("\n\n")
        );
    }

    /* ========================================================
       13. PROCEDURA GUIDATA
       ======================================================== */

    function startCreation(placed) {
        try {
            let firstId = getMicroorganismId(placed);

            /*
             * Se il tool non riceve un ID riconoscibile, chiediamo
             * un ID esplicito invece di procedere con dati vuoti.
             */
            if (!firstId) {
                firstId = safePrompt(
                    "Non riesco a leggere l'ID del primo microorganismo.\n" +
                    "Inserisci il suo ID:"
                );

                if (cancelValue(firstId)) return;

                firstId = String(firstId).trim();
            }

            if (!isKnownMicroorganism(firstId)) {
                safeAlert(
                    'Il primo microorganismo "' + firstId +
                    '" non è presente nel registro riconosciuto.'
                );
                return;
            }

            const secondInput = safePrompt(
                "PRIMO MICROORGANISMO\n" +
                getMicroorganismName(firstId) + " (" + firstId + ")\n\n" +
                "Inserisci l'ID del SECONDO microorganismo:"
            );

            if (cancelValue(secondInput)) return;

            const secondId = String(secondInput).trim();

            if (firstId === secondId) {
                safeAlert(
                    "I due microorganismi devono essere distinti."
                );
                return;
            }

            if (!isKnownMicroorganism(secondId)) {
                safeAlert(
                    'Il secondo microorganismo "' + secondId +
                    '" non è presente nel registro riconosciuto. ' +
                    "Controlla l'ID."
                );
                return;
            }

            const treatmentInput = safePrompt(
                "TRATTAMENTI CHIMICI\n\n" +
                "Inserisci uno o più trattamenti separati da virgole.\n" +
                "Puoi usare il nome, l'ID o la riga completa.\n\n" +
                formatCatalog(treatmentCatalog)
            );

            if (cancelValue(treatmentInput)) return;

            let treatments;

            try {
                treatments = parseSelections(
                    treatmentInput,
                    treatmentCatalog,
                    "trattamento"
                );
            } catch (error) {
                safeAlert(error.message);
                return;
            }

            const apparatusInput = safePrompt(
                "APPARATI INDUSTRIALI\n\n" +
                "Inserisci UNO o DUE apparati distinti, separati da virgole.\n" +
                "Puoi inserire il nome, l'ID o copiare la riga completa.\n\n" +
                "Esempi validi:\n" +
                "reattore_chimico\n" +
                "Reattore chimico\n" +
                "reattore_chimico — Reattore chimico\n" +
                "reattore_chimico, centrifuga\n\n" +
                formatCatalog(apparatusCatalog)
            );

            if (cancelValue(apparatusInput)) return;

            let apparatus;

            try {
                apparatus = parseSelections(
                    apparatusInput,
                    apparatusCatalog,
                    "apparato"
                );
            } catch (error) {
                safeAlert(
                    error.message +
                    "\n\nInserisci uno o due apparati validi, " +
                    "separati da virgole."
                );
                return;
            }

            /*
             * Controllo esplicito del numero di apparati DISTINCT.
             * Una voce duplicata viene contata una sola volta.
             */
            if (apparatus.length < 1 || apparatus.length > 2) {
                safeAlert(
                    "Devi selezionare uno o due apparati differenti.\n" +
                    "Apparati riconosciuti: " + apparatus.length
                );
                return;
            }

            const result = createDrug(
                firstId,
                secondId,
                treatments,
                apparatus
            );

            const drug = result.drug;

            if (result.existing) {
                safeAlert(
                    "Questa combinazione esiste già.\n\n" +
                    "È stata ritrovata la stessa pillola:\n" +
                    drug.name + "\n" +
                    "ID: " + drug.id + "\n" +
                    "Colore: " + drug.color
                );
                return;
            }

            safeAlert(
                "PILLOLA CREATA\n\n" +
                "Nome: " + drug.name + "\n" +
                "ID: " + drug.id + "\n" +
                "Colore uniforme: " + drug.color + "\n\n" +
                "Microorganismi:\n" +
                drug.microorganismNames.join(" + ") + "\n\n" +
                "Trattamenti:\n" +
                drug.treatmentNames.join(", ") + "\n\n" +
                "Apparati:\n" +
                drug.apparatusNames.join(", ") + "\n\n" +
                (
                    drug.registeredInGame
                        ? "Ingrediente inviato al registro del gioco."
                        : "Pillola salvata nel registro DrugMaker. " +
                          "La registrazione nel gioco potrebbe non essere riuscita."
                )
            );

            console.log("[DrugMaker] Pillola creata:", drug);
        } catch (error) {
            console.error("[DrugMaker] Errore:", error);

            safeAlert(
                "Si è verificato un errore durante la creazione:\n" +
                (error && error.message ? error.message : String(error))
            );
        }
    }

    /* ========================================================
       14. REGISTRAZIONE DEI TOOL
       ======================================================== */

    function registerTools() {
        if (typeof window.addTool !== "function") {
            console.error(
                "[DrugMaker] window.addTool non è disponibile. " +
                "La mod non può registrare i tool."
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

            return true;
        } catch (error) {
            console.error(
                "[DrugMaker] Errore durante la registrazione dei tool:",
                error
            );

            return false;
        }
    }

    /* ========================================================
       15. API PUBBLICA
       ======================================================== */

    window.DrugMaker = {
        version: MOD_VERSION,

        createDrug: createDrug,
        startCreation: startCreation,
        showRegistry: showRegistry,

        getRegistry: function () {
            return Object.keys(drugRegistry).map(function (key) {
                return drugRegistry[key];
            });
        },

        getTreatments: function () {
            return Object.keys(treatmentCatalog.items).map(function (id) {
                return treatmentCatalog.items[id];
            });
        },

        getApparatus: function () {
            return Object.keys(apparatusCatalog.items).map(function (id) {
                return apparatusCatalog.items[id];
            });
        },

        parseTreatments: function (input) {
            return parseSelections(
                input,
                treatmentCatalog,
                "trattamento"
            );
        },

        parseApparatus: function (input) {
            return parseSelections(
                input,
                apparatusCatalog,
                "apparato"
            );
        },

        colorForKey: drugColor
    };

    const registered = registerTools();

    console.log(
        "[DrugMaker] v" + MOD_VERSION +
        (registered ? " caricata correttamente." : " caricata con errori nei tool.")
    );

    console.log(
        "[DrugMaker] Trattamenti: " +
        Object.keys(treatmentCatalog.items).length +
        " | Apparati: " +
        Object.keys(apparatusCatalog.items).length
    );
})();
