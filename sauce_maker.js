
/*
 * SauceMaker.js — Infinite Chef R74n+
 * Crea salse combinando esattamente 4 ingredienti.
 *
 * Compatibilità:
 * - addTool / addIngredient
 * - smoker.js: le salse possono essere affumicate
 * - innestatore.js: le salse possono essere innestate
 *
 * Nota: l'estrazione nutrizionale è dinamica e dipende
 * dai campi realmente presenti nei dati degli ingredienti.
 */

(function () {
    "use strict";

    if (
        typeof addTool !== "function" ||
        typeof addIngredient !== "function" ||
        typeof ingredients !== "object"
    ) {
        console.error("[SauceMaker] API del gioco non disponibili.");
        return;
    }

    const PREFIX = "saucemaker";
    const DB_KEY = "infinite_chef_saucemaker_db_v1";
    const NUTRIENT_RE =
        /nutri|protein|carbohydrat|fat|fiber|vitamin|mineral|calor|energy|sugar|salt|water|lipid/i;

    let selected = [];
    let sauceDatabase = [];

    try {
        const saved = localStorage.getItem(DB_KEY);
        sauceDatabase = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(sauceDatabase)) sauceDatabase = [];
    } catch (_) {
        sauceDatabase = [];
    }

    // --------------------------------------------------
    // UTILITÀ
    // --------------------------------------------------

    function cleanId(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 70);
    }


