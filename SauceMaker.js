
/*
 * SauceMaker.js — Infinite Chef R74n+
 *
 * - Seleziona 4 ingredienti distinti.
 * - Crea una salsa con ID deterministico.
 * - Calcola un colore vivace basato sulla combinazione.
 * - Cerca dati nutrizionali nelle strutture disponibili.
 * - Mantiene un database locale ricercabile.
 * - Conserva i metadati della salsa per altri mod.
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
            .replace(/^_+|_+$/g, "")
            .slice(0, 65);
    }

    function combinationKey(ids) {
        return ids.slice().sort().join("+");
    }

    function definitionOf(id) {
        return ingredients[id] || {};
    }

    function ingredientName(id) {
        const def = definitionOf(id);
        return def.name || id.replace(/_/g, " ");
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

        for (const [id, def] of Object.entries(ingredients)) {
            if (def === placed) return id;
        }

        console.warn("[SauceMaker] ID non riconosciuto:", placed);
        return null;
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

        const keys = [
            "color", "colour", "hex", "fill", "background"
        ];

        for (const key of keys) {
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
        const key = combinationKey(ids);
        const seed = hash(key);

        // La tonalità deriva dalla combinazione ordinata:
        // stessi 4 ingredienti = stesso colore, in qualsiasi ordine.
        const hue = seed % 360;
        const saturation = 68 + ((seed >>> 9) % 22);
        const lightness = 42 + ((seed >>> 17) % 15);

        let rgb = hslToRgb(hue, saturation, lightness);

        // Se esistono colori sorgente validi, ne usa una
        // media leggera senza perdere la distinzione cromatica.
        const sourceColors = ids
            .map(ingredientColor)
            .filter(Boolean);

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

        // Evita risultati quasi grigi o troppo scuri.
        const max = Math.max(...rgb);
        const min = Math.min(...rgb);

        if (max - min < 45 || max < 85) {
            rgb = hslToRgb(hue, Math.max(75, saturation), 49);
        }

        const result = rgbToHex(rgb);

        console.log(
            "[SauceMaker] Colore:",
            result,
            "| combinazione:",
            key
        );

        return result;
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
            ) {
                return;
            }

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

            console.log(
                "[SauceMaker] Nutrienti rilevati:",
                id,
                values
            );

            if (Object.keys(values).length > 0) sourcesFound++;

            for (const [key, value] of Object.entries(values)) {
                totals[key] = (totals[key] || 0) + value;
            }
        }

        return { totals, sourcesFound };
    }

    // ---------------- NOMI ----------------

    const adjectives = [
        "Royal", "Mystic", "Velvet", "Infernal",
        "Cosmic", "Golden", "Wild", "Secret",
        "Emerald", "Crimson", "Midnight", "Atomic"
    ];

    const sauceTypes = [
        "Nebula Sauce", "Velvet Drizzle", "Fusion Cream",
        "Alchemy Sauce", "Flavor Elixir", "Quantum Gravy",
        "Chef Secret", "Nutrient Nectar", "Fusion Glaze",
        "Infinity Dressing", "Gourmet Emulsion"
    ];

    function createSauceName(ids) {
        const h = hash(combinationKey(ids));
        return adjectives[h % adjectives.length] +
            " " + sauceTypes[(h >>> 4) % sauceTypes.length];
    }

    // ---------------- INTERFACCIA ----------------

    function makeButton(label, callback) {
        const el = document.createElement("button");
        el.type = "button";
        el.textContent = label;

        el.style.cssText =
            "padding:7px 10px;border:0;border-radius:6px;" +
            "background:#8c4fc4;color:white;cursor:pointer;" +
            "margin:3px;";

        el.addEventListener("click", callback);
        return el;
    }

    function renderDatabase() {
        if (!list) return;

        list.replaceChildren();

        const query = (search.value || "").toLowerCase().trim();

        const results = database.filter(item =>
            String(item.name || "").toLowerCase().includes(query) ||
            String(item.id || "").toLowerCase().includes(query) ||
            (item.ingredients || []).join(" ").toLowerCase().includes(query)
        );

        for (const item of results) {
            const row = document.createElement("div");

            row.style.cssText =
                "padding:9px;margin:5px 0;background:#30243b;" +
                "border-radius:7px;overflow-wrap:anywhere;";

            const heading = document.createElement("strong");
            heading.textContent = "🥣 " + item.name + " ";

            const swatch = document.createElement("span");
            swatch.style.cssText =
                "display:inline-block;width:13px;height:13px;" +
                "border-radius:50%;border:1px solid #fff8;" +
                "background:" +
                (/^#[0-9a-f]{6}$/i.test(item.color || "")
                    ? item.color : "#888") +
                ";vertical-align:middle;";

            heading.appendChild(swatch);

            const details = document.createElement("div");
            details.style.cssText = "font-size:12px;color:#ddd;margin-top:5px;";
            details.textContent =
                "ID: " + item.id + " | Ingredienti: " +
                (item.ingredients || []).map(ingredientName).join(", ");

            const nutrients = document.createElement("div");
            nutrients.style.cssText =
                "font-size:12px;color:#c6e6d2;margin-top:5px;";

            const entries = Object.entries(item.nutrients || {});
            nutrients.textContent = entries.length
                ? "Nutrienti rilevati: " +
                    entries.map(([k, v]) => k + "=" + v).join(", ")
                : "Nessun campo nutrizionale riconosciuto.";

            row.append(heading, details, nutrients);
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
        search.placeholder = "Cerca salsa o ingrediente...";
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
            makeButton("Azzera selezione", resetSelection)
        );

        document.body.appendChild(panel);
        renderDatabase();
    }

    // ---------------- CREAZIONE SALSA ----------------

    function createSauce(ids, placed) {
        const sorted = ids.slice().sort();
        const key = combinationKey(sorted);
        const h = hash(key);

        const name = createSauceName(sorted);
        const id = "sauce_" + cleanId(name) + "_" + h.toString(36);
        const color = createSauceColor(sorted);
        const nutrition = combineNutrients(sorted);

      
const data = {
    id,
    name,
    color,
    type: "liquid",
    keywords:
        "sauce sauce_maker custom_sauce liquid salsa " +
        sorted.join(" "),
    sauceMaker: true,
    sauceIngredients: sorted.slice(),
    sauceNutrients: { ...nutrition.totals },
    sauceNutrientSources: nutrition.sourcesFound
};


        if (!ingredients[id]) {
            addIngredient(id, data);
        }

        if (!ingredients[id]) {
            throw new Error("Il gioco non ha registrato la salsa: " + id);
        }

        // Mantiene esplicite le proprietà anche se addIngredient
        // normalizza o copia l'oggetto ricevuto.
        Object.assign(ingredients[id], data);

        /*
         * Il tool trasforma l'oggetto cliccato per rappresentare
         * la salsa nel mondo. Prima abbiamo già salvato gli ID
         * originali dei quattro ingredienti.
         */
        if (placed && typeof placed === "object") {
            Object.assign(placed, data);
        }

        const record = {
            id,
            name,
            color,
            type: "liquid",
            shape: data.shape,
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
            "Creata " + name +
            " | Colore: " + color +
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

            // Svuota la selezione prima di trasformare l'oggetto.
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
            const launcher = makeButton("🥣 SauceMaker DB", function () {
                createPanel();
                panel.style.display =
                    panel.style.display === "none" ? "block" : "none";
                renderDatabase();
            });

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
