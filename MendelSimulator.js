
/*
 * MendelSimulator.js
 * Infinite Chef R74n Plus
 *
 * Incrocio genetico deterministico di due microrganismi.
 *
 * Requisiti:
 * - CreatorOfMicroorganisms_amazing_tool_completed.js
 * - API Infinite Chef: addIngredient e addTool
 *
 * Utilizzo:
 * 1. Seleziona "Mendel Simulator".
 * 2. Clicca sul primo microrganismo.
 * 3. Clicca sul secondo microrganismo.
 * 4. Il risultato viene registrato come ingrediente.
 *
 * Identificazione esclusivamente tramite ID.
 * A+B equivale a B+A.
 * Lo stesso incrocio non genera duplicati.
 */

(function () {
    "use strict";

    const VERSION = "1.0";
    const TOOL_ID = "mendel_simulator";
    const STORAGE_KEY = "mendel_simulator_hybrids_v1";

    if (typeof window.addIngredient !== "function" ||
        typeof window.addTool !== "function") {
        console.error(
            "[MendelSimulator] API addIngredient/addTool non disponibili."
        );
        return;
    }

    const registry = window.microorganismRegistry =
        window.microorganismRegistry || {
            microorganisms: {},
            eggs: {},
            traits: {},
            species: {},
            discoveries: {}
        };

    registry.microorganisms = registry.microorganisms || {};
    registry.traits = registry.traits || {};
    registry.discoveries = registry.discoveries || {};

    // ------------------------------------------------------------
    // STORAGE
    // ------------------------------------------------------------

    function loadHybrids() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn(
                "[MendelSimulator] Registro non leggibile.",
                error
            );
            return {};
        }
    }

    function saveHybrids() {
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(hybrids)
            );
            return true;
        } catch (error) {
            console.warn(
                "[MendelSimulator] Salvataggio non disponibile.",
                error
            );
            return false;
        }
    }

    const hybrids = loadHybrids();

    // ------------------------------------------------------------
    // UTILITÀ
    // ------------------------------------------------------------

    function hash(value) {
        let h = 2166136261;
        const s = String(value);

        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return h >>> 0;
    }

    function unique(values) {
        return Array.from(new Set(values.filter(function (v) {
            return v !== null &&
                v !== undefined &&
                v !== "";
        })));
    }

    function normalizeId(id) {
        return String(id == null ? "" : id).trim();
    }

    function combinationKey(idA, idB) {
        const ids = [normalizeId(idA), normalizeId(idB)].sort();
        return ids[0] + "::" + ids[1];
    }

    function makeHybridId(idA, idB) {
        const key = combinationKey(idA, idB);
        return "mendel_hybrid_" +
            hash(key).toString(16).padStart(8, "0");
    }

    function mixColors(colorA, colorB) {
        function parse(color) {
            if (typeof color !== "string") return null;

            let match = color.match(/^#([0-9a-f]{6})$/i);

            if (match) {
                const n = parseInt(match[1], 16);
                return [
                    (n >> 16) & 255,
                    (n >> 8) & 255,
                    n & 255
                ];
            }

            match = color.match(/^#([0-9a-f]{3})$/i);

            if (match) {
                return match[1].split("").map(function (c) {
                    return parseInt(c + c, 16);
                });
            }

            return null;
        }

        const a = parse(colorA) || [120, 200, 120];
        const b = parse(colorB) || [90, 184, 206];

        return "#" + a.map(function (v, i) {
            return Math.round((v + b[i]) / 2)
                .toString(16).padStart(2, "0");
        }).join("");
    }

    // ------------------------------------------------------------
    // RISOLUZIONE INGREDIENTI TRAMITE ID
    // ------------------------------------------------------------

    function getId(placed) {
        if (!placed) return "";

        if (typeof placed === "string" ||
            typeof placed === "number") {
            return normalizeId(placed);
        }

        const fields = [
            "id",
            "ingredientId",
            "ingredient_id",
            "key",
            "uid",
            "identifier"
        ];

        for (const field of fields) {
            if (placed[field] !== undefined &&
                placed[field] !== null &&
                String(placed[field]).trim() !== "") {
                return normalizeId(placed[field]);
            }
        }

        return "";
    }

    function getIngredient(id) {
        const key = normalizeId(id);

        if (!key) return null;

        if (registry.microorganisms[key]) {
            return registry.microorganisms[key];
        }

        const stores = [
            window.ingredients,
            window.ingredientRegistry,
            window.ingredientDatabase,
            window.ingredientData,
            window.ingredientMap
        ];

        for (const store of stores) {
            if (!store) continue;

            if (Array.isArray(store)) {
                const found = store.find(function (item) {
                    return getId(item) === key;
                });

                if (found) return found;
            } else if (typeof store === "object") {
                if (store[key]) return store[key];

                for (const storeKey of Object.keys(store)) {
                    const item = store[storeKey];

                    if (storeKey === key || getId(item) === key) {
                        return item;
                    }
                }
            }
        }

        return null;
    }

    function getTraits(id, ingredient) {
        const microorganism = registry.microorganisms[id];
        const source = microorganism || ingredient || {};

        const traits = Array.isArray(source.traits)
            ? source.traits
            : [];

        return unique(traits.map(function (trait) {
            if (typeof trait === "string") return trait;
            if (trait && trait.id) return trait.id;
            return "";
        })).filter(function (traitId) {
            return !!registry.traits[traitId];
        });
    }

    // ------------------------------------------------------------
    // GENETICA MENDELIANA
    //
    // Modello di gioco:
    // - Tratto presente nel genitore: genotipo Tt.
    // - Tratto assente: genotipo tt.
    // - Ogni genitore trasmette un allele.
    // - La scelta dell'allele è deterministica.
    //
    // I genotipi non dichiarati dal Creator vengono inferiti
    // dai fenotipi disponibili: non sono dati biologici reali.
    // ------------------------------------------------------------

    function transmittedAllele(hasTrait, seed, parentNumber) {
        if (!hasTrait) return "t";

        return hash(seed + "|parent" + parentNumber) % 2 === 0
            ? "T"
            : "t";
    }

    function crossTrait(hasA, hasB, seed) {
        const alleleA = transmittedAllele(hasA, seed, 1);
        const alleleB = transmittedAllele(hasB, seed, 2);

        const genotype = [alleleA, alleleB].sort().reverse().join("");

        return {
            genotype: genotype,
            expressed: genotype.indexOf("T") !== -1
        };
    }

    function inheritTraits(idA, idB, traitsA, traitsB, key) {
        const allTraits = unique(
            traitsA.concat(traitsB)
        ).sort();

        const inherited = [];
        const genotypes = {};

        allTraits.forEach(function (traitId) {
            const seed = key + "|" + traitId;

            const result = crossTrait(
                traitsA.includes(traitId),
                traitsB.includes(traitId),
                seed
            );

            genotypes[traitId] = result.genotype;

            if (result.expressed) {
                inherited.push(traitId);
            }
        });

        return {
            traits: inherited,
            genotypes: genotypes
        };
    }

    // ------------------------------------------------------------
    // REGISTRAZIONE DEL RISULTATO COME INGREDIENTE
    // ------------------------------------------------------------

    function registerHybrid(idA, idB) {
        idA = normalizeId(idA);
        idB = normalizeId(idB);

        if (!idA || !idB) {
            window.alert("Seleziona due ID validi.");
            return null;
        }

        if (idA === idB) {
            window.alert(
                "Seleziona due microrganismi con ID differenti."
            );
            return null;
        }

        const parentA = getIngredient(idA);
        const parentB = getIngredient(idB);

        if (!parentA || !parentB) {
            window.alert(
                "Uno dei due ID non è presente negli ingredienti " +
                "disponibili. Controlla gli ID e le mod caricate."
            );
            return null;
        }

        const traitsA = getTraits(idA, parentA);
        const traitsB = getTraits(idB, parentB);

        if (!traitsA.length && !traitsB.length) {
            window.alert(
                "Nessun tratto genetico riconosciuto nei genitori. " +
                "Verifica che siano microrganismi creati dalla mod."
            );
            return null;
        }

        const key = combinationKey(idA, idB);
        const hybridId = makeHybridId(idA, idB);

        // La combinazione già registrata restituisce lo stesso ibrido.
        if (hybrids[key]) {
            const existing = hybrids[key];

            // Ripristina l'ingrediente se necessario.
            try {
                window.addIngredient(existing.id, {
                    name: existing.name,
                    type: "microbe",
                    shape: "microbe",
                    color: existing.color,
                    innerColor: existing.innerColor,
                    quality: existing.quality,
                    value: existing.value,
                    traits: existing.traits,
                    flavors: existing.flavors,
                    textures: existing.textures,
                    description: existing.description
                });
            } catch (error) {
                console.warn(
                    "[MendelSimulator] Ripristino ingrediente:",
                    error
                );
            }

            window.alert(
                "Incrocio già scoperto!\n\n" +
                "Nome: " + existing.name + "\n" +
                "ID: " + existing.id + "\n" +
                "Genitori: " + idA + " + " + idB
            );

            return existing;
        }

        const inheritance = inheritTraits(
            idA,
            idB,
            traitsA,
            traitsB,
            key
        );

        const parentNameA = parentA.name || idA;
        const parentNameB = parentB.name || idB;

        const name = "Ibrido mendeliano (" +
            parentNameA + " × " + parentNameB + ")";

        const color = mixColors(
            parentA.color,
            parentB.color
        );

        const flavors = unique(
            (parentA.flavors || []).concat(parentB.flavors || [])
        );

        const textures = unique(
            (parentA.textures || []).concat(parentB.textures || [])
        );

        const quality = Math.max(1, Math.min(10, Math.round(
            (
                Number(parentA.quality || 5) +
                Number(parentB.quality || 5)
            ) / 2
        )));

        const value = Math.max(1, Math.round(
            (
                Number(parentA.value || 1) +
                Number(parentB.value || 1)
            ) / 2
        ));

        const hybrid = {
            id: hybridId,
            name: name,
            type: "microbe",
            species: "hybrid",
            speciesName: "Ibrido mendeliano",
            color: color,
            innerColor: color,
            quality: quality,
            value: value,
            shape: "microbe",
            traits: inheritance.traits,
            genotypes: inheritance.genotypes,
            flavors: flavors,
            textures: textures,
            parents: [idA, idB].sort(),
            combinationKey: key,
            description:
                "Ibrido mendeliano derivato dagli ID " +
                idA + " e " + idB,
            version: VERSION
        };

        // Registra i dati prima dell'aggiunta all'inventario.
        hybrids[key] = hybrid;
        registry.microorganisms[hybridId] = hybrid;

        const saved = saveHybrids();

        try {
            window.addIngredient(hybridId, {
                name: hybrid.name,
                type: "microbe",
                shape: "microbe",
                color: hybrid.color,
                innerColor: hybrid.innerColor,
                quality: hybrid.quality,
                value: hybrid.value,
                traits: hybrid.traits,
                flavors: hybrid.flavors,
                textures: hybrid.textures,
                description: hybrid.description
            });
        } catch (error) {
            console.error(
                "[MendelSimulator] Errore registrando l'ingrediente:",
                error
            );

            window.alert(
                "I dati dell'ibrido sono stati calcolati, ma " +
                "addIngredient ha restituito un errore. " +
                "Controlla la console."
            );

            return null;
        }

        // Evento utilizzabile da altre mod.
        try {
            window.dispatchEvent(new CustomEvent("mendelHybridCreated", {
                detail: {
                    hybrid: hybrid,
                    parents: hybrid.parents.slice(),
                    combinationKey: key
                }
            }));
        } catch (_) {
            // L'evento è facoltativo.
        }

        console.info("[MendelSimulator] Ibrido creato:", hybrid);

        window.alert(
            "INCROCIO MENDELIANO COMPLETATO!\n\n" +
            "Nome: " + hybrid.name + "\n" +
            "ID: " + hybrid.id + "\n\n" +
            "Genitori:\n" + idA + "\n" + idB + "\n\n" +
            "Tratti espressi: " + hybrid.traits.length + "\n" +
            "Qualità: " + hybrid.quality + "/10\n" +
            "Valore: " + hybrid.value + "\n\n" +
            "Salvataggio: " +
            (saved ? "completato" : "non disponibile")
        );

        return hybrid;
    }

    // ------------------------------------------------------------
    // TOOL: SELEZIONE DEI DUE GENITORI CON DUE CLICK
    // ------------------------------------------------------------

    let firstParentId = null;

    window.addTool(TOOL_ID, {
        name: "Mendel Simulator",
        shape: "microbe",

        onSelect: function () {
            firstParentId = null;

            console.info(
                "[MendelSimulator] Clicca sul primo microrganismo, " +
                "poi sul secondo."
            );
        },

        func: function (placed) {
            const clickedId = getId(placed);

            if (!clickedId) {
                window.alert(
                    "Impossibile leggere l'ID dell'ingrediente cliccato."
                );
                return;
            }

            const clicked = getIngredient(clickedId);

            if (!clicked) {
                window.alert(
                    "Ingrediente non trovato tramite ID: " + clickedId
                );
                return;
            }

            if (!firstParentId) {
                firstParentId = clickedId;

                console.info(
                    "[MendelSimulator] Primo genitore selezionato:",
                    clickedId
                );

                window.alert(
                    "Primo genitore selezionato:\n" + clickedId +
                    "\n\nOra clicca sul secondo microrganismo."
                );

                return;
            }

            if (clickedId === firstParentId) {
                window.alert(
                    "Hai selezionato di nuovo lo stesso ID. " +
                    "Clicca su un altro microrganismo."
                );
                return;
            }

            const idA = firstParentId;
            const idB = clickedId;

            // Resetta prima di generare: evita doppi click accidentali.
            firstParentId = null;

            registerHybrid(idA, idB);
        },

        onDeselect: function () {
            firstParentId = null;

            console.info(
                "[MendelSimulator] Selezione dei genitori azzerata."
            );
        }
    });

    // ------------------------------------------------------------
    // RIPRISTINO DEGLI IBRIDI SALVATI
    // ------------------------------------------------------------

    Object.keys(hybrids).forEach(function (key) {
        const hybrid = hybrids[key];

        if (!hybrid || !hybrid.id) return;

        registry.microorganisms[hybrid.id] = hybrid;

        try {
            window.addIngredient(hybrid.id, {
                name: hybrid.name,
                type: "microbe",
                shape: "microbe",
                color: hybrid.color,
                innerColor: hybrid.innerColor,
                quality: hybrid.quality,
                value: hybrid.value,
                traits: hybrid.traits || [],
                flavors: hybrid.flavors || [],
                textures: hybrid.textures || [],
                description: hybrid.description
            });
        } catch (error) {
            console.warn(
                "[MendelSimulator] Ripristino non riuscito:",
                hybrid.id,
                error
            );
        }
    });

    // API pubblica per le altre mod.
    window.mendelSimulator = {
        version: VERSION,
        getHybrid: function (idA, idB) {
            return hybrids[combinationKey(idA, idB)] || null;
        },
        cross: registerHybrid,
        listHybrids: function () {
            return Object.keys(hybrids).map(function (key) {
                return hybrids[key];
            });
        }
    };

    console.info(
        "[MendelSimulator " + VERSION + "] Caricato.",
        "Ibridi salvati:",
        Object.keys(hybrids).length
    );
})();
