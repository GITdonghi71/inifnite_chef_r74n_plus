
/*
 * infinite_alchemy_AI.js
 * Infinite Chef R74n+
 *
 * Alchimia generativa: 4 ingredienti -> 1 nuovo ingrediente.
 * Compatibile con window.ingredients, addIngredient e addTool.
 * Mini AI locale: nomi, colori, forme e sintesi delle reazioni.
 */

(() => {
    "use strict";

    const PREFIX = "infinite-alchemy-ai";
    const TOOL_ID = "infinite_alchemy_AI";
    const DB_KEY = "infinite_alchemy_AI_v1";

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

    let panel;
    let statusNode;
    let selectionNode;
    let resultNode;

    const $ = (tag, text) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        return node;
    };

    function pretty(id) {
        return String(id || "Ingrediente")
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    function getId(placed) {
        if (typeof placed === "string" && ingredients[placed]) {
            return placed;
        }

        if (!placed || typeof placed !== "object") return null;

        const candidates = [
            placed.id,
            placed.ingredientId,
            placed.ingredient_id,
            placed.elementId,
            placed.element_id,
            placed.data?.id,
            placed.ingredient
        ];

        for (const candidate of candidates) {
            if (
                typeof candidate === "string" &&
                ingredients[candidate]
            ) return candidate;

            if (
                candidate &&
                typeof candidate === "object" &&
                typeof candidate.id === "string" &&
                ingredients[candidate.id]
            ) return candidate.id;
        }

        for (const [id, definition] of Object.entries(ingredients)) {
            if (definition === placed) return id;
        }

        return null;
    }

    // Mini AI: hash deterministico per la combinazione non ordinata.
    function hash(text) {
        let h = 2166136261;

        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return (h >>> 0).toString(16).padStart(8, "0");
    }

    function parseColor(value) {
        if (typeof value !== "string") return null;

        let c = value.trim();

        if (/^#[\da-f]{3}$/i.test(c)) {
            c = "#" + c.slice(1).split("")
                .map(x => x + x).join("");
        }

        if (!/^#[\da-f]{6}$/i.test(c)) return null;

        return [
            parseInt(c.slice(1, 3), 16),
            parseInt(c.slice(3, 5), 16),
            parseInt(c.slice(5, 7), 16)
        ];
    }

    function averageColor(values) {
        const colors = values.map(parseColor).filter(Boolean);

        if (!colors.length) return "#9b6bd3";

        const rgb = [0, 1, 2].map(i =>
            Math.round(
                colors.reduce((sum, c) => sum + c[i], 0) /
                colors.length
            )
        );

        return "#" + rgb.map(n =>
            n.toString(16).padStart(2, "0")
        ).join("");
    }

    function mixColors(a, b) {
        const ca = parseColor(a);
        const cb = parseColor(b);

        if (!ca) return cb ? b : "#ffffff";
        if (!cb) return a;

        return "#" + ca.map((v, i) =>
            Math.round((v + cb[i]) / 2)
                .toString(16).padStart(2, "0")
        ).join("");
    }

    // Parole usate per creare nomi alchemici.
    const syllables = [
        "aqua", "flam", "lum", "crist", "verd",
        "sol", "nox", "vit", "arcan", "fer",
        "miel", "ombr", "stell", "flor", "neb",
        "elect", "aer", "terr", "cor", "mag"
    ];

    function makeName(ids, defs, signature) {
        const words = ids.map((id, i) =>
            String(defs[i].name || pretty(id))
                .toLowerCase()
                .replace(/[^a-zà-ÿ]/g, "")
        );

        // Il nome dipende dai quattro ingredienti e dalla loro identità.
        const seed = parseInt(signature.slice(0, 8), 16) >>> 0;
        const parts = [];

        for (let i = 0; i < 3; i++) {
            const word = words[i % words.length];
            const start = (seed >>> (i * 5)) % Math.max(1, word.length);
            const chunk = word.slice(start, start + 3);

            parts.push(
                chunk.length >= 2
                    ? chunk
                    : syllables[(seed + i * 7) % syllables.length]
            );
        }

        // Il quarto ingrediente contribuisce alla radice finale.
        const finalWord = words[3] || "arcano";
        parts.push(
            finalWord.slice(0, Math.min(3, finalWord.length)) ||
            syllables[(seed >>> 4) % syllables.length]
        );

        const raw = parts.join("");
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    function chooseShape(defs) {
        // Preferisce una forma classica già usata da un ingrediente.
        const counts = {};

        for (const def of defs) {
            if (typeof def.shape === "string" && def.shape) {
                counts[def.shape] = (counts[def.shape] || 0) + 1;
            }
        }

        const shapes = Object.keys(counts).sort((a, b) =>
            counts[b] - counts[a] || a.localeCompare(b)
        );

        return shapes[0] || "fruit";
    }

    function chooseType(defs, ids) {
        const counts = {};

        defs.forEach((def, i) => {
            const type = typeof def.type === "string" ? def.type : null;

            if (type && type !== ids[i] && ingredients[type]) {
                counts[type] = (counts[type] || 0) + 1;
            }
        });

        const types = Object.keys(counts).sort((a, b) =>
            counts[b] - counts[a] || a.localeCompare(b)
        );

        return types[0] || "fruit";
    }

    // Combina reazioni compatibili senza modificare le originali.
    function mergeReactions(defs) {
        const merged = {};

        for (const def of defs) {
            if (!def.reactions || typeof def.reactions !== "object") {
                continue;
            }

            for (const [target, reaction] of Object.entries(def.reactions)) {
                if (!reaction || typeof reaction !== "object") continue;

                if (!merged[target]) {
                    merged[target] = { ...reaction };
                } else {
                    // Mantiene la prima definizione per ogni proprietà.
                    for (const [key, value] of Object.entries(reaction)) {
                        if (!(key in merged[target])) {
                            merged[target][key] = value;
                        }
                    }
                }
            }
        }

        return merged;
    }

    function setStatus(message) {
        console.log("[Infinite Alchemy AI]", message);
        if (statusNode) statusNode.textContent = message;
    }

    function renderSelection() {
        if (!selectionNode) return;

        selectionNode.replaceChildren();

        for (let i = 0; i < 4; i++) {
            const entry = selected[i];

            const row = $("div");
            row.style.cssText =
                "padding:5px 8px;margin:3px 0;background:#342c48;" +
                "border-radius:6px;";

            row.textContent = (i + 1) + ". " +
                (entry ? pretty(entry.id) : "In attesa...");

            selectionNode.appendChild(row);
        }
    }

    function createPanel() {
        if (panel && panel.isConnected) return;

        panel = $("div");
        panel.id = PREFIX + "-panel";
        panel.style.cssText =
            "position:fixed;right:14px;bottom:76px;width:320px;" +
            "max-width:calc(100vw - 28px);max-height:70vh;" +
            "overflow:auto;z-index:999999;background:#191526;" +
            "color:#f5edff;border:2px solid #9b6bd3;" +
            "border-radius:12px;padding:12px;" +
            "font:14px Arial,sans-serif;box-shadow:0 5px 24px #0009;";

        const heading = $("strong", "⚗️ Infinite Alchemy AI");
        heading.style.fontSize = "17px";

        const help = $("p",
            "Clicca quattro ingredienti nel gioco. " +
            "Al quarto clic la sintesi viene generata automaticamente."
        );

        selectionNode = $("div");
        statusNode = $("p", "Pronto per la trasmutazione.");
        resultNode = $("div");

        statusNode.style.cssText = "color:#d8b7ff;font-size:12px;";
        resultNode.style.cssText =
            "padding:8px;background:#29213a;border-radius:8px;" +
            "overflow-wrap:anywhere;";

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
                "border:0;border-radius:6px;background:#7450a8;" +
                "color:white;cursor:pointer;";
        }

        panel.append(
            heading, help, selectionNode,
            statusNode, resultNode, resetButton, closeButton
        );

        document.body.appendChild(panel);
        renderSelection();
    }

    function createAlchemy(ids, defs) {
        // L'ordine dei clic non cambia l'identità della ricetta.
        const canonical = [...ids].sort();
        const signature = canonical.join("+");
        const fingerprint = hash(signature);
        const resultId = "alchemy_" + fingerprint;

        if (ingredients[resultId]) {
            resultNode.textContent =
                "✨ Questa combinazione esiste già: " +
                pretty(resultId) + ".";
            setStatus("Combinazione già scoperta.");
            return;
        }

        const color = averageColor(defs.map(d => d.color));
        const innerColor = averageColor(
            defs.map(d => d.innerColor || d.color)
        );

        const shape = chooseShape(defs);
        const type = chooseType(defs, ids);
        const name = makeName(canonical, canonical.map(id => ingredients[id]), fingerprint);
        const reactions = mergeReactions(defs);

        // Piccolo bonus cromatico deterministico: evita risultati spenti.
        const palette = [
            "#bd70f2", "#57d6cb", "#f5b942",
            "#ff718d", "#85dc65", "#75a9ff"
        ];
        const accent = palette[
            parseInt(fingerprint.slice(-2), 16) % palette.length
        ];

        const definition = {
            name: name,
            color: mixColors(color, accent),
            innerColor: mixColors(innerColor, accent),
            type: type,
            shape: shape,
            reactions: reactions,

            // Metadati della mod.
            alchemyAI: true,
            alchemyInputs: canonical.slice(),
            alchemySignature: signature,
            alchemyVersion: 1
        };

        window.addIngredient(resultId, definition);

        if (!ingredients[resultId]) {
            throw new Error(
                "Il gioco non ha registrato il nuovo ingrediente."
            );
        }

        generated.set(resultId, definition);

        resultNode.replaceChildren();

        const title = $("strong", "✨ " + name);
        title.style.cssText =
            "display:block;font-size:17px;color:" + definition.color + ";";

        const idText = $("div", "ID: " + resultId);
        const shapeText = $("div", "Forma: " + shape + " | Tipo: " + type);
        const colorText = $("div", "Colore: " + definition.color);
        const originText = $("div",
            "Sintesi: " + canonical.map(pretty).join(" + ")
        );

        resultNode.append(
            title, idText, shapeText, colorText, originText
        );

        setStatus("Trasmutazione riuscita! Ingrediente registrato.");
        console.log(
            "[Infinite Alchemy AI] Nuovo ingrediente:",
            resultId,
            definition
        );
    }

    function selectIngredient(placed) {
        const id = getId(placed);

        if (!id || !ingredients[id]) {
            setStatus("Non riesco a identificare questo ingrediente.");
            return;
        }

        if (selected.length >= 4) {
            setStatus("Hai già selezionato quattro ingredienti.");
            return;
        }

        // Evita di contare due volte lo stesso oggetto piazzato.
        if (
            placed &&
            typeof placed === "object" &&
            selectedObjects.has(placed)
        ) {
            setStatus("Hai già selezionato questo oggetto.");
            return;
        }

        if (placed && typeof placed === "object") {
            selectedObjects.add(placed);
        }

        selected.push({ id: id, placed: placed });
        renderSelection();

        setStatus(
            "Ingrediente " + selected.length + "/4: " + pretty(id)
        );

        if (selected.length !== 4) return;

        const ids = selected.map(item => item.id);
        const defs = ids.map(itemId => ingredients[itemId]);

        try {
            createAlchemy(ids, defs);
        } catch (error) {
            console.error("[Infinite Alchemy AI]", error);
            setStatus("Errore di trasmutazione: " + error.message);
        } finally {
            selected.length = 0;
            renderSelection();
        }
    }

    // Registra il tool nel sistema di Infinite Chef.
    window.addTool(TOOL_ID, {
        name: "Infinite Alchemy AI",
        color: "#9b6bd3",
        shape: "liquid",
        spin: true,

        onSelect: function () {
            createPanel();
            panel.style.display = "block";
            setStatus("Alchimista attivo: seleziona quattro ingredienti.");
        },

        func: function (placed) {
            createPanel();
            selectIngredient(placed);
        }
    });

    // Pannello apribile anche se il tool non è selezionato.
    function initialize() {
        createPanel();

        const launcher = $("button", "⚗️ Alchemy AI");
        launcher.id = PREFIX + "-launcher";
        launcher.style.cssText =
            "position:fixed;right:14px;bottom:14px;z-index:999998;" +
            "padding:10px 12px;border:2px solid #b99ae9;" +
            "border-radius:9px;background:#5e3c89;color:white;" +
            "font-weight:bold;cursor:pointer;";

        launcher.onclick = () => {
            panel.style.display =
                panel.style.display === "none" ? "block" : "none";
        };

        document.body.appendChild(launcher);
        panel.style.display = "none";

        console.log("[Infinite Alchemy AI] Mod caricata.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();
