
/*
 * restoration_simulator.js
 * Infinite Chef R74n Plus
 *
 * 3 giornate, 2 piatti al giorno, 6 ricette uniche.
 * Ricette importate automaticamente quando accessibili.
 * La spunta verde conferma e salva ogni slot.
 * Nessuna ricetta di esempio e nessun inserimento manuale.
 */

(function () {
    "use strict";

    const MOD_ID = "restoration-simulator";
    const STORAGE_KEY = "restoration_simulator_save_v2";
    const DAYS = 3;
    const PER_DAY = 2;
    const SLOT_COUNT = DAYS * PER_DAY;
    const INITIAL_CAPITAL = 1000;

    if (document.getElementById(MOD_ID + "-panel")) return;

    const state = {
        capital: INITIAL_CAPITAL,
        recipes: [],
        menu: Array(SLOT_COUNT).fill(""),
        reports: [],
        completed: false
    };

    const $ = selector => document.querySelector(selector);

    const money = value => "$" + Number(value || 0).toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const clamp = (value, min = 1, max = 10) =>
        Math.max(min, Math.min(max, Number(value) || min));

    const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn("[Restoration Simulator] Salvataggio fallito:", error);
        }
    }

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (!saved) return;

            state.capital = Number(saved.capital) || INITIAL_CAPITAL;
            state.recipes = Array.isArray(saved.recipes) ? saved.recipes : [];
            state.menu = Array.isArray(saved.menu)
                ? saved.menu.slice(0, SLOT_COUNT)
                : Array(SLOT_COUNT).fill("");
            state.reports = Array.isArray(saved.reports) ? saved.reports : [];
            state.completed = Boolean(saved.completed);

            while (state.menu.length < SLOT_COUNT) state.menu.push("");
        } catch (error) {
            console.warn("[Restoration Simulator] Salvataggio non valido:", error);
        }
    }

    function estimateMetrics(recipe) {
        const name = recipe.name.toLowerCase();
        const ingredients = recipe.ingredients || [];
        const tools = recipe.tools || [];

        const premium =
            /gourmet|signature|tartare|souffl[eé]|risotto|truffle|tartufo|wagyu|sashimi|carpaccio|confit|molecular|degustazione|premium|stellato|affumicato|fermentato|caramellato/;

        const visual =
            /rainbow|layer|flower|gold|crystal|sculpt|cake|sushi|dessert|colorato|fiore|oro|cristallo|torta/;

        const flavor =
            /spicy|sweet|sour|smok|umami|herb|spice|agrodolce|piccante|dolce|affumicato|erbe|speziato/;

        const complexity = clamp(
            1 + ingredients.length * 0.7 + tools.length * 0.6 +
            (premium.test(name) ? 2 : 0)
        );

        const gourmet = clamp(
            2 + Math.min(ingredients.length, 7) * 0.5 +
            (premium.test(name) ? 4 : 0)
        );

        const aesthetic = clamp(
            3 + Math.min(ingredients.length, 5) * 0.3 +
            (visual.test(name) ? 3 : 0)
        );

        const taste = clamp(
            3 + Math.min(ingredients.length, 7) * 0.6 +
            (flavor.test(name) ? 2 : 0)
        );

        const combinations = clamp(
            2 + Math.max(0, ingredients.length - 1) * 1.1
        );

        const score =
            complexity * 0.25 +
            gourmet * 0.25 +
            aesthetic * 0.18 +
            taste * 0.17 +
            combinations * 0.15;

        return {
            complexity,
            gourmet,
            visual: aesthetic,
            flavor: taste,
            combinations,
            score: Math.round(score * 10) / 10
        };
    }

    /*
     * Cerca ricette in fonti globali accessibili.
     * Non inventa ricette: importa solo oggetti che sembrano ricette.
     */
    function discoverRecipes() {
        const found = new Map();
        const visited = new WeakSet();
        const queue = [];

        const preferred = [
            "recipes", "recipeBook", "recipeDatabase", "cookbook",
            "dishes", "foods", "craftingRecipes"
        ];

        function enqueue(value, path) {
            if (value && typeof value === "object") {
                queue.push({ value, path });
            }
        }

        for (const key of preferred) {
            try {
                enqueue(window[key], key);
            } catch (_) {}
        }

        // Esamina soltanto globali con nomi pertinenti.
        try {
            for (const key of Object.getOwnPropertyNames(window)) {
                if (!/recipe|cook|dish|food|ingredient|craft/i.test(key)) continue;
                try {
                    enqueue(window[key], key);
                } catch (_) {}
            }
        } catch (_) {}

        function normalizeIngredients(item) {
            const raw =
                item.ingredients ??
                item.inputs ??
                item.input ??
                item.components ??
                item.materials ??
                [];

            if (Array.isArray(raw)) {
                return raw.map(value => {
                    if (typeof value === "string") return value;
                    if (value && typeof value === "object") {
                        return String(
                            value.name ?? value.id ?? value.ingredient ?? "Ingrediente"
                        );
                    }
                    return String(value);
                });
            }

            if (typeof raw === "string") {
                return raw.split(/[+,]/).map(x => x.trim()).filter(Boolean);
            }

            if (raw && typeof raw === "object") return Object.keys(raw);
            return [];
        }

        let inspected = 0;
        const maxObjects = 8000;

        while (queue.length && inspected < maxObjects) {
            const { value, path } = queue.shift();

            if (!value || typeof value !== "object") continue;
            if (value instanceof HTMLElement) continue;
            if (visited.has(value)) continue;

            visited.add(value);
            inspected++;

            let entries = [];

            if (Array.isArray(value)) {
                entries = value.map((item, index) => [String(index), item]);
            } else {
                try {
                    entries = Object.entries(value);
                } catch (_) {
                    continue;
                }
            }

            for (const [key, item] of entries) {
                if (!item || typeof item !== "object") continue;

                const name =
                    item.name ??
                    item.title ??
                    item.recipeName ??
                    item.dishName ??
                    (typeof item.result === "string" ? item.result : null) ??
                    (typeof item.output === "string" ? item.output : null) ??
                    item.result?.name ??
                    item.output?.name;

                const ingredients = normalizeIngredients(item);

                const isRecipe = Boolean(name) && (
                    ingredients.length > 0 ||
                    item.ingredients != null ||
                    item.inputs != null ||
                    item.output != null ||
                    item.result != null ||
                    /recipe|cookbook|dish|craft/i.test(path)
                );

                if (isRecipe) {
                    const normalizedName = String(name).trim();
                    const uniqueKey = normalizedName.toLowerCase();

                    if (normalizedName && !found.has(uniqueKey)) {
                        found.set(uniqueKey, {
                            id: "game_" + path + "_" +
                                String(item.id ?? item.key ?? key),
                            name: normalizedName,
                            ingredients,
                            tools: Array.isArray(item.tools)
                                ? item.tools.map(String)
                                : []
                        });
                    }
                }

                // Cerca anche negli oggetti annidati.
                let children = [];
                try {
                    children = Object.entries(item);
                } catch (_) {}

                for (const [childKey, child] of children) {
                    if (
                        child &&
                        typeof child === "object" &&
                        !visited.has(child)
                    ) {
                        enqueue(child, path + "." + childKey);
                    }
                }
            }
        }

        console.info(
            "[Restoration Simulator] Ricette trovate:",
            found.size,
            "Oggetti esaminati:",
            inspected
        );

        return [...found.values()];
    }

    function importRecipes() {
        const discovered = discoverRecipes();
        const existing = new Set(
            state.recipes.map(recipe => recipe.name.toLowerCase())
        );

        let added = 0;

        for (const item of discovered) {
            const key = item.name.toLowerCase();
            if (existing.has(key)) continue;

            item.metrics = estimateMetrics(item);
            state.recipes.push(item);
            existing.add(key);
            added++;
        }

        // Aggiorna anche i dettagli delle ricette salvate.
        state.recipes.forEach(recipe => {
            recipe.ingredients = Array.isArray(recipe.ingredients)
                ? recipe.ingredients : [];
            recipe.tools = Array.isArray(recipe.tools) ? recipe.tools : [];
            recipe.metrics = estimateMetrics(recipe);
        });

        save();
        render();

        const status = $("#rs-status");
        if (status) {
            status.textContent = discovered.length
                ? `Ricette individuate: ${discovered.length}. Nuove importate: ${added}.`
                : "Nessuna ricetta accessibile trovata. Il gioco potrebbe usare dati interni non esposti.";
        }
    }

    function getRecipe(id) {
        return state.recipes.find(recipe => recipe.id === id);
    }

    function calculateCosts(recipe, day) {
        const premium =
            /truffle|tartufo|wagyu|caviar|caviale|saffron|zafferano|lobster|aragosta|gold|oro/i;

        const ingredients = recipe.ingredients.reduce((sum, ingredient) => {
            const base = 3 + (String(ingredient).length % 5) * 0.8;
            return sum + base * (premium.test(ingredient) ? 5 : 1);
        }, 0);

        const tools = recipe.tools.reduce(
            (sum, tool) => sum + 4 + (String(tool).length % 4),
            0
        );

        const labor = recipe.metrics.complexity * 2.5;
        const market = [1, 1.08, 0.96][day - 1] || 1;

        return {
            ingredients: ingredients * market,
            tools: tools * market,
            labor,
            total: (ingredients + tools) * market + labor
        };
    }

    function calculateRevenue(recipe) {
        const m = recipe.metrics;
        const base =
            15 + m.complexity * 8 + m.gourmet * 10 +
            m.visual * 4 + m.flavor * 5 + m.combinations * 5;

        const premium =
            /gourmet|signature|tartare|souffl[eé]|risotto|truffle|tartufo|wagyu|sashimi|carpaccio|confit|molecular|degustazione|stellato/i;

        return Math.round(
            base * (premium.test(recipe.name) ? 1.25 : 1) * 100
        ) / 100;
    }

    function simulateDay() {
        const day = state.reports.length + 1;

        if (day > DAYS) {
            alert("Hai completato tutte e tre le giornate!");
            return;
        }

        const start = (day - 1) * PER_DAY;
        const ids = state.menu.slice(start, start + PER_DAY);

        if (ids.length !== 2 || ids.some(id => !id)) {
            alert("Conferma entrambe le ricette del giorno " + day + ".");
            return;
        }

        if (new Set(ids).size !== 2) {
            alert("I due piatti devono essere diversi.");
            return;
        }

        const dishes = ids.map(getRecipe);

        if (dishes.some(recipe => !recipe)) {
            alert("Una ricetta non è più disponibile. Importa nuovamente le ricette.");
            return;
        }

        let revenue = 0;
        let ingredientCosts = 0;
        let toolCosts = 0;
        let laborCosts = 0;

        const breakdown = dishes.map(recipe => {
            const costs = calculateCosts(recipe, day);
            const gross = calculateRevenue(recipe);

            revenue += gross;
            ingredientCosts += costs.ingredients;
            toolCosts += costs.tools;
            laborCosts += costs.labor;

            return {
                name: recipe.name,
                gross,
                ingredients: costs.ingredients,
                tools: costs.tools,
                labor: costs.labor,
                totalCost: costs.total,
                profit: gross - costs.total,
                metrics: recipe.metrics
            };
        });

        const difference = Math.abs(
            dishes[0].metrics.score - dishes[1].metrics.score
        );

        revenue += Math.max(0, 5 - difference) * 2;

        const totalCosts = ingredientCosts + toolCosts + laborCosts;
        const netProfit = revenue - totalCosts;
        state.capital += netProfit;

        state.reports.push({
            day,
            revenue,
            ingredientCosts,
            toolCosts,
            laborCosts,
            totalCosts,
            netProfit,
            capitalAfter: state.capital,
            dishes: breakdown
        });

        state.completed = state.reports.length >= DAYS;
        save();
        render();

        $("#rs-status").textContent =
            `Giorno ${day} concluso. Utile netto: ${money(netProfit)}`;
    }

    function resetService() {
        if (!confirm("Iniziare un nuovo ciclo mantenendo il capitale?")) return;

        state.reports = [];
        state.menu = Array(SLOT_COUNT).fill("");
        state.completed = false;
        save();
        render();

        $("#rs-status").textContent = "Nuovo ciclo pronto.";
    }

    function resetEverything() {
        if (!confirm("Azzerare il capitale e tutti i risultati?")) return;

        state.capital = INITIAL_CAPITAL;
        state.reports = [];
        state.menu = Array(SLOT_COUNT).fill("");
        state.completed = false;
        save();
        render();

        $("#rs-status").textContent = "Simulazione azzerata.";
    }

    function render() {
        if (!$("#rs-capital")) return;

        $("#rs-capital").textContent = money(state.capital);
        $("#rs-day").textContent = state.completed
            ? "Ciclo completato"
            : `Giorno ${state.reports.length + 1} / ${DAYS}`;

        const slots = $("#rs-slots");

        slots.innerHTML = state.menu.map((id, index) => {
            const recipe = getRecipe(id);
            const day = Math.floor(index / PER_DAY) + 1;
            const dishNumber = index % PER_DAY + 1;

            const options = state.recipes.map(item => {
                const usedElsewhere = state.menu.some(
                    (selected, otherIndex) =>
                        selected === item.id && otherIndex !== index
                );

                return `<option value="${escapeHTML(item.id)}"
                    ${item.id === id ? "selected" : ""}
                    ${usedElsewhere ? "disabled" : ""}>
                    ${escapeHTML(item.name)}
                </option>`;
            }).join("");

            let details = state.recipes.length
                ? `<p class="rs-muted">Scegli una ricetta e premi la spunta verde.</p>`
                : `<p class="rs-muted">Nessuna ricetta importata. Premi “Importa ricette dal gioco”.</p>`;

            if (recipe) {
                const m = recipe.metrics;
                const costs = calculateCosts(recipe, day);

                details = `
                    <div class="rs-confirmed">✓ Ricetta confermata</div>
                    <div class="rs-metrics">
                        <span>Complessità<b>${m.complexity.toFixed(1)}</b></span>
                        <span>Gourmet<b>${m.gourmet.toFixed(1)}</b></span>
                        <span>Estetica<b>${m.visual.toFixed(1)}</b></span>
                        <span>Sapori<b>${m.flavor.toFixed(1)}</b></span>
                        <span>Combo<b>${m.combinations.toFixed(1)}</b></span>
                    </div>
                    <p class="rs-muted">Ingredienti: ${
                        escapeHTML(recipe.ingredients.join(", ") || "non disponibili")
                    }</p>
                    <p class="rs-muted">Strumenti: ${
                        escapeHTML(recipe.tools.join(", ") || "non disponibili")
                    }</p>
                    <p>Ricavo stimato: <b>${money(calculateRevenue(recipe))}</b></p>
                    <p>Costo stimato: <b>${money(costs.total)}</b></p>
                `;
            }

            return `
                <section class="rs-card">
                    <h3>Giorno ${day} · Piatto ${dishNumber}</h3>
                    <select data-slot="${index}" aria-label="Ricetta giorno ${day}, piatto ${dishNumber}">
                        <option value="">— Seleziona ricetta —</option>
                        ${options}
                    </select>
                    <button type="button" class="rs-confirm"
                        data-confirm-slot="${index}"
                        ${state.reports.length >= day ? "disabled" : ""}>
                        ✓ Conferma ricetta
                    </button>
                    ${details}
                </section>
            `;
        }).join("");

        slots.querySelectorAll("select[data-slot]").forEach(select => {
            select.addEventListener("change", () => {
                $("#rs-status").textContent =
                    "Selezione provvisoria: premi ✓ per salvare.";
            });
        });

        slots.querySelectorAll("button[data-confirm-slot]").forEach(button => {
            button.addEventListener("click", () => {
                const index = Number(button.dataset.confirmSlot);
                const select = slots.querySelector(
                    `select[data-slot="${index}"]`
                );
                const selectedId = select?.value;

                if (!selectedId) {
                    $("#rs-status").textContent = "Seleziona una ricetta.";
                    return;
                }

                const duplicate = state.menu.some(
                    (id, otherIndex) => otherIndex !== index && id === selectedId
                );

                if (duplicate) {
                    $("#rs-status").textContent =
                        "Ricetta già assegnata a un altro slot.";
                    return;
                }

                state.menu[index] = selectedId;
                save();
                render();

                $("#rs-status").textContent =
                    "✅ Ricetta salvata nello slot selezionato.";
            });
        });

        const start = state.reports.length * PER_DAY;
        const current = state.menu.slice(start, start + PER_DAY);
        const validDay = current.length === PER_DAY &&
            current.every(Boolean) &&
            new Set(current).size === PER_DAY;

        $("#rs-run-day").disabled = state.completed || !validDay;
        $("#rs-run-day").textContent = state.completed
            ? "Tre giornate completate"
            : `Simula giornata ${state.reports.length + 1}`;

        $("#rs-results").innerHTML = state.reports.map(report => `
            <section class="rs-report">
                <h3>Giornata ${report.day}</h3>
                <p>Ricavi lordi: <b>${money(report.revenue)}</b></p>
                <p>Costi ingredienti: ${money(report.ingredientCosts)}</p>
                <p>Costi strumenti: ${money(report.toolCosts)}</p>
                <p>Costi lavorazione: ${money(report.laborCosts)}</p>
                <p>Costi totali: <b>${money(report.totalCosts)}</b></p>
                <p>Utile netto: <strong class="${
                    report.netProfit >= 0 ? "positive" : "negative"
                }">${money(report.netProfit)}</strong></p>
                <p>Capitale finale: <b>${money(report.capitalAfter)}</b></p>
                <ul>${report.dishes.map(dish => `
                    <li>${escapeHTML(dish.name)}: ricavo ${money(dish.gross)},
                    costo ${money(dish.totalCost)}</li>
                `).join("")}</ul>
            </section>
        `).join("") || `<p class="rs-muted">Il bilancio apparirà dopo il primo servizio.</p>`;

        if (state.completed) {
            const profit = state.reports.reduce(
                (sum, report) => sum + report.netProfit, 0
            );

            $("#rs-summary").innerHTML = `
                <h3>🏆 Risultato finale</h3>
                <p>Utile complessivo: <b>${money(profit)}</b></p>
                <p>Capitale finale: <b>${money(state.capital)}</b></p>
            `;
        } else {
            $("#rs-summary").innerHTML = "";
        }
    }

    function createInterface() {
        const style = document.createElement("style");

        style.textContent = `
            #${MOD_ID}-panel {
                position:fixed; inset:3vh 3vw; overflow:auto; z-index:999999;
                display:none; max-width:1200px; margin:auto; padding:18px;
                color:#f8f1e7; background:#1c211f; border:2px solid #b58b57;
                border-radius:14px; box-shadow:0 10px 45px #000b;
                font:14px/1.5 system-ui,Arial,sans-serif;
            }
            #${MOD_ID}-panel * { box-sizing:border-box; }
            #${MOD_ID}-panel h2 { margin-top:0; }
            #${MOD_ID}-panel .rs-grid {
                display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px;
            }
            #${MOD_ID}-panel .rs-card {
                min-width:0; padding:12px; background:#292f2c;
                border:1px solid #49534d; border-radius:9px;
            }
            #${MOD_ID}-panel select {
                width:100%; padding:8px; margin:4px 0 8px; border-radius:6px;
                border:1px solid #626d65; background:#121715; color:white;
            }
            #${MOD_ID}-panel button {
                padding:9px 12px; margin:4px 4px 4px 0; border:0;
                border-radius:7px; background:#a96c3b; color:white;
                font-weight:bold; cursor:pointer;
            }
            #${MOD_ID}-panel button.rs-confirm {
                width:100%; background:#218838; color:white;
            }
            #${MOD_ID}-panel button.rs-confirm:hover { background:#28a745; }
            #${MOD_ID}-panel button:disabled { opacity:.45; cursor:not-allowed; }
            #${MOD_ID}-panel .rs-stat {
                font-size:24px; font-weight:800; color:#ffd18a;
            }
            #${MOD_ID}-panel .rs-muted {
                color:#c5c1b7; font-size:12px; overflow-wrap:anywhere;
            }
            #${MOD_ID}-panel .rs-metrics {
                display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
                gap:5px; margin:10px 0;
            }
            #${MOD_ID}-panel .rs-metrics span {
                padding:6px; border-radius:5px; background:#3b443e;
                text-align:center; font-size:11px;
            }
            #${MOD_ID}-panel .rs-metrics b {
                display:block; color:#ffd18a; font-size:15px;
            }
            #${MOD_ID}-panel .rs-confirmed {
                display:inline-block; padding:4px 8px; margin:5px 0;
                color:#b7f7c4; background:#174d2a; border-radius:5px;
                font-weight:bold;
            }
            #${MOD_ID}-panel .rs-report {
                padding:10px; margin:10px 0; border-left:3px solid #bd8b51;
                background:#292f2c;
            }
            #${MOD_ID}-panel .positive { color:#8fe0a0; }
            #${MOD_ID}-panel .negative { color:#ff9a8d; }
            @media(max-width:700px) {
                #${MOD_ID}-panel { inset:1vh 1vw; padding:10px; }
                #${MOD_ID}-panel .rs-grid { grid-template-columns:1fr; }
            }
        `;

        document.head.appendChild(style);

        const launcher = document.createElement("button");
        launcher.id = MOD_ID + "-launcher";
        launcher.textContent = "🍽️ Restoration Simulator";
        launcher.style.cssText =
            "position:fixed;right:12px;top:90px;z-index:999998;" +
            "padding:10px 13px;background:#8d572e;color:white;" +
            "border:2px solid #d5a66d;border-radius:8px;cursor:pointer;";
        document.body.appendChild(launcher);

        const panel = document.createElement("div");
        panel.id = MOD_ID + "-panel";

        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
                <div>
                    <h2>🍽️ Restoration Simulator</h2>
                    <div class="rs-muted">Tre giornate · Due piatti al giorno · Sei ricette diverse</div>
                </div>
                <button id="rs-close">Chiudi ✕</button>
            </div>

            <div class="rs-grid" style="margin:12px 0">
                <div class="rs-card">
                    <div>Capitale disponibile</div>
                    <div id="rs-capital" class="rs-stat"></div>
                </div>
                <div class="rs-card">
                    <div>Stato del servizio</div>
                    <div id="rs-day" class="rs-stat"></div>
                </div>
            </div>

            <h3>1. Ricette del gioco</h3>
            <div class="rs-card">
                <p class="rs-muted">
                    Le ricette vengono cercate nei dati accessibili di Infinite Chef.
                    Nessun piatto dimostrativo viene aggiunto.
                </p>
                <button id="rs-discover">⟳ Importa / aggiorna ricette dal gioco</button>
                <div id="rs-recipe-count" class="rs-muted"></div>
            </div>

            <h3 style="margin-top:18px">2. Menu delle tre giornate</h3>
            <div id="rs-slots" class="rs-grid"></div>

            <div style="margin:12px 0">
                <button id="rs-run-day">Simula giornata 1</button>
                <button id="rs-reset">Nuovo ciclo mantenendo il capitale</button>
                <button id="rs-reset-all">Azzera la simulazione</button>
            </div>

            <div id="rs-status" class="rs-muted" role="status" aria-live="polite"></div>

            <h3 style="margin-top:18px">3. Bilancio giornaliero</h3>
            <div id="rs-results"></div>
            <div id="rs-summary" class="rs-card"></div>

            <p class="rs-muted">
                I prezzi e gli indicatori economici sono stime della simulazione,
                non dati ufficiali del gioco.
            </p>
        `;

        document.body.appendChild(panel);

        launcher.addEventListener("click", () => {
            panel.style.display = panel.style.display === "none" ? "block" : "none";
            render();
        });

        $("#rs-close").addEventListener("click", () => {
            panel.style.display = "none";
        });

        $("#rs-discover").addEventListener("click", importRecipes);
        $("#rs-run-day").addEventListener("click", simulateDay);
        $("#rs-reset").addEventListener("click", resetService);
        $("#rs-reset-all").addEventListener("click", resetEverything);
    }

    // Avvio: carica salvataggio e tenta di importare le ricette disponibili.
    load();

    state.recipes.forEach(recipe => {
        recipe.ingredients = Array.isArray(recipe.ingredients)
            ? recipe.ingredients : [];
        recipe.tools = Array.isArray(recipe.tools) ? recipe.tools : [];
        recipe.metrics = estimateMetrics(recipe);
    });

    const discovered = discoverRecipes();
    const existing = new Set(
        state.recipes.map(recipe => recipe.name.toLowerCase())
    );

    for (const recipe of discovered) {
        const key = recipe.name.toLowerCase();
        if (existing.has(key)) continue;

        recipe.metrics = estimateMetrics(recipe);
        state.recipes.push(recipe);
        existing.add(key);
    }

    // Rimuove selezioni duplicate o ricette che non esistono più.
    const seen = new Set();

    state.menu = state.menu.map(id => {
        if (!id || !state.recipes.some(recipe => recipe.id === id) || seen.has(id)) {
            return "";
        }
        seen.add(id);
        return id;
    });

    createInterface();
    render();
    save();

    $("#rs-recipe-count").textContent =
        "Ricette disponibili: " + state.recipes.length;

    console.info("[Restoration Simulator] Mod caricata.");
})();
