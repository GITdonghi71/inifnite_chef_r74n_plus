
/*
 * Infinite Chef R74N+ — Distiller
 * Versione 5.0.0
 *
 * - Nessun LaTeX, parser o formula matematica
 * - Selezione di esattamente 3 ingredienti dal gioco
 * - Alcohol obbligatorio
 * - Temperatura e metodo scelti dall'interfaccia
 * - Risultato deterministico per ogni combinazione
 * - ID e nome generati automaticamente
 * - Salvataggio persistente in localStorage
 * - Esportazione del database JSON
 */
(function () {
    "use strict";

    if (window.__IC_DISTILLER_V5__) return;
    window.__IC_DISTILLER_V5__ = true;

    const VERSION = "5.0.0";
    const PREFIX = "ic-distiller";

    const STORAGE_KEY = "ic_distiller_discoveries_v4";

    let discoveries = readDB(STORAGE_KEY, []);
    let selected = [];

    let panel = null;
    let launcher = null;
    let statusNode = null;
    let selectionNode = null;
    let discoveryList = null;
    let temperatureInput = null;
    let methodSelect = null;

    let gameToolRegistered = false;

    // --------------------------------------------------
    // DATABASE
    // --------------------------------------------------

    function readDB(key, fallback) {
        try {
            const value = JSON.parse(
                localStorage.getItem(key) || "null"
            );

            return Array.isArray(value) ? value : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function writeDB() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(discoveries)
            );

            return true;
        } catch (error) {
            console.error("[Distiller] Errore database:", error);
            setStatus("Impossibile salvare il database locale.");
            return false;
        }
    }

    // Hash deterministico: stesso testo = stesso hash.
    function fingerprint(value) {
        let hash = 2166136261;
        const text = String(value);

        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return (hash >>> 0).toString(16).padStart(8, "0");
    }

    function setStatus(message) {
        console.log("[Distiller]", message);

        if (statusNode) {
            statusNode.textContent = message;
        }
    }

    // --------------------------------------------------
    // INTEGRAZIONE CON INFINITE CHEF
    // --------------------------------------------------

    function getIngredients() {
        return window.ingredients || null;
    }

    function resolveIngredientId(item) {
        const ingredients = getIngredients();

        if (!ingredients) return null;

        if (
            typeof item === "string" &&
            ingredients[item]
        ) {
            return item;
        }

        if (!item || typeof item !== "object") {
            return null;
        }

        const candidates = [
            item.id,
            item.ingredientId,
            item.ingredient_id,
            item.elementId,
            item.element_id,
            item.data && item.data.id,
            item.ingredient
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

        for (const [id, definition] of Object.entries(ingredients)) {
            if (definition === item) return id;
        }

        return null;
    }

    // Alcohol è obbligatorio.
    // Riconosce anche nomi comuni di bevande alcoliche.
    

function isAlcohol(id) {
    return id === "alcohol";
}
    // --------------------------------------------------
    // SELEZIONE INGREDIENTI
    // --------------------------------------------------

    function selectIngredient(item) {
        const id = resolveIngredientId(item);

        if (!id) {
            setStatus("Impossibile identificare l'ingrediente.");
            return;
        }

        if (selected.includes(id)) {
            setStatus("Ingrediente già selezionato.");
            return;
        }

        if (selected.length >= 3) {
            setStatus(
                "Hai già selezionato 3 ingredienti. " +
                "Annulla la selezione per ricominciare."
            );
            return;
        }

        selected.push(id);

        renderPanel();

        if (selected.length === 3) {
            if (selected.some(isAlcohol)) {
                setStatus(
                    "3 ingredienti selezionati. " +
                    "Imposta temperatura e metodo, poi distilla."
                );
            } else {
                setStatus(
                    "Manca Alcohol: uno dei 3 ingredienti " +
                    "deve essere alcolico."
                );
            }
        } else {
            setStatus(
                "Ingrediente aggiunto (" + selected.length + "/3)."
            );
        }
    }

    // --------------------------------------------------
    // RISULTATO DETERMINISTICO
    // --------------------------------------------------

    function createSignature(ingredients, temperature, method) {
        // Ordine canonico per rendere irrilevante l'ordine dei clic.
        const canonicalIngredients = ingredients.slice().sort();

        return JSON.stringify({
            ingredients: canonicalIngredients,
            temperature: temperature,
            method: method
        });
    }

    function registerDistilledIngredient(signature, details) {
        const ingredients = getIngredients();

        if (
            !ingredients ||
            typeof window.addIngredient !== "function"
        ) {
            throw new Error("API ingredienti del gioco non disponibile.");
        }

        // Il nome e l'ID dipendono soltanto dalla firma.
        const hash = fingerprint(signature);
        const id = "distillate_" + hash;
        const name = "Distillato " + hash.toUpperCase();

        // Una scoperta esistente non viene ricreata.
        const existingDiscovery = discoveries.find(
            item => item.signature === signature
        );

        if (existingDiscovery) {
            // Ripristina l'ingrediente se manca dal gioco.
            if (!ingredients[existingDiscovery.id]) {
                window.addIngredient(existingDiscovery.id, {
                    name: existingDiscovery.name,
                    color: existingDiscovery.color || "#2471a3",
                    innerColor: "#d6eaf8",
                    type: "liquid",
                    category: "liquid",
                    description: existingDiscovery.description ||
                        "Distillato sperimentale."
                });
            }

            return existingDiscovery;
        }

        // Gestisce un eventuale ID già occupato.
        if (ingredients[id]) {
            const existingName = ingredients[id].name;

            if (existingName === name) {
                throw new Error(
                    "ID già utilizzato nel gioco da un ingrediente " +
                    "non presente nel database delle scoperte."
                );
            }

            throw new Error(
                "Collisione ID: impossibile registrare il distillato."
            );
        }

        const colors = [
            "#8e44ad",
            "#2471a3",
            "#148f77",
            "#b9770e",
            "#2874a6",
            "#117864"
        ];

        const colorIndex =
            parseInt(hash.slice(0, 2), 16) % colors.length;

        const color = colors[colorIndex];

        const description =
            "Distillato sperimentale. " +
            "Metodo: " + details.method + ". " +
            "Temperatura: " + details.temperature + " °C. " +
            "Ingredienti: " + details.ingredients.join(", ") + ".";

        window.addIngredient(id, {
            name: name,
            color: color,
            innerColor: "#d6eaf8",
            type: "liquid",
            category: "liquid",
            description: description
        });

        const entry = {
            id: id,
            name: name,
            ingredients: details.ingredients.slice().sort(),
            method: details.method,
            temperature: details.temperature,
            signature: signature,
            color: color,
            description: description,
            discoveredAt: new Date().toISOString()
        };

        discoveries.unshift(entry);

        if (!writeDB()) {
            // Non lascia un ingrediente senza registrazione persistente.
            discoveries = discoveries.filter(
                item => item.signature !== signature
            );

            try {
                if (
                    typeof window.removeIngredient === "function"
                ) {
                    window.removeIngredient(id);
                }
            } catch (_) {
                // Il gioco potrebbe non esporre removeIngredient.
            }

            throw new Error("Salvataggio della scoperta non riuscito.");
        }

        return entry;
    }

    // --------------------------------------------------
    // DISTILLAZIONE
    // --------------------------------------------------

    function distill() {
        if (selected.length !== 3) {
            setStatus("Seleziona esattamente 3 ingredienti.");
            return;
        }

        if (!selected.some(isAlcohol)) {
            setStatus(
                "Alcohol è obbligatorio: seleziona almeno " +
                "un ingrediente alcolico tra i 3."
            );
            return;
        }

        const rawTemperature = temperatureInput
            ? temperatureInput.value.trim()
            : "";

        if (rawTemperature === "") {
            setStatus("Inserisci la temperatura in °C.");
            return;
        }

        const temperature = Number(rawTemperature);

        if (
            !Number.isFinite(temperature) ||
            temperature < -273.15
        ) {
            setStatus("Temperatura non valida.");
            return;
        }

        const method = methodSelect ? methodSelect.value : "";

        const allowedMethods = [
            "semplice",
            "frazionata",
            "vapore"
        ];

        if (!allowedMethods.includes(method)) {
            setStatus("Seleziona un metodo di distillazione valido.");
            return;
        }

        const ingredients = selected.slice().sort();

        const signature = createSignature(
            ingredients,
            temperature,
            method
        );

        const existing = discoveries.find(
            item => item.signature === signature
        );

        try {
            const entry = registerDistilledIngredient(signature, {
                ingredients: ingredients,
                temperature: temperature,
                method: method
            });

            selected = [];
            renderPanel();

            if (existing) {
                setStatus(
                    "Combinazione già scoperta: " + entry.name
                );
            } else {
                setStatus(
                    "Distillato creato: " + entry.name
                );
            }
        } catch (error) {
            setStatus(
                "Distillazione non riuscita: " + error.message
            );
        }
    }

    // --------------------------------------------------
    // INTERFACCIA
    // --------------------------------------------------

    function button(label, callback) {
        const element = document.createElement("button");

        element.type = "button";
        element.textContent = label;

        element.style.cssText =
            "padding:9px 11px;margin:3px;" +
            "border:0;border-radius:7px;" +
            "background:#246b68;color:white;" +
            "cursor:pointer;font-weight:bold;";

        element.addEventListener("click", callback);

        return element;
    }

    function heading(text) {
        const element = document.createElement("h4");

        element.textContent = text;
        element.style.margin = "14px 0 7px";

        return element;
    }

    function createFieldLabel(text) {
        const label = document.createElement("label");

        label.textContent = text;
        label.style.cssText =
            "display:block;margin:12px 0 5px;font-weight:bold;";

        return label;
    }

    function createInputStyle(element) {
        element.style.cssText =
            "box-sizing:border-box;width:100%;padding:9px;" +
            "background:#071c1c;color:#e7ffff;" +
            "border:1px solid #438d87;border-radius:7px;" +
            "font:14px Arial,sans-serif;";

        return element;
    }

    function renderSelection() {
        if (!selectionNode) return;

        selectionNode.replaceChildren();

        if (!selected.length) {
            selectionNode.textContent =
                "Nessun ingrediente selezionato.";
            return;
        }

        selected.forEach((id, index) => {
            const row = document.createElement("div");

            row.style.cssText =
                "padding:7px;margin:4px 0;" +
                "background:#183b3b;border-radius:6px;" +
                "overflow-wrap:anywhere;";

            const alcoholTag = isAlcohol(id)
                ? " ✓ Alcohol"
                : "";

            row.textContent =
                (index + 1) + ". " + id + alcoholTag;

            selectionNode.appendChild(row);
        });

        const remaining = document.createElement("div");

        remaining.style.cssText =
            "font-size:12px;margin-top:7px;color:#8de0ce;";

        remaining.textContent =
            selected.length + "/3 ingredienti selezionati";

        selectionNode.appendChild(remaining);
    }

    function renderDiscoveries() {
        if (!discoveryList) return;

        discoveryList.replaceChildren();

        if (!discoveries.length) {
            discoveryList.textContent =
                "Nessun distillato ancora scoperto.";
            return;
        }

        discoveries.forEach(record => {
            const row = document.createElement("div");

            row.style.cssText =
                "padding:8px;margin:5px 0;" +
                "background:#183b3b;border-radius:6px;" +
                "overflow-wrap:anywhere;";

            const title = document.createElement("strong");
            title.textContent = "⚗️ " + record.name;

            const detail = document.createElement("div");

            detail.style.cssText =
                "font-size:12px;margin-top:5px;" +
                "white-space:pre-wrap;";

            detail.textContent = [
                "Ingredienti: " + record.ingredients.join(" + "),
                "Metodo: " + record.method,
                "Temperatura: " + record.temperature + " °C"
            ].join("\n");

            row.append(title, detail);
            discoveryList.appendChild(row);
        });
    }

    function renderPanel() {
        renderSelection();
        renderDiscoveries();
    }

    // --------------------------------------------------
    // ESPORTAZIONE
    // --------------------------------------------------

    function exportDatabase() {
        const data = {
            version: VERSION,
            exportedAt: new Date().toISOString(),
            discoveries: discoveries
        };

        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "infinite-chef-distiller.json";
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setStatus("Esportazione del database avviata.");
    }

    // --------------------------------------------------
    // PANNELLO
    // --------------------------------------------------

    function createPanel() {
        if (panel && panel.isConnected) {
            panel.style.display =
                panel.style.display === "none" ? "block" : "none";

            renderPanel();
            return;
        }

        panel = document.createElement("section");
        panel.id = PREFIX + "-panel";

        panel.style.cssText =
            "position:fixed;right:14px;bottom:68px;" +
            "width:390px;max-width:calc(100vw - 28px);" +
            "max-height:78vh;overflow:auto;" +
            "z-index:2147483647;background:#102b2b;color:#e7ffff;" +
            "border:2px solid #3c9992;border-radius:12px;padding:12px;" +
            "box-sizing:border-box;font:14px Arial,sans-serif;" +
            "box-shadow:0 5px 25px #0009;";

        const title = document.createElement("h3");

        title.textContent = "⚗️ Distiller";
        title.style.marginTop = "0";

        const intro = document.createElement("p");

        intro.textContent =
            "Clicca 3 ingredienti nel gioco. " +
            "Alcohol è obbligatorio. Scegli temperatura e metodo.";

        const alcoholNotice = document.createElement("div");

        alcoholNotice.textContent =
            "⚠ Almeno uno dei 3 ingredienti deve essere Alcohol.";

        alcoholNotice.style.cssText =
            "padding:8px;margin:8px 0;background:#50351c;" +
            "border-radius:6px;color:#ffe0a3;";

        selectionNode = document.createElement("div");

        const temperatureLabel =
            createFieldLabel("Temperatura (°C)");

        temperatureInput = document.createElement("input");
        temperatureInput.type = "number";
        temperatureInput.min = "-273.15";
        temperatureInput.step = "any";
        temperatureInput.value = "78";
        temperatureInput.placeholder = "Inserisci la temperatura";
        createInputStyle(temperatureInput);

        const methodLabel =
            createFieldLabel("Tipo di distillazione");

        methodSelect = document.createElement("select");
        createInputStyle(methodSelect);

        [
            ["semplice", "Semplice"],
            ["frazionata", "Frazionata"],
            ["vapore", "A vapore"]
        ].forEach(([value, label]) => {
            const option = document.createElement("option");

            option.value = value;
            option.textContent = label;

            methodSelect.appendChild(option);
        });

        const actions = document.createElement("div");

        actions.style.cssText =
            "display:flex;flex-wrap:wrap;margin:8px -3px;";

        actions.append(
            button("Distilla", distill),
            button("Annulla selezione", function () {
                selected = [];
                renderPanel();
                setStatus("Selezione annullata.");
            }),
            button("Esporta JSON", exportDatabase),
            button("Chiudi", function () {
                panel.style.display = "none";
            })
        );

        discoveryList = document.createElement("div");

        statusNode = document.createElement("div");

        statusNode.style.cssText =
            "margin-top:10px;color:#8de0ce;font-size:12px;" +
            "overflow-wrap:anywhere;";

        panel.append(
            title,
            intro,
            alcoholNotice,
            heading("Ingredienti selezionati"),
            selectionNode,
            temperatureLabel,
            temperatureInput,
            methodLabel,
            methodSelect,
            actions,
            heading("Distillati scoperti"),
            discoveryList,
            statusNode
        );

        document.body.appendChild(panel);

        renderPanel();
        setStatus("Distiller pronto.");
    }

    // --------------------------------------------------
    // PULSANTE DISTILLER
    // --------------------------------------------------

    function createLauncher() {
        if (!document.body) return;

        if (document.getElementById(PREFIX + "-launcher")) {
            return;
        }

        launcher = document.createElement("button");
        launcher.id = PREFIX + "-launcher";
        launcher.type = "button";
        launcher.textContent = "⚗️ Distiller";

        launcher.style.cssText =
            "position:fixed;right:14px;bottom:14px;" +
            "z-index:2147483646;padding:11px 14px;" +
            "background:#246b68;color:white;" +
            "border:2px solid #65bcb0;border-radius:9px;" +
            "cursor:pointer;font:bold 14px Arial,sans-serif;" +
            "box-shadow:0 3px 12px #0007;";

        launcher.addEventListener("click", function () {
            createPanel();

            if (panel) {
                panel.style.display = "block";
            }
        });

        document.body.appendChild(launcher);
    }

    // --------------------------------------------------
    // REGISTRAZIONE DEL TOOL NEL GIOCO
    // --------------------------------------------------

    function registerGameTool() {
        if (gameToolRegistered) return true;

        if (
            !window.ingredients ||
            typeof window.addIngredient !== "function" ||
            typeof window.addTool !== "function"
        ) {
            return false;
        }

        try {
            window.addTool("distiller", {
                func: selectIngredient,

                onSelect: function () {
                    createPanel();

                    if (panel) {
                        panel.style.display = "block";
                    }

                    setStatus(
                        "Tool attivo: clicca 3 ingredienti nel gioco."
                    );
                },

                onDeselect: function () {
                    setStatus("Tool disattivato.");
                },

                shape: "liquid"
            });

            gameToolRegistered = true;

            console.log("[Distiller] Tool registrato nel gioco.");

            return true;
        } catch (error) {
            console.warn(
                "[Distiller] Registrazione non riuscita:",
                error
            );

            return false;
        }
    }

    // --------------------------------------------------
    // AVVIO
    // --------------------------------------------------

    function start() {
        createLauncher();

        let attempts = 0;

        const timer = setInterval(function () {
            createLauncher();

            if (registerGameTool()) {
                clearInterval(timer);
                return;
            }

            attempts++;

            if (attempts >= 120) {
                clearInterval(timer);

                console.warn(
                    "[Distiller] Il pulsante è disponibile, ma " +
                    "le API del gioco non sono state individuate."
                );
            }
        }, 500);

        console.log(
            "[Distiller] Versione " + VERSION + " avviata."
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );
    } else {
        start();
    }
})();
