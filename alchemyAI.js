
/*
 * alchemy_AI.js
 * Infinite Chef R74N+
 *
 * Infinite Alchemy AI - versione integrata
 *
 * Funzioni:
 * - Trasmutazione di 4 ingredienti in un nuovo ingrediente.
 * - Riconoscimento degli ID reali degli ingredienti.
 * - Supporto per ingredienti base e derivati.
 * - Compatibilità con i registri condivisi dei tool.
 * - Supporto per affumicati, caramellati, salse,
 *   innesti, microorganismi e ibridi.
 * - Recupero di ID da oggetti annidati.
 * - Rilevamento di ingredienti già registrati.
 * - Generazione deterministica dei risultati.
 * - Conservazione dei metadati e delle reazioni.
 * - Interfaccia grafica indipendente.
 *
 * Dipendenze del gioco:
 * window.ingredients
 * window.addIngredient
 * window.addTool
 *
 * Compatibilità aggiuntiva:
 * window.microorganismRegistry
 */

(() => {
    "use strict";

    const PREFIX = "infinite-alchemy-ai";
    const TOOL_ID = "infinite_alchemy_AI";
    const VERSION = 2;

    if (
        !window.ingredients ||
        typeof window.addIngredient !== "function" ||
        typeof window.addTool !== "function"
    ) {
        console.error(
            "[Infinite Alchemy AI] API di Infinite Chef non disponibili."
        );
        return;
    }

    const ingredients = window.ingredients;
    const selected = [];
    const selectedObjects = new WeakSet();
    const generated = new Map();

    let panel = null;
    let statusNode = null;
    let selectionNode = null;
    let resultNode = null;
    let launcher = null;

    // ---------------------------------------------------------
    // UTILITÀ DOM
    // ---------------------------------------------------------

    function $(tag, text) {
        const node = document.createElement(tag);

        if (text !== undefined) {
            node.textContent = text;
        }

        return node;
    }

    function pretty(id) {
        return String(id || "Ingrediente")
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    function setStatus(message) {
        console.log("[Infinite Alchemy AI]", message);

        if (statusNode) {
            statusNode.textContent = message;
        }
    }

    function isObject(value) {
        return value !== null && typeof value === "object";
    }

    function hasIngredient(id) {
        return (
            typeof id === "string" &&
            Object.prototype.hasOwnProperty.call(
                ingredients,
                id
            ) &&
            isObject(ingredients[id])
        );
    }

    // ---------------------------------------------------------
    // REGISTRI DEI TOOL
    // ---------------------------------------------------------

    /*
     * Non crea ID fittizi.
     *
     * Cerca nei registri condivisi e verifica che l'ingrediente
     * sia effettivamente presente nel database del gioco.
     *
     * I registri dei tool possono contenere anche metadati,
     * scoperte o tratti: questi non vengono trattati
     * automaticamente come ingredienti.
     */

    function getExternalRegistries() {
        const registries = [];

        if (isObject(window.microorganismRegistry)) {
            const registry = window.microorganismRegistry;

            registries.push({
                name: "microorganisms",
                value: registry.microorganisms
            });

            registries.push({
                name: "eggs",
                value: registry.eggs
            });

            registries.push({
                name: "discoveries",
                value: registry.discoveries
            });
        }

        return registries;
    }

    function findRegisteredId(value) {
        if (!isObject(value)) return null;

        for (const [id, definition] of Object.entries(
            ingredients
        )) {
            if (definition === value) {
                return id;
            }
        }

        return null;
    }

    /*
     * Recupera l'ID dagli oggetti usati comunemente da
     * Infinite Chef e dai tool della repository.
     *
     * La ricerca annidata è limitata per evitare cicli
     * e attraversamenti eccessivi.
     */

    function getId(placed) {
        const visited = new WeakSet();

        const directFields = [
            "id",
            "ingredientId",
            "ingredient_id",
            "elementId",
            "element_id",
            "itemId",
            "item_id",
            "resultId",
            "result_id",
            "ingredient",
            "element",
            "item",
            "result",
            "data",
            "props",
            "instance",
            "metadata",
            "definition"
        ];

        function search(value, depth = 0) {
            if (depth > 6 || value == null) {
                return null;
            }

            if (typeof value === "string") {
                return hasIngredient(value) ? value : null;
            }

            if (!isObject(value)) {
                return null;
            }

            if (visited.has(value)) {
                return null;
            }

            visited.add(value);

            // L'oggetto potrebbe essere la definizione stessa.
            const directMatch = findRegisteredId(value);

            if (directMatch) {
                return directMatch;
            }

            // Prima cerca i campi più probabili.
            for (const field of directFields) {
                if (!(field in value)) continue;

                const found = search(
                    value[field],
                    depth + 1
                );

                if (found) {
                    return found;
                }
            }

            // Compatibilità con array o wrapper non standard.
            if (Array.isArray(value)) {
                for (const item of value) {
                    const found = search(item, depth + 1);

                    if (found) return found;
                }
            }

            return null;
        }

        const id = search(placed);

        if (id) return id;

        /*
         * Alcuni tool conservano informazioni supplementari
         * nel registro dei microorganismi.
         *
         * Il registro aiuta a individuare la provenienza,
         * ma non sostituisce window.ingredients.
         */

        for (const registry of getExternalRegistries()) {
            const entries = registry.value;

            if (!isObject(entries)) continue;

            for (const [registryId, record] of Object.entries(
                entries
            )) {
                if (!isObject(record)) continue;

                if (
                    record === placed &&
                    hasIngredient(registryId)
                ) {
                    return registryId;
                }

                const possibleIds = [
                    record.id,
                    record.ingredientId,
                    record.ingredient_id,
                    record.elementId,
                    record.element_id,
                    record.eggId,
                    record.ingredient?.id
                ];

                for (const candidate of possibleIds) {
                    if (hasIngredient(candidate)) {
                        return candidate;
                    }
                }
            }
        }

        return null;
    }

    // ---------------------------------------------------------
    // COLORI
    // ---------------------------------------------------------

    function parseColor(value) {
        if (typeof value !== "string") {
            return null;
        }

        let color = value.trim();

        if (/^#[\da-f]{3}$/i.test(color)) {
            color = "#" + color.slice(1)
                .split("")
                .map(char => char + char)
                .join("");
        }

        if (!/^#[\da-f]{6}$/i.test(color)) {
            return null;
        }

        return [
            parseInt(color.slice(1, 3), 16),
            parseInt(color.slice(3, 5), 16),
            parseInt(color.slice(5, 7), 16)
        ];
    }

    function rgbToHex(rgb) {
        return "#" + rgb
            .map(value => Math.max(
                0,
                Math.min(255, Math.round(value))
            ).toString(16).padStart(2, "0"))
            .join("");
    }

    function averageColor(values) {
        const colors = values
            .map(parseColor)
            .filter(Boolean);

        if (!colors.length) {
            return "#9b6bd3";
        }

        return rgbToHex([0, 1, 2].map(index =>
            colors.reduce(
                (sum, color) => sum + color[index],
                0
            ) / colors.length
        ));
    }

    function mixColors(first, second) {
        const a = parseColor(first);
        const b = parseColor(second);

        if (!a) return b ? second : "#ffffff";
        if (!b) return first;

        return rgbToHex(
            a.map((value, index) =>
                (value + b[index]) / 2
            )
        );
    }

    // ---------------------------------------------------------
    // HASH E IDENTITÀ DELLA COMBINAZIONE
    // ---------------------------------------------------------

    function hash(text) {
        let result = 2166136261;

        for (let i = 0; i < text.length; i++) {
            result ^= text.charCodeAt(i);
            result = Math.imul(result, 16777619);
        }

        return (result >>> 0)
            .toString(16)
            .padStart(8, "0");
    }

    // ---------------------------------------------------------
    // NOME DELL'INGREDIENTE
    // ---------------------------------------------------------

    const syllables = [
        "aqua", "flam", "lum", "crist", "verd",
        "sol", "nox", "vit", "arcan", "fer",
        "miel", "ombr", "stell", "flor", "neb",
        "elect", "aer", "terr", "cor", "mag"
    ];

    function makeName(ids, defs, signature) {
        const seed = parseInt(signature.slice(0, 8), 16) >>> 0;

        const words = ids.map((id, index) =>
            String(defs[index]?.name || pretty(id))
                .toLowerCase()
                .replace(/[^a-zà-ÿ]/g, "")
        );

        const parts = [];

        for (let i = 0; i < 3; i++) {
            const word = words[i % words.length] || "";
            const start = (
                seed >>> (i * 5)
            ) % Math.max(1, word.length);

            const chunk = word.slice(start, start + 3);

            parts.push(
                chunk.length >= 2
                    ? chunk
                    : syllables[
                        (seed + i * 7) % syllables.length
                    ]
            );
        }

        const lastWord = words[3] || "arcano";

        parts.push(
            lastWord.slice(0, 3) ||
            syllables[(seed >>> 4) % syllables.length]
        );

        const result = parts.join("");

        return result.charAt(0).toUpperCase() +
            result.slice(1);
    }

    // ---------------------------------------------------------
    // FORMA E TIPO
    // ---------------------------------------------------------

    function chooseShape(defs) {
        const counts = {};

        for (const definition of defs) {
            if (
                typeof definition.shape === "string" &&
                definition.shape
            ) {
                counts[definition.shape] =
                    (counts[definition.shape] || 0) + 1;
            }
        }

        const shapes = Object.keys(counts).sort(
            (a, b) =>
                counts[b] - counts[a] ||
                a.localeCompare(b)
        );

        return shapes[0] || "fruit";
    }

    function chooseType(defs, ids) {
        const counts = {};

        defs.forEach((definition, index) => {
            const type = definition.type;

            if (
                typeof type === "string" &&
                type !== ids[index] &&
                hasIngredient(type)
            ) {
                counts[type] = (counts[type] || 0) + 1;
            }
        });

        const types = Object.keys(counts).sort(
            (a, b) =>
                counts[b] - counts[a] ||
                a.localeCompare(b)
        );

        return types[0] || "fruit";
    }

    // ---------------------------------------------------------
    // REAZIONI
    // ---------------------------------------------------------

    function mergeReactions(defs) {
        const merged = {};

        for (const definition of defs) {
            const reactions = definition.reactions;

            if (!isObject(reactions)) continue;

            for (const [target, reaction] of Object.entries(
                reactions
            )) {
                if (!isObject(reaction)) continue;

                if (!merged[target]) {
                    merged[target] = { ...reaction };
                    continue;
                }

                for (const [key, value] of Object.entries(
                    reaction
                )) {
                    if (!(key in merged[target])) {
                        merged[target][key] = value;
                    }
                }
            }
        }

        return merged;
    }

    // ---------------------------------------------------------
    // METADATI DERIVATI
    // ---------------------------------------------------------

    function getIngredientCategory(id, definition) {
        const text = [
            id,
            definition.name,
            definition.category,
            definition.source,
            definition.origin,
            definition.tool,
            definition.createdBy
        ]
            .filter(value => typeof value === "string")
            .join(" ")
            .toLowerCase();

        const categories = [
            {
                label: "Affumicato",
                pattern: /smok|affumicat/
            },
            {
                label: "Caramellato",
                pattern: /caramel|caramellat/
            },
            {
                label: "Salsa",
                pattern: /sauce|salsa|saucemaker/
            },
            {
                label: "Innesto",
                pattern: /innesto|graft/
            },
            {
                label: "Microorganismo",
                pattern: /microorgan|bacter|batter|fungus|yeast/
            },
            {
                label: "Ibrido",
                pattern: /hybrid|ibrid|mendel/
            }
        ];

        const matches = categories
            .filter(category => category.pattern.test(text))
            .map(category => category.label);

        return matches.length ? matches : ["Base o altro"];
    }

    // ---------------------------------------------------------
    // INTERFACCIA: SELEZIONE
    // ---------------------------------------------------------

    function renderSelection() {
        if (!selectionNode) return;

        selectionNode.replaceChildren();

        for (let index = 0; index < 4; index++) {
            const entry = selected[index];
            const row = $("div");

            row.style.cssText =
                "padding:6px 8px;margin:3px 0;" +
                "background:#342c48;border-radius:6px;" +
                "overflow-wrap:anywhere;";

            if (entry) {
                const definition = ingredients[entry.id];
                const categories = getIngredientCategory(
                    entry.id,
                    definition
                );

                row.textContent =
                    (index + 1) + ". " +
                    (definition.name || pretty(entry.id)) +
                    " [" + entry.id + "] — " +
                    categories.join(", ");
            } else {
                row.textContent =
                    (index + 1) + ". In attesa...";
            }

            selectionNode.appendChild(row);
        }
    }

    // ---------------------------------------------------------
    // INTERFACCIA: PANNELLO
    // ---------------------------------------------------------

    function createPanel() {
        if (panel && panel.isConnected) {
            return;
        }

        panel = $("div");
        panel.id = PREFIX + "-panel";

        panel.style.cssText =
            "position:fixed;right:14px;bottom:76px;" +
            "width:360px;max-width:calc(100vw - 28px);" +
            "max-height:75vh;overflow:auto;" +
            "z-index:999999;background:#191526;" +
            "color:#f5edff;border:2px solid #9b6bd3;" +
            "border-radius:12px;padding:12px;" +
            "font:14px Arial,sans-serif;" +
            "box-shadow:0 5px 24px #0009;";

        const heading = $("strong", "⚗️ Infinite Alchemy AI");
        heading.style.fontSize = "17px";

        const help = $("p",
            "Seleziona quattro ingredienti nel gioco. " +
            "Sono supportati anche gli ingredienti derivati " +
            "registrati dagli altri tool."
        );

        selectionNode = $("div");
        statusNode = $("p", "Pronto per la trasmutazione.");
        resultNode = $("div");

        statusNode.style.cssText =
            "color:#d8b7ff;font-size:12px;";

        resultNode.style.cssText =
            "padding:8px;background:#29213a;" +
            "border-radius:8px;overflow-wrap:anywhere;";

        const resetButton = $("button", "↻ Azzera selezione");

        resetButton.onclick = () => {
            selected.length = 0;
            renderSelection();
            setStatus("Selezione azzerata.");
        };

        const closeButton = $("button", "Chiudi");

        closeButton.onclick = () => {
            panel.style.display = "none";
        };

        for (const button of [resetButton, closeButton]) {
            button.style.cssText =
                "padding:7px 10px;margin:4px 4px 0 0;" +
                "border:0;border-radius:6px;" +
                "background:#7450a8;color:white;" +
                "cursor:pointer;";
        }

        panel.append(
            heading,
            help,
            selectionNode,
            statusNode,
            resultNode,
            resetButton,
            closeButton
        );

        document.body.appendChild(panel);
        renderSelection();
    }

    // ---------------------------------------------------------
    // CREAZIONE DEL NUOVO INGREDIENTE
    // ---------------------------------------------------------

    function createAlchemy(inputIds) {
        /*
         * Ordinamento canonico:
         * A+B+C+D e D+C+B+A producono lo stesso ID.
         */

        const canonical = [...inputIds].sort();
        const signature = canonical.join("+");
        const fingerprint = hash(signature);
        const resultId = "alchemy_" + fingerprint;

        if (hasIngredient(resultId)) {
            resultNode.textContent =
                "✨ Combinazione già scoperta: " +
                pretty(resultId) + " (" + resultId + ").";

            setStatus("Combinazione già presente nel gioco.");
            return;
        }

        /*
         * Le definizioni devono seguire lo stesso ordine
         * degli ID canonici per mantenere la coerenza.
         */

        const defs = canonical.map(id => ingredients[id]);

        if (defs.some(definition => !isObject(definition))) {
            throw new Error(
                "Uno degli ingredienti non è più disponibile."
            );
        }

        const color = averageColor(
            defs.map(definition => definition.color)
        );

        const innerColor = averageColor(
            defs.map(definition =>
                definition.innerColor || definition.color
            )
        );

        const shape = chooseShape(defs);
        const type = chooseType(defs, canonical);
        const name = makeName(canonical, defs, fingerprint);
        const reactions = mergeReactions(defs);

        const palette = [
            "#bd70f2",
            "#57d6cb",
            "#f5b942",
            "#ff718d",
            "#85dc65",
            "#75a9ff"
        ];

        const accent = palette[
            parseInt(fingerprint.slice(-2), 16) %
            palette.length
        ];

        /*
         * Copia soltanto i metadati esplicitamente selezionati.
         * Le definizioni originali non vengono modificate.
         */

        const categories = {};

        for (const id of canonical) {
            categories[id] = getIngredientCategory(
                id,
                ingredients[id]
            );
        }

        const definition = {
            name,
            color: mixColors(color, accent),
            innerColor: mixColors(innerColor, accent),
            type,
            shape,
            reactions,

            // Metadati della trasmutazione.
            alchemyAI: true,
            alchemyVersion: VERSION,
            alchemyInputs: canonical.slice(),
            alchemySignature: signature,
            alchemyInputCategories: categories,
            alchemyCreatedAt: new Date().toISOString()
        };

        window.addIngredient(resultId, definition);

        if (!hasIngredient(resultId)) {
            throw new Error(
                "Il gioco non ha registrato il nuovo ingrediente."
            );
        }

        generated.set(resultId, definition);

        // -----------------------------------------------------
        // RISULTATO VISIVO
        // -----------------------------------------------------

        resultNode.replaceChildren();

        const title = $("strong", "✨ " + name);

        title.style.cssText =
            "display:block;font-size:17px;color:" +
            definition.color + ";";

        const idText = $("div", "ID: " + resultId);

        const shapeText = $("div",
            "Forma: " + shape + " | Tipo: " + type
        );

        const colorText = $("div",
            "Colore: " + definition.color
        );

        const originText = $("div",
            "Ingredienti: " + canonical.map(id => {
                const def = ingredients[id];

                return (def.name || pretty(id)) +
                    " [" + id + "]";
            }).join(" + ")
        );

        const categoriesText = $("div",
            "Categorie: " + canonical.map(id =>
                pretty(id) + " → " +
                categories[id].join(", ")
            ).join(" | ")
        );

        resultNode.append(
            title,
            idText,
            shapeText,
            colorText,
            originText,
            categoriesText
        );

        setStatus(
            "Trasmutazione riuscita: ingrediente registrato."
        );

        console.log(
            "[Infinite Alchemy AI] Nuovo ingrediente:",
            resultId,
            definition
        );
    }

    // ---------------------------------------------------------
    // SELEZIONE DEGLI INGREDIENTI
    // ---------------------------------------------------------

    function selectIngredient(placed) {
        const id = getId(placed);

        if (!id || !hasIngredient(id)) {
            setStatus(
                "Ingrediente non riconosciuto. " +
                "Verifica che il tool lo abbia registrato " +
                "in window.ingredients."
            );

            console.warn(
                "[Infinite Alchemy AI] Oggetto non riconosciuto:",
                placed
            );

            return;
        }

        if (selected.length >= 4) {
            setStatus(
                "Hai già selezionato quattro ingredienti."
            );
            return;
        }

        /*
         * Evita il doppio clic sullo stesso oggetto piazzato.
         * Non impedisce di usare due oggetti distinti
         * con lo stesso ID.
         */

        if (
            isObject(placed) &&
            selectedObjects.has(placed)
        ) {
            setStatus("Hai già selezionato questo oggetto.");
            return;
        }

        if (isObject(placed)) {
            selectedObjects.add(placed);
        }

        selected.push({
            id,
            placed
        });

        renderSelection();

        setStatus(
            "Ingrediente " + selected.length +
            "/4: " + pretty(id)
        );

        if (selected.length !== 4) {
            return;
        }

        const ids = selected.map(entry => entry.id);

        try {
            createAlchemy(ids);
        } catch (error) {
            console.error(
                "[Infinite Alchemy AI] Errore:",
                error
            );

            setStatus(
                "Errore di trasmutazione: " +
                error.message
            );
        } finally {
            selected.length = 0;
            renderSelection();
        }
    }

    // ---------------------------------------------------------
    // REGISTRAZIONE DEL TOOL NEL GIOCO
    // ---------------------------------------------------------

    window.addTool(TOOL_ID, {
        name: "Infinite Alchemy AI",
        color: "#9b6bd3",
        shape: "liquid",
        spin: true,

        onSelect: function () {
            createPanel();

            panel.style.display = "block";

            setStatus(
                "Alchimista attivo: seleziona quattro ingredienti."
            );
        },

        func: function (placed) {
            createPanel();
            selectIngredient(placed);
        }
    });

    // ---------------------------------------------------------
    // PULSANTE DI ACCESSO RAPIDO
    // ---------------------------------------------------------

    function initialize() {
        createPanel();

        if (
            document.getElementById(PREFIX + "-launcher")
        ) {
            return;
        }

        launcher = $("button", "⚗️ Alchemy AI");
        launcher.id = PREFIX + "-launcher";

        launcher.style.cssText =
            "position:fixed;right:14px;bottom:14px;" +
            "z-index:999998;padding:10px 12px;" +
            "border:2px solid #b99ae9;border-radius:9px;" +
            "background:#5e3c89;color:white;" +
            "font-weight:bold;cursor:pointer;";

        launcher.onclick = () => {
            const isHidden = panel.style.display === "none";

            panel.style.display = isHidden ? "block" : "none";
        };

        document.body.appendChild(launcher);
        panel.style.display = "none";

        console.log(
            "[Infinite Alchemy AI] Mod caricata.",
            {
                ingredients: Object.keys(ingredients).length,
                microorganismRegistry:
                    Boolean(window.microorganismRegistry)
            }
        );
    }

    // ---------------------------------------------------------
    // AVVIO
    // ---------------------------------------------------------

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }
})();
