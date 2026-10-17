
/*
 * creator_of_microorganisms.js
 * Versione 5.0
 *
 * Include:
 * - Creazione di microrganismi
 * - Batteri, lieviti, muffe, archei, microalghe e ibridi
 * - Forme microbe, fungus, algae, double_helix, embryo
 * - Uova e schiusa manuale
 * - Ereditarietà dei tratti
 * - Metadati per nutrienti, salse, affumicatura,
 *   caramellizzazione e innesti
 * - ID deterministici per evitare duplicati
 *
 * Compatibilità prevista con le API standard di Infinite Chef.
 * Le integrazioni con altri mod richiedono che questi espongano
 * metadati compatibili.
 */

(function () {
    "use strict";

    if (typeof addIngredient !== "function" ||
        typeof addTool !== "function") {
        console.error(
            "[Microorganisms] addIngredient/addTool non disponibili."
        );
        return;
    }

    const PREFIX = "microorganism_";
    const VERSION = "5.0";

    const SPECIES = {
        bacterium: {
            label: "Batterio",
            color: "#73C77A",
            shape: "microbe",
            traits: ["divisione_binaria", "metabolismo"]
        },
        yeast: {
            label: "Lievito",
            color: "#E4C878",
            shape: "fungus",
            traits: ["fermentazione", "crescita"]
        },
        mold: {
            label: "Muffa",
            color: "#9C83C8",
            shape: "fungus",
            traits: ["ife", "sporulazione"]
        },
        archaea: {
            label: "Archeo",
            color: "#D98B54",
            shape: "microbe",
            traits: ["adattamento", "metabolismo_estremo"]
        },
        microalgae: {
            label: "Microalga",
            color: "#43B978",
            shape: "algae",
            traits: ["fotosintesi", "clorofilla"]
        },
        hybrid: {
            label: "Ibrido",
            color: "#59B7CB",
            shape: "double_helix",
            traits: ["ricombinazione", "adattamento"]
        }
    };

    const CELL_TYPES = [
        "procariote",
        "eucariote",
        "unicellulare",
        "multicellulare"
    ];

    const SHAPES = [
        "microbe",
        "fungus",
        "algae",
        "double_helix",
        "embryo"
    ];

    const registry = Object.create(null);

    function clean(value) {
        return String(value == null ? "" : value)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 70);
    }

    function hash(value) {
        const text = String(value);
        let h1 = 0x811c9dc5;
        let h2 = 0x45d9f3b;

        for (let i = 0; i < text.length; i++) {
            h1 ^= text.charCodeAt(i);
            h1 = Math.imul(h1, 0x01000193);
            h2 ^= text.charCodeAt(i);
            h2 = Math.imul(h2, 0x5bd1e995);
        }

        return (
            (h1 >>> 0).toString(36) +
            (h2 >>> 0).toString(36)
        );
    }

    function unique(values) {
        return [...new Set(
            values
                .filter(v => v != null && v !== "")
                .map(v => String(v).trim())
                .filter(Boolean)
        )];
    }

    function getId(placed) {
        if (!placed) return "";

        return String(
            placed.name ||
            placed.id ||
            placed.element ||
            placed.ingredient ||
            ""
        ).trim();
    }

    function getData(placed) {
        if (!placed) return {};

        const direct = placed.microorganismData;
        if (direct && typeof direct === "object") {
            return direct;
        }

        const id = getId(placed);
        return registry[id] || {};
    }

    function getMetadata(placed) {
        if (!placed) return {};

        const data = getData(placed);

        return {
            sauceIngredients: unique(
                placed.sauceIngredients ||
                data.sauceIngredients || []
            ),
            sauceNutrients: unique(
                placed.sauceNutrients ||
                data.sauceNutrients || []
            ),
            smoked: !!(placed.smoked || data.smoked),
            caramelized: !!(
                placed.caramelized || data.caramelized
            ),
            caramelizedFrom:
                placed.caramelizedFrom ||
                data.caramelizedFrom ||
                "",
            graftTraits: unique(
                placed.graftTraits ||
                data.graftTraits || []
            ),
            nutrients: unique(
                placed.nutrients ||
                data.nutrients || []
            )
        };
    }

    function ask(message, fallback) {
        if (typeof prompt !== "function") return fallback;

        const answer = prompt(message, fallback);
        return answer == null ? fallback : answer.trim();
    }

    function chooseSpecies() {
        const menu = Object.keys(SPECIES)
            .map((key, i) =>
                (i + 1) + ". " + SPECIES[key].label +
                " (" + key + ")"
            )
            .join("\n");

        const answer = ask(
            "Scegli la specie:\n" + menu +
            "\nScrivi il nome o il numero.",
            "bacterium"
        );

        const keys = Object.keys(SPECIES);
        const index = Number(answer) - 1;

        if (Number.isInteger(index) &&
            index >= 0 && index < keys.length) {
            return keys[index];
        }

        const normalized = clean(answer);

        return SPECIES[normalized]
            ? normalized
            : "bacterium";
    }

    function makeDefinition(id, data, color, shape) {
        return {
            color: color,
            shape: shape,
            type: "life",
            microorganism: true,
            microorganismData: data
        };
    }

    function registerIngredient(id, definition) {
        if (registry[id]) return false;

        registry[id] = definition.microorganismData;

        try {
            addIngredient(id, definition);
            return true;
        } catch (error) {
            delete registry[id];
            console.error(
                "[Microorganisms] Errore registrando " + id,
                error
            );
            return false;
        }
    }

    function buildOrganism(parentA, parentB) {
        const idA = getId(parentA) || "unknown_parent_a";
        const idB = getId(parentB) || "unknown_parent_b";

        const dataA = getData(parentA);
        const dataB = getData(parentB);
        const metaA = getMetadata(parentA);
        const metaB = getMetadata(parentB);

        const species = chooseSpecies();
        const speciesInfo = SPECIES[species];

        const defaultCell = species === "yeast" ||
            species === "mold" ||
            species === "microalgae"
            ? "eucariote"
            : "procariote";

        const cellType = ask(
            "Tipo cellulare:\n" + CELL_TYPES.join(", "),
            defaultCell
        );

        const temperatureText = ask(
            "Temperatura ottimale in °C:",
            "37"
        );

        let temperature = Number(temperatureText);
        if (!Number.isFinite(temperature)) temperature = 37;

        temperature = Math.max(-273, Math.min(1000, temperature));

        const traitText = ask(
            "Tratti personalizzati separati da virgole:",
            speciesInfo.traits.join(", ")
        );

        const customTraits = unique(
            traitText.split(",").map(clean)
        );

        const inheritedTraits = unique([
            ...(dataA.traits || []),
            ...(dataB.traits || []),
            ...(dataA.inheritedTraits || []),
            ...(dataB.inheritedTraits || []),
            ...metaA.graftTraits,
            ...metaB.graftTraits
        ].map(clean));

        const traits = unique([
            ...speciesInfo.traits,
            ...customTraits,
            ...inheritedTraits
        ]);

        const nutrients = unique([
            ...metaA.nutrients,
            ...metaB.nutrients,
            ...metaA.sauceNutrients,
            ...metaB.sauceNutrients
        ]);

        const sauceIngredients = unique([
            ...metaA.sauceIngredients,
            ...metaB.sauceIngredients
        ]);

        const treatments = {
            smoked: metaA.smoked || metaB.smoked,
            caramelized:
                metaA.caramelized || metaB.caramelized,
            caramelizedFrom: unique([
                metaA.caramelizedFrom,
                metaB.caramelizedFrom
            ]),
            graftTraits: unique([
                ...metaA.graftTraits,
                ...metaB.graftTraits
            ])
        };

        const parents = [idA, idB].sort();

        const signature = JSON.stringify({
            version: VERSION,
            parents: parents,
            species: species,
            cellType: clean(cellType),
            temperature: temperature,
            traits: traits.slice().sort(),
            nutrients: nutrients.slice().sort(),
            sauceIngredients: sauceIngredients.slice().sort(),
            treatments: treatments,
            inherited: [
                dataA.parentMicroorganism || "",
                dataB.parentMicroorganism || "",
                dataA.egg ? "eggA" : "",
                dataB.egg ? "eggB" : ""
            ].sort()
        });

        const id = PREFIX + species + "_" + hash(signature);

        const color = speciesInfo.color;
        const shape = speciesInfo.shape;

        const generation = Math.max(
            Number(dataA.generation) || 0,
            Number(dataB.generation) || 0
        ) + 1;

        const data = {
            version: VERSION,
            species: species,
            cellType: clean(cellType) || defaultCell,
            temperature: temperature,
            traits: traits,
            inheritedTraits: inheritedTraits,
            nutrients: nutrients,
            sauceIngredients: sauceIngredients,
            sauceNutrients: unique([
                ...metaA.sauceNutrients,
                ...metaB.sauceNutrients
            ]),
            smoked: treatments.smoked,
            caramelized: treatments.caramelized,
            caramelizedFrom: treatments.caramelizedFrom,
            graftTraits: treatments.graftTraits,
            parents: parents,
            generation: generation,
            egg: false,
            signature: signature
        };

        return {
            id: id,
            signature: signature,
            color: color,
            shape: shape,
            data: data,
            definition: makeDefinition(id, data, color, shape)
        };
    }

    function makeEgg(organism) {
        const eggId = "microbe_egg_" +
            hash(organism.signature || organism.id);

        const eggData = {
            version: VERSION,
            species: organism.data.species,
            cellType: organism.data.cellType,
            temperature: organism.data.temperature,
            traits: [...organism.data.traits],
            inheritedTraits: [...organism.data.traits],
            nutrients: [...organism.data.nutrients],
            sauceIngredients: [...organism.data.sauceIngredients],
            sauceNutrients: [...organism.data.sauceNutrients],
            smoked: organism.data.smoked,
            caramelized: organism.data.caramelized,
            caramelizedFrom: [
                ...organism.data.caramelizedFrom
            ],
            graftTraits: [...organism.data.graftTraits],
            parents: [organism.id],
            generation: organism.data.generation + 1,
            egg: true,
            parentMicroorganism: organism.id,
            signature: organism.signature
        };

        const eggDefinition = {
            type: "life",
            shape: "embryo",
            color: organism.color,
            microorganism: true,
            microorganismEgg: true,
            microorganismData: eggData
        };

        registerIngredient(eggId, eggDefinition);
        return eggId;
    }

    function createFromPlaced(placed) {
        if (!placed) {
            alert("Seleziona un ingrediente sul piano.");
            return;
        }

        const firstId = getId(placed);

        const secondId = ask(
            "Inserisci l'ID del secondo ingrediente/genitore:",
            "water"
        );

        if (!secondId) return;

        const second = {
            name: secondId,
            id: secondId
        };

        const organism = buildOrganism(placed, second);
        const created = registerIngredient(
            organism.id,
            organism.definition
        );

        if (!created) {
            alert(
                "Microrganismo già registrato oppure errore. ID: " +
                organism.id
            );
            return;
        }

        const eggId = makeEgg(organism);

        alert(
            "Microrganismo creato!\n\n" +
            "ID: " + organism.id + "\n" +
            "Specie: " + organism.data.species + "\n" +
            "Genitori: " + firstId + " + " + secondId + "\n" +
            "Tratti: " + organism.data.traits.join(", ") + "\n" +
            "Generazione: " + organism.data.generation + "\n\n" +
            "Uovo registrato: " + eggId
        );
    }

    function hatchEgg(placed) {
        if (!placed) {
            alert("Seleziona un uovo sul piano.");
            return;
        }

        const eggId = getId(placed);
        const data = getData(placed);

        if (!(placed.microorganismEgg || data.egg ||
              eggId.indexOf("microbe_egg_") === 0)) {
            alert("L'ingrediente selezionato non sembra un uovo.");
            return;
        }

        const species = SPECIES[data.species]
            ? data.species
            : "bacterium";

        const signature = JSON.stringify({
            egg: eggId,
            species: species,
            traits: unique(data.traits || []).sort(),
            generation: data.generation || 1
        });

        const id = PREFIX + species + "_hatched_" + hash(signature);

        const newData = {
            ...data,
            species: species,
            egg: false,
            hatchedFrom: eggId,
            parents: unique(data.parents || [
                data.parentMicroorganism || eggId
            ]),
            traits: unique([
                ...(data.traits || []),
                ...(data.inheritedTraits || [])
            ]),
            inheritedTraits: unique([
                ...(data.traits || []),
                ...(data.inheritedTraits || [])
            ]),
            generation: Number(data.generation) || 1,
            signature: signature
        };

        const definition = makeDefinition(
            id,
            newData,
            SPECIES[species].color,
            SPECIES[species].shape
        );

        if (!registerIngredient(id, definition)) {
            alert("Organismo già schiuso o errore di registrazione.");
            return;
        }

        alert(
            "Uovo schiuso!\n\n" +
            "Nuovo microrganismo: " + id + "\n" +
            "Specie: " + species + "\n" +
            "Tratti ereditati: " + newData.traits.join(", ")
        );
    }

    // Ingredienti di base per rendere accessibili le forme.
    // Sono definiti soltanto se il gioco non li ha già registrati.
    const baseForms = {
        microorganism_cell: {
            type: "life",
            shape: "microbe",
            color: "#73C77A"
        },
        microorganism_fungus: {
            type: "life",
            shape: "fungus",
            color: "#9C83C8"
        },
        microorganism_algae: {
            type: "life",
            shape: "algae",
            color: "#43B978"
        },
        microorganism_helix: {
            type: "life",
            shape: "double_helix",
            color: "#59B7CB"
        },
        microorganism_embryo: {
            type: "life",
            shape: "embryo",
            color: "#E4C878"
        }
    };

    Object.keys(baseForms).forEach(function (id) {
        try {
            addIngredient(id, baseForms[id]);
        } catch (error) {
            // L'ingrediente potrebbe esistere già.
        }
    });

    // Strumento principale: usa l'ingrediente selezionato
    // come primo genitore e chiede il secondo tramite ID.
    addTool("creator_of_microorganisms", {
        func: function (placed) {
            try {
                createFromPlaced(placed);
            } catch (error) {
                console.error("[Microorganisms] Creazione fallita", error);
                alert("Errore nella creazione: " + error.message);
            }
        },
        shape: "microbe"
    });

    // Strumento per schiudere un uovo selezionato.
    addTool("hatch_microorganism_egg", {
        func: function (placed) {
            try {
                hatchEgg(placed);
            } catch (error) {
                console.error("[Microorganisms] Schiusa fallita", error);
                alert("Errore nella schiusa: " + error.message);
            }
        },
        shape: "embryo"
    });

    console.log(
        "[Microorganisms] Creator v" + VERSION +
        " caricato. Specie: " + Object.keys(SPECIES).join(", ")
    );
})();
