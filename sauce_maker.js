
/*
 * SauceMaker.js — Infinite Chef R74n+
 *
 * Combina esattamente 4 ingredienti distinti per creare una salsa.
 *
 * Funzioni:
 * - Colore calcolato dalla combinazione dei 4 ingredienti.
 * - Ricerca del colore in più proprietà dei dati.
 * - Fallback cromatico deterministico se il colore manca.
 * - Estrazione nutrizionale dinamica e diagnostica.
 * - Database persistente e ricercabile.
 * - Proprietà liquide applicate alla definizione e all'oggetto.
 *
 * Compatibilità prevista:
 * - addTool / addIngredient
 * - smoker.js
 * - innestatore.js
 *
 * Nota:
 * Le proprietà effettivamente usate per rendering e fisica
 * dipendono dalla versione del motore di Infinite Chef.
 */

(function () {
    "use strict";

    // --------------------------------------------------
    // VERIFICA API
    // --------------------------------------------------

    if (
        typeof addTool !== "function" ||
        typeof addIngredient !== "function" ||
        typeof ingredients !== "object" ||
        ingredients === null
    ) {
        console.error(
            "[SauceMaker] API del gioco non disponibili."
        );
        return;
    }

    const PREFIX = "saucemaker";
    const DB_KEY = "infinite_chef_saucemaker_db_v1";
    const INGREDIENT_COUNT = 4;

    const NUTRIENT_RE =
        /nutri|protein|carbohydrat|fat|fiber|fibre|vitamin|mineral|calor|energy|sugar|salt|water|lipid|starch|sodium|potassium|calcium|iron/i;

    let selected = [];
    let sauceDatabase = [];

    let panel = null;
    let list = null;
    let search = null;
    let status = null;

    // --------------------------------------------------
    // CARICAMENTO DATABASE
    // --------------------------------------------------

    try {
        const saved = localStorage.getItem(DB_KEY);
        sauceDatabase = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(sauceDatabase)) {
            sauceDatabase = [];
        }
    } catch (error) {
        console.warn(
            "[SauceMaker] Impossibile caricare il database.",
            error
        );

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

    function hash(text) {
        let value = 2166136261;

        for (let i = 0; i < text.length; i++) {
            value ^= text.charCodeAt(i);
            value = Math.imul(value, 16777619);
        }

        return value >>> 0;
    }

    function getCombinationKey(ids) {
        return ids.slice().sort().join("+");
    }

    function getId(placed) {
        if (typeof placed === "string") {
            return ingredients[placed] ? placed : null;
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
            localStorage.setItem(
                DB_KEY,
                JSON.stringify(sauceDatabase)
            );
        } catch (error) {
            console.warn(
                "[SauceMaker] Database non salvato.",
                error
            );
        }
    }

    // --------------------------------------------------
    // COLORI
    // --------------------------------------------------

    function parseColor(value) {
        if (
            typeof value === "number" &&
            Number.isFinite(value)
        ) {
            const hex = Math.max(
                0,
                Math.min(0xFFFFFF, Math.round(value))
            )
                .toString(16)
                .padStart(6, "0");

            return [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16)
            ];
        }

        if (typeof value !== "string") {
            return null;
        }

        const color = value.trim();

        if (/^#[0-9a-f]{3}$/i.test(color)) {
            return color.slice(1).split("").map(c =>
                parseInt(c + c, 16)
            );
        }

        if (/^#[0-9a-f]{6}$/i.test(color)) {
            return [
                parseInt(color.slice(1, 3), 16),
                parseInt(color.slice(3, 5), 16),
                parseInt(color.slice(5, 7), 16)
            ];
        }

        if (/^0x[0-9a-f]{6}$/i.test(color)) {
            return parseColor("#" + color.slice(2));
        }

        const rgb = color.match(
            /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i
        );

        if (rgb) {
            return [
                Number(rgb[1]),
                Number(rgb[2]),
                Number(rgb[3])
            ].map(n => Math.max(0, Math.min(255, n)));
        }

        return null;
    }

    function getIngredientColor(id) {
        const data = getDefinition(id);

        const candidates = [
            data.color,
            data.colorObject,
            data.fill,
            data.background,
            data.hex,
            data.colour,
            data.style && data.style.color,
            data.data && data.data.color,
            data.properties && data.properties.color,
            data.visual && data.visual.color,
            data.render && data.render.color
        ];

        for (const candidate of candidates) {
            const parsed = parseColor(candidate);

            if (parsed) {
                return parsed;
            }
        }

        console.warn(
            "[SauceMaker] Colore non trovato:",
            id,
            data
        );

        return null;
    }

    function createSauceColor(ids) {
        const sortedIds = ids.slice().sort();

        const fallbackColors = [
            [235, 75, 75],
            [70, 190, 100],
            [70, 130, 240],
            [245, 190, 55],
            [185, 90, 220],
            [40, 190, 190],
            [240, 125, 45],
            [220, 100, 150]
        ];

        const colors = sortedIds.map(id => {
            const original = getIngredientColor(id);

            if (original) {
                return original;
            }

            // Il fallback varia per ingrediente e non usa
            // sempre il grigio.
            return fallbackColors[
                hash(id) % fallbackColors.length
            ];
        });

        // Seed deterministico: la combinazione mantiene
        // lo stesso colore anche se cambia l'ordine.
        let seed = hash(sortedIds.join("+"));

        const weights = colors.map(() => {
            seed = (
                Math.imul(seed, 1664525) +
                1013904223
            ) >>> 0;

            return 0.5 + seed / 4294967295;
        });

        const totalWeight = weights.reduce(
            (sum, weight) => sum + weight,
            0
        );

        const rgb = [0, 1, 2].map(channel => {
            const value = colors.reduce(
                (sum, color, index) =>
                    sum + color[channel] * weights[index],
                0
            ) / totalWeight;

            return Math.max(
                0,
                Math.min(255, Math.round(value))
            );
        });

        const result = "#" + rgb
            .map(value =>
                value.toString(16).padStart(2, "0")
            )
            .join("");

        console.log(
            "[SauceMaker] Colore calcolato:",
            result,
            "Ingredienti:",
            sortedIds
        );

        return result;
    }

    // --------------------------------------------------
    // NUTRIENTI
    // --------------------------------------------------

    function extractNutrients(data, result, visited) {
        result = result || {};
        visited = visited || new Set();

        if (
            !data ||
            typeof data !== "object" ||
            visited.has(data)
        ) {
            return result;
        }

        visited.add(data);

        for (const [key, value] of Object.entries(data)) {
            if (
                NUTRIENT_RE.test(key) &&
                (
                    typeof value === "number" ||
                    (
                        typeof value === "string" &&
                        value.trim() !== "" &&
                        Number.isFinite(Number(value))
                    )
                )
            ) {
                result[key] = Number(value);
            }
        }

        // Controlla i gruppi più comuni.
        for (const groupKey of [
            "nutrients",
            "nutrition",
            "nutrientData",
            "nutritionalInfo",
            "nutritionFacts"
        ]) {
            const group = data[groupKey];

            if (group && typeof group === "object") {
                extractNutrients(group, result, visited);
            }
        }

        return result;
    }

    function combineNutrients(ids) {
        const totals = {};
        let sourcesFound = 0;

        ids.forEach(id => {
            const definition = getDefinition(id);
            const values = extractNutrients(definition);

            // Diagnostica: mostra i dati reali dell'ingrediente.
            console.log(
                "[SauceMaker] Dati ingrediente:",
                id,
                definition,
                "Nutrienti trovati:",
                values
            );

            if (Object.keys(values).length > 0) {
                sourcesFound++;
            }

            Object.entries(values).forEach(([key, value]) => {
                totals[key] = (totals[key] || 0) + value;
            });
        });

        console.log(
            "[SauceMaker] Totali nutrizionali:",
            totals
        );

        return {
            totals,
            sourcesFound
        };
    }

    // --------------------------------------------------
    // NOMI DELLE SALSE
    // --------------------------------------------------

    const adjectives = [
        "Royal",
        "Mystic",
        "Velvet",
        "Infernal",
        "Cosmic",
        "Golden",
        "Wild",
        "Secret",
        "Emerald",
        "Crimson",
        "Midnight",
        "Atomic"
    ];

    const sauceTypes = [
        "Nebula Sauce",
        "Velvet Drizzle",
        "Fusion Cream",
        "Alchemy Sauce",
        "Flavor Elixir",
        "Quantum Gravy",
        "Chef's Secret",
        "Nutrient Nectar",
        "Fusion Glaze",
        "Infinity Dressing",
        "Gourmet Emulsion"
    ];

    function createSauceName(ids) {
        const h = hash(getCombinationKey(ids));

        return adjectives[h % adjectives.length] +
            " " +
            sauceTypes[(h >>> 4) % sauceTypes.length];
    }

    // --------------------------------------------------
    // DATABASE RICERCABILE
    // --------------------------------------------------

    function button(label, callback) {
        const el = document.createElement("button");

        el.type = "button";
        el.textContent = label;

        el.style.cssText =
            "padding:7px 10px;" +
            "border:0;" +
            "border-radius:6px;" +
            "background:#8c4fc4;" +
            "color:white;" +
            "cursor:pointer;";

        el.addEventListener("click", callback);

        return el;
    }

    function renderDB() {
        if (!list) return;

        list.replaceChildren();

        const query = (search.value || "")
            .toLowerCase()
            .trim();

        const matches = sauceDatabase.filter(item => {
            const name = String(item.name || "").toLowerCase();
            const id = String(item.id || "").toLowerCase();

            const ids = Array.isArray(item.ingredients)
                ? item.ingredients
                : [];

            return (
                name.includes(query) ||
                id.includes(query) ||
                ids.join(" ").toLowerCase().includes(query)
            );
        });

        matches.forEach(item => {
            const row = document.createElement("div");

            row.style.cssText =
                "padding:9px;" +
                "margin:4px 0;" +
                "background:#30243b;" +
                "border-radius:7px;" +
                "overflow-wrap:anywhere;";

            const title = document.createElement("strong");
            title.textContent = "🥣 " + item.name;

            const swatch = document.createElement("span");

            swatch.style.cssText =
                "display:inline-block;" +
                "width:13px;" +
                "height:13px;" +
                "margin-left:8px;" +
                "border-radius:50%;" +
                "border:1px solid #fff8;" +
                "vertical-align:middle;" +
                "background:" +
                (/^#[0-9a-f]{6}$/i.test(item.color || "")
                    ? item.color
                    : "#808080") +
                ";";

            title.appendChild(swatch);

            const details = document.createElement("div");

            details.style.cssText =
                "font-size:12px;" +
                "color:#ddd;" +
                "margin-top:5px;";

            const ids = Array.isArray(item.ingredients)
                ? item.ingredients
                : [];

            details.textContent =
                "ID: " + item.id +
                " | Ingredienti: " +
                ids.map(getName).join(", ");

            const nutrientLine = document.createElement("div");

            nutrientLine.style.cssText =
                "font-size:12px;" +
                "color:#c6e6d2;" +
                "margin-top:5px;";

            const nutrientEntries = Object.entries(
                item.nutrients || {}
            );

            nutrientLine.textContent = nutrientEntries.length
                ? "Nutrienti: " +
                    nutrientEntries
                        .map(([key, value]) => key + "=" + value)
                        .join(", ")
                : "Nessun campo nutrizionale riconosciuto.";

            row.append(title, details, nutrientLine);
            list.appendChild(row);
        });

        if (matches.length === 0) {
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
            "position:fixed;" +
            "right:14px;" +
            "bottom:75px;" +
            "width:360px;" +
            "max-width:calc(100vw - 28px);" +
            "max-height:70vh;" +
            "overflow:auto;" +
            "z-index:999999;" +
            "background:#21192a;" +
            "color:#fff;" +
            "border:2px solid #8c4fc4;" +
            "border-radius:12px;" +
            "padding:12px;" +
            "font:14px Arial,sans-serif;" +
            "display:none;" +
            "box-shadow:0 5px 25px #0009;";

        const heading = document.createElement("h3");
        heading.textContent = "🥣 SauceMaker — Database";
        heading.style.marginTop = "0";

        search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Cerca salsa o ingrediente...";

        search.style.cssText =
            "box-sizing:border-box;" +
            "width:100%;" +
            "padding:9px;" +
            "margin-bottom:8px;";

        search.addEventListener("input", renderDB);

        list = document.createElement("div");

        status = document.createElement("div");

        status.style.cssText =
            "margin:9px 0;" +
            "color:#e2c9ff;" +
            "font-size:12px;";

        panel.append(
            heading,
            search,
            list,
            status,
            button("Chiudi", () => {
                panel.style.display = "none";
            }),
            button("Azzera selezione", resetSelection)
        );

        document.body.appendChild(panel);
        renderDB();
    }

    function showStatus(message) {
        console.log("[SauceMaker]", message);

        if (status) {
            status.textContent = message;
        }
    }

    function resetSelection() {
        selected = [];

        showStatus(
            "Selezione azzerata. Scegli 4 ingredienti."
        );
    }

    // --------------------------------------------------
    // APPLICAZIONE PROPRIETÀ
    // --------------------------------------------------

    function applySauceProperties(target, data) {
        if (!target || typeof target !== "object") {
            return;
        }

        target.id = data.id;
        target.name = data.name;
        target.color = data.color;

        target.type = "liquid";
        target.shape = data.shape;

        // Metadati aggiuntivi: il gioco potrebbe ignorarli.
        target.category = "liquid";
        target.state = "liquid";
        target.isLiquid = true;

        target.keywords = data.keywords;
        target.sauceMaker = true;

        target.sauceIngredients =
            data.sauceIngredients.slice();

        target.sauceNutrients = {
            ...data.sauceNutrients
        };

        target.sauceNutrientSources =
            data.sauceNutrientSources;
    }

    // --------------------------------------------------
    // CREAZIONE DELLA SALSA
    // --------------------------------------------------

    function createSauce(ids, placed) {
        const sortedIds = ids.slice().sort();
        const name = createSauceName(sortedIds);

        const combinationHash = hash(
            getCombinationKey(sortedIds)
        );

        const id =
            "sauce_" +
            cleanId(name) +
            "_" +
            combinationHash.toString(36);

        const color = createSauceColor(sortedIds);
        const nutrition = combineNutrients(sortedIds);

        const data = {
            id: id,
            name: name,
            color: color,

            // Proprietà principali richieste.
            type: "liquid",
            shape: "blob",

            // Metadati aggiuntivi.
            category: "liquid",
            state: "liquid",
            isLiquid: true,

            keywords:
                "sauce, sauce maker, custom sauce, nutrient, " +
                "salsa, liquid, " + sortedIds.join(", "),

            sauceMaker: true,
            sauceIngredients: sortedIds.slice(),

            sauceNutrients: {
                ...nutrition.totals
            },

            sauceNutrientSources: nutrition.sourcesFound
        };

        // Registra la definizione nel gioco.
        if (!ingredients[id]) {
            addIngredient(id, data);
        }

        if (!ingredients[id]) {
            console.error(
                "[SauceMaker] Registrazione fallita:",
                id
            );

            throw new Error(
                "Il gioco non ha registrato la salsa."
            );
        }

        // Riapplica le proprietà dopo la registrazione.
        Object.assign(ingredients[id], data);

        // Aggiorna l'oggetto fisico ricevuto dal tool.
        if (placed && typeof placed === "object") {
            applySauceProperties(placed, data);
        }

        // Registra anche il colore nel database.
        const record = {
            id: id,
            name: name,
            color: color,
            type: "liquid",
            shape: data.shape,
            ingredients: sortedIds.slice(),
            nutrients: {
                ...nutrition.totals
            },
            sourcesFound: nutrition.sourcesFound,
            date: new Date().toLocaleString()
        };

        const existingIndex = sauceDatabase.findIndex(
            item => item.id === id
        );

        if (existingIndex >= 0) {
            sauceDatabase[existingIndex] = record;
        } else {
            sauceDatabase.unshift(record);
        }

        saveDB();
        renderDB();

        showStatus(
            "Creata " + name +
            " | Tipo: liquid" +
            " | Colore: " + color +
            " | Campi nutrizionali: " +
            Object.keys(nutrition.totals).length
        );

        console.log(
            "[SauceMaker] Salsa creata:",
            record
        );

        return record;
    }

    // --------------------------------------------------
    // TOOL
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
                "Clicca 4 ingredienti distinti, uno alla volta."
            );
        },

        func: function (placed) {
            const id = getId(placed);

            if (!id) {
                showStatus(
                    "Ingrediente non riconosciuto."
                );
                return;
            }

            if (selected.includes(id)) {
                showStatus(
                    getName(id) +
                    " è già nella selezione."
                );
                return;
            }

            selected.push(id);

            showStatus(
                "Ingrediente " +
                selected.length + "/" +
                INGREDIENT_COUNT + ": " +
                getName(id)
            );

            if (selected.length < INGREDIENT_COUNT) {
                return;
            }

            const chosen = selected.slice(
                0,
                INGREDIENT_COUNT
            );

            selected = [];

            try {
                createSauce(chosen, placed);
            } catch (error) {
                console.error(
                    "[SauceMaker] Errore:",
                    error
                );

                showStatus(
                    "Errore durante la creazione della salsa."
                );
            }
        }
    });

    // --------------------------------------------------
    // PULSANTE DATABASE
    // --------------------------------------------------

    function initialize() {
        createPanel();

        if (
            !document.getElementById(
                PREFIX + "-launcher"
            )
        ) {
            const launcher = button(
                "🥣 SauceMaker DB",
                function () {
                    createPanel();

                    panel.style.display =
                        panel.style.display === "none"
                            ? "block"
                            : "none";

                    renderDB();
                }
            );

            launcher.id = PREFIX + "-launcher";

            launcher.style.cssText +=
                "position:fixed;" +
                "right:14px;" +
                "bottom:14px;" +
                "z-index:999999;" +
                "padding:11px;" +
                "border:2px solid #c7a1ed;";

            document.body.appendChild(launcher);
        }

        console.log(
            "[SauceMaker] Caricato. " +
            "Seleziona 4 ingredienti per creare una salsa."
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


