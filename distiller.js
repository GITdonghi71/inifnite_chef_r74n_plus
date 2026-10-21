
/*
 * distiller.js
 * Infinite Chef R74n+
 * Distillazione sperimentale con ingredienti, equazioni e unità dinamiche.
 *
 * API: window.ingredients, addIngredient, addTool
 * Database: localStorage del browser.
 */
(function () {
    "use strict";

    const PREFIX = "ic-distiller";
    const DB_KEY = "ic_distiller_database_v1";
    const UNIT_KEY = "ic_distiller_units_v1";

    if (
        !window.ingredients ||
        typeof window.addIngredient !== "function" ||
        typeof window.addTool !== "function"
    ) {
        console.error("[Distiller] API del gioco non disponibili.");
        return;
    }

    const ingredients = window.ingredients;
    const state = { selected: [] };
    let discoveries = readDB(DB_KEY);
    let units = readDB(UNIT_KEY);
    let panel;
    let statusNode;
    let selectionNode;
    let databaseNode;
    let equationInput;
    let unitInput;

    function readDB(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (_) {
            return [];
        }
    }

    function saveDB() {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(discoveries));
            localStorage.setItem(UNIT_KEY, JSON.stringify(units));
        } catch (error) {
            console.warn("[Distiller] Salvataggio non riuscito.", error);
        }
    }

    function status(message) {
        console.log("[Distiller]", message);
        if (statusNode) statusNode.textContent = message;
    }

    function prettyName(id) {
        return String(id || "unknown")
            .replace(/_/g, " ")
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
            placed.data && placed.data.id,
            placed.ingredient
        ];

        for (const candidate of candidates) {
            if (typeof candidate === "string" && ingredients[candidate]) {
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
            if (definition === placed) return id;
        }
        return null;
    }

    function isAlcohol(id) {
        const def = ingredients[id] || {};
        const text = [
            id,
            def.name,
            def.type,
            def.category,
            def.description
        ].join(" ").toLowerCase();

        return /\balcohol\b|\balcool\b|\bethanol\b|\bethanolo\b|alcol|vodka|whisky|whiskey|rum\b|gin\b|brandy|wine\b|vino\b|beer\b|birra\b|liquor|liqueur|spirits/.test(text);
    }

    function hash(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0).toString(16);
    }

    function normalizeEquation(input) {
        return input.trim().replace(/\s+/g, " ").toLowerCase();
    }

    /*
     * Unità di base:
     * volume, massa, tempo, temperatura, pressione, energia,
     * quantità di sostanza e dimensione adimensionale.
     *
     * Le unità personalizzate si inseriscono come:
     * nome = dimensione = fattore SI
     * Esempio: furlong = length = 201.168
     */
    const BASE_UNITS = {
        m: ["length", 1],
        cm: ["length", 0.01],
        km: ["length", 1000],
        mm: ["length", 0.001],
        kg: ["mass", 1],
        g: ["mass", 0.001],
        mg: ["mass", 0.000001],
        s: ["time", 1],
        min: ["time", 60],
        h: ["time", 3600],
        K: ["temperature", 1],
        Pa: ["pressure", 1],
        kPa: ["pressure", 1000],
        bar: ["pressure", 100000],
        J: ["energy", 1],
        kJ: ["energy", 1000],
        mol: ["amount", 1],
        L: ["volume", 0.001],
        mL: ["volume", 0.000001],
        uL: ["volume", 0.000000001],
        "1": ["dimensionless", 1]
    };

    function getUnit(name) {
        const key = name.trim();
        if (BASE_UNITS[key]) {
            return {
                name: key,
                dimension: BASE_UNITS[key][0],
                factor: BASE_UNITS[key][1]
            };
        }
        return units.find(u => u.name === key) || null;
    }

    function addCustomUnit() {
        const raw = prompt(
            "Nuova unità nel formato:\n" +
            "nome = dimensione = fattore SI\n\n" +
            "Esempio: furlong = length = 201.168\n" +
            "Dimensioni: length, mass, time, temperature,\n" +
            "pressure, energy, amount, volume, dimensionless"
        );
        if (!raw) return;

        const parts = raw.split("=").map(s => s.trim());
        if (parts.length !== 3) {
            status("Formato non valido.");
            return;
        }

        const [name, dimension, factorText] = parts;
        const factor = Number(factorText);
        const allowed = [
            "length", "mass", "time", "temperature",
            "pressure", "energy", "amount", "volume",
            "dimensionless"
        ];

        if (
            !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name) ||
            !allowed.includes(dimension) ||
            !Number.isFinite(factor) ||
            factor <= 0
        ) {
            status("Unità o fattore non valido.");
            return;
        }

        if (getUnit(name)) {
            status("Questa unità esiste già.");
            return;
        }

        units.push({ name, dimension, factor });
        saveDB();
        status("Unità aggiunta: " + name);
        renderPanel();
    }

    /*
     * Parser volutamente limitato a formule esplicite.
     * Esempi: 10 m / 2 s
     *         5 kg * 3 m / 2 s
     *         12 mL + 3 mL
     *
     * Non esegue JavaScript né eval().
     */
    function evaluateEquation(source) {
        const tokens = source.match(
            /(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?)|[a-zA-Z][a-zA-Z0-9_-]*|[()+*/-]/gi
        );
        if (!tokens || tokens.join("").length !== source.replace(/\s/g, "").length) {
            throw new Error("Equazione non riconosciuta.");
        }

        const normalized = source.replace(/\s+/g, "");
        if (!normalized) throw new Error("Inserisci un'equazione.");

        const regex = /(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*([a-zA-Z][a-zA-Z0-9_-]*)/gi;
        const matches = [...source.matchAll(regex)];
        if (matches.length < 2) {
            throw new Error("Servono almeno due quantità con unità.");
        }

        // Valida tutte le quantità e le unità.
        const quantities = matches.map(match => {
            const value = Number(match[1]);
            const unit = getUnit(match[2]);
            if (!Number.isFinite(value) || !unit) {
                throw new Error("Unità sconosciuta: " + match[2]);
            }
            return { value, unit };
        });

        // Riconosce somme e sottrazioni solo tra dimensioni uguali.
        const additive = source.match(/[+-]/g) || [];
        if (additive.length) {
            const dimensions = new Set(quantities.map(q => q.unit.dimension));
            if (dimensions.size !== 1) {
                throw new Error(
                    "Somma/sottrazione tra dimensioni fisiche incompatibili."
                );
            }
        }

        // Il risultato è un indice numerico di gioco, non una
        // simulazione termodinamica certificata.
        const normalizedValues = quantities.map(
            q => q.value * q.unit.factor
        );

        const operators = source.match(/[+*/-]/g) || [];
        let value = normalizedValues[0];

        for (let i = 1; i < normalizedValues.length; i++) {
            const op = operators[i - 1] || "*";
            const next = normalizedValues[i];

            if (op === "+") value += next;
            else if (op === "-") value -= next;
            else if (op === "/") {
                if (next === 0) throw new Error("Divisione per zero.");
                value /= next;
            } else value *= next;
        }

        if (!Number.isFinite(value)) {
            throw new Error("Risultato numerico non valido.");
        }

        return {
            value,
            dimensions: quantities.map(q => q.unit.dimension),
            canonical: normalizeEquation(source)
        };
    }

    function addUniqueIngredient(signature, details) {
        const baseId = "distillate_" + hash(signature);
        let id = baseId;
        let suffix = 2;

        // Anche in caso di collisione hash, non sovrascrivere
        // una scoperta con una firma differente.
        while (ingredients[id]) {
            const existing = discoveries.find(d => d.id === id);
            if (existing && existing.signature === signature) {
                return existing;
            }
            id = baseId + "_" + suffix++;
        }

        const colors = ["#8e44ad", "#2471a3", "#148f77", "#b9770e"];
        const color = colors[parseInt(hash(signature).slice(0, 2), 16) % colors.length];

        addIngredient(id, {
            name: details.name,
            color,
            innerColor: "#d6eaf8",
            type: "liquid",
            category: "liquid",
            description:
                "Distillato sperimentale scoperto dall'utente. " +
                "Processo: " + details.method +
                "; temperatura: " + details.temperature + " °C."
        });

        const entry = {
            id,
            name: details.name,
            type: "liquid",
            ingredients: details.ingredients,
            method: details.method,
            temperature: details.temperature,
            equation: details.equation,
            equationValue: details.equationValue,
            signature,
            discoveredAt: new Date().toISOString()
        };

        discoveries.unshift(entry);
        saveDB();
        renderPanel();
        return entry;
    }

    function distill() {
        if (state.selected.length !== 3) {
            status("Seleziona esattamente 3 ingredienti.");
            return;
        }

        const alcohols = state.selected.filter(isAlcohol);
        if (!alcohols.length) {
            status("Alcol obbligatorio: seleziona un ingrediente alcolico.");
            return;
        }

        const method = prompt(
            "Tipo di distillazione (es. semplice, frazionata, sottovuoto):",
            "semplice"
        );
        if (!method || !method.trim()) return;

        const temperatureText = prompt("Temperatura in °C:", "78");
        if (temperatureText === null) return;
        const temperature = Number(temperatureText);

        if (!Number.isFinite(temperature) || temperature < -273.15) {
            status("Temperatura non valida.");
            return;
        }

        const equation = prompt(
            "Equazione con almeno due quantità e unità.\n" +
            "Esempio: 10 mL / 2 s\n" +
            "Unità note: m, cm, kg, g, s, min, h, L, mL, K, Pa, bar, J, mol",
            "10 mL / 2 s"
        );
        if (!equation) return;

        let result;
        try {
            result = evaluateEquation(equation);
        } catch (error) {
            status(error.message);
            return;
        }

        const ids = state.selected.map(item => item.id);
        const signature = JSON.stringify({
            ingredients: ids.slice().sort(),
            method: method.trim().toLowerCase(),
            temperature,
            equation: result.canonical
        });

        const existing = discoveries.find(d => d.signature === signature);
        if (existing) {
            status("Scoperta già esistente: " + existing.name);
            return;
        }

        const name = prompt(
            "Dai un nome alla tua nuova scoperta:",
            "Distillato " + hash(signature).toUpperCase()
        );
        if (!name || !name.trim()) return;

        const entry = addUniqueIngredient(signature, {
            name: name.trim(),
            ingredients: ids,
            method: method.trim(),
            temperature,
            equation: equation.trim(),
            equationValue: result.value
        });

        state.selected = [];
        renderPanel();
        status("Nuovo distillato scoperto: " + entry.name + " (" + entry.id + ")");
    }

    function makeButton(label, callback) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.style.cssText =
            "padding:7px 10px;border:0;border-radius:7px;" +
            "background:#246b68;color:white;cursor:pointer;margin:3px;";
        button.addEventListener("click", callback);
        return button;
    }

    function renderPanel() {
        if (!panel) return;

        selectionNode.textContent = state.selected.length
            ? state.selected.map((item, i) =>
                (i + 1) + ". " + prettyName(item.id)
            ).join(" | ")
            : "Nessun ingrediente selezionato.";

        databaseNode.replaceChildren();

        discoveries.forEach(entry => {
            const row = document.createElement("div");
            row.style.cssText =
                "padding:7px;margin:5px 0;background:#183b3b;" +
                "border-radius:6px;overflow-wrap:anywhere;";

            const title = document.createElement("strong");
            title.textContent = "🧪 " + entry.name;

            const detail = document.createElement("div");
            detail.style.cssText = "font-size:12px;margin-top:4px;";
            detail.textContent =
                "type: liquid | " + entry.method + " | " +
                entry.temperature + " °C | " + entry.equation;

            row.append(title, detail);
            databaseNode.appendChild(row);
        });

        if (!discoveries.length) {
            databaseNode.textContent = "Nessuna scoperta registrata.";
        }
    }

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
            "position:fixed;right:14px;bottom:70px;width:350px;" +
            "max-width:calc(100vw - 28px);max-height:75vh;overflow:auto;" +
            "z-index:999999;background:#102b2b;color:#e7ffff;" +
            "border:2px solid #3c9992;border-radius:12px;padding:12px;" +
            "font:14px Arial,sans-serif;box-shadow:0 5px 25px #0009;";

        const title = document.createElement("h3");
        title.textContent = "⚗️ Distiller — Laboratorio";

        const help = document.createElement("p");
        help.textContent =
            "Seleziona il tool Distiller e clicca 3 ingredienti. " +
            "Almeno uno deve essere alcolico.";

        selectionNode = document.createElement("div");
        selectionNode.style.cssText = "margin:8px 0;overflow-wrap:anywhere;";

        const buttons = document.createElement("div");
        buttons.append(
            makeButton("Distilla", distill),
            makeButton("Aggiungi unità", addCustomUnit),
            makeButton("Annulla selezione", function () {
                state.selected = [];
                renderPanel();
                status("Selezione annullata.");
            }),
            makeButton("Esporta JSON", function () {
                const blob = new Blob(
                    [JSON.stringify({ discoveries, units }, null, 2)],
                    { type: "application/json" }
                );
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "distiller_database.json";
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }),
            makeButton("Chiudi", function () {
                panel.style.display = "none";
            })
        );

        const dbTitle = document.createElement("h4");
        dbTitle.textContent = "Registro delle scoperte";

        databaseNode = document.createElement("div");
        statusNode = document.createElement("div");
        statusNode.style.cssText =
            "margin-top:10px;color:#8de0ce;font-size:12px;";

        panel.append(
            title, help, selectionNode, buttons,
            dbTitle, databaseNode, statusNode
        );
        document.body.appendChild(panel);
        renderPanel();
    }

    function selectIngredient(placed) {
        const id = getId(placed);
        if (!id) {
            status("Ingrediente non riconosciuto.");
            return;
        }

        if (state.selected.some(item => item.id === id)) {
            status("Ingrediente già selezionato.");
            return;
        }

        if (state.selected.length >= 3) {
            status("Hai già selezionato 3 ingredienti.");
            return;
        }

        state.selected.push({ id });
        renderPanel();
        status("Selezionato: " + prettyName(id));

        if (state.selected.length === 3) {
            if (!state.selected.some(item => isAlcohol(item.id))) {
                status("Manca l'alcol obbligatorio. Annulla e riprova.");
            } else {
                status("Miscela pronta. Premi Distilla.");
            }
        }
    }

    addTool("distiller", {
        func: selectIngredient,
        onSelect: function () {
            createPanel();
            if (panel) panel.style.display = "block";
            status("Tool attivo: clicca gli ingredienti da distillare.");
        },
        onDeselect: function () {
            status("Tool Distiller disattivato.");
        },
        shape: "liquid"
    });

    // Pulsante indipendente dal tool per consultare il registro.
    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.textContent = "⚗️ Distiller";
    launcher.style.cssText =
        "position:fixed;right:14px;bottom:14px;z-index:999998;" +
        "padding:10px 13px;background:#246b68;color:white;" +
        "border:2px solid #65bcb0;border-radius:9px;cursor:pointer;";
    launcher.addEventListener("click", createPanel);
    document.body.appendChild(launcher);

    console.log("[Distiller] Mod caricata. Scoperte:", discoveries.length);
})();