function getId(placed) {
    if (typeof placed === "string") {
        return ingredients[placed] ? placed : null;
    }

    if (!placed || typeof placed !== "object") {
        return null;
    }

    // ID diretti usati dal gioco e da smoker.js.
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

    // Fallback: riconosce un oggetto che coincide con
    // una definizione registrata nel database del gioco.
    for (const [id, definition] of Object.entries(ingredients)) {
        if (definition === placed) {
            return id;
        }
    }

    console.warn(
        "[SauceMaker] Ingrediente non riconosciuto:",
        placed
    );

    return null;
}


    function getDefinition(id) {
        return ingredients[id] || {};
    }

    function getName(id) {
        const data = getDefinition(id);
        return data.name || id.replace(/_/g, " ");
    }

    function saveDB() {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(sauceDatabase));
        } catch (error) {
            console.warn("[SauceMaker] Database non salvato.", error);
        }
    }

    // Estrae i campi nutrizionali riconoscibili.
    function extractNutrients(data) {
        const result = {};

        if (!data || typeof data !== "object") return result;

        for (const [key, value] of Object.entries(data)) {
            if (
                NUTRIENT_RE.test(key) &&
                (typeof value === "number" ||
                 (typeof value === "string" && value.trim() !== "" &&
                  Number.isFinite(Number(value))))
            ) {
                result[key] = Number(value);
            }
        }

        // Alcuni mod potrebbero raggruppare i nutrienti.
        for (const groupKey of ["nutrients", "nutrition", "nutrientData"]) {
            const group = data[groupKey];

            if (group && typeof group === "object") {
                Object.assign(result, extractNutrients(group));
            }
        }

        return result;
    }

    function combineNutrients(ids) {
        const totals = {};
        let sourcesFound = 0;

        ids.forEach(id => {
            const values = extractNutrients(getDefinition(id));

            if (Object.keys(values).length) sourcesFound++;

            Object.entries(values).forEach(([key, value]) => {
                totals[key] = (totals[key] || 0) + value;
            });
        });

        return {
            totals,
            sourcesFound
        };
    }

    // --------------------------------------------------
    // NOMI E COLORI DELLE SALSE
    // --------------------------------------------------

    const adjectives = [
        "Royal", "Mystic", "Velvet", "Infernal",
        "Cosmic", "Golden", "Wild", "Secret",
        "Emerald", "Crimson", "Midnight", "Atomic"
    ];

    const sauceTypes = [
        "Nebula Sauce", "Velvet Drizzle", "Fusion Cream",
        "Alchemy Sauce", "Flavor Elixir", "Quantum Gravy",
        "Chef's Secret", "Nutrient Nectar", "Fusion Glaze",
        "Infinity Dressing", "Gourmet Emulsion"
    ];

    function hash(text) {
        let value = 2166136261;

        for (let i = 0; i < text.length; i++) {
            value ^= text.charCodeAt(i);
            value = Math.imul(value, 16777619);
        }

        return value >>> 0;
    }

    function createSauceName(ids) {
        const key = ids.slice().sort().join("+");
        const h = hash(key);

        return adjectives[h % adjectives.length] + " " +
            sauceTypes[(h >>> 4) % sauceTypes.length];
    }

    function createSauceColor(ids) {
        const h = hash(ids.slice().sort().join("+"));
        return "hsl(" + (h % 360) + ", 68%, 48%)";
    }

    // --------------------------------------------------
    // DATABASE RICERCABILE
    // --------------------------------------------------

    let panel;
    let list;
    let search;
    let status;

    function button(label, callback) {
        const el = document.createElement("button");
        el.textContent = label;
        el.style.cssText =
            "padding:7px 10px;border:0;border-radius:6px;" +
            "background:#8c4fc4;color:white;cursor:pointer;";
        el.addEventListener("click", callback);
        return el;
    }

    function renderDB() {
        if (!list) return;

        list.replaceChildren();

        const query = (search.value || "").toLowerCase().trim();
        const matches = sauceDatabase.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.id.toLowerCase().includes(query) ||
            item.ingredients.join(" ").toLowerCase().includes(query)
        );

        matches.forEach(item => {
            const row = document.createElement("div");
            row.style.cssText =
                "padding:9px;margin:4px 0;background:#30243b;" +
                "border-radius:7px;overflow-wrap:anywhere;";

            const title = document.createElement("strong");
            title.textContent = "🥣 " + item.name;

            const details = document.createElement("div");
            details.style.cssText =
                "font-size:12px;color:#ddd;margin-top:5px;";
            details.textContent =
                "ID: " + item.id + " | Ingredienti: " +
                item.ingredients.map(getName).join(", ");

            const nutrientLine = document.createElement("div");
            nutrientLine.style.cssText =
                "font-size:12px;color:#c6e6d2;margin-top:5px;";

            const nutrientEntries = Object.entries(item.nutrients || {});
            nutrientLine.textContent = nutrientEntries.length
                ? "Nutrienti: " + nutrientEntries
                    .map(([key, value]) => key + "=" + value)
                    .join(", ")
                : "Nessun campo nutrizionale riconosciuto nei dati originali.";

            row.append(title, details, nutrientLine);
            list.appendChild(row);
        });

        if (!matches.length) {
            const empty = document.createElement("div");
            empty.textContent = "Nessuna salsa trovata.";
            list.appendChild(empty);
        }
    }

    function createPanel() {
        if (panel) return;

        panel = document.createElement("div");
        panel.id = PREFIX + "-panel";
        panel.style.cssText =
            "position:fixed;right:14px;bottom:75px;width:360px;" +
            "max-width:calc(100vw - 28px);max-height:70vh;" +
            "overflow:auto;z-index:999999;background:#21192a;" +
            "color:#fff;border:2px solid #8c4fc4;border-radius:12px;" +
            "padding:12px;font:14px Arial,sans-serif;display:none;" +
            "box-shadow:0 5px 25px #0009;";

        const heading = document.createElement("h3");
        heading.textContent = "🥣 SauceMaker — Database";
        heading.style.marginTop = "0";

        search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Cerca salsa o ingrediente...";
        search.style.cssText =
            "box-sizing:border-box;width:100%;padding:9px;" +
            "margin-bottom:8px;";
        search.addEventListener("input", renderDB);

        list = document.createElement("div");

        status = document.createElement("div");
        status.style.cssText =
            "margin:9px 0;color:#e2c9ff;font-size:12px;";

        panel.append(
            heading,
            search,
            list,
            status,
            button("Chiudi", () => panel.style.display = "none"),
            button("Azzera selezione", resetSelection)
        );

        document.body.appendChild(panel);
        renderDB();
    }

    function showStatus(message) {
        console.log("[SauceMaker]", message);
        if (status) status.textContent = message;
    }

    function resetSelection() {
        selected = [];
        showStatus("Selezione azzerata. Scegli 4 ingredienti.");
    }

    // --------------------------------------------------
    // CREAZIONE DELLA SALSA
    // --------------------------------------------------

    function createSauce(ids, placed) {
        const name = createSauceName(ids);
        const id = "sauce_" + cleanId(name) + "_" +
            hash(ids.slice().sort().join("+")).toString(36);

        const nutrition = combineNutrients(ids);

        const data = {
            name: name,
            color: createSauceColor(ids),
            type: "liquid",
            shape: "blob_short",
            keywords:
                "sauce, sauce maker, custom sauce, nutrient, " +
                "salsa, " + ids.join(", "),
            // Metadati della mod, senza inventare valori nutrizionali.
            sauceMaker: true,
            sauceIngredients: ids.slice(),
            sauceNutrients: nutrition.totals,
            sauceNutrientSources: nutrition.sourcesFound
        };

        if (!ingredients[id]) {
            addIngredient(id, data);
        } else {
            Object.assign(ingredients[id], data);
        }

        // Alcune versioni richiedono l'aggiornamento esplicito
        // dell'oggetto ingredienti dopo addIngredient().
        if (ingredients[id]) {
            Object.assign(ingredients[id], data);
        }

        const record = {
            id: id,
            name: name,
            ingredients: ids.slice(),
            nutrients: nutrition.totals,
            sourcesFound: nutrition.sourcesFound,
            date: new Date().toLocaleString()
        };

        const existing = sauceDatabase.findIndex(item => item.id === id);

        if (existing >= 0) sauceDatabase[existing] = record;
        else sauceDatabase.unshift(record);

        saveDB();
        renderDB();

        // Il quarto ingrediente diventa la salsa creata.
        if (placed && typeof placed === "object") {
            placed.id = id;
            placed.name = name;
            placed.type = "liquid";
            placed.color = data.color;
            placed.sauceMaker = true;
            placed.sauceIngredients = ids.slice();
            placed.sauceNutrients = nutrition.totals;
        }

        showStatus(
            "Creata " + name + " da: " +
            ids.map(getName).join(", ") +
            ". Campi nutrizionali: " +
            Object.keys(nutrition.totals).length + "."
        );

        console.log("[SauceMaker] Nuova salsa:", record);
    }

    // --------------------------------------------------
    // TOOL: QUATTRO INGREDIENTI
    // --------------------------------------------------

    addTool("saucemaker", {
        name: "SauceMaker",
        color: "#9b59d0",
        shape: "liquid",
        spin: true,

        onSelect: function () {
            createPanel();
            panel.style.display = "block";
            showStatus(
                "Clicca 4 ingredienti diversi, uno alla volta."
            );
        },

        func: function (placed) {
            const id = getId(placed);

            if (!id) {
                showStatus("Ingrediente non riconosciuto.");
                return;
            }

            // Evita di selezionare due volte lo stesso ingrediente.
            if (selected.includes(id)) {
                showStatus(
                    getName(id) + " è già nella selezione."
                );
                return;
            }

            selected.push(id);

            showStatus(
                "Ingrediente " + selected.length + "/4: " +
                getName(id)
            );

            if (selected.length < 4) return;

            const chosen = selected.slice(0, 4);
            selected = [];

            try {
                createSauce(chosen, placed);
            } catch (error) {
                console.error("[SauceMaker] Errore:", error);
                showStatus("Errore durante la creazione della salsa.");
            }
        }
    });

    // Pulsante per aprire il database anche senza selezionare il tool.
    function initialize() {
        createPanel();

        if (!document.getElementById(PREFIX + "-launcher")) {
            const launcher = button("🥣 SauceMaker DB", function () {
                createPanel();
                panel.style.display =
                    panel.style.display === "none" ? "block" : "none";
                renderDB();
            });

            launcher.id = PREFIX + "-launcher";
            launcher.style.cssText +=
                "position:fixed;right:14px;bottom:14px;" +
                "z-index:999999;padding:11px;" +
                "border:2px solid #c7a1ed;";

            document.body.appendChild(launcher);
        }

        console.log(
            "[SauceMaker] Caricato. Usa il tool e seleziona 4 ingredienti."
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();
