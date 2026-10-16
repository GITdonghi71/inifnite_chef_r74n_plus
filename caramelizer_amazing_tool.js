
/*
 * Caramellatore Universale — Infinite Chef R74n+
 *
 * Funzioni:
 * - Caramellizza dinamicamente ingredienti diversi.
 * - Crea un ingrediente risultante nel database del gioco.
 * - Preserva forma, tipo, dimensioni e proprietà originali.
 * - Mantiene le reazioni originali dell'ingrediente.
 * - Evita di caramellizzare ripetutamente lo stesso oggetto.
 * - Registra i risultati in un database locale.
 * - Mostra un pannello con gli ingredienti caramellati.
 *
 * API: window.ingredients, addIngredient, addTool.
 */

(function () {
    "use strict";

    const PREFIX = "universal-caramellatore";
    const DB_KEY = "infinite_chef_caramellatore_db_v1";

    if (
        !window.ingredients ||
        typeof window.addIngredient !== "function" ||
        typeof window.addTool !== "function"
    ) {
        console.error(
            "[Caramellatore] API di Infinite Chef non disponibili."
        );
        return;
    }

    // Accesso dinamico al database degli ingredienti.
    const ingredients = new Proxy({}, {
        get: function (_, id) {
            return window.ingredients?.[id];
        },
        set: function (_, id, value) {
            window.ingredients[id] = value;
            return true;
        },
        ownKeys: function () {
            return Reflect.ownKeys(window.ingredients || {});
        },
        getOwnPropertyDescriptor: function (_, id) {
            if (!(id in (window.ingredients || {}))) {
                return undefined;
            }

            return {
                configurable: true,
                enumerable: true,
                writable: true,
                value: window.ingredients[id]
            };
        }
    });

    let database = [];

    try {
        const saved = JSON.parse(
            localStorage.getItem(DB_KEY) || "[]"
        );

        database = Array.isArray(saved) ? saved : [];
    } catch (_) {
        database = [];
    }

    let panel = null;
    let list = null;
    let search = null;
    let statusElement = null;
    let count = null;

    function saveDatabase() {
        try {
            localStorage.setItem(
                DB_KEY,
                JSON.stringify(database)
            );
        } catch (error) {
            console.warn(
                "[Caramellatore] Impossibile salvare il database.",
                error
            );
        }
    }

    function status(message) {
        console.log("[Caramellatore]", message);

        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    // Identifica l'ID dell'ingrediente cliccato.
    function getId(placed) {
        if (typeof placed === "string" && ingredients[placed]) {
            return placed;
        }

        if (!placed || typeof placed !== "object") {
            return null;
        }

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
            ) {
                return candidate;
            }

            if (
                candidate &&
                typeof candidate === "object" &&
                typeof candidate.id === "string" &&
                ingredients[candidate.id]
            ) {
                return candidate.id;
            }
        }

        for (const [id, definition] of Object.entries(
            window.ingredients || {}
        )) {
            if (definition === placed) {
                return id;
            }
        }

        return null;
    }

    // Converte colori esadecimali brevi o lunghi in RGB.
    function parseColor(value) {
        if (typeof value !== "string") {
            return null;
        }

        let hex = value.trim();

        if (/^#[0-9a-f]{3}$/i.test(hex)) {
            hex = "#" + hex.slice(1)
                .split("")
                .map(c => c + c)
                .join("");
        }

        if (!/^#[0-9a-f]{6}$/i.test(hex)) {
            return null;
        }

        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16)
        };
    }

    // Scalda la tonalità mantenendo una parte del colore originale.
    function caramelColor(value, factor) {
        const rgb = parseColor(value);

        if (!rgb) {
            return "#a65316";
        }

        const caramel = {
            r: 166,
            g: 83,
            b: 22
        };

        const mix = (a, b) =>
            Math.round(a * (1 - factor) + b * factor);

        return "#" + [
            mix(rgb.r, caramel.r),
            mix(rgb.g, caramel.g),
            mix(rgb.b, caramel.b)
        ].map(n => n.toString(16).padStart(2, "0")).join("");
    }

    function prettyName(id) {
        return String(id || "ingrediente")
            .replace(/_caramellato$/, "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    // Registra o aggiorna un risultato senza duplicarlo.
    function registerResult(id, originalId) {
        const entry = {
            id: id,
            originalId: originalId,
            name: prettyName(originalId) + " caramellato",
            date: new Date().toLocaleString()
        };

        const index = database.findIndex(item => item.id === id);

        if (index >= 0) {
            database[index] = entry;
        } else {
            database.unshift(entry);
        }

        saveDatabase();
        renderDatabase();
    }

    function makeButton(label, callback) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = label;
        button.style.cssText =
            "padding:7px 10px;margin:3px;border:0;" +
            "border-radius:7px;background:#a65316;" +
            "color:white;cursor:pointer;";

        button.addEventListener("click", callback);

        return button;
    }

    // Pannello per visualizzare i risultati.
    function createPanel() {
        if (panel && panel.isConnected) {
            return;
        }

        panel = document.createElement("div");
        panel.id = PREFIX + "-panel";

        panel.style.cssText =
            "position:fixed;right:14px;bottom:72px;width:330px;" +
            "max-width:calc(100vw - 28px);max-height:65vh;" +
            "overflow:auto;z-index:999999;background:#241811;" +
            "color:#fff0dc;border:2px solid #b76520;" +
            "border-radius:12px;padding:12px;" +
            "font:14px Arial,sans-serif;display:none;" +
            "box-shadow:0 5px 25px #0009;";

        const heading = document.createElement("strong");
        heading.textContent = "🍮 Caramellatore universale";

        const explanation = document.createElement("p");
        explanation.textContent =
            "Seleziona il tool Caramellatore e clicca " +
            "un ingrediente nel gioco.";

        search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Cerca un risultato...";
        search.style.cssText =
            "box-sizing:border-box;width:100%;padding:8px;" +
            "margin:8px 0;border-radius:6px;";

        search.addEventListener("input", renderDatabase);

        count = document.createElement("div");
        count.style.margin = "5px 0";

        list = document.createElement("div");
        list.style.cssText =
            "display:flex;flex-direction:column;gap:6px;";

        statusElement = document.createElement("div");
        statusElement.style.cssText =
            "margin-top:10px;color:#ffc88d;font-size:12px;";

        panel.append(
            heading,
            explanation,
            search,
            count,
            list,
            statusElement,
            makeButton("Aggiorna", renderDatabase),
            makeButton("Esporta JSON", exportDatabase),
            makeButton("Chiudi", function () {
                panel.style.display = "none";
            })
        );

        document.body.appendChild(panel);
        renderDatabase();
    }

    function renderDatabase() {
        if (!list || !count) {
            return;
        }

        list.replaceChildren();

        const query = search
            ? search.value.toLowerCase().trim()
            : "";

        const filtered = database.filter(entry =>
            String(entry.name).toLowerCase().includes(query) ||
            String(entry.id).toLowerCase().includes(query)
        );

        count.textContent =
            "Risultati registrati: " + database.length;

        if (!filtered.length) {
            const empty = document.createElement("div");
            empty.textContent = "Nessun risultato trovato.";
            list.appendChild(empty);
            return;
        }

        filtered.forEach(entry => {
            const row = document.createElement("div");

            row.style.cssText =
                "padding:8px;background:#39271b;" +
                "border-radius:6px;overflow-wrap:anywhere;";

            const name = document.createElement("strong");
            name.textContent = "🍯 " + entry.name;

            const id = document.createElement("small");
            id.textContent =
                "ID: " + entry.id +
                " | Origine: " + entry.originalId;

            id.style.display = "block";

            row.append(name, id);
            list.appendChild(row);
        });
    }

    function exportDatabase() {
        const blob = new Blob(
            [JSON.stringify(database, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "database_caramellatore.json";
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function createLauncher() {
        if (document.getElementById(PREFIX + "-launcher")) {
            return;
        }

        const button = makeButton(
            "🍮 Caramellatore",
            function () {
                createPanel();

                panel.style.display =
                    panel.style.display === "none"
                        ? "block"
                        : "none";

                renderDatabase();
            }
        );

        button.id = PREFIX + "-launcher";
        button.style.cssText +=
            "position:fixed;right:14px;bottom:14px;" +
            "z-index:999999;padding:11px;" +
            "border:2px solid #e2a15a;";

        document.body.appendChild(button);
    }

    // --------------------------------------------------
    // CARAmELLIZZAZIONE UNIVERSALE
    // --------------------------------------------------

    function caramelize(placed) {
        if (!placed || typeof placed !== "object") {
            status("Ingrediente non valido.");
            return;
        }

        if (
            placed.caramellatoreProcessing ||
            placed.caramellatoreDone
        ) {
            status("Questo ingrediente è già caramellato.");
            return;
        }

        const originalId = getId(placed);

        if (!originalId) {
            status("Impossibile identificare l'ingrediente.");
            return;
        }

        if (placed.caramellato === true) {
            status("Ingrediente già caramellato.");
            return;
        }

        const original = ingredients[originalId];

        if (!original) {
            status("Definizione originale non trovata.");
            return;
        }

        placed.caramellatoreProcessing = true;

        try {
            const resultId = originalId.endsWith("_caramellato")
                ? originalId
                : originalId + "_caramellato";

            const originalColor =
                placed.color ||
                original.color ||
                "#c78b55";

            const originalInnerColor =
                placed.innerColor ||
                original.innerColor ||
                originalColor;

            const resultColor = caramelColor(
                originalColor,
                0.68
            );

            const resultInnerColor = caramelColor(
                originalInnerColor,
                0.45
            );

            /*
             * Copia la definizione originale per conservare
             * tipo, forma, reazioni e proprietà compatibili.
             * Non modifica la definizione dell'originale.
             */
            if (!ingredients[resultId]) {
                const definition = {
                    ...original,
                    name: prettyName(originalId) +
                        " caramellato",
                    color: resultColor,
                    innerColor: resultInnerColor,
                    reactions: original.reactions
                        ? { ...original.reactions }
                        : {},
                    caramelized: true,
                    caramelizedFrom: originalId
                };

                window.addIngredient(resultId, definition);
            }

            const resultDefinition = ingredients[resultId];

            if (!resultDefinition) {
                throw new Error(
                    "Il gioco non ha registrato " + resultId
                );
            }

            /*
             * Aggiorna l'oggetto piazzato preservando le
             * proprietà originali non sostituite qui.
             */
            placed.id = resultId;
            placed.name = prettyName(originalId) +
                " caramellato";
            placed.color = resultColor;
            placed.innerColor = resultInnerColor;
            placed.caramellato = true;
            placed.caramellatoreDone = true;

            registerResult(resultId, originalId);

            status("Caramellizzato: " + placed.name);

            console.log(
                "[Caramellatore] Risultato:",
                resultId,
                resultDefinition
            );
        } catch (error) {
            console.error(
                "[Caramellatore] Errore:",
                error
            );

            status("Errore: " + error.message);
        } finally {
            delete placed.caramellatoreProcessing;
        }
    }

    // --------------------------------------------------
    // REGISTRAZIONE DEL TOOL
    // --------------------------------------------------

    window.addTool("caramellatore", {
        name: "Caramellatore universale",
        color: "#b76520",
        shape: "liquid",
        spin: true,

        onSelect: function () {
            createPanel();

            panel.style.display = "block";

            status(
                "Pronto: clicca qualsiasi ingrediente compatibile."
            );
        },

        func: function (placed) {
            caramelize(placed);
        }
    });

    function initialize() {
        createPanel();
        createLauncher();

        status(
            "Caramellatore caricato. Seleziona il tool e prova un ingrediente."
        );

        console.log(
            "[Caramellatore] Caricato correttamente."
        );
    }

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
