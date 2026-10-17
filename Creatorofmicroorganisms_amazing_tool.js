
/*
 * creator_of_microorganisms.js
 * Versione 6.0
 *
 * - Creazione di microrganismi
 * - Batteri, lieviti, muffe, archei, microalghe e ibridi
 * - Forme: microbe, fungus, algae, double_helix, embryo
 * - Uova e schiusa manuale
 * - Ereditarietà dei tratti
 * - Lettura flessibile dei metadati degli ingredienti
 * - Compatibilità tentata con SauceMaker, caramellatore,
 *   smoker, nutrients, innestatore e restoration simulator
 *
 * Nota: i nomi dei campi dei mod esterni possono variare.
 */

(function () {
    "use strict";

    if (
        typeof addIngredient !== "function" ||
        typeof addTool !== "function"
    ) {
        console.error(
            "[Microorganisms] API addIngredient/addTool non disponibili."
        );
        return;
    }

    const VERSION = "6.0";
    const PREFIX = "microorganism_";
    const registry = Object.create(null);

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
        const input = Array.isArray(values) ? values : [];

        return [...new Set(
            input
                .filter(v => v != null && v !== "")
                .map(v => String(v).trim())
                .filter(Boolean)
        )];
    }

    function getId(item) {
        if (!item) return "";

        if (typeof item === "string") return item.trim();

        return String(
            item.name ||
            item.id ||
            item.element ||
            item.ingredient ||
            item.key ||
            ""
        ).trim();
    }

    function lookupIngredient(id) {
        if (!id) return null;

        if (registry[id]) {
            return {
                id: id,
                name: id,
                type: "life",
                microorganism: true,
                microorganismData: registry[id]
            };
        }

        const sourceNames = [
            "ingredients",
            "ingredientData",
            "ingredientDatabase",
            "ingredientRegistry"
        ];

        for (const sourceName of sourceNames) {
            let source;

            try {
                source = globalThis[sourceName];
            } catch (_) {
                source = null;
            }

            if (!source) continue;

            if (
                !Array.isArray(source) &&
                typeof source === "object" &&
                source[id]
            ) {
                return source[id];
            }

            if (Array.isArray(source)) {
                const found = source.find(item =>
                    item &&
                    (
                        item.id === id ||
                        item.name === id ||
                        item.element === id
                    )
                );

                if (found) return found;
            }
        }

        return null;
    }

    function getData(item) {
        if (!item) return {};

        if (
            typeof item === "object" &&
            item.microorganismData &&
            typeof item.microorganismData === "object"
        ) {
            return item.microorganismData;
        }

        const id = getId(item);
        const definition = lookupIngredient(id);

        if (!definition) return {};

        if (
            definition.microorganismData &&
            typeof definition.microorganismData === "object"
        ) {
            return definition.microorganismData;
        }

        return definition;
    }

    function readArray(...values) {
        for (const value of values) {
            if (Array.isArray(value)) return unique(value);

            if (typeof value === "string" && value.trim()) {
                return unique(value.split(","));
            }
        }

        return [];
    }

    function readFlag(...values) {
        return values.some(value =>
            value === true ||
            value === 1 ||
            value === "true"
        );
    }

    function getMetadata(item) {
        if (!item) {
            return {
                sauceIngredients: [],
                sauceNutrients: [],
                nutrients: [],
                graftTraits: [],
                smoked: false,
                caramelized: false,
                caramelizedFrom: "",
                restorationTraits: []
            };
        }

        const id = getId(item);
        const definition = lookupIngredient(id) || {};
        const data = getData(item);

        return {
            sauceIngredients: readArray(
                item.sauceIngredients,
                definition.sauceIngredients,
                data.sauceIngredients
            ),

            sauceNutrients: readArray(
                item.sauceNutrients,
                definition.sauceNutrients,
                data.sauceNutrients
            ),

            nutrients: readArray(
                item.nutrients,
                definition.nutrients,
                data.nutrients,
                item.nutrientTraits,
                data.nutrientTraits
            ),

            graftTraits: readArray(
                item.graftTraits,
                definition.graftTraits,
                data.graftTraits,
                item.inheritedTraits,
                data.inheritedTraits
            ),

            restorationTraits: readArray(
                item.restorationTraits,
                definition.restorationTraits,
                data.restorationTraits,
                item.restoredTraits,
                data.restoredTraits
            ),

            smoked: readFlag(
                item.smoked,
                definition.smoked,
                data.smoked,
                item.isSmoked,
                data.isSmoked
            ),

            caramelized: readFlag(
                item.caramelized,
                definition.caramelized,
                data.caramelized,
                item.isCaramelized,
                data.isCaramelized
            ),

            caramelizedFrom:
                item.caramelizedFrom ||
                definition.caramelizedFrom ||
                data.caramelizedFrom ||
                ""
        };
    }

    function ask(message, fallback) {
        if (typeof prompt !== "function") return fallback;

        const answer = prompt(message, fallback);

        return answer == null
            ? fallback
            : answer.trim();
    }

    function chooseSpecies() {
        const keys = Object.keys(SPECIES);

        const menu = keys.map((key, index) =>
            (index + 1) + ". " +
            SPECIES[key].label + " (" + key + ")"
        ).join("\n");

        const answer = ask(
            "Scegli la specie:\n" + menu +
            "\nInserisci il numero o il nome.",
            "1"
        );

        const index = Number(answer) - 1;

        if (
            Number.isInteger(index) &&
            index >= 0 &&
            index < keys.length
        ) {
            return keys[index];
        }

        const normalized = clean(answer);

        return SPECIES[normalized]
            ? normalized
            : "bacterium";
    }

    function makeDefinition(data, color, shape) {
        return {
            type: "life",
            color: color,
            shape: shape,
            microorganism: true,
            microorganismData: data
        };
    }

    function registerIngredient(id, definition) {
        if (lookupIngredient(id)) return false;

        try {
            addIngredient(id, definition);

            registry[id] = definition.microorganismData || {};

            return true;
        } catch (error) {
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
        const info = SPECIES[species];

        const defaultCell = (
            species === "yeast" ||
            species === "mold" ||
            species === "microalgae"
        ) ? "eucariote" : "procariote";

        const cellAnswer = ask(
            "Tipo cellulare:\n" + CELL_TYPES.join(", "),
            defaultCell
        );

        const cellType = CELL_TYPES.includes(clean(cellAnswer))
            ? clean(cellAnswer)
            : defaultCell;

        const temperatureAnswer = ask(
            "Temperatura ottimale in gradi Celsius:",
            "37"
        );

        let temperature = Number(temperatureAnswer);

        if (!Number.isFinite(temperature)) temperature = 37;

        temperature = Math.max(-273, Math.min(1000, temperature));

        const traitAnswer = ask(
            "Tratti aggiuntivi separati da virgole:",
            info.traits.join(", ")
        );

        const customTraits = unique(
            traitAnswer.split(",").map(clean)
        );

        const inheritedTraits = unique([
            ...(dataA.traits || []),
            ...(dataB.traits || []),
            ...(dataA.inheritedTraits || []),
            ...(dataB.inheritedTraits || []),
            ...metaA.graftTraits,
            ...metaB.graftTraits,
            ...metaA.restorationTraits,
            ...metaB.restorationTraits
        ].map(clean));

        const traits = unique([
            ...info.traits,
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

        const sauceNutrients = unique([
            ...metaA.sauceNutrients,
            ...metaB.sauceNutrients
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
            ]),
            restorationTraits: unique([
                ...metaA.restorationTraits,
                ...metaB.restorationTraits
            ])
        };

        const parents = [idA, idB].sort();

        const signature = JSON.stringify({
            version: VERSION,
            parents: parents,
            species: species,
            cellType: cellType,
            temperature: temperature,
            traits: traits.slice().sort(),
            nutrients: nutrients.slice().sort(),
            sauceIngredients: sauceIngredients.slice().sort(),
            sauceNutrients: sauceNutrients.slice().sort(),
            treatments: treatments
        });

        const id = PREFIX + species + "_" + hash(signature);

        const generation = Math.max(
            Number(dataA.generation) || 0,
            Number(dataB.generation) || 0
        ) + 1;

        const data = {
            version: VERSION,
            species: species,
            cellType: cellType,
            temperature: temperature,
            traits: traits,
            inheritedTraits: inheritedTraits,
            nutrients: nutrients,
            sauceIngredients: sauceIngredients,
            sauceNutrients: sauceNutrients,
            smoked: treatments.smoked,
            caramelized: treatments.caramelized,
            caramelizedFrom: treatments.caramelizedFrom,
            graftTraits: treatments.graftTraits,
            restorationTraits: treatments.restorationTraits,
            parents: parents,
            generation: generation,
            egg: false,
            signature: signature
        };

        return {
            id: id,
            signature: signature,
            color: info.color,
            shape: info.shape,
            data: data,
            definition: makeDefinition(
                data,
                info.color,
                info.shape
            )
        };
    }

    function makeEgg(organism) {
        const eggId = "microbe_egg_" +
            hash(organism.signature || organism.id);

        const eggData = {
            ...organism.data,
            traits: [...organism.data.traits],
            inheritedTraits: [...organism.data.traits],
            nutrients: [...organism.data.nutrients],
            sauceIngredients: [...organism.data.sauceIngredients],
            sauceNutrients: [...organism.data.sauceNutrients],
            graftTraits: [...organism.data.graftTraits],
            restorationTraits: [
                ...organism.data.restorationTraits
            ],
            parents: [organism.id],
            generation: organism.data.generation + 1,
            egg: true,
            parentMicroorganism: organism.id
        };

        const definition = {
            type: "life",
            shape: "embryo",
            color: organism.color,
            microorganism: true,
            microorganismEgg: true,
            microorganismData: eggData
        };

        if (!registerIngredient(eggId, definition)) {
            console.info(
                "[Microorganisms] Uovo già registrato:",
                eggId
            );
        }

        return eggId;
    }

    function createFromPlaced(placed) {
        if (!placed) {
            alert("Seleziona il primo ingrediente sul piano.");
            return;
        }

        const firstId = getId(placed);

        if (!firstId) {
            alert("Non riesco a leggere l'ID del primo ingrediente.");
            return;
        }

        const secondId = ask(
            "Inserisci l'ID esatto del secondo ingrediente:",
            "water"
        );

        if (!secondId) return;

        const second = lookupIngredient(secondId);

        if (!second) {
            alert(
                "Ingrediente non trovato: " + secondId +
                "\nControlla l'ID nel database del gioco."
            );
            return;
        }

        const organism = buildOrganism(placed, second);

        if (!registerIngredient(
            organism.id,
            organism.definition
        )) {
            alert(
                "Microrganismo già registrato oppure errore.\nID: " +
                organism.id
            );
            return;
        }

        const eggId = makeEgg(organism);

        alert(
            "MICRORGANISMO CREATO\n\n" +
            "ID: " + organism.id + "\n" +
            "Specie: " + organism.data.species + "\n" +
            "Genitori: " + firstId + " + " + secondId + "\n" +
            "Tratti: " + organism.data.traits.join(", ") + "\n" +
            "Nutrienti: " + organism.data.nutrients.join(", ") + "\n" +
            "Affumicato: " + organism.data.smoked + "\n" +
            "Caramellizzato: " + organism.data.caramelized + "\n" +
            "Generazione: " + organism.data.generation + "\n\n" +
            "Uovo: " + eggId
        );
    }

    function hatchEgg(placed) {
        if (!placed) {
            alert("Seleziona un uovo sul piano.");
            return;
        }

        const eggId = getId(placed);
        const data = getData(placed);

        if (!(
            placed.microorganismEgg ||
            data.egg ||
            eggId.indexOf("microbe_egg_") === 0
        )) {
            alert("L'ingrediente selezionato non è riconosciuto come uovo.");
            return;
        }

        const species = SPECIES[data.species]
            ? data.species
            : "bacterium";

        const signature = JSON.stringify({
            egg: eggId,
            species: species,
            traits: unique(data.traits || []).sort(),
            generation: Number(data.generation) || 1
        });

        const id = PREFIX + species + "_hatched_" + hash(signature);

        const newData = {
            ...data,
            species: species,
            egg: false,
            hatchedFrom: eggId,
            traits: unique([
                ...(data.traits || []),
                ...(data.inheritedTraits || [])
            ]),
            inheritedTraits: unique([
                ...(data.traits || []),
                ...(data.inheritedTraits || [])
            ]),
            parents: unique(data.parents || [
                data.parentMicroorganism || eggId
            ]),
            generation: Number(data.generation) || 1,
            signature: signature
        };

        const info = SPECIES[species];

        const definition = makeDefinition(
            newData,
            info.color,
            info.shape
        );

        if (!registerIngredient(id, definition)) {
            alert("Organismo già schiuso oppure errore di registrazione.");
            return;
        }

        alert(
            "UOVO SCHIUSO\n\n" +
            "Nuovo microrganismo: " + id + "\n" +
            "Specie: " + species + "\n" +
            "Tratti ereditati: " + newData.traits.join(", ") + "\n" +
            "Generazione: " + newData.generation
        );
    }

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
        if (lookupIngredient(id)) return;

        try {
            addIngredient(id, baseForms[id]);
        } catch (error) {
            console.warn(
                "[Microorganisms] Forma non registrata:",
                id,
                error
            );
        }
    });

    try {
        addTool("creator_of_microorganisms", {
            func: function (placed) {
                try {
                    createFromPlaced(placed);
                } catch (error) {
                    console.error(
                        "[Microorganisms] Creazione fallita:",
                        error
                    );

                    alert(
                        "Errore durante la creazione: " +
                        (error.message || error)
                    );
                }
            },
            shape: "microbe"
        });
    } catch (error) {
        console.error(
            "[Microorganisms] Impossibile registrare il creator:",
            error
        );
    }

    try {
        addTool("hatch_microorganism_egg", {
            func: function (placed) {
                try {
                    hatchEgg(placed);
                } catch (error) {
                    console.error(
                        "[Microorganisms] Schiusa fallita:",
                        error
                    );

                    alert(
                        "Errore durante la schiusa: " +
                        (error.message || error)
                    );
                }
            },
            shape: "embryo"
        });
    } catch (error) {
        console.error(
            "[Microorganisms] Impossibile registrare lo strumento di schiusa:",
            error
        );
    }

    console.log(
        "[Microorganisms] Creator v" + VERSION +
        " caricato. Specie: " +
        Object.keys(SPECIES).join(", ")
    );
})();
