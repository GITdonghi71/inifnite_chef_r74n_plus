
/*
 * creator_of_microorganisms.js
 * VERSIONE 7.0 - GENETICA PROCEDURALE
 *
 * Include:
 * - Genetica ereditaria e mutazioni deterministiche
 * - Colori derivati da specie, tratti e ingredienti
 * - Proprietà biologiche calcolate
 * - Gusti, aromi e consistenze
 * - Interazioni tra tratti
 * - Ereditarietà nelle uova e nella schiusa
 * - Metadati per salse, nutrienti, affumicatura,
 *   caramellizzazione, innesti e restauri
 *
 * Richiede le API globali addIngredient e addTool.
 */

(function () {
    "use strict";

    if (
        typeof addIngredient !== "function" ||
        typeof addTool !== "function"
    ) {
        console.error("[Microorganisms] API non disponibili.");
        return;
    }

    const VERSION = "7.0";
    const PREFIX = "microorganism_";
    const registry = Object.create(null);

    const SPECIES = {
        bacterium: {
            label: "Batterio",
            shape: "microbe",
            color: "#75C878",
            traits: ["divisione_binaria", "metabolismo"]
        },
        yeast: {
            label: "Lievito",
            shape: "fungus",
            color: "#E4C878",
            traits: ["fermentazione", "crescita"]
        },
        mold: {
            label: "Muffa",
            shape: "fungus",
            color: "#A18ACB",
            traits: ["ife", "sporulazione"]
        },
        archaea: {
            label: "Archeo",
            shape: "microbe",
            color: "#DE8B55",
            traits: ["adattamento", "metabolismo_estremo"]
        },
        microalgae: {
            label: "Microalga",
            shape: "algae",
            color: "#43B978",
            traits: ["fotosintesi", "clorofilla"]
        },
        hybrid: {
            label: "Ibrido",
            shape: "double_helix",
            color: "#59B7CB",
            traits: ["ricombinazione", "adattamento"]
        }
    };

    const TRAITS = {
        fotosintesi: {
            properties: ["produzione_di_energia_luminosa"],
            flavors: ["vegetale", "fresco"],
            colors: ["#43B978", "#A2D66D"]
        },
        clorofilla: {
            properties: ["pigmento_verde"],
            flavors: ["erbaceo"],
            colors: ["#39A95E", "#8CCB63"]
        },
        fermentazione: {
            properties: ["produzione_di_metaboliti"],
            flavors: ["fermentato", "acidulo"],
            textures: ["effervescente"],
            colors: ["#D9A441", "#C77B50"]
        },
        bioluminescenza: {
            properties: ["luminescenza"],
            flavors: ["minerale"],
            colors: ["#42E5D4", "#6A8DFF"]
        },
        termoresistenza: {
            properties: ["resistenza_al_calore"],
            flavors: ["tostato"],
            colors: ["#D86D36", "#E9A343"]
        },
        psicrofilia: {
            properties: ["adattamento_al_freddo"],
            flavors: ["fresco"],
            colors: ["#73D8EA", "#92B9FF"]
        },
        acidofilia: {
            properties: ["tolleranza_all_acidita"],
            flavors: ["acido"],
            colors: ["#D5A4E8", "#E68AA7"]
        },
        alcalofilia: {
            properties: ["tolleranza_all_alcalinita"],
            flavors: ["minerale"],
            colors: ["#8BB9A2", "#A3C8B9"]
        },
        resistenza_siccita: {
            properties: ["resistenza_alla_siccita"],
            flavors: ["concentrato"],
            colors: ["#C9A66B", "#B7A16A"]
        },
        resistenza_sale: {
            properties: ["tolleranza_al_sale"],
            flavors: ["salato", "minerale"],
            colors: ["#85B7C9", "#A0C7D9"]
        },
        produzione_tossine: {
            properties: ["produzione_di_tossine"],
            flavors: ["amaro"],
            colors: ["#9870B8", "#78629B"]
        },
        produzione_enzimi: {
            properties: ["produzione_di_enzimi"],
            flavors: ["umami"],
            colors: ["#D6B65D", "#91B56A"]
        },
        produzione_vitamine: {
            properties: ["produzione_di_vitamine"],
            flavors: ["dolce", "vegetale"],
            colors: ["#E6C85C", "#8CCB63"]
        },
        biodegradazione: {
            properties: ["decomposizione_organica"],
            flavors: ["terroso"],
            colors: ["#9B875E", "#78915A"]
        },
        motilita: {
            properties: ["mobilita"],
            flavors: ["fresco"],
            colors: ["#55B9C8", "#70D4C3"]
        },
        biofilm: {
            properties: ["formazione_di_biofilm"],
            flavors: ["cremoso"],
            textures: ["viscoso"],
            colors: ["#8BBCA6", "#B3C7A4"]
        },
        sporulazione: {
            properties: ["formazione_di_spore"],
            flavors: ["terroso"],
            textures: ["granuloso"],
            colors: ["#A58B70", "#B7A17D"]
        },
        adattamento: {
            properties: ["adattabilita"],
            flavors: ["complesso"],
            colors: ["#6CA8C8", "#A18ACB"]
        },
        ricombinazione: {
            properties: ["ricombinazione_genetica"],
            flavors: ["complesso"],
            colors: ["#59B7CB", "#BB81D2"]
        },
        divisione_binaria: {
            properties: ["riproduzione_per_divisione"],
            flavors: ["neutro"],
            colors: ["#73C878", "#90D18D"]
        },
        crescita: {
            properties: ["crescita"],
            flavors: ["delicato"],
            colors: ["#C9D47A", "#9DCB7B"]
        },
        ife: {
            properties: ["struttura_ifeale"],
            flavors: ["terroso"],
            textures: ["filamentoso"],
            colors: ["#A18ACB", "#C1A4D9"]
        },
        dormienza: {
            properties: ["dormienza"],
            flavors: ["delicato"],
            colors: ["#8D9AA7", "#A3AEB8"]
        },
        rigenerazione: {
            properties: ["rigenerazione"],
            flavors: ["fresco"],
            colors: ["#60C5A2", "#9CCB78"]
        },
        resistenza_antibiotici: {
            properties: ["resistenza_agli_antibiotici"],
            flavors: ["amaro"],
            colors: ["#987B91", "#8B8D72"]
        },
        riparazione_dna: {
            properties: ["riparazione_del_dna"],
            flavors: ["neutro"],
            colors: ["#83A5D4", "#8CBDAA"]
        }
    };

    const FLAVOR_RULES = [
        {
            words: ["sugar", "sugarcane", "honey", "syrup",
                    "sugar_beet", "zucchero", "miele"],
            flavors: ["dolce", "caramellato"],
            traits: ["metabolismo_zuccherino"],
            color: "#E5B94E"
        },
        {
            words: ["lemon", "lime", "vinegar", "citric",
                    "limone", "aceto", "acid"],
            flavors: ["acido", "agrumato"],
            traits: ["metabolismo_acido"],
            color: "#D7D95D"
        },
        {
            words: ["berry", "strawberry", "apple", "grape",
                    "fruit", "frutta", "mela", "fragola"],
            flavors: ["fruttato", "dolce"],
            traits: ["metabolismo_dei_frutti"],
            color: "#D77C9D"
        },
        {
            words: ["salt", "sea_salt", "sale"],
            flavors: ["salato", "minerale"],
            traits: ["tolleranza_al_sale"],
            color: "#9AC7D9"
        },
        {
            words: ["mushroom", "fungus", "truffle",
                    "fungo", "tartufo"],
            flavors: ["terroso", "umami"],
            traits: ["metabolismo_fungino"],
            color: "#A58B70"
        },
        {
            words: ["meat", "beef", "chicken", "fish",
                    "carne", "pesce"],
            flavors: ["umami", "sapido"],
            traits: ["metabolismo_proteico"],
            color: "#B96E62"
        },
        {
            words: ["coffee", "cocoa", "chocolate",
                    "caffe", "cacao", "cioccolato"],
            flavors: ["amaro", "tostato"],
            traits: ["metabolismo_tostato"],
            color: "#93664F"
        },
        {
            words: ["milk", "cream", "butter", "cheese",
                    "latte", "panna", "burro", "formaggio"],
            flavors: ["cremoso", "lattico"],
            traits: ["metabolismo_lattico"],
            color: "#E5D6A8"
        }
    ];

    function clean(value) {
        return String(value == null ? "" : value)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 80);
    }

    function unique(values) {
        return [...new Set(
            (Array.isArray(values) ? values : [])
                .filter(v => v != null && v !== "")
                .map(v => String(v).trim())
                .filter(Boolean)
        )];
    }

    function hash(value) {
        const text = String(value);
        let h = 2166136261;

        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return (h >>> 0).toString(36);
    }

    function getId(item) {
        if (!item) return "";
        if (typeof item === "string") return item.trim();

        return String(
            item.id ||
            item.name ||
            item.element ||
            item.ingredient ||
            item.key ||
            ""
        ).trim();
    }

    function getDefinition(id) {
        if (!id) return null;
        if (registry[id]) return registry[id];

        const sources = [
            "ingredients",
            "ingredientData",
            "ingredientDatabase",
            "ingredientRegistry"
        ];

        for (const key of sources) {
            let source;

            try {
                source = globalThis[key];
            } catch (_) {
                source = null;
            }

            if (!source) continue;

            if (
                typeof source === "object" &&
                !Array.isArray(source) &&
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

        if (item.microorganismData) {
            return item.microorganismData;
        }

        const def = getDefinition(getId(item));

        if (!def) return {};

        return def.microorganismData || def;
    }

    function getMetadata(item) {
        const id = getId(item);
        const def = getDefinition(id) || {};
        const data = getData(item);

        function array(...values) {
            for (const value of values) {
                if (Array.isArray(value)) return unique(value);
                if (typeof value === "string" && value.trim()) {
                    return unique(value.split(","));
                }
            }
            return [];
        }

        function flag(...values) {
            return values.some(v =>
                v === true || v === 1 || v === "true"
            );
        }

        return {
            ingredients: unique([
                id,
                ...array(item && item.sauceIngredients),
                ...array(def.sauceIngredients),
                ...array(data.sauceIngredients)
            ]),
            nutrients: array(
                item && item.nutrients,
                def.nutrients,
                data.nutrients,
                item && item.sauceNutrients,
                data.sauceNutrients
            ),
            traits: array(
                item && item.traits,
                data.traits,
                item && item.graftTraits,
                data.graftTraits,
                item && item.restorationTraits,
                data.restorationTraits
            ),
            flavors: array(
                item && item.flavors,
                data.flavors,
                item && item.tastes,
                data.tastes
            ),
            textures: array(
                item && item.textures,
                data.textures
            ),
            properties: array(
                item && item.properties,
                data.properties
            ),
            smoked: flag(
                item && item.smoked,
                def.smoked,
                data.smoked,
                item && item.isSmoked,
                data.isSmoked
            ),
            caramelized: flag(
                item && item.caramelized,
                def.caramelized,
                data.caramelized,
                item && item.isCaramelized,
                data.isCaramelized
            ),
            graftTraits: array(
                item && item.graftTraits,
                data.graftTraits,
                item && item.inheritedTraits,
                data.inheritedTraits
            ),
            restorationTraits: array(
                item && item.restorationTraits,
                data.restorationTraits,
                item && item.restoredTraits,
                data.restoredTraits
            )
        };
    }

    function ask(message, fallback) {
        if (typeof prompt !== "function") return fallback;
        const result = prompt(message, fallback);
        return result == null ? fallback : result.trim();
    }

    function chooseSpecies() {
        const keys = Object.keys(SPECIES);
        const menu = keys.map((key, i) =>
            (i + 1) + ". " + SPECIES[key].label +
            " (" + key + ")"
        ).join("\n");

        const answer = ask(
            "Scegli la specie:\n" + menu,
            "1"
        );

        const n = Number(answer);

        if (Number.isInteger(n) && keys[n - 1]) {
            return keys[n - 1];
        }

        const key = clean(answer);
        return SPECIES[key] ? key : "bacterium";
    }

    function detectIngredientTraits(metadata) {
        const traits = [];
        const flavors = [...metadata.flavors];
        const textures = [...metadata.textures];
        const colors = [];
        const ids = metadata.ingredients.map(clean);

        for (const rule of FLAVOR_RULES) {
            const matched = ids.some(id =>
                rule.words.some(word => id.includes(clean(word)))
            );

            if (matched) {
                traits.push(...rule.traits);
                flavors.push(...rule.flavors);
                colors.push(rule.color);
            }
        }

        if (metadata.smoked) {
            traits.push("affumicatura");
            flavors.push("affumicato", "legnoso");
            colors.push("#9B7258");
        }

        if (metadata.caramelized) {
            traits.push("caramellizzazione");
            flavors.push("caramellato", "tostato");
            colors.push("#D99A45");
        }

        for (const nutrient of metadata.nutrients) {
            const n = clean(nutrient);

            if (/protein|proteina|amino/.test(n)) {
                traits.push("metabolismo_proteico");
                flavors.push("umami");
            }

            if (/vitamin|vitamina/.test(n)) {
                traits.push("assorbimento_vitaminico");
                flavors.push("vegetale");
            }

            if (/mineral|minerale|calcium|iron|ferro/.test(n)) {
                traits.push("assorbimento_minerale");
                flavors.push("minerale");
            }

            if (/sugar|glucose|zucchero/.test(n)) {
                traits.push("metabolismo_zuccherino");
                flavors.push("dolce");
            }
        }

        return {
            traits: unique(traits),
            flavors: unique(flavors),
            textures: unique(textures),
            colors: unique(colors)
        };
    }

    function colorToRgb(hex) {
        const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");

        if (!match) return [115, 200, 120];

        const n = parseInt(match[1], 16);

        return [
            (n >> 16) & 255,
            (n >> 8) & 255,
            n & 255
        ];
    }

    function blendColors(colors) {
        const valid = unique(colors).map(colorToRgb);

        if (!valid.length) return "#75C878";

        const rgb = [0, 0, 0];

        valid.forEach(c => {
            rgb[0] += c[0];
            rgb[1] += c[1];
            rgb[2] += c[2];
        });

        const n = valid.length;

        return "#" + rgb.map(v =>
            Math.round(v / n)
                .toString(16)
                .padStart(2, "0")
        ).join("").toUpperCase();
    }

    function chooseColor(species, traits, ingredientColors, signature) {
        const colors = [SPECIES[species].color, ...ingredientColors];

        for (const trait of traits) {
            const info = TRAITS[trait];

            if (info && info.colors) {
                colors.push(info.colors[
                    parseInt(hash(signature + trait), 36) %
                    info.colors.length
                ]);
            }
        }

        return blendColors(colors);
    }

    function deriveProperties(traits, metadata) {
        const properties = [...metadata.properties];

        for (const trait of traits) {
            const info = TRAITS[trait];

            if (info && info.properties) {
                properties.push(...info.properties);
            }
        }

        if (traits.includes("fotosintesi") &&
            traits.includes("bioluminescenza")) {
            properties.push("conversione_energetica_speciale");
        }

        if (traits.includes("fermentazione") &&
            traits.includes("metabolismo_zuccherino")) {
            properties.push("fermentazione_degli_zuccheri");
        }

        if (traits.includes("termoresistenza") &&
            traits.includes("resistenza_siccita")) {
            properties.push("sopravvivenza_in_ambienti_estremi");
        }

        if (traits.includes("biofilm") &&
            traits.includes("resistenza_antibiotici")) {
            properties.push("protezione_collettiva");
        }

        if (metadata.smoked) properties.push("trattamento_affumicato");
        if (metadata.caramelized) properties.push("trattamento_caramellizzato");

        return unique(properties);
    }

    function deriveFlavors(traits, metadata, ingredientResult) {
        const flavors = [
            ...metadata.flavors,
            ...ingredientResult.flavors
        ];

        const textures = [...metadata.textures, ...ingredientResult.textures];

        for (const trait of traits) {
            const info = TRAITS[trait];

            if (!info) continue;

            if (info.flavors) flavors.push(...info.flavors);
            if (info.textures) textures.push(...info.textures);
        }

        if (traits.includes("fermentazione") &&
            traits.includes("metabolismo_dei_frutti")) {
            flavors.push("fruttato-fermentato");
        }

        if (traits.includes("metabolismo_lattico") &&
            traits.includes("fermentazione")) {
            flavors.push("yogurt", "lattico-acidulo");
            textures.push("cremoso");
        }

        if (traits.includes("metabolismo_tostato") &&
            traits.includes("metabolismo_zuccherino")) {
            flavors.push("caramello-tostato");
        }

        if (traits.includes("metabolismo_fungino") &&
            traits.includes("produzione_enzimi")) {
            flavors.push("umami-intenso");
        }

        if (metadata.smoked) flavors.push("affumicato");
        if (metadata.caramelized) flavors.push("caramellato");

        return {
            flavors: unique(flavors.length ? flavors : ["neutro"]),
            textures: unique(textures.length ? textures : ["cellulare"])
        };
    }

    function registerIngredient(id, definition) {
        if (getDefinition(id)) return false;

        try {
            addIngredient(id, definition);
            registry[id] = definition;
            return true;
        } catch (error) {
            console.error("[Microorganisms] Errore registrando", id, error);
            return false;
        }
    }

    function buildOrganism(parentA, parentB) {
        const idA = getId(parentA) || "parent_a";
        const idB = getId(parentB) || "parent_b";

        const dataA = getData(parentA);
        const dataB = getData(parentB);
        const metaA = getMetadata(parentA);
        const metaB = getMetadata(parentB);

        const species = chooseSpecies();
        const info = SPECIES[species];

        const userTraits = ask(
            "Inserisci tratti aggiuntivi separati da virgole:",
            info.traits.join(", ")
        ).split(",").map(clean).filter(Boolean);

        const inheritedTraits = unique([
            ...(dataA.traits || []),
            ...(dataB.traits || []),
            ...(dataA.inheritedTraits || []),
            ...(dataB.inheritedTraits || []),
            ...metaA.traits,
            ...metaB.traits,
            ...metaA.graftTraits,
            ...metaB.graftTraits,
            ...metaA.restorationTraits,
            ...metaB.restorationTraits
        ].map(clean));

        const ingredients = {
            ingredients: unique([
                ...metaA.ingredients,
                ...metaB.ingredients
            ]),
            nutrients: unique([
                ...metaA.nutrients,
                ...metaB.nutrients
            ]),
            flavors: unique([
                ...metaA.flavors,
                ...metaB.flavors
            ]),
            textures: unique([
                ...metaA.textures,
                ...metaB.textures
            ]),
            properties: unique([
                ...metaA.properties,
                ...metaB.properties
            ]),
            smoked: metaA.smoked || metaB.smoked,
            caramelized: metaA.caramelized || metaB.caramelized,
            graftTraits: unique([
                ...metaA.graftTraits,
                ...metaB.graftTraits
            ]),
            restorationTraits: unique([
                ...metaA.restorationTraits,
                ...metaB.restorationTraits
            ])
        };

        const ingredientResult = detectIngredientTraits(ingredients);

        let traits = unique([
            ...info.traits,
            ...userTraits,
            ...inheritedTraits,
            ...ingredientResult.traits
        ]);

        // Interazioni biologiche: le combinazioni creano nuovi tratti.
        if (traits.includes("fotosintesi") &&
            traits.includes("bioluminescenza")) {
            traits.push("energia_luminosa");
        }

        if (traits.includes("fermentazione") &&
            traits.includes("metabolismo_zuccherino")) {
            traits.push("fermentazione_avanzata");
        }

        if (traits.includes("adattamento") &&
            traits.includes("termoresistenza")) {
            traits.push("adattamento_termico");
        }

        if (traits.includes("ricombinazione") &&
            traits.includes("riparazione_dna")) {
            traits.push("stabilita_genetica");
        }

        traits = unique(traits);

        const generation = Math.max(
            Number(dataA.generation) || 0,
            Number(dataB.generation) || 0
        ) + 1;

        const signatureData = {
            version: VERSION,
            parents: [idA, idB].sort(),
            species: species,
            traits: traits.slice().sort(),
            ingredients: ingredients.ingredients.slice().sort(),
            nutrients: ingredients.nutrients.slice().sort(),
            smoked: ingredients.smoked,
            caramelized: ingredients.caramelized,
            generation: generation
        };

        const signature = JSON.stringify(signatureData);
        const id = PREFIX + species + "_" + hash(signature);

        // Le mutazioni sono deterministiche per questa combinazione.
        const mutationNumber = parseInt(hash(signature + "_mutation"), 36);
        const mutationChance = mutationNumber % 100;

        const mutations = [];

        if (mutationChance < 18) {
            mutations.push("mutazione_pigmentazione");
        }

        if (mutationChance >= 18 && mutationChance < 30) {
            mutations.push("mutazione_metabolica");
        }

        if (generation >= 3 && mutationChance % 4 === 0) {
            mutations.push("mutazione_generazionale");
        }

        traits = unique([...traits, ...mutations]);

        const color = chooseColor(
            species,
            traits,
            ingredientResult.colors,
            signature
        );

        const properties = deriveProperties(traits, ingredients);

        const tasteResult = deriveFlavors(
            traits,
            ingredients,
            ingredientResult
        );

        const data = {
            version: VERSION,
            species: species,
            traits: traits,
            inheritedTraits: inheritedTraits,
            mutations: mutations,
            properties: properties,
            flavors: tasteResult.flavors,
            textures: tasteResult.textures,
            nutrients: ingredients.nutrients,
            ingredients: ingredients.ingredients,
            sauceIngredients: ingredients.ingredients,
            sauceNutrients: ingredients.nutrients,
            smoked: ingredients.smoked,
            caramelized: ingredients.caramelized,
            graftTraits: ingredients.graftTraits,
            restorationTraits: ingredients.restorationTraits,
            parents: [idA, idB],
            generation: generation,
            color: color,
            shape: info.shape,
            egg: false,
            signature: signature
        };

        return {
            id: id,
            color: color,
            shape: info.shape,
            data: data,
            signature: signature,
            definition: {
                type: "life",
                color: color,
                shape: info.shape,
                microorganism: true,
                microorganismData: data
            }
        };
    }

    function makeEgg(organism) {
        const eggId = "microbe_egg_" + hash(organism.signature);

        const eggData = {
            ...organism.data,
            traits: [...organism.data.traits],
            inheritedTraits: [...organism.data.traits],
            properties: [...organism.data.properties],
            flavors: [...organism.data.flavors],
            textures: [...organism.data.textures],
            ingredients: [...organism.data.ingredients],
            nutrients: [...organism.data.nutrients],
            parents: [organism.id],
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
            console.info("[Microorganisms] Uovo già presente:", eggId);
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
            alert("Non riesco a leggere il primo ingrediente.");
            return;
        }

        const secondId = ask(
            "ID esatto del secondo ingrediente:",
            "sugar"
        );

        if (!secondId) return;

        const second = getDefinition(secondId);

        if (!second) {
            alert(
                "Ingrediente non trovato: " + secondId +
                "\nVerifica l'ID nel database del gioco."
            );
            return;
        }

        const organism = buildOrganism(placed, {
            ...second,
            id: secondId,
            name: secondId
        });

        if (!registerIngredient(organism.id, organism.definition)) {
            alert("Organismo già registrato o errore di registrazione.");
            return;
        }

        const eggId = makeEgg(organism);

        alert(
            "NUOVO MICRORGANISMO!\n\n" +
            "ID: " + organism.id + "\n" +
            "Specie: " + organism.data.species + "\n" +
            "Colore: " + organism.color + "\n" +
            "Generazione: " + organism.data.generation + "\n\n" +
            "TRATTI:\n" + organism.data.traits.join(", ") + "\n\n" +
            "PROPRIETÀ:\n" + organism.data.properties.join(", ") + "\n\n" +
            "GUSTI:\n" + organism.data.flavors.join(", ") + "\n\n" +
            "CONSISTENZA:\n" + organism.data.textures.join(", ") + "\n\n" +
            "MUTAZIONI:\n" +
            (organism.data.mutations.join(", ") || "Nessuna") + "\n\n" +
            "Uovo creato: " + eggId
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
            eggId.startsWith("microbe_egg_")
        )) {
            alert("L'ingrediente selezionato non è un uovo riconosciuto.");
            return;
        }

        const species = SPECIES[data.species]
            ? data.species
            : "bacterium";

        const signature = JSON.stringify({
            egg: eggId,
            traits: unique(data.traits || []).sort(),
            generation: Number(data.generation) || 1
        });

        const id = PREFIX + species + "_hatched_" + hash(signature);

        const newData = {
            ...data,
            egg: false,
            hatchedFrom: eggId,
            traits: unique(data.traits || []),
            inheritedTraits: unique(data.inheritedTraits || data.traits || []),
            properties: unique(data.properties || []),
            flavors: unique(data.flavors || []),
            textures: unique(data.textures || []),
            generation: Number(data.generation) || 1,
            signature: signature
        };

        const info = SPECIES[species];

        const definition = {
            type: "life",
            color: data.color || info.color,
            shape: info.shape,
            microorganism: true,
            microorganismData: newData
        };

        if (!registerIngredient(id, definition)) {
            alert("Organismo già schiuso o errore di registrazione.");
            return;
        }

        alert(
            "UOVO SCHIUSO!\n\n" +
            "ID: " + id + "\n" +
            "Colore: " + definition.color + "\n" +
            "Tratti: " + newData.traits.join(", ") + "\n" +
            "Proprietà: " + newData.properties.join(", ") + "\n" +
            "Gusti: " + newData.flavors.join(", ")
        );
    }

    const baseForms = {
        microorganism_cell: {
            type: "life",
            shape: "microbe",
            color: "#75C878"
        },
        microorganism_fungus: {
            type: "life",
            shape: "fungus",
            color: "#A18ACB"
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

    for (const id of Object.keys(baseForms)) {
        if (getDefinition(id)) continue;

        try {
            addIngredient(id, baseForms[id]);
        } catch (error) {
            console.warn("[Microorganisms] Forma non registrata:", id, error);
        }
    }

    try {
        addTool("creator_of_microorganisms", {
            func: function (placed) {
                try {
                    createFromPlaced(placed);
                } catch (error) {
                    console.error("[Microorganisms] Creazione fallita:", error);
                    alert("Errore: " + (error.message || error));
                }
            },
            shape: "microbe"
        });
    } catch (error) {
        console.error("[Microorganisms] Impossibile registrare creator:", error);
    }

    try {
        addTool("hatch_microorganism_egg", {
            func: function (placed) {
                try {
                    hatchEgg(placed);
                } catch (error) {
                    console.error("[Microorganisms] Schiusa fallita:", error);
                    alert("Errore: " + (error.message || error));
                }
            },
            shape: "embryo"
        });
    } catch (error) {
        console.error("[Microorganisms] Impossibile registrare hatch:", error);
    }

    console.log(
        "[Microorganisms] v" + VERSION +
        " caricato: genetica, colori, proprietà, gusti e mutazioni."
    );
})();

