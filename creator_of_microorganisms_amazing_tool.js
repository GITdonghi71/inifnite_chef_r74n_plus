
/*
 * Creator of Microorganisms v4.0
 * Infinite Chef R74n+
 *
 * Funzioni:
 * - due ingredienti genitori
 * - salse SauceMaker e relativi nutrienti
 * - affumicatura e caramellizzazione
 * - metadati di innesto
 * - specie, tipo di cellula e temperatura indipendenti
 * - varianti deterministiche, senza duplicati
 *
 * Modifica soltanto questo addon.
 */
(function () {
    "use strict";

    const VERSION = "4.0.0";
    const PREFIX = "creator-microorganisms";
    const DEFAULT_TEMP = 37;

    const SPECIES = {
        bacterium:  { label: "Batterio",   shape: "microbe",      color: "#65c466" },
        yeast:      { label: "Lievito",    shape: "fungus",      color: "#d7b66d" },
        mold:       { label: "Muffa",      shape: "fungus",      color: "#8e70c4" },
        archaea:    { label: "Archea",     shape: "double_helix",color: "#e38c4e" },
        microalgae: { label: "Microalga",  shape: "algae",       color: "#42b7a5" },
        hybrid:     { label: "Ibrido",     shape: "embryo",      color: "#c878b7" }
    };

    const CELL_TYPES = {
        prokaryotic: "Procariote",
        eukaryotic: "Eucariote",
        hybrid: "Cellula ibrida"
    };

    let selected = [];
    let panel = null;
    let status = null;
    let selectedBox = null;
    let resultBox = null;
    let speciesInput = null;
    let cellInput = null;
    let temperatureInput = null;
    let traitsInput = null;

    function getDB() {
        try {
            if (typeof ingredients !== "undefined" && ingredients) {
                return ingredients;
            }
        } catch (_) {}

        return window.ingredients || {};
    }

    function getRegisterIngredient() {
        try {
            if (typeof addIngredient === "function") return addIngredient;
        } catch (_) {}

        return window.addIngredient;
    }

    function getRegisterTool() {
        try {
            if (typeof addTool === "function") return addTool;
        } catch (_) {}

        return window.addTool;
    }

    function stableStringify(value) {
        if (value === null || typeof value !== "object") {
            return JSON.stringify(value);
        }

        if (Array.isArray(value)) {
            return "[" + value.map(stableStringify).join(",") + "]";
        }

        return "{" + Object.keys(value).sort().map(key =>
            JSON.stringify(key) + ":" + stableStringify(value[key])
        ).join(",") + "}";
    }

    function hash(text) {
        let h = 2166136261;

        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return (h >>> 0).toString(36);
    }

    function cleanId(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 70) || "unknown";
    }

    function getPlacedId(placed) {
        const db = getDB();

        if (typeof placed === "string" && db[placed]) {
            return placed;
        }

        if (!placed || typeof placed !== "object") return null;

        const candidates = [
            placed.id,
            placed.ingredientId,
            placed.ingredient_id,
            placed.elementId,
            placed.element_id,
            placed.ingredient
        ];

        for (const candidate of candidates) {
            if (typeof candidate === "string" && db[candidate]) {
                return candidate;
            }

            if (candidate && typeof candidate === "object" &&
                typeof candidate.id === "string" && db[candidate.id]) {
                return candidate.id;
            }
        }

        for (const [id, def] of Object.entries(db)) {
            if (def === placed) return id;
        }

        return null;
    }

    function getDefinition(id, placed) {
        return getDB()[id] || placed || {};
    }

    function getName(id, placed) {
        const def = getDefinition(id, placed);
        return String(def.name || id || "Ingrediente");
    }

    function toList(value) {
        if (Array.isArray(value)) {
            return value.map(item => {
                if (typeof item === "string") return item;
                if (item && typeof item === "object") {
                    return item.id || item.ingredientId || item.name || "";
                }
                return "";
            }).filter(Boolean).map(String).sort();
        }

        if (typeof value === "string" && value.trim()) {
            return [value.trim()];
        }

        return [];
    }

    function extractNumbers(object, prefix, output, seen, depth) {
        if (!object || typeof object !== "object" ||
            depth > 7 || seen.has(object)) return;

        seen.add(object);

        for (const [key, value] of Object.entries(object)) {
            const path = prefix ? prefix + "." + key : key;

            const isNutrient =
                /nutri|protein|carbohydrat|fat|fiber|fibre|vitamin|mineral|calor|energy|sugar|salt|water|lipid|starch|sodium|potassium|calcium|iron|magnesium|zinc/i.test(key);

            if (isNutrient &&
                (typeof value === "number" ||
                 (typeof value === "string" && value.trim() !== "" &&
                  Number.isFinite(Number(value))))) {
                output[path] = Number(value);
            } else if (value && typeof value === "object") {
                extractNumbers(value, path, output, seen, depth + 1);
            }
        }
    }

    function inspectIngredient(id, placed) {
        const def = getDefinition(id, placed);
        const nutrients = {};

        extractNumbers(def, "", nutrients, new Set(), 0);

        // SauceMaker: campi effettivi usati dall'addon.
        if (def.sauceNutrients && typeof def.sauceNutrients === "object") {
            extractNumbers(
                def.sauceNutrients,
                "sauceNutrients",
                nutrients,
                new Set(),
                0
            );
        }

        const sauceIngredients = toList(def.sauceIngredients);

        const graftParents = toList(
            def.graftedFrom ||
            def.graftParents ||
            def.innestoGenitori ||
            def.innestoParents ||
            def.parents ||
            def.parentIngredients
        );

        const smoked =
            def.smoked === true ||
            def.isSmoked === true ||
            def.smokerDone === true ||
            def.universalSmokerDone === true;

        const caramelized =
            def.caramelized === true ||
            def.caramellato === true ||
            def.isCaramelized === true ||
            def.caramelizerDone === true ||
            def.caramellatoreDone === true ||
            def.caramelizedFrom != null;

        const grafted =
            def.grafted === true ||
            def.graft === true ||
            def.innesto === true ||
            def.innestatoreDone === true ||
            graftParents.length > 0;

        const isSauce =
            def.sauceMaker === true ||
            sauceIngredients.length > 0 ||
            (def.sauceNutrients && typeof def.sauceNutrients === "object");

        return {
            id: String(id),
            name: String(def.name || id),
            smoked,
            caramelized,
            grafted,
            graftParents,
            isSauce,
            sauceIngredients,
            nutrients,
            color: def.color || null,
            shape: def.shape || null
        };
    }

    function calculateTraits(inputs, species, cellType, temperature) {
        const traits = [];
        const treatments = [];
        const nutrients = {};
        const sauces = [];
        const graftedInputs = [];

        let smokedCount = 0;
        let caramelizedCount = 0;
        let nutrientMagnitude = 0;

        for (const input of inputs) {
            if (input.smoked) {
                smokedCount++;
                treatments.push(input.id + ":smoked");
            }

            if (input.caramelized) {
                caramelizedCount++;
                treatments.push(input.id + ":caramelized");
            }

            if (input.grafted) {
                graftedInputs.push(input.id);
                treatments.push(input.id + ":grafted");
            }

            if (input.isSauce) sauces.push(input.id);

            // Nutrienti reali: niente valori nutrizionali inventati.
            for (const [key, value] of Object.entries(input.nutrients)) {
                nutrients[key] = (nutrients[key] || 0) + value;
                nutrientMagnitude += Math.abs(value);
            }
        }

        if (smokedCount) traits.push("resistenza_ambientale");
        if (caramelizedCount) traits.push("metabolismo_modificato");
        if (sauces.length) traits.push("adattamento_nutrizionale");
        if (graftedInputs.length) traits.push("ereditarieta_da_innesto");

        if (species === "microalgae") traits.push("fotosintesi_simulata");
        if (species === "yeast" || species === "mold") {
            traits.push("crescita_fungina");
        }

        if (cellType === "eukaryotic") {
            traits.push("organizzazione_eucariotica");
        } else if (cellType === "prokaryotic") {
            traits.push("organizzazione_procariotica");
        } else {
            traits.push("organizzazione_cellulare_ibrida");
        }

        if (temperature < 10) traits.push("adattamento_al_freddo");
        else if (temperature > 45) traits.push("adattamento_al_calore");
        else traits.push("temperatura_moderata");

        if (nutrientMagnitude > 0) {
            traits.push("profilo_nutrizionale_rilevato");
        }

        return {
            traits: [...new Set(traits)].sort(),
            treatments: treatments.sort(),
            sauces: sauces.sort(),
            graftedInputs: graftedInputs.sort(),
            nutrients,
            scores: {
                environmentalResistance: Math.min(
                    100,
                    20 + smokedCount * 18 +
                    (temperature < 10 || temperature > 45 ? 12 : 0)
                ),
                metabolism: Math.min(
                    100,
                    20 + caramelizedCount * 15 +
                    Math.min(30, Math.round(nutrientMagnitude))
                ),
                nutrientAdaptation: Math.min(
                    100,
                    15 + sauces.length * 20 +
                    Object.keys(nutrients).length * 2
                ),
                graftInheritance: Math.min(100, graftedInputs.length * 30)
            }
        };
    }

    function mixColor(inputs, fallback) {
        const colors = inputs
            .map(item => item.color)
            .filter(color => typeof color === "string" &&
                /^#[0-9a-f]{6}$/i.test(color));

        if (!colors.length) return fallback;

        const rgb = colors.map(color => [
            parseInt(color.slice(1, 3), 16),
            parseInt(color.slice(3, 5), 16),
            parseInt(color.slice(5, 7), 16)
        ]);

        const average = [0, 1, 2].map(index =>
            Math.round(rgb.reduce((sum, color) => sum + color[index], 0) / rgb.length)
        );

        return "#" + average.map(value =>
            value.toString(16).padStart(2, "0")
        ).join("");
    }

    function setStatus(message) {
        if (status) status.textContent = message;
        console.log("[Creator Microorganisms] " + message);
    }

    function makeButton(text, callback, primary) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.style.cssText =
            "padding:8px 10px;border:0;border-radius:7px;" +
            "margin:3px;cursor:pointer;color:white;background:" +
            (primary ? "#287c63" : "#51445f") + ";";
        button.addEventListener("click", callback);
        return button;
    }

    function makeFieldLabel(text, field) {
        const wrapper = document.createElement("label");
        wrapper.style.cssText =
            "display:block;margin:8px 0;color:#e8dff0;font-size:12px;";

        const caption = document.createElement("span");
        caption.textContent = text;
        caption.style.cssText = "display:block;margin-bottom:4px;";

        wrapper.append(caption, field);
        return wrapper;
    }

    function styleField(field) {
        field.style.cssText =
            "box-sizing:border-box;width:100%;padding:8px;" +
            "border:1px solid #6b5a79;border-radius:6px;" +
            "background:#17131d;color:white;";
        return field;
    }

    function refreshSelected() {
        if (!selectedBox) return;

        selectedBox.replaceChildren();

        if (!selected.length) {
            const empty = document.createElement("div");
            empty.textContent =
                "Seleziona due ingredienti sul piano di lavoro.";
            empty.style.color = "#c9bdd4";
            selectedBox.appendChild(empty);
            return;
        }

        selected.forEach((item, index) => {
            const line = document.createElement("div");
            const details = [];

            if (item.data.smoked) details.push("affumicato");
            if (item.data.caramelized) details.push("caramellato");
            if (item.data.grafted) details.push("innestato");
            if (item.data.isSauce) details.push("salsa");

            line.style.cssText =
                "padding:6px 8px;margin:4px 0;" +
                "background:#34283f;border-radius:5px;overflow-wrap:anywhere;";

            line.textContent = (index + 1) + ". " + item.data.name +
                (details.length ? " [" + details.join(", ") + "]" : "");

            selectedBox.appendChild(line);
        });
    }

    function createPanel() {
        if (panel) return;

        panel = document.createElement("aside");
        panel.id = PREFIX + "-panel";
        panel.style.cssText =
            "position:fixed;right:14px;bottom:70px;width:370px;" +
            "max-width:calc(100vw - 28px);max-height:78vh;overflow:auto;" +
            "z-index:999999;background:#211927;color:white;" +
            "border:2px solid #4a9c80;border-radius:12px;padding:13px;" +
            "font:14px Arial,sans-serif;box-shadow:0 5px 24px #0009;" +
            "display:none;";

        const title = document.createElement("h3");
        title.textContent = "🦠 Creator of Microorganisms";
        title.style.marginTop = "0";

        const intro = document.createElement("p");
        intro.textContent =
            "Seleziona due ingredienti. Salse, nutrienti e trattamenti " +
            "vengono letti dai metadati disponibili.";
        intro.style.cssText = "font-size:12px;color:#d8cddd;line-height:1.4;";

        speciesInput = styleField(document.createElement("select"));

        for (const [key, species] of Object.entries(SPECIES)) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = species.label;
            speciesInput.appendChild(option);
        }

        cellInput = styleField(document.createElement("select"));

        for (const [key, label] of Object.entries(CELL_TYPES)) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = label;
            cellInput.appendChild(option);
        }

        temperatureInput = styleField(document.createElement("input"));
        temperatureInput.type = "number";
        temperatureInput.min = "-20";
        temperatureInput.max = "150";
        temperatureInput.step = "0.5";
        temperatureInput.value = String(DEFAULT_TEMP);

        traitsInput = styleField(document.createElement("input"));
        traitsInput.placeholder =
            "Facoltativo: pigmentazione, motilità...";

        selectedBox = document.createElement("div");
        selectedBox.style.margin = "8px 0";

        resultBox = document.createElement("div");
        resultBox.style.cssText =
            "display:none;margin-top:8px;padding:8px;border-radius:6px;" +
            "background:#172b25;color:#d7f5e8;font-size:12px;" +
            "overflow-wrap:anywhere;";

        status = document.createElement("div");
        status.style.cssText =
            "margin:8px 0;color:#d8cddd;font-size:12px;";

        const selectedTitle = document.createElement("strong");
        selectedTitle.textContent = "Ingredienti selezionati";

        panel.append(
            title,
            intro,
            makeFieldLabel("Specie", speciesInput),
            makeFieldLabel("Tipo di cellula", cellInput),
            makeFieldLabel("Temperatura °C", temperatureInput),
            makeFieldLabel("Tratti aggiuntivi (separati da virgole)", traitsInput),
            selectedTitle,
            selectedBox,
            makeButton("Azzera selezione", () => {
                selected = [];
                refreshSelected();
                setStatus("Selezione azzerata.");
            }),
            makeButton("Crea microrganismo", createOrganism, true),
            makeButton("Chiudi", () => {
                panel.style.display = "none";
            }),
            status,
            resultBox
        );

        document.body.appendChild(panel);
        refreshSelected();
    }

    function buildOrganism() {
        if (selected.length !== 2) {
            throw new Error("Seleziona esattamente due ingredienti.");
        }

        const species = speciesInput.value;
        const cellType = cellInput.value;
        const temperature = Number(temperatureInput.value);

        if (!Number.isFinite(temperature) ||
            temperature < -20 || temperature > 150) {
            throw new Error("Temperatura valida: da -20 a 150 °C.");
        }

        // A+B e B+A sono la stessa combinazione.
        const parents = selected.map(item => item.data)
            .sort((a, b) => a.id.localeCompare(b.id));

        const biology = calculateTraits(
            parents, species, cellType, temperature
        );

        const customTraits = String(traitsInput.value || "")
            .split(",")
            .map(cleanId)
            .filter(value => value && value !== "unknown");

        biology.traits = [...new Set(
            biology.traits.concat(customTraits)
        )].sort();

        const signatureData = {
            version: VERSION,
            parents: parents.map(parent => ({
                id: parent.id,
                smoked: parent.smoked,
                caramelized: parent.caramelized,
                grafted: parent.grafted,
                graftParents: parent.graftParents.slice().sort(),
                isSauce: parent.isSauce,
                sauceIngredients: parent.sauceIngredients.slice().sort(),
                nutrients: parent.nutrients
            })),
            species,
            cellType,
            temperature,
            traits: biology.traits
        };

        const signature = stableStringify(signatureData);
        const id = "microorganism_" + cleanId(species) + "_" + hash(signature);
        const speciesInfo = SPECIES[species];

        const sauceIngredients = [...new Set(
            parents.flatMap(parent => parent.sauceIngredients)
        )].sort();

        const parentIds = parents.map(parent => parent.id);
        const parentNames = parents.map(parent => parent.name);

        const def = {
            id,
            name: id,
            color: mixColor(parents, speciesInfo.color),
            shape: speciesInfo.shape,
            spin: true,
            type: "microorganism",
            keywords: [
                "microorganism",
                "microrganismo",
                species,
                cellType,
                ...biology.traits,
                ...parentIds,
                ...sauceIngredients
            ].join(" "),
            description: "Microrganismo creato da: " + parentNames.join(" + "),
            microorganism: true,
            microorganismSpecies: species,
            cellType,
            temperatureC: temperature,
            traits: biology.traits,
            microorganismParents: parentIds,
            microorganismData: {
                version: VERSION,
                id,
                species,
                speciesLabel: speciesInfo.label,
                cellType,
                temperatureC: temperature,
                parents: parentIds,
                parentNames,
                traits: biology.traits,
                treatments: biology.treatments,
                sauces: biology.sauces,
                sauceIngredients,
                graftedInputs: biology.graftedInputs,
                nutrients: biology.nutrients,
                scores: biology.scores,
                signature
            }
        };

        return { id, def, signature };
    }

    function createOrganism() {
        try {
            const result = buildOrganism();
            const db = getDB();
            const register = getRegisterIngredient();

            if (!register) {
                throw new Error("addIngredient non è disponibile.");
            }

            let existing = db[result.id];

            if (!existing) {
                register(result.id, result.def);
                existing = db[result.id];
            }

            if (!existing) {
                throw new Error(
                    "Il gioco non ha registrato il microrganismo. " +
                    "Controlla la console."
                );
            }

            // Conserva il risultato già registrato per evitare duplicati.
            if (!existing.microorganismData) {
                Object.assign(existing, result.def);
            }

            const placed = selected[1] && selected[1].placed;

            // Aggiorna l'oggetto sul piano, se il gioco lo consente.
            if (placed && typeof placed === "object") {
                Object.assign(placed, {
                    id: result.id,
                    name: result.id,
                    color: existing.color || result.def.color,
                    shape: existing.shape || result.def.shape,
                    microorganism: true,
                    microorganismData:
                        existing.microorganismData || result.def.microorganismData,
                    keywords: existing.keywords || result.def.keywords
                });
            }

            resultBox.style.display = "block";
            resultBox.textContent =
                (db[result.id] ? "Microrganismo: " : "Creato: ") +
                result.id +
                " | Specie: " + SPECIES[speciesInput.value].label +
                " | Cellula: " + CELL_TYPES[cellInput.value] +
                " | Temperatura: " + temperatureInput.value + " °C" +
                " | Forma: " + (existing.shape || result.def.shape) +
                " | Tratti: " + result.def.microorganismData.traits.join(", ");

            setStatus("Risultato registrato: " + result.id);
            console.log(
                "[Creator of Microorganisms] Dati:",
                existing.microorganismData || result.def.microorganismData
            );

            selected = [];
            refreshSelected();

        } catch (error) {
            setStatus(error && error.message ? error.message : String(error));
            console.error("[Creator of Microorganisms]", error);
        }
    }

    const registerTool = getRegisterTool();
    const registerIngredient = getRegisterIngredient();

    if (typeof registerTool !== "function" ||
        typeof registerIngredient !== "function") {
        console.error(
            "[Creator of Microorganisms] API non disponibili. " +
            "Carica il file dopo gli script principali del gioco."
        );
        return;
    }

    registerTool("creator_of_microorganisms", {
        name: "Creator of Microorganisms",
        color: "#3c9c7c",
        shape: "microbe",
        spin: true,

        onSelect: function () {
            createPanel();
            panel.style.display = "block";
            setStatus("Clicca due ingredienti distinti sul piano.");
        },

        func: function (placed) {
            const id = getPlacedId(placed);

            if (!id) {
                setStatus("Ingrediente non riconosciuto dal database.");
                return;
            }

            if (selected.some(item => item.id === id)) {
                setStatus("Hai già selezionato " + getName(id, placed) + ".");
                return;
            }

            selected.push({
                id,
                placed: placed && typeof placed === "object" ? placed : null,
                data: inspectIngredient(id, placed)
            });

            createPanel();
            panel.style.display = "block";
            refreshSelected();

            if (selected.length < 2) {
                setStatus("Ingrediente 1/2: " + getName(id, placed));
            } else {
                setStatus(
                    "Due ingredienti selezionati. Imposta i parametri e crea."
                );
            }
        }
    });

    window.creatorOfMicroorganisms = {
        version: VERSION,
        species: Object.keys(SPECIES),
        inspectIngredient: function (id) {
            return inspectIngredient(id, null);
        },
        getSelected: function () {
            return selected.map(item => item.id);
        },
        clearSelection: function () {
            selected = [];
            refreshSelected();
        },
        preview: buildOrganism
    };

    function initialize() {
        createPanel();

        if (!document.getElementById(PREFIX + "-launcher")) {
            const launcher = makeButton(
                "🦠 Creator Microorganismi",
                function () {
                    createPanel();
                    panel.style.display =
                        panel.style.display === "none" ? "block" : "none";
                    refreshSelected();
                },
                true
            );

            launcher.id = PREFIX + "-launcher";
            launcher.style.cssText +=
                "position:fixed;right:14px;bottom:14px;" +
                "z-index:999999;padding:10px;border:2px solid #a6e2ce;";

            document.body.appendChild(launcher);
        }

        console.log(
            "[Creator of Microorganisms] Caricato. Versione " + VERSION
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();
