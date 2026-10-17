
/*
 * creator_of_microorganisms.js
 * Infinite Chef — Microorganism Creator
 *
 * Compatibilità prevista:
 * - saucemaker4ings_amazing_tool.js
 * - caramelizer_amazing_tool.js
 * - restoration_sim.js
 * - smoker_tool.js
 * - nutrients.js
 * - innestatore.js
 *
 * Nota: API delle mod esterne non verificate.
 */

(function () {
    "use strict";

    if (
        typeof addIngredient !== "function" ||
        typeof addRecipe !== "function" ||
        typeof addTool !== "function"
    ) {
        console.error(
            "[Microorganism Creator] API Infinite Chef mancanti."
        );
        return;
    }

    const TOOL_ID = "creator_of_microorganisms";

    const SPECIES = {
        batterio: {
            label: "Batterio",
            cell: "procariote",
            growth: 3,
            reproduction: 3,
            resistance: 1,
            color: "#a8d66d"
        },
        lievito: {
            label: "Lievito",
            cell: "eucariote",
            growth: 3,
            reproduction: 2,
            nutrition: 3,
            color: "#e8c56e"
        },
        muffa: {
            label: "Muffa",
            cell: "eucariote",
            growth: 2,
            mutation: 3,
            reproduction: 2,
            color: "#a98bd4"
        },
        archeo: {
            label: "Archeo",
            cell: "procariote",
            resistance: 4,
            growth: 1,
            reproduction: 2,
            color: "#e58d63"
        },
        microalga: {
            label: "Microalga",
            cell: "eucariote",
            nutrition: 3,
            vitality: 3,
            reproduction: 2,
            color: "#53b99a"
        }
    };

    const TRAITS = {
        growth: { label: "Crescita", bonus: 3 },
        nutrition: { label: "Nutrimento", bonus: 2 },
        resistance: { label: "Resistenza termica", bonus: 2 },
        reproduction: { label: "Riproduzione", bonus: 3 },
        mutation: { label: "Mutazione", bonus: 2 },
        vitality: { label: "Vitalità", bonus: 2 }
    };

    const ROLES = {
        base: {
            growth: 2,
            nutrition: 2
        },
        innesto: {
            mutation: 2,
            growth: 1
        }
    };

    const TREATMENTS = {
        normale: {
            nutrition: 1
        },
        affumicato: {
            resistance: 2,
            vitality: 1
        },
        caramellato: {
            nutrition: 3,
            growth: 1
        }
    };

    const state = {
        lastResult: null
    };

    // Registro di sessione: contiene i metadati generati da questa mod.
    const registry = Object.create(null);

    // Evita di presumere che le altre mod espongano API globali.
    const EXTERNAL_MODS = [
        "saucemaker4ings_amazing_tool.js",
        "caramelizer_amazing_tool.js",
        "restoration_sim.js",
        "smoker_tool.js",
        "nutrients.js",
        "innestatore.js"
    ];

    function slug(value) {
        return String(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 60);
    }

    function hash(value) {
        let result = 2166136261;

        for (let i = 0; i < value.length; i++) {
            result ^= value.charCodeAt(i);
            result = Math.imul(result, 16777619);
        }

        return result >>> 0;
    }

    function ask(message, initial) {
        const result = prompt(message, initial || "");
        return result === null ? null : result.trim();
    }

    function choose(message, options, initial) {
        const text = options.map(function (item, index) {
            return (index + 1) + ". " + item.label;
        }).join("\n");

        const answer = ask(
            message + "\n\n" + text + "\n\nNumero:",
            String(initial || 1)
        );

        if (answer === null) return null;

        const index = Number(answer) - 1;

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= options.length
        ) {
            alert("Scelta non valida.");
            return null;
        }

        return options[index].id;
    }

    function addScores(target, source) {
        Object.keys(source).forEach(function (key) {
            target[key] = (target[key] || 0) + source[key];
        });
    }

    function createIngredient(id, data) {
        try {
            addIngredient(id, data);
            return true;
        } catch (error) {
            console.error(
                "[Microorganism Creator] Errore ingrediente:",
                id,
                error
            );
            return false;
        }
    }

    function createRecipe(input, output) {
        try {
            addRecipe(input, output);
            return true;
        } catch (error) {
            console.error(
                "[Microorganism Creator] Errore ricetta:",
                input,
                output,
                error
            );
            return false;
        }
    }

    function selectIngredient(number) {
        const name = ask(
            "Ingrediente " + number +
            ": inserisci il nome o l'ID dell'ingrediente esistente.",
            number === 1 ? "bread" : "sugar"
        );

        if (!name) return null;

        const role = choose(
            "Ruolo dell'ingrediente " + number,
            [
                { id: "base", label: "Base" },
                { id: "innesto", label: "Innesto" }
            ],
            number === 1 ? 1 : 2
        );

        if (!role) return null;

        const treatment = choose(
            "Trattamento dell'ingrediente " + number,
            [
                { id: "normale", label: "Normale" },
                { id: "affumicato", label: "Affumicato" },
                { id: "caramellato", label: "Caramellato" }
            ],
            1
        );

        if (!treatment) return null;

        return {
            name: name,
            id: slug(name),
            role: role,
            treatment: treatment
        };
    }

    function selectTraits() {
        const keys = Object.keys(TRAITS);

        const answer = ask(
            "Scegli le proprietà benefiche separandole con virgole:\n" +
            keys.map(function (key) {
                return key + " = " + TRAITS[key].label;
            }).join("\n"),
            "growth,nutrition,reproduction"
        );

        if (answer === null) return null;

        const selected = answer.split(",")
            .map(function (item) {
                return item.trim().toLowerCase();
            })
            .filter(function (item, index, array) {
                return TRAITS[item] && array.indexOf(item) === index;
            });

        if (!selected.length) {
            alert("Devi scegliere almeno una proprietà valida.");
            return null;
        }

        return selected;
    }

    function buildScores(species, first, second, traits, temperature, mode, cell) {
        const scores = {
            growth: 0,
            nutrition: 0,
            resistance: 0,
            reproduction: 0,
            mutation: 0,
            vitality: 0
        };

        addScores(scores, species);
        addScores(scores, ROLES[first.role]);
        addScores(scores, ROLES[second.role]);
        addScores(scores, TREATMENTS[first.treatment]);
        addScores(scores, TREATMENTS[second.treatment]);

        traits.forEach(function (trait) {
            scores[trait] += TRAITS[trait].bonus;
        });

        // Modello termico ludico, non biologico.
        const optimal = mode === "caldo" ? 37 : 4;
        const penalty = Math.floor(
            Math.abs(temperature - optimal) / 15
        );

        scores.growth = Math.max(0, scores.growth - penalty);

        if (mode === "freddo") {
            scores.resistance += 2;
        } else {
            scores.growth += 1;
        }

        if (cell !== species.cell) {
            scores.mutation += 2;
            scores.growth = Math.max(0, scores.growth - 1);
        }

        return scores;
    }

    function createMicroorganism() {
        const mode = choose(
            "Modalità di lavorazione",
            [
                { id: "caldo", label: "A caldo" },
                { id: "freddo", label: "A freddo" }
            ],
            1
        );

        if (!mode) return;

        const rawTemperature = ask(
            "Temperatura in °C (da -50 a 200):",
            mode === "caldo" ? "37" : "4"
        );

        if (rawTemperature === null || rawTemperature === "") return;

        const temperature = Number(rawTemperature);

        if (
            !Number.isFinite(temperature) ||
            temperature < -50 ||
            temperature > 200
        ) {
            alert("Temperatura non valida.");
            return;
        }

        const speciesId = choose(
            "Seleziona il microrganismo",
            Object.keys(SPECIES).map(function (key) {
                return {
                    id: key,
                    label: SPECIES[key].label
                };
            }),
            1
        );

        if (!speciesId) return;

        const species = SPECIES[speciesId];

        const cell = choose(
            "Tipo cellulare",
            [
                { id: "procariote", label: "Procariote" },
                { id: "eucariote", label: "Eucariote" }
            ],
            species.cell === "procariote" ? 1 : 2
        );

        if (!cell) return;

        const first = selectIngredient(1);
        if (!first) return;

        const second = selectIngredient(2);
        if (!second) return;

        if (first.id === second.id) {
            alert("Seleziona due ingredienti differenti.");
            return;
        }

        const traits = selectTraits();
        if (!traits) return;

        const scores = buildScores(
            species,
            first,
            second,
            traits,
            temperature,
            mode,
            cell
        );

        const signature = [
            speciesId,
            cell,
            mode,
            temperature,
            first.id,
            first.role,
            first.treatment,
            second.id,
            second.role,
            second.treatment,
            traits.slice().sort().join(",")
        ].join("|");

        const unique = hash(signature).toString(36);
        const microbeId = "microbe_" + speciesId + "_" + unique;
        const eggId = "reproductive_egg_" + unique;

        const fertility = Math.max(
            5,
            Math.min(
                95,
                20 +
                scores.reproduction * 8 +
                scores.growth * 3
            )
        );

        const microbeDescription =
            "Microrganismo di gioco. Specie: " +
            species.label +
            "; cellula: " + cell +
            "; modalità: " + mode +
            "; temperatura: " + temperature + " °C.";

        const eggDescription =
            "Uovo riproduttivo generato da " +
            microbeId +
            ". Fertilità simulata: " + fertility +
            "%. Ingredienti parentali: " +
            first.name + " e " + second.name + ".";

        if (!createIngredient(microbeId, {
            name: "Microrganismo " + species.label,
            type: "life",
            color: species.color,
            description: microbeDescription
        })) {
            alert("Non è stato possibile creare il microrganismo.");
            return;
        }

        if (!createIngredient(eggId, {
            name: "Uovo riproduttivo " + unique,
            type: "egg",
            color: mode === "caldo" ? "#e87945" : "#69b9e8",
            description: eggDescription
        })) {
            alert("Microrganismo creato, ma creazione uovo fallita.");
            return;
        }

        // Ricette di gioco per creazione e riproduzione.
        const recipeA = createRecipe(
            first.id + "+" + second.id,
            microbeId
        );

        const recipeB = createRecipe(
            microbeId + "+" + second.id,
            eggId
        );

        const recipeC = createRecipe(
            eggId + "+" + first.id,
            microbeId
        );

        registry[microbeId] = {
            id: microbeId,
            eggId: eggId,
            species: speciesId,
            cellType: cell,
            temperatureMode: mode,
            temperature: temperature,
            ingredients: [first, second],
            traits: traits,
            scores: scores,
            fertility: fertility,
            signature: signature,
            recipesRegistered: recipeA && recipeB && recipeC
        };

        state.lastResult = registry[microbeId];

        alert(
            "MICRORGANISMO CREATO\n\n" +
            "ID: " + microbeId + "\n" +
            "Specie: " + species.label + "\n" +
            "Cellula: " + cell + "\n" +
            "Temperatura: " + temperature + " °C\n" +
            "Modalità: " + mode + "\n\n" +
            "Ingredienti:\n" +
            first.name + " — " + first.role +
            " — " + first.treatment + "\n" +
            second.name + " — " + second.role +
            " — " + second.treatment + "\n\n" +
            "Proprietà:\n" +
            Object.keys(TRAITS).map(function (key) {
                return TRAITS[key].label + ": " + scores[key];
            }).join("\n") +
            "\n\nUovo: " + eggId +
            "\nFertilità simulata: " + fertility + "%" +
            "\nRicette registrate: " +
            (registry[microbeId].recipesRegistered ? "sì" : "parzialmente")
        );
    }

    function showStatus() {
        const count = Object.keys(registry).length;

        alert(
            "CREATOR OF MICROORGANISMS\n\n" +
            "Microrganismi creati in questa sessione: " + count +
            "\n\nMod complementari previste:\n" +
            EXTERNAL_MODS.map(function (name) {
                return "• " + name;
            }).join("\n") +
            "\n\nLe API specifiche delle mod esterne non sono " +
            "state verificate. Il registro è temporaneo e si perde " +
            "quando la pagina viene ricaricata."
        );
    }

    addTool(TOOL_ID, {
        shape: "egg",
        color: "#8cce83",
        onSelect: function () {
            alert(
                "CREATOR OF MICROORGANISMS\n\n" +
                "Applica il tool a un ingrediente per avviare " +
                "la creazione di un microrganismo."
            );
        },
        func: function (placed) {
            if (!placed) {
                alert("Seleziona un ingrediente valido.");
                return;
            }

            createMicroorganism();
        }
    });

    console.info(
        "[Microorganism Creator] Caricato correttamente.",
        {
            tool: TOOL_ID,
            externalMods: EXTERNAL_MODS,
            registry: registry,
            showStatus: showStatus
        }
    );
})();
