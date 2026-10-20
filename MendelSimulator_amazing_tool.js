
/*
 * MendelSimulator.js
 * Infinite Chef R74n Plus
 *
 * Versione 2.0 - genetica procedurale
 *
 * Funzioni:
 * - Incroci deterministici e simmetrici: A+B = B+A.
 * - Un solo risultato persistente per ogni coppia di genitori.
 * - Ereditarietà dei tratti riconosciuti dal registro.
 * - Mutazioni procedurali, sinergie e rarità emergenti.
 * - Nomi, colori, descrizioni e caratteristiche deterministici.
 * - Salvataggio e ripristino degli ibridi.
 * - Tentativo di pulizia della ricerca dopo Ctrl+R.
 *
 * Dipendenze:
 * - window.addIngredient
 * - window.addTool
 * - window.microorganismRegistry (creato se assente)
 */

(function () {
    "use strict";

    const VERSION = "2.0";
    const TOOL_ID = "mendel_simulator";
    const STORAGE_KEY = "mendel_simulator_hybrids_v1";
    const RELOAD_SEARCH_KEY = "mendel_clear_search_after_reload";

    if (
        typeof window.addIngredient !== "function" ||
        typeof window.addTool !== "function"
    ) {
        console.error(
            "[MendelSimulator] addIngredient/addTool non disponibili."
        );
        return;
    }

    const registry = window.microorganismRegistry =
        window.microorganismRegistry || {};

    registry.microorganisms = registry.microorganisms || {};
    registry.traits = registry.traits || {};
    registry.discoveries = registry.discoveries || {};

    // ---------------------------------------------------------
    // STORAGE
    // ---------------------------------------------------------

    function loadHybrids() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn("[MendelSimulator] Storage non leggibile.", error);
            return {};
        }
    }

    let hybrids = loadHybrids();

    function saveHybrids() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(hybrids));
            return true;
        } catch (error) {
            console.warn("[MendelSimulator] Salvataggio fallito.", error);
            return false;
        }
    }

    // ---------------------------------------------------------
    // HASH E CASUALITÀ DETERMINISTICA
    // Nessuna casualità diversa a ogni esecuzione.
    // ---------------------------------------------------------

    function hash(value) {
        let h = 2166136261;
        const str = String(value);

        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return h >>> 0;
    }

    function random01(seed) {
        return hash(seed) / 4294967296;
    }

    function choose(list, seed) {
        if (!list || !list.length) return "";
        return list[Math.floor(random01(seed) * list.length)];
    }

    function unique(list) {
        return Array.from(new Set(
            (list || []).filter(function (value) {
                return value !== null &&
                    value !== undefined &&
                    value !== "";
            })
        ));
    }

    function normalizeId(id) {
        return String(id == null ? "" : id).trim();
    }

    function combinationKey(idA, idB) {
        return [normalizeId(idA), normalizeId(idB)]
            .sort()
            .map(encodeURIComponent)
            .join("::");
    }

    function makeHybridId(key) {
        return "mendel_hybrid_" +
            hash(key).toString(16).padStart(8, "0");
    }

    // ---------------------------------------------------------
    // INGREDIENTI E ID
    // ---------------------------------------------------------

    function getId(item) {
        if (item === null || item === undefined) return "";

        if (typeof item === "string" || typeof item === "number") {
            return normalizeId(item);
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
            if (item[field] != null && String(item[field]).trim()) {
                return normalizeId(item[field]);
            }
        }

        return "";
    }

    function getIngredient(id) {
        id = normalizeId(id);
        if (!id) return null;

        if (registry.microorganisms[id]) {
            return registry.microorganisms[id];
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
                const result = store.find(function (item) {
                    return getId(item) === id;
                });

                if (result) return result;
                continue;
            }

            if (typeof store === "object") {
                if (store[id]) return store[id];

                for (const key of Object.keys(store)) {
                    if (key === id || getId(store[key]) === id) {
                        return store[key];
                    }
                }
            }
        }

        return null;
    }

    function getTraits(id, ingredient) {
        const source =
            registry.microorganisms[id] || ingredient || {};

        const rawTraits = Array.isArray(source.traits)
            ? source.traits
            : [];

        return unique(rawTraits.map(function (trait) {
            if (typeof trait === "string") return trait;
            return trait && trait.id ? trait.id : "";
        })).filter(function (traitId) {
            return !!registry.traits[traitId];
        }).sort();
    }

    function getParentName(item, id) {
        return String(
            item && (item.name || item.displayName || item.label)
                ? (item.name || item.displayName || item.label)
                : id
        );
    }

    function getArray(item, key) {
        return Array.isArray(item && item[key]) ? item[key] : [];
    }

    // ---------------------------------------------------------
    // COLORI
    // ---------------------------------------------------------

    function parseColor(color) {
        if (typeof color !== "string") return null;

        let match = color.match(/^#([0-9a-f]{6})$/i);

        if (match) {
            const n = parseInt(match[1], 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }

        match = color.match(/^#([0-9a-f]{3})$/i);

        if (match) {
            return match[1].split("").map(function (c) {
                return parseInt(c + c, 16);
            });
        }

        return null;
    }

    function mixColors(colorA, colorB, seed) {
        const a = parseColor(colorA) || [100, 180, 130];
        const b = parseColor(colorB) || [100, 150, 210];

        const mutation = random01(seed + "|pigment") > 0.72;
        const shift = mutation
            ? Math.floor(random01(seed + "|shift") * 31) - 15
            : 0;

        return "#" + a.map(function (value, index) {
            const mixed = Math.max(0, Math.min(
                255,
                Math.round((value + b[index]) / 2 + shift)
            ));

            return mixed.toString(16).padStart(2, "0");
        }).join("");
    }

    // ---------------------------------------------------------
    // GENETICA DETERMINISTICA
    //
    // Il modello è una simulazione di gioco, non un modello
    // biologico reale.
    // ---------------------------------------------------------

    function transmittedAllele(hasTrait, seed, parentNumber) {
        if (!hasTrait) return "t";

        return hash(seed + "|parent|" + parentNumber) % 2 === 0
            ? "T"
            : "t";
    }

    function crossTrait(hasA, hasB, seed) {
        const alleleA = transmittedAllele(hasA, seed, 1);
        const alleleB = transmittedAllele(hasB, seed, 2);

        const genotype = [alleleA, alleleB]
            .sort()
            .reverse()
            .join("");

        return {
            genotype: genotype,
            expressed: genotype.indexOf("T") !== -1
        };
    }

    function inheritTraits(traitsA, traitsB, key) {
        const allTraits = unique(traitsA.concat(traitsB)).sort();
        const expressed = [];
        const genotypes = {};

        allTraits.forEach(function (traitId) {
            const result = crossTrait(
                traitsA.includes(traitId),
                traitsB.includes(traitId),
                key + "|trait|" + traitId
            );

            genotypes[traitId] = result.genotype;

            if (result.expressed) {
                expressed.push(traitId);
            }
        });

        return {
            traits: expressed,
            genotypes: genotypes
        };
    }

    // ---------------------------------------------------------
    // SINERGIA E MUTAZIONI EMERGENTI
    //
    // Non esiste un elenco di coppie speciali.
    // Il risultato dipende dagli ID, dai tratti e dalle
    // proprietà dei genitori.
    // ---------------------------------------------------------

    function calculateSynergy(parentA, parentB, traitsA, traitsB, key) {
        const overlap = traitsA.filter(function (trait) {
            return traitsB.includes(trait);
        }).length;

        const differences = unique(traitsA.concat(traitsB)).length - overlap;

        const colorA = parseColor(parentA.color);
        const colorB = parseColor(parentB.color);

        let colorDistance = 0;

        if (colorA && colorB) {
            colorDistance = colorA.reduce(function (sum, value, index) {
                return sum + Math.abs(value - colorB[index]);
            }, 0) / 765;
        }

        const qualityA = Number(parentA.quality || 5);
        const qualityB = Number(parentB.quality || 5);
        const qualityDifference = Math.abs(qualityA - qualityB) / 10;

        const seedFactor = random01(key + "|synergy") * 0.35;

        const score =
            overlap * 0.12 +
            differences * 0.09 +
            colorDistance * 0.20 +
            qualityDifference * 0.10 +
            seedFactor;

        return {
            score: Math.min(1, score),
            sharedTraits: overlap,
            distinctTraits: differences,
            colorDistance: colorDistance
        };
    }

    function generateMutations(key, traitsA, traitsB, synergy) {
        const mutations = [];
        const shared = traitsA.filter(function (trait) {
            return traitsB.includes(trait);
        });

        const distinct = unique(traitsA.concat(traitsB));

        // La probabilità è deterministica per ogni incrocio.
        const mutationChance = Math.min(
            0.82,
            0.12 + synergy.score * 0.50 +
            distinct.length * 0.025
        );

        if (random01(key + "|mutation-check") < mutationChance) {
            mutations.push({
                id: "mutation_" + hash(key + "|m1").toString(16),
                type: "adaptive",
                strength: 1 + Math.floor(
                    random01(key + "|strength") * 3
                ),
                description: "Mutazione emersa durante l'incrocio."
            });
        }

        // Sinergia tra tratti condivisi.
        if (
            shared.length > 0 &&
            random01(key + "|synergy-mutation") <
                Math.min(0.75, 0.18 + synergy.score * 0.55)
        ) {
            mutations.push({
                id: "mutation_" + hash(key + "|m2").toString(16),
                type: "synergy",
                strength: 1 + Math.floor(
                    random01(key + "|synergy-strength") * 4
                ),
                description:
                    "Interazione emergente tra caratteristiche condivise."
            });
        }

        // Divergenza genetica: una combinazione molto diversa
        // può produrre una mutazione aggiuntiva.
        if (
            distinct.length >= 4 &&
            random01(key + "|divergence") <
                Math.min(0.60, distinct.length * 0.07)
        ) {
            mutations.push({
                id: "mutation_" + hash(key + "|m3").toString(16),
                type: "divergent",
                strength: 1 + Math.floor(
                    random01(key + "|divergent-strength") * 5
                ),
                description:
                    "Mutazione divergente dovuta alla diversità genetica."
            });
        }

        return mutations;
    }

    function calculateRarity(synergy, mutations, traitCount, key) {
        const mutationStrength = mutations.reduce(function (sum, mutation) {
            return sum + mutation.strength;
        }, 0);

        const score = Math.min(
            100,
            Math.round(
                synergy.score * 40 +
                mutations.length * 9 +
                mutationStrength * 4 +
                Math.min(traitCount, 10) * 1.5 +
                random01(key + "|rarity") * 8
            )
        );

        let rarity = "Comune";

        if (score >= 82) rarity = "Mitico";
        else if (score >= 67) rarity = "Leggendario";
        else if (score >= 50) rarity = "Epico";
        else if (score >= 34) rarity = "Raro";
        else if (score >= 20) rarity = "Non comune";

        return { score: score, rarity: rarity };
    }

    // ---------------------------------------------------------
    // IDENTITÀ PROCEDURALE
    // ---------------------------------------------------------

    function generateName(parentA, parentB, rarity, key) {
        const prefixes = [
            "Neo", "Xeno", "Astra", "Vitra", "Cryo",
            "Luma", "Umbra", "Aero", "Myco", "Bio",
            "Quantum", "Prisma", "Nexa", "Chrono", "Evo"
        ];

        const suffixes = [
            "gen", "morph", "spora", "cyte", "flux",
            "nex", "vore", "lume", "form", "zyme",
            "core", "strain", "pulse", "bloom", "veil"
        ];

        const prefix = choose(prefixes, key + "|name-prefix");
        const suffix = choose(suffixes, key + "|name-suffix");

        const names = [
            getParentName(parentA, "A"),
            getParentName(parentB, "B")
        ].sort();

        return prefix + suffix + " [" + rarity + "]";
    }

    function generateDescription(
        parentA,
        parentB,
        traits,
        mutations,
        rarity,
        synergy
    ) {
        const names = [
            getParentName(parentA, "A"),
            getParentName(parentB, "B")
        ].sort();

        const parts = [
            "Ibrido procedurale derivato da " +
                names[0] + " e " + names[1] + ".",
            "Classe: " + rarity.rarity +
                " (" + rarity.score + "/100).",
            "Sinergia genetica: " +
                Math.round(synergy.score * 100) + "/100.",
            "Tratti riconosciuti espressi: " + traits.length + ".",
            "Mutazioni emergenti: " + mutations.length + "."
        ];

        if (mutations.length) {
            parts.push(
                "Le mutazioni sono generate deterministicamente " +
                "dalla combinazione dei genitori."
            );
        }

        return parts.join(" ");
    }

    // ---------------------------------------------------------
    // REGISTRAZIONE DELL'IBRIDO
    // ---------------------------------------------------------

    function addHybridIngredient(hybrid) {
        return window.addIngredient(hybrid.id, {
            name: hybrid.name,
            type: "microbe",
            species: "hybrid",
            shape: "microbe",
            color: hybrid.color,
            innerColor: hybrid.innerColor,
            quality: hybrid.quality,
            value: hybrid.value,
            traits: hybrid.traits,
            flavors: hybrid.flavors,
            textures: hybrid.textures,
            description: hybrid.description,

            // Metadati personalizzati della mod.
            // Il gioco può ignorare i campi che non conosce.
            mendel: {
                version: VERSION,
                parents: hybrid.parents,
                rarity: hybrid.rarity,
                rarityScore: hybrid.rarityScore,
                mutations: hybrid.mutations,
                genotypes: hybrid.genotypes,
                synergy: hybrid.synergy,
                combinationKey: hybrid.combinationKey
            }
        });
    }

    function restoreHybrid(hybrid) {
        if (!hybrid || !hybrid.id) return false;

        registry.microorganisms[hybrid.id] = hybrid;

        try {
            addHybridIngredient(hybrid);
            return true;
        } catch (error) {
            console.warn(
                "[MendelSimulator] Ripristino fallito:",
                hybrid.id,
                error
            );
            return false;
        }
    }

    function registerHybrid(idA, idB) {
        idA = normalizeId(idA);
        idB = normalizeId(idB);

        if (!idA || !idB) {
            window.alert("Seleziona due ingredienti validi.");
            return null;
        }

        if (idA === idB) {
            window.alert("Seleziona due ID differenti.");
            return null;
        }

        const parentA = getIngredient(idA);
        const parentB = getIngredient(idB);

        if (!parentA || !parentB) {
            window.alert(
                "Non riesco a trovare entrambi gli ingredienti tramite ID."
            );
            return null;
        }

        // Ordine canonico per rendere A+B identico a B+A.
        const ids = [idA, idB].sort();
        const parent1 = getIngredient(ids[0]);
        const parent2 = getIngredient(ids[1]);

        const key = combinationKey(ids[0], ids[1]);
        const hybridId = makeHybridId(key);

        // Se già scoperto, restituisce sempre il risultato originale.
        if (hybrids[key]) {
            restoreHybrid(hybrids[key]);

            window.alert(
                "Incrocio già scoperto!\n\n" +
                hybrids[key].name + "\n" +
                "Rarità: " + hybrids[key].rarity + "\n" +
                "ID: " + hybrids[key].id
            );

            return hybrids[key];
        }

        const traitsA = getTraits(ids[0], parent1);
        const traitsB = getTraits(ids[1], parent2);

        const inheritance = inheritTraits(traitsA, traitsB, key);

        const synergy = calculateSynergy(
            parent1,
            parent2,
            traitsA,
            traitsB,
            key
        );

        const mutations = generateMutations(
            key,
            traitsA,
            traitsB,
            synergy
        );

        const rarity = calculateRarity(
            synergy,
            mutations,
            inheritance.traits.length,
            key
        );

        const color = mixColors(
            parent1.color,
            parent2.color,
            key
        );

        const flavors = unique(
            getArray(parent1, "flavors")
                .concat(getArray(parent2, "flavors"))
        );

        const textures = unique(
            getArray(parent1, "textures")
                .concat(getArray(parent2, "textures"))
        );

        const qualityA = Number(parent1.quality || 5);
        const qualityB = Number(parent2.quality || 5);

        const quality = Math.max(1, Math.min(
            10,
            Math.round(
                (qualityA + qualityB) / 2 +
                mutations.length * 0.25
            )
        ));

        const valueA = Number(parent1.value || 1);
        const valueB = Number(parent2.value || 1);

        const value = Math.max(1, Math.round(
            ((valueA + valueB) / 2) *
            (1 + rarity.score / 100)
        ));

        const hybrid = {
            id: hybridId,
            name: generateName(
                parent1,
                parent2,
                rarity.rarity,
                key
            ),
            type: "microbe",
            species: "hybrid",
            speciesName: "Ibrido procedurale",
            shape: "microbe",
            color: color,
            innerColor: color,
            quality: quality,
            value: value,

            // Solo ID di tratti che esistono nel registro.
            traits: inheritance.traits,
            genotypes: inheritance.genotypes,

            flavors: flavors,
            textures: textures,

            parents: ids,
            combinationKey: key,

            rarity: rarity.rarity,
            rarityScore: rarity.score,
            mutations: mutations,
            synergy: synergy,

            // Questi metadati descrivono le mutazioni.
            // Non sono automaticamente tratti nativi del gioco.
            specialTraits: mutations.map(function (mutation) {
                return mutation.id;
            }),

            description: generateDescription(
                parent1,
                parent2,
                inheritance.traits,
                mutations,
                rarity,
                synergy
            ),

            version: VERSION,
            createdAt: Date.now()
        };

        // Salva prima di chiamare l'API del gioco.
        hybrids[key] = hybrid;
        registry.microorganisms[hybridId] = hybrid;

        const saved = saveHybrids();

        try {
            addHybridIngredient(hybrid);
        } catch (error) {
            console.error(
                "[MendelSimulator] addIngredient fallito:",
                error
            );

            window.alert(
                "L'ibrido è stato calcolato e salvato, ma il gioco " +
                "non ha accettato la registrazione dell'ingrediente. " +
                "Controlla la console."
            );

            return null;
        }

        try {
            window.dispatchEvent(new CustomEvent("mendelHybridCreated", {
                detail: {
                    hybrid: hybrid,
                    parents: ids.slice(),
                    combinationKey: key
                }
            }));
        } catch (_) {}

        console.info("[MendelSimulator] Nuova scoperta:", hybrid);

        window.alert(
            "NUOVO IBRIDO SCOPERTO!\n\n" +
            "Nome: " + hybrid.name + "\n" +
            "Rarità: " + hybrid.rarity + "\n" +
            "Punteggio: " + hybrid.rarityScore + "/100\n\n" +
            "Genitori:\n" + ids[0] + "\n" + ids[1] + "\n\n" +
            "Tratti espressi: " + hybrid.traits.length + "\n" +
            "Mutazioni emergenti: " + hybrid.mutations.length + "\n" +
            "Qualità: " + hybrid.quality + "/10\n" +
            "Valore: " + hybrid.value + "\n\n" +
            "Salvataggio: " + (saved ? "completato" : "fallito")
        );

        return hybrid;
    }

    // ---------------------------------------------------------
    // TOOL DI GIOCO: DUE CLIC
    // ---------------------------------------------------------

    let firstParentId = null;

    window.addTool(TOOL_ID, {
        name: "Mendel Simulator",
        shape: "microbe",

        onSelect: function () {
            firstParentId = null;

            console.info(
                "[MendelSimulator] Seleziona il primo e poi il secondo genitore."
            );
        },

        func: function (placed) {
            const clickedId = getId(placed);

            if (!clickedId) {
                window.alert("Impossibile leggere l'ID selezionato.");
                return;
            }

            if (!getIngredient(clickedId)) {
                window.alert("Ingrediente non trovato: " + clickedId);
                return;
            }

            if (!firstParentId) {
                firstParentId = clickedId;

                window.alert(
                    "Primo genitore: " + clickedId +
                    "\n\nOra seleziona il secondo."
                );

                return;
            }

            if (clickedId === firstParentId) {
                window.alert(
                    "Hai selezionato lo stesso ingrediente. " +
                    "Scegline un altro."
                );
                return;
            }

            const idA = firstParentId;
            const idB = clickedId;

            firstParentId = null;
            registerHybrid(idA, idB);
        },

        onDeselect: function () {
            firstParentId = null;
        }
    });

    // ---------------------------------------------------------
    // RIPRISTINO DEGLI IBRIDI
    // ---------------------------------------------------------

    Object.keys(hybrids).forEach(function (key) {
        const hybrid = hybrids[key];
        if (hybrid) restoreHybrid(hybrid);
    });

    // ---------------------------------------------------------
    // API PUBBLICA
    // ---------------------------------------------------------

    window.mendelSimulator = {
        version: VERSION,

        cross: registerHybrid,

        getHybrid: function (idA, idB) {
            return hybrids[combinationKey(idA, idB)] || null;
        },

        listHybrids: function () {
            return Object.keys(hybrids).map(function (key) {
                return hybrids[key];
            });
        },

        count: function () {
            return Object.keys(hybrids).length;
        },

        hasHybrid: function (idA, idB) {
            return !!hybrids[combinationKey(idA, idB)];
        },

        getMutations: function (idA, idB) {
            const hybrid = hybrids[combinationKey(idA, idB)];
            return hybrid ? hybrid.mutations.slice() : [];
        },

        getDiscoveriesByRarity: function (rarity) {
            return Object.keys(hybrids)
                .map(function (key) {
                    return hybrids[key];
                })
                .filter(function (hybrid) {
                    return hybrid.rarity === rarity;
                });
        },

        // Cancella solo il registro degli ibridi della mod.
        // Non viene eseguito automaticamente con Ctrl+R.
        clearHybrids: function () {
            hybrids = {};

            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (_) {}

            console.warn(
                "[MendelSimulator] Registro degli ibridi cancellato."
            );
        }
    };

    // ---------------------------------------------------------
    // PULIZIA DELLA RICERCA DOPO CTRL+R
    //
    // Non cancella gli ibridi salvati.
    // Funziona solo se i campi sono accessibili nel DOM.
    // ---------------------------------------------------------

    function isSearchField(element) {
        if (!element || !element.matches) return false;

        const tag = element.tagName;
        const type = (element.type || "").toLowerCase();

        if (
            tag !== "INPUT" &&
            tag !== "TEXTAREA" &&
            !element.isContentEditable
        ) {
            return false;
        }

        if (
            tag === "INPUT" &&
            !["search", "text", ""].includes(type)
        ) {
            return false;
        }

        const descriptor = [
            element.id,
            element.name,
            element.className,
            element.placeholder,
            element.getAttribute("aria-label"),
            element.getAttribute("data-testid")
        ].join(" ").toLowerCase();

        return /search|cerca|ricerca|ingredient-filter/.test(descriptor) ||
            type === "search";
    }

    function clearSearchFields() {
        const fields = document.querySelectorAll(
            "input, textarea, [contenteditable='true']"
        );

        fields.forEach(function (element) {
            if (!isSearchField(element)) return;

            try {
                if (element.isContentEditable) {
                    element.textContent = "";
                } else {
                    const prototype = element.tagName === "TEXTAREA"
                        ? window.HTMLTextAreaElement.prototype
                        : window.HTMLInputElement.prototype;

                    const setter = Object.getOwnPropertyDescriptor(
                        prototype,
                        "value"
                    );

                    if (setter && setter.set) {
                        setter.set.call(element, "");
                    } else {
                        element.value = "";
                    }

                    element.dispatchEvent(
                        new Event("input", { bubbles: true })
                    );
                    element.dispatchEvent(
                        new Event("change", { bubbles: true })
                    );
                }
            } catch (error) {
                console.debug(
                    "[MendelSimulator] Campo di ricerca non pulito.",
                    error
                );
            }
        });
    }

    window.addEventListener("keydown", function (event) {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "r"
        ) {
            try {
                sessionStorage.setItem(RELOAD_SEARCH_KEY, "1");
            } catch (_) {}
        }
    }, true);

    let shouldClearSearch = false;

    try {
        shouldClearSearch =
            sessionStorage.getItem(RELOAD_SEARCH_KEY) === "1";

        if (shouldClearSearch) {
            sessionStorage.removeItem(RELOAD_SEARCH_KEY);
        }
    } catch (_) {}

    if (shouldClearSearch) {
        let attempts = 0;
        const maxAttempts = 30;

        function tryClearSearch() {
            clearSearchFields();
            attempts++;

            if (attempts < maxAttempts) {
                window.setTimeout(tryClearSearch, 250);
            }
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                tryClearSearch,
                { once: true }
            );
        } else {
            tryClearSearch();
        }
    }

    console.info(
        "[MendelSimulator " + VERSION + "] Caricato.",
        "Ibridi registrati:",
        Object.keys(hybrids).length
    );
})();
