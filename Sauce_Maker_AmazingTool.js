
/*
 * SauceMaker.js — Infinite Chef R74n+
 *
 * - Seleziona 4 ingredienti distinti.
 * - ID deterministico basato sugli ID degli ingredienti.
 * - Nome della salsa identico al suo ID.
 * - Livelli di innesto 1 e 2 conservati.
 * - Parole separate da underscore.
 * - Colore deterministico.
 * - Estrazione e combinazione dei dati nutrizionali.
 * - Database locale ricercabile e cancellabile.
 * - Metadati conservati per altri mod.
 */

(function () {
    "use strict";

    if (
        typeof addTool !== "function" ||
        typeof addIngredient !== "function" ||
        typeof ingredients !== "object" ||
        ingredients === null
    ) {
        console.error("[SauceMaker] API del gioco non disponibili.");
        return;
    }

    const PREFIX = "saucemaker";
    const DB_KEY = "infinite_chef_saucemaker_db_v2";
    const COUNT = 4;

    const NUTRIENT_RE =
        /nutri|protein|carbohydrat|fat|fiber|fibre|vitamin|mineral|calor|energy|sugar|salt|water|lipid|starch|sodium|potassium|calcium|iron|magnesium|zinc/i;

    let selected = [];
    let database = [];
    let panel;
    let search;
    let list;
    let status;

    // ---------------- DATABASE ----------------

    try {
        const saved = localStorage.getItem(DB_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        database = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("[SauceMaker] Database non leggibile:", error);
        database = [];
    }

    function saveDatabase() {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(database));
        } catch (error) {
            console.warn("[SauceMaker] Salvataggio fallito:", error);
        }
    }

    function clearSauceDatabase() {
        if (!window.confirm(
            "Vuoi eliminare tutte le salse salvate nel database SauceMaker?"
        )) return;

        database = [];
        saveDatabase();
        renderDatabase();
        showStatus("Database delle salse svuotato.");
    }

    // ---------------- UTILITÀ ----------------

    function hash(text) {
        let h = 2166136261;

        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return h >>> 0;
    }

    function cleanId(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 65);
    }

    /*
     * Normalizza l'ID di un ingrediente.
     *
     * Esempi:
     * "Crab Sticks"            -> "crab_sticks"
     * "innesto1...con...Olive" -> "innesto1_con_olive"
     * "innesto2...con...Milk"  -> "innesto2_con_milk"
     *
     * I livelli 1 e 2 sono conservati esclusivamente
     * quando fanno parte della parola "innesto".
     */
    function normalizeIngredientId(value) {
    let result = String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // Uniforma "innesto 1", "innesto_1" e "innesto...1".
    result = result.replace(
        /innesto[\s._-]*([12])/g,
        "innesto$1"
    );

    // Uniforma i separatori della struttura innesto/con.
    result = result.replace(
        /innesto([12])[\s._-]*\.{0,3}[\s._-]*con[\s._-]*\.{0,3}/g,
        "innesto$1_con_"
    );

    // Trasforma spazi e punteggiatura in underscore.
    result = result
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    // Elimina numeri estranei, mantenendo i livelli innesto1/2.
    result = result.replace(/innesto([12])/g, "LIVELLOINNESTO$1");
    result = result.replace(/[0-9]/g, "");
    result = result.replace(/LIVELLOINNESTO([12])/g, "innesto$1");

    return result
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
}
    function combinationKey(ids) {
        return ids.slice().sort().join("+");
    }

    function definitionOf(id) {
        return ingredients[id] || {};
    }

    function ingredientName(id) {
        const def = definitionOf(id);
        return String(def.name || id.replace(/_/g, " "));
    }

    function describeIngredients(ids) {
        return ids.map(ingredientName).join(" + ");
    }

    function normalizedText(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function showStatus(message) {
        console.log("[SauceMaker]", message);
        if (status) status.textContent = message;
    }

    function getId(placed) {
        if (typeof placed === "string") {
            return ingredients[placed] ? placed : null;
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

        for (const [id, def] of Object.entries(ingredients)) {
            if (def === placed) return id;
        }

        console.warn("[SauceMaker] ID non riconosciuto:", placed);
        return null;
    }

    // ---------------- ID E NOME ----------------

    /*
     * Ogni ingrediente contribuisce con il proprio ID.
     * Le parole sono separate da underscore.
     * Gli ID sono ordinati per ottenere un risultato deterministico.
     *
     * Il nome della salsa è identico all'ID finale.
     */
    function createSauceId(ids) {
    const parts = ids
        .map(id => normalizeIngredientId(id))
        .filter(Boolean)
        .sort();

    return "sauce_" + parts.join("_");
}

function createSauceName(id) {
    return id;
}

    function createSauceName(id) {
        return id;
    }

    // ---------------- COLORI ----------------

    function parseColor(value) {
        if (typeof value === "number" && Number.isFinite(value)) {
            const hex = Math.max(0, Math.min(0xFFFFFF, value))
                .toString(16)
                .padStart(6, "0");

            return [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16)
            ];
        }

        if (typeof value !== "string") return null;

        const s = value.trim();

        if (/^#[0-9a-f]{3}$/i.test(s)) {
            return s.slice(1).split("").map(c =>
                parseInt(c + c, 16)
            );
        }

        if (/^#[0-9a-f]{6}$/i.test(s)) {
            return [
                parseInt(s.slice(1, 3), 16),
                parseInt(s.slice(3, 5), 16),
                parseInt(s.slice(5, 7), 16)
            ];
        }

        if (/^0x[0-9a-f]{6}$/i.test(s)) {
            return parseColor("#" + s.slice(2));
        }

        const match = s.match(
            /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i
        );

        if (match) {
            return match.slice(1, 4).map(n =>
                Math.max(0, Math.min(255, Number(n)))
            );
        }

        return null;
    }

    function findColorInObject(object, depth) {
        if (!object || typeof object !== "object" || depth > 2) {
            return null;
        }

        for (const key of [
            "color", "colour", "hex", "fill", "background"
        ]) {
            const parsed = parseColor(object[key]);
            if (parsed) return parsed;
        }

        for (const key of [
            "style", "data", "properties", "visual", "render"
        ]) {
            const nested = object[key];

            if (nested && typeof nested === "object") {
                const found = findColorInObject(nested, depth + 1);
                if (found) return found;
            }
        }

        return null;
    }

    function ingredientColor(id) {
        return findColorInObject(definitionOf(id), 0);
    }

    function rgbToHex(rgb) {
        return "#" + rgb.map(n =>
            Math.round(Math.max(0, Math.min(255, n)))
                .toString(16)
                .padStart(2, "0")
        ).join("");
    }

    function hslToRgb(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let rgb;

        if (h < 60) rgb = [c, x, 0];
        else if (h < 120) rgb = [x, c, 0];
        else if (h < 180) rgb = [0, c, x];
        else if (h < 240) rgb = [0, x, c];
        else if (h < 300) rgb = [x, 0, c];
        else rgb = [c, 0, x];

        return rgb.map(v => Math.round((v + m) * 255));
    }

    function createSauceColor(ids) {
        const seed = hash(combinationKey(ids));
        const hue = seed % 360;
        const saturation = 68 + ((seed >>> 9) % 22);
        const lightness = 42 + ((seed >>> 17) % 15);

        let rgb = hslToRgb(hue, saturation, lightness);

        const sourceColors = ids.map(ingredientColor).filter(Boolean);

        if (sourceColors.length > 0) {
            const average = [0, 1, 2].map(channel =>
                sourceColors.reduce(
                    (sum, color) => sum + color[channel], 0
                ) / sourceColors.length
            );

            rgb = rgb.map((channel, i) =>
                Math.round(channel * 0.72 + average[i] * 0.28)
            );
        }

        const max = Math.max(...rgb);
        const min = Math.min(...rgb);

        if (max - min < 45 || max < 85) {
            rgb = hslToRgb(hue, Math.max(75, saturation), 49);
        }

        return rgbToHex(rgb);
    }

    // ---------------- NUTRIENTI ----------------

    function extractNutrients(root) {
        const totals = {};
        const visited = new Set();

        function walk(value, path, depth) {
            if (
                !value ||
                typeof value !== "object" ||
                depth > 8 ||
                visited.has(value)
            ) return;

            visited.add(value);

            for (const [key, item] of Object.entries(value)) {
                if (
                    NUTRIENT_RE.test(key) &&
                    (
                        typeof item === "number" ||
                        (
                            typeof item === "string" &&
                            item.trim() !== "" &&
                            Number.isFinite(Number(item))
                        )
                    )
                ) {
                    const numeric = Number(item);
                    const fullKey = path ? path + "." + key : key;

                    if (Number.isFinite(numeric)) {
                        totals[fullKey] = numeric;
                    }
                }

                if (item && typeof item === "object") {
                    walk(item, path ? path + "." + key : key, depth + 1);
                }
            }
        }

        walk(root, "", 0);
        return totals;
    }

    function combineNutrients(ids) {
        const totals = {};
        let sourcesFound = 0;

        for (const id of ids) {
            const values = extractNutrients(definitionOf(id));

            console.log("[SauceMaker] Nutrienti rilevati:", id, values);

            if (Object.keys(values).length > 0) sourcesFound++;

            for (const [key, value] of Object.entries(values)) {
                totals[key] = (totals[key] || 0) + value;
            }
        }

        return { totals, sourcesFound };
    }

    // ---------------- INTERFACCIA ----------------

    function makeButton(label, callback) {
        const el = document.createElement("button");
        el.type = "button";
        el.textContent = label;

        el.style.cssText =
            "padding:7px 10px;border:0;border-radius:6px;" +
            "background:#8c4fc4;color:white;cursor:pointer;margin:3px;";

        el.addEventListener("click", callback);
        return el;
    }

    function renderDatabase() {
        if (!list) return;

        list.replaceChildren();

        const query = (search.value || "").toLowerCase().trim();

        const results = database.filter(item => {
            const description =
                item.description ||
                describeIngredients(item.ingredients || []);

            return (
                String(item.id || "").toLowerCase().includes(query) ||
                String(description).toLowerCase().includes(query) ||
                (item.ingredients || [])
                    .map(id => id + " " + ingredientName(id))
                    .join(" ")
                    .toLowerCase()
                    .includes(query)
            );
        });

        for (const item of results) {
            const row = document.createElement("div");

            row.style.cssText =
                "padding:9px;margin:5px 0;background:#30243b;" +
                "border-radius:7px;overflow-wrap:anywhere;";

            const heading = document.createElement("strong");

            // Nome visualizzato sempre identico all'ID.
            heading.textContent = "🥣 " + item.id;

            const swatch = document.createElement("span");
            swatch.style.cssText =
                "display:inline-block;width:13px;height:13px;" +
                "border-radius:50%;border:1px solid #fff8;" +
                "background:" +
                (/^#[0-9a-f]{6}$/i.test(item.color || "")
                    ? item.color : "#888") +
                ";vertical-align:middle;margin-left:6px;";

            heading.appendChild(swatch);

            const details = document.createElement("div");
            details.style.cssText =
                "font-size:12px;color:#ddd;margin-top:5px;";
            details.textContent = "ID: " + item.id;

            const ingredientDetails = document.createElement("div");
            ingredientDetails.style.cssText =
                "font-size:12px;color:#ddd;margin-top:4px;";
            ingredientDetails.textContent =
                "Ingredienti: " +
                (item.ingredients || []).map(ingredientName).join(", ");

            const nutrients = document.createElement("div");
            nutrients.style.cssText =
                "font-size:12px;color:#c6e6d2;margin-top:5px;";

            const entries = Object.entries(item.nutrients || {});

            nutrients.textContent = entries.length
                ? "Nutrienti rilevati: " +
                    entries.map(([k, v]) => k + "=" + v).join(", ")
                : "Nessun campo nutrizionale riconosciuto.";

            row.append(heading, details, ingredientDetails, nutrients);
            list.appendChild(row);
        }

        if (!results.length) {
            const empty = document.createElement("div");
            empty.textContent = "Nessuna salsa trovata.";
            list.appendChild(empty);
        }
    }

    function resetSelection() {
        selected = [];
        showStatus("Selezione azzerata. Scegli 4 ingredienti distinti.");
    }

    function createPanel() {
        if (panel) return;

        panel = document.createElement("div");
        panel.id = PREFIX + "-panel";

        panel.style.cssText =
            "position:fixed;right:14px;bottom:75px;" +
            "width:360px;max-width:calc(100vw - 28px);" +
            "max-height:70vh;overflow:auto;z-index:999999;" +
            "background:#21192a;color:#fff;border:2px solid #8c4fc4;" +
            "border-radius:12px;padding:12px;font:14px Arial,sans-serif;" +
            "display:none;box-shadow:0 5px 25px #0009;";

        const title = document.createElement("h3");
        title.textContent = "🥣 SauceMaker — Database";
        title.style.marginTop = "0";

        search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Cerca ID o ingrediente...";
        search.style.cssText =
            "box-sizing:border-box;width:100%;padding:9px;margin-bottom:8px;";

        search.addEventListener("input", renderDatabase);
        list = document.createElement("div");

        status = document.createElement("div");
        status.style.cssText =
            "margin:9px 0;color:#e2c9ff;font-size:12px;";

        panel.append(
            title,
            search,
            list,
            status,
            makeButton("Chiudi", () => {
                panel.style.display = "none";
            }),
            makeButton("Azzera selezione", resetSelection),
            makeButton("🗑 Pulisci lista salse", clearSauceDatabase)
        );

        document.body.appendChild(panel);
        renderDatabase();
    }

    // ---------------- CREAZIONE SALSA ----------------

    function createSauce(ids, placed) {
        const sorted = ids.slice().sort();

        const id = createSauceId(sorted);
        const name = createSauceName(id);
        const description = describeIngredients(sorted);
        const color = createSauceColor(sorted);
        const nutrition = combineNutrients(sorted);

        const data = {
            id,
            name,
            description,
            color,
            type: "liquid",
            keywords:
                "sauce sauce_maker custom_sauce liquid salsa " +
                sorted.join(" ") + " " + id + " " + description,
            sauceMaker: true,
            sauceIngredients: sorted.slice(),
            sauceNutrients: { ...nutrition.totals },
            sauceNutrientSources: nutrition.sourcesFound
        };

        if (!ingredients[id]) addIngredient(id, data);

        if (!ingredients[id]) {
            throw new Error("Il gioco non ha registrato la salsa: " + id);
        }

        Object.assign(ingredients[id], data);

        // Nome sempre uguale all'ID anche nell'oggetto del gioco.
        ingredients[id].name = id;

        if (placed && typeof placed === "object") {
            Object.assign(placed, data);
        }

        const record = {
            id,
            name: id,
            description,
            color,
            type: "liquid",
            ingredients: sorted,
            nutrients: { ...nutrition.totals },
            sourcesFound: nutrition.sourcesFound,
            date: new Date().toLocaleString()
        };

        const index = database.findIndex(item => item.id === id);

        if (index >= 0) database[index] = record;
        else database.unshift(record);

        saveDatabase();
        renderDatabase();

        showStatus(
            "Creata: " + id +
            " | Campi nutrizionali: " +
            Object.keys(nutrition.totals).length
        );

        console.log("[SauceMaker] Salsa registrata:", record);
        console.log("[SauceMaker] Definizione nel gioco:", ingredients[id]);

        return record;
    }

    // ---------------- TOOL ----------------

    addTool("saucemaker", {
        name: "SauceMaker",
        color: "#9b59d0",
        shape: "liquid",
        spin: true,

        onSelect: function () {
            createPanel();
            panel.style.display = "block";
            showStatus("Clicca 4 ingredienti distinti, uno alla volta.");
        },

        func: function (placed) {
            const id = getId(placed);

            if (!id) {
                showStatus("Ingrediente non riconosciuto.");
                return;
            }

            if (selected.includes(id)) {
                showStatus(ingredientName(id) + " è già nella selezione.");
                return;
            }

            selected.push(id);

            showStatus(
                "Ingrediente " + selected.length + "/" + COUNT +
                ": " + ingredientName(id)
            );

            if (selected.length < COUNT) return;

            const chosen = selected.slice(0, COUNT);
            selected = [];

            try {
                createSauce(chosen, placed);
            } catch (error) {
                console.error("[SauceMaker] Errore di creazione:", error);
                showStatus("Errore durante la creazione della salsa.");
            }
        }
    });

    // ---------------- AVVIO ----------------

    function initialize() {
        createPanel();

        if (!document.getElementById(PREFIX + "-launcher")) {
            const launcher = makeButton(
                "🥣 SauceMaker DB",
                function () {
                    createPanel();

                    panel.style.display =
                        panel.style.display === "none" ? "block" : "none";

                    renderDatabase();
                }
            );

            launcher.id = PREFIX + "-launcher";

            launcher.style.cssText +=
                "position:fixed;right:14px;bottom:14px;" +
                "z-index:999999;padding:11px;border:2px solid #c7a1ed;";

            document.body.appendChild(launcher);
        }

        console.log("[SauceMaker] Caricato correttamente.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();
