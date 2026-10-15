
(function () {
    "use strict";

    // =========================================================
    // INFINITE CHEF - AFFUMICATORE UNIVERSALE
    // Preserva forma e colori originali quando disponibili
    // Ricette tramite reactions
    // Database visivo persistente
    // =========================================================

    const PREFIX = "universal-smoker";
    const DB_KEY = "infinite_chef_smoked_database_v2";

    if (
        !window.ingredients ||
        typeof addIngredient !== "function" ||
        typeof addTool !== "function"
    ) {
        console.error("[Affumicatore] API del gioco non disponibili.");
        alert("Affumicatore: API di Infinite Chef non disponibili.");
        return;
    }

    const ingredients = window.ingredients;
    let database = [];

    try {
        const stored = localStorage.getItem(DB_KEY);
        database = stored ? JSON.parse(stored) : [];

        if (!Array.isArray(database)) {
            database = [];
        }
    } catch (error) {
        database = [];
    }

    // ---------------------------------------------------------
    // NOMI VISIBILI
    // ---------------------------------------------------------

    function prettyName(id) {
        const names = {
            smoker_wood_chips: "Trucioli per affumicatura",
            oak_wood_chips: "Trucioli di quercia",
            apple_wood_chips: "Trucioli di melo",
            cherry_wood_chips: "Trucioli di ciliegio",
            smoked_meat: "Carne affumicata",
            smoked_beef: "Manzo affumicato",
            smoked_pork: "Maiale affumicato",
            smoked_chicken: "Pollo affumicato",
            smoked_bacon: "Pancetta affumicata",
            smoked_ham: "Prosciutto affumicato",
            smoked_salami: "Salame affumicato",
            smoked_fish: "Pesce affumicato",
            smoked_salmon: "Salmone affumicato",
            smoked_tuna: "Tonno affumicato",
            smoked_cheese: "Formaggio affumicato",
            smoked_cheddar: "Cheddar affumicato"
        };

        return names[id] ||
            String(id || "ingrediente sconosciuto")
                .replace(/_/g, " ")
                .replace(/\b\w/g, function (letter) {
                    return letter.toUpperCase();
                });
    }

    // ---------------------------------------------------------
    // INGREDIENTI AFFUMICATI PREDEFINITI
    // ---------------------------------------------------------

    const definitions = [
        ["smoker_wood_chips", "#a96f3e", "#69411f", "plant"],
        ["oak_wood_chips", "#95613b", "#593820", "plant"],
        ["apple_wood_chips", "#bd8050", "#77482a", "plant"],
        ["cherry_wood_chips", "#a34d4d", "#652b32", "plant"],

        ["smoked_meat", "#75412f", "#48251e", "meat"],
        ["smoked_beef", "#793b32", "#49221f", "beef"],
        ["smoked_pork", "#b66c68", "#75413f", "pork"],
        ["smoked_chicken", "#c49a61", "#82613b", "chicken"],
        ["smoked_bacon", "#b45f58", "#6d302e", "bacon"],
        ["smoked_ham", "#c17a79", "#7c4648", "ham"],
        ["smoked_salami", "#8b3938", "#501f23", "salami"],
        ["smoked_fish", "#8e9892", "#4e625e", "fish"],
        ["smoked_salmon", "#d18467", "#8b4b43", "salmon"],
        ["smoked_tuna", "#8c6d68", "#513d42", "tuna"],
        ["smoked_cheese", "#c9a34e", "#80652e", "cheese"],
        ["smoked_cheddar", "#d18a32", "#8d521c", "cheddar"]
    ];

    definitions.forEach(function (entry) {
        const id = entry[0];

        if (!ingredients[id]) {
            addIngredient(id, {
                color: entry[1],
                innerColor: entry[2],
                type: entry[3]
            });
        }
    });

    // ---------------------------------------------------------
    // RICETTE PREDEFINITE
    // ---------------------------------------------------------

    const recipePairs = [
        ["meat", "smoked_meat"],
        ["beef", "smoked_beef"],
        ["pork", "smoked_pork"],
        ["chicken", "smoked_chicken"],
        ["bacon", "smoked_bacon"],
        ["ham", "smoked_ham"],
        ["salami", "smoked_salami"],
        ["fish", "smoked_fish"],
        ["salmon", "smoked_salmon"],
        ["tuna", "smoked_tuna"],
        ["cheese", "smoked_cheese"],
        ["cheddar", "smoked_cheddar"]
    ];

    recipePairs.forEach(function (pair) {
        const baseId = pair[0];
        const resultId = pair[1];
        const base = ingredients[baseId];

        if (!base) {
            console.warn(
                "[Affumicatore] Ingrediente base non trovato:",
                baseId
            );
            return;
        }

        if (!base.reactions) {
            base.reactions = {};
        }

        base.reactions.smoke = {
            set1: resultId
        };
    });

    // ---------------------------------------------------------
    // DATABASE VISIVO
    // ---------------------------------------------------------

    function saveDatabase() {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(database));
        } catch (error) {
            console.warn(
                "[Affumicatore] Salvataggio locale non riuscito.",
                error
            );
        }
    }

    let panel;
    let list;
    let search;
    let count;
    let statusElement;

    function registerSmoked(placed, smokedId) {
        const id = String(smokedId || "unknown");

        const item = {
            id: id,
            name: prettyName(id) + " (affumicato)",
            date: new Date().toLocaleString()
        };

        const index = database.findIndex(function (entry) {
            return entry.id === id;
        });

        if (index === -1) {
            database.unshift(item);
        } else {
            database[index] = item;
        }

        saveDatabase();
        renderDatabase();

        if (statusElement) {
            statusElement.textContent = "Affumicato: " + item.name;
        }
    }

    // ---------------------------------------------------------
    // PULSANTI
    // ---------------------------------------------------------

    function makeButton(text, callback) {
        const button = document.createElement("button");

        button.textContent = text;
        button.style.cssText =
            "padding:7px 10px;border:0;border-radius:7px;" +
            "background:#65402d;color:white;cursor:pointer;";

        button.addEventListener("click", callback);

        return button;
    }

    // ---------------------------------------------------------
    // PANNELLO DATABASE
    // ---------------------------------------------------------

    function createPanel() {
        const existingPanel = document.getElementById(
            PREFIX + "-panel"
        );

        if (existingPanel) {
            panel = existingPanel;

            list = panel.querySelector("[data-smoker-list]");
            search = panel.querySelector("[data-smoker-search]");
            count = panel.querySelector("[data-smoker-count]");
            statusElement = panel.querySelector("[data-smoker-status]");

            return;
        }

        panel = document.createElement("div");
        panel.id = PREFIX + "-panel";

        panel.style.cssText =
            "position:fixed;right:14px;bottom:72px;width:320px;" +
            "max-width:calc(100vw - 28px);max-height:70vh;" +
            "overflow:auto;z-index:999999;background:#241a16;" +
            "color:#fff3e6;border:2px solid #986443;border-radius:12px;" +
            "padding:12px;font:14px Arial,sans-serif;display:none;" +
            "box-shadow:0 5px 25px #0009;";

        const heading = document.createElement("div");

        heading.style.cssText =
            "display:flex;justify-content:space-between;" +
            "align-items:center;gap:8px;margin-bottom:10px;";

        const title = document.createElement("strong");
        title.textContent = "🔥 Database affumicati";

        heading.append(
            title,
            makeButton("Chiudi", function () {
                panel.style.display = "none";
            })
        );

        search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Cerca ingrediente...";
        search.dataset.smokerSearch = "";

        search.style.cssText =
            "box-sizing:border-box;width:100%;padding:9px;" +
            "margin-bottom:9px;border-radius:7px;" +
            "border:1px solid #986443;";

        search.addEventListener("input", renderDatabase);

        count = document.createElement("div");
        count.dataset.smokerCount = "";

        count.style.cssText =
            "margin:5px 0 9px;color:#e8b98e;";

        list = document.createElement("div");
        list.dataset.smokerList = "";

        list.style.cssText =
            "display:flex;flex-direction:column;gap:6px;" +
            "max-height:30vh;overflow:auto;";

        statusElement = document.createElement("div");
        statusElement.dataset.smokerStatus = "";

        statusElement.style.cssText =
            "font-size:12px;color:#e8b98e;margin-top:10px;";

        const buttons = document.createElement("div");

        buttons.style.cssText =
            "display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;";

        buttons.append(
            makeButton("Aggiorna", renderDatabase),
            makeButton("Esporta JSON", exportDatabase),
            makeButton("Svuota", clearDatabase)
        );

        panel.append(
            heading,
            search,
            count,
            list,
            statusElement,
            buttons
        );

        document.body.appendChild(panel);

        renderDatabase();
    }

    // ---------------------------------------------------------
    // RENDER DATABASE
    // ---------------------------------------------------------

    function renderDatabase() {
        if (!list || !count) {
            return;
        }

        list.replaceChildren();

        const query = search
            ? search.value.toLowerCase().trim()
            : "";

        const filtered = database.filter(function (entry) {
            const name = String(entry.name || "").toLowerCase();
            const id = String(entry.id || "").toLowerCase();

            return name.includes(query) || id.includes(query);
        });

        count.textContent =
            "Ingredienti registrati: " + database.length;

        if (filtered.length === 0) {
            const empty = document.createElement("div");

            empty.textContent = database.length
                ? "Nessun risultato trovato."
                : "Nessun ingrediente ancora. Seleziona l'affumicatore e clicca un ingrediente.";

            empty.style.cssText =
                "padding:10px;color:#d9c4b5;";

            list.appendChild(empty);
            return;
        }

        filtered.forEach(function (entry) {
            const row = document.createElement("div");

            row.style.cssText =
                "padding:9px;border-radius:7px;background:#392720;" +
                "border:1px solid #604333;overflow-wrap:anywhere;";

            const name = document.createElement("div");

            name.textContent = "🔥 " + entry.name;
            name.style.fontWeight = "bold";

            const id = document.createElement("small");

            id.textContent = "ID: " + entry.id;

            id.style.cssText =
                "display:block;margin-top:4px;color:#cbb2a0;";

            row.append(name, id);
            list.appendChild(row);
        });
    }

    // ---------------------------------------------------------
    // ESPORTAZIONE JSON
    // ---------------------------------------------------------

    function exportDatabase() {
        const blob = new Blob(
            [JSON.stringify(database, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "database_affumicati.json";

        link.click();

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    // ---------------------------------------------------------
    // SVUOTA DATABASE
    // ---------------------------------------------------------

    function clearDatabase() {
        if (!confirm("Vuoi svuotare il database degli affumicati?")) {
            return;
        }

        database = [];

        saveDatabase();
        renderDatabase();

        if (statusElement) {
            statusElement.textContent = "Database svuotato.";
        }
    }

    // ---------------------------------------------------------
    // PULSANTE DI AVVIO
    // ---------------------------------------------------------

    function createLauncher() {
        if (document.getElementById(PREFIX + "-launcher")) {
            return;
        }

        const button = makeButton(
            "🔥 Affumicatore / Database",
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
            "position:fixed;right:14px;bottom:14px;z-index:999999;" +
            "padding:12px;background:#6b3e28;" +
            "border:2px solid #986443;border-radius:10px;" +
            "box-shadow:0 4px 14px #0008;";

        document.body.appendChild(button);
    }

    // ---------------------------------------------------------
    // UTILITÀ: COPIA PROPRIETÀ VISIVE
    // ---------------------------------------------------------

    function copyIfPresent(target, source, key) {
        if (
            source &&
            Object.prototype.hasOwnProperty.call(source, key)
        ) {
            target[key] = source[key];
        }
    }

    // ---------------------------------------------------------
    // STRUMENTO AFFUMICATORE UNIVERSALE
    // ---------------------------------------------------------

    addTool("smoker", {
        name: "Affumicatore universale",

        // Aspetto dello strumento, non dell'ingrediente trattato.
        shape: "liquid",
        color: "#69412f",
        spin: true,

        onSelect: function () {
            createPanel();

            if (statusElement) {
                statusElement.textContent =
                    "Affumicatore pronto: clicca un ingrediente.";
            }
        },

        func: function (placed) {
            if (!placed || typeof placed !== "object") {
                console.warn(
                    "[Affumicatore] Oggetto non valido:",
                    placed
                );
                return;
            }

            if (
                placed.universalSmokerProcessing ||
                placed.universalSmokerDone
            ) {
                return;
            }

            placed.universalSmokerProcessing = true;

            try {
                console.log(
                    "[Affumicatore] Oggetto ricevuto:",
                    placed
                );

                // Individua l'ID originale.
                const possibiliId = [
                    placed.id,
                    placed.ingredientId,
                    placed.ingredient_id,
                    placed.elementId,
                    placed.element_id,
                    placed.data && placed.data.id,
                    placed.ingredient
                ];

                let originalId = null;

                for (const valore of possibiliId) {
                    if (
                        typeof valore === "string" &&
                        valore.trim() !== ""
                    ) {
                        originalId = valore;
                        break;
                    }

                    if (
                        valore &&
                        typeof valore === "object" &&
                        typeof valore.id === "string" &&
                        valore.id.trim() !== ""
                    ) {
                        originalId = valore.id;
                        break;
                    }
                }

                if (!originalId) {
                    console.error(
                        "[Affumicatore] ID non trovato:",
                        Object.keys(placed)
                    );

                    if (statusElement) {
                        statusElement.textContent =
                            "Non riesco a identificare l'ingrediente.";
                    }

                    return;
                }

                // Recupera la definizione originale prima di cambiare ID.
                const originalDefinition = ingredients[originalId] || {};

                // Se è già affumicato, non aggiungere un altro suffisso.
                const smokedId = originalId.endsWith("_smoked")
                    ? originalId
                    : originalId + "_smoked";

                const originalName =
                    originalDefinition.name ||
                    placed.name ||
                    prettyName(originalId);

                const baseName = String(originalName)
                    .replace(/_smoked$/, "")
                    .replace(/\s*\(affumicato\)$/i, "");

                const smokedName = baseName + " (affumicato)";

                // Salva le proprietà visive dell'oggetto originale.
                const visualSource = {};

                [
                    "shape",
                    "color",
                    "innerColor",
                    "type",
                    "h",
                    "s",
                    "l",
                    "width",
                    "height",
                    "size",
                    "texture",
                    "emoji",
                    "image"
                ].forEach(function (key) {
                    if (
                        placed[key] !== undefined &&
                        placed[key] !== null
                    ) {
                        visualSource[key] = placed[key];
                    } else {
                        copyIfPresent(
                            visualSource,
                            originalDefinition,
                            key
                        );
                    }
                });

                // Crea la definizione solo se non esiste già.
                if (!ingredients[smokedId]) {
                    const newDefinition = {
                        name: smokedName,
                        reactions: {}
                    };

                    Object.keys(visualSource).forEach(function (key) {
                        newDefinition[key] = visualSource[key];
                    });

                    // Non assegna colori o forme artificiali:
                    // conserva quelli originali disponibili.
                    addIngredient(smokedId, newDefinition);
                }

                // Aggiorna l'oggetto senza imporre una nuova forma
                // né forzare tonalità, saturazione o luminosità.
                placed.id = smokedId;
                placed.name = smokedName;
                placed.smoked = true;
                placed.universalSmokerDone = true;

                Object.keys(visualSource).forEach(function (key) {
                    placed[key] = visualSource[key];
                });

                // Registra una sola volta nel database.
                registerSmoked(placed, smokedId);

                if (statusElement) {
                    statusElement.textContent =
                        "Affumicato: " + smokedName;
                }

                console.log(
                    "[Affumicatore] Risultato:",
                    smokedId,
                    smokedName,
                    visualSource
                );
            } catch (errore) {
                console.error(
                    "[Affumicatore] Errore:",
                    errore
                );
            } finally {
                delete placed.universalSmokerProcessing;
            }
        }
    });

    // ---------------------------------------------------------
    // AVVIO
    // ---------------------------------------------------------

    function initialize() {
        createLauncher();
        createPanel();

        if (statusElement) {
            statusElement.textContent =
                "Caricato. Seleziona l'affumicatore e clicca un ingrediente.";
        }

        console.log(
            "[Affumicatore] Caricato correttamente.",
            "Ingredienti:", definitions.length,
            "Ricette tramite reactions:", recipePairs.length
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
