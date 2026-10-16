
/*
 * restoration_simulator.js
 * Infinite Chef R74n Plus
 *
 * - 3 giornate, 2 piatti per giornata
 * - 6 ricette diverse, assegnate manualmente
 * - Spunta verde per confermare ogni slot
 * - Valutazione gourmet, complessità, estetica, sapori e combinazioni
 * - Ricavi, costi e utile netto
 * - Capitale progressivo salvato localmente
 */

(function () {
    "use strict";

    const MOD_ID = "restoration-simulator";
    const STORAGE_KEY = "restoration_simulator_save_v1";
    const DAYS = 3;
    const DISHES_PER_DAY = 2;
    const SLOT_COUNT = DAYS * DISHES_PER_DAY;
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

    const money = value =>
        "$" + Number(value || 0).toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    const clamp = (value, min = 1, max = 10) =>
        Math.max(min, Math.min(max, Number(value) || min));

    const safeText = value => String(value ?? "");

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn("[Restoration Simulator] Salvataggio non riuscito.", error);
        }
    }

    function load() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "null"
            );

            if (!saved || typeof saved !== "object") return;

            state.capital = Number(saved.capital) || INITIAL_CAPITAL;
            state.recipes = Array.isArray(saved.recipes)
                ? saved.recipes : [];

            state.menu = Array.isArray(saved.menu)
                ? saved.menu.slice(0, SLOT_COUNT) : Array(SLOT_COUNT).fill("");

            while (state.menu.length < SLOT_COUNT) {
                state.menu.push("");
            }

            state.reports = Array.isArray(saved.reports)
                ? saved.reports : [];

            state.completed = Boolean(saved.completed);

            // Elimina selezioni duplicate o ricette mancanti.
            const seen = new Set();

            state.menu = state.menu.map(id => {
                if (
                    !id ||
                    !state.recipes.some(recipe => recipe.id === id) ||
                    seen.has(id)
                ) {
                    return "";
                }

                seen.add(id);
                return id;
            });
        } catch (error) {
            console.warn("[Restoration Simulator] Salvataggio non valido.", error);
        }
    }

    function discoverIngredients() {
        const sources = [
            window.ingredients,
            window.elements,
            window.ingredientDatabase,
            window.foods
        ];

        const ids = new Set();

        for (const source of sources) {
            if (!source || typeof source !== "object") continue;

            for (const [id, item] of Object.entries(source)) {
                if (!item || typeof item !== "object") continue;

                const description = [
                    id,
                    item.name,
                    item.type,
                    item.category,
                    item.description
                ].join(" ").toLowerCase();

                if (
                    /food|ingredient|fruit|vegetable|meat|fish|spice|sauce|dessert|bread|cheese|rice|pasta|frutta|verdura|carne|pesce|salsa|dolce|pane|formaggio|riso/.test(description)
                ) {
                    ids.add(id);
                }
            }
        }

        return [...ids];
    }

    function discoverRecipes() {
        const sources = [
            window.recipes,
            window.recipeBook,
            window.recipeDatabase,
            window.cookbook
        ];

        const result = [];

        for (const source of sources) {
            if (!source) continue;

            const entries = Array.isArray(source)
                ? source.map((value, index) => [String(index), value])
                : Object.entries(source);

            for (const [id, item] of entries) {
                if (!item) continue;

                const name = typeof item === "string"
                    ? item
                    : item.name || item.result || item.output || item.id;

                if (!name) continue;

                let ingredients = [];

                if (typeof item === "object") {
                    const raw =
                        item.ingredients || item.input || item.inputs || [];

                    ingredients = Array.isArray(raw)
                        ? raw.map(String)
                        : typeof raw === "string"
                            ? raw.split(/[+,]/)
                                .map(x => x.trim())
                                .filter(Boolean)
                            : [];
                }

                result.push({
                    id: "game_" + id,
                    name: String(name),
                    ingredients,
                    tools: []
                });
            }
        }

        return result;
    }

    function estimateMetrics(recipe) {
        const name = recipe.name.toLowerCase();
        const ingredients = recipe.ingredients || [];
        const tools = recipe.tools || [];

        const gourmetWords =
            /gourmet|signature|tartare|souffl[eé]|risotto|truffle|tartufo|wagyu|sashimi|carpaccio|confit|molecular|degustazione|premium|stellato|affumicato|fermentato|caramellato/;

        const visualWords =
            /rainbow|layer|flower|gold|crystal|sculpt|cake|sushi|dessert|colorato|fiore|oro|cristallo|impiattamento|torta/;

        const flavorWords =
            /spicy|sweet|sour|smok|umami|herb|spice|agrodolce|piccante|dolce|affumicato|erbe|speziato/;

        const complexity = clamp(
            1 + ingredients.length * 0.7 +
            tools.length * 0.6 +
            (gourmetWords.test(name) ? 2 : 0)
        );

        const gourmet = clamp(
            2 + Math.min(ingredients.length, 7) * 0.5 +
            (gourmetWords.test(name) ? 4 : 0)
        );

        const visual = clamp(
            3 + Math.min(ingredients.length, 5) * 0.3 +
            (visualWords.test(name) ? 3 : 0)
        );

        const flavor = clamp(
            3 + Math.min(ingredients.length, 7) * 0.6 +
            (flavorWords.test(name) ? 2 : 0)
        );

        const combinations = clamp(
            2 + Math.max(0, ingredients.length - 1) * 1.1
        );

        const score =
            complexity * 0.25 +
            gourmet * 0.25 +
            visual * 0.18 +
            flavor * 0.17 +
            combinations * 0.15;

        return {
            complexity,
            gourmet,
            visual,
            flavor,
            combinations,
            score: Math.round(score * 10) / 10
        };
    }

    function addRecipe(name, ingredientText, toolText) {
        name = name.trim();

        if (!name) {
            alert("Inserisci il nome del piatto.");
            return false;
        }

        const ingredients = ingredientText
            .split(",")
            .map(value => value.trim())
            .filter(Boolean);

        const tools = toolText
            .split(",")
            .map(value => value.trim())
            .filter(Boolean);

        const recipe = {
            id: "recipe_" + Date.now() + "_" +
                Math.random().toString(36).slice(2, 7),
            name,
            ingredients,
            tools,
            metrics: null
        };

        recipe.metrics = estimateMetrics(recipe);
        state.recipes.push(recipe);

        // Nessuna assegnazione automatica allo slot.
        save();
        render();

        $("#rs-status").textContent =
            "Ricetta aggiunta: " + name +
            ". Seleziona uno slot e premi ✓ Conferma ricetta.";

        return true;
    }

    function calculateCosts(recipe, day) {
        const premiumPattern =
            /truffle|tartufo|wagyu|caviar|caviale|saffron|zafferano|lobster|aragosta|gold|oro/i;

        const ingredientCosts = recipe.ingredients.reduce(
            (total, ingredient) => {
                const premium = premiumPattern.test(ingredient);
                const baseCost = 3 + (ingredient.length % 5) * 0.8;

                return total + baseCost * (premium ? 5 : 1);
            },
            0
        );

        const toolCosts = recipe.tools.reduce(
            (total, tool) => total + 4 + (tool.length % 4),
            0
        );

        const laborCosts = recipe.metrics.complexity * 2.5;
        const marketFactors = [1.00, 1.08, 0.96];
        const market = marketFactors[day - 1] || 1;

        return {
            ingredients: ingredientCosts * market,
            tools: toolCosts * market,
            labor: laborCosts,
            total: (ingredientCosts + toolCosts) * market + laborCosts,
            market
        };
    }

    function calculateRevenue(recipe) {
        const m = recipe.metrics;

        const base =
            15 +
            m.complexity * 8 +
            m.gourmet * 10 +
            m.visual * 4 +
            m.flavor * 5 +
            m.combinations * 5;

        const premiumPattern =
            /gourmet|signature|tartare|souffl[eé]|risotto|truffle|tartufo|wagyu|sashimi|carpaccio|confit|molecular|degustazione|stellato/i;

        const multiplier = premiumPattern.test(recipe.name) ? 1.25 : 1;

        return Math.round(base * multiplier * 100) / 100;
    }

    function getRecipe(id) {
        return state.recipes.find(recipe => recipe.id === id);
    }

    function simulateDay() {
        const day = state.reports.length + 1;

        if (day > DAYS) {
            alert("Hai completato tutte e tre le giornate!");
            return;
        }

        const startIndex = (day - 1) * DISHES_PER_DAY;
        const selectedIds = state.menu.slice(
            startIndex,
            startIndex + DISHES_PER_DAY
        );

        if (selectedIds.length !== 2 || selectedIds.some(id => !id)) {
            alert("Conferma entrambe le ricette del giorno " + day + ".");
            return;
        }

        if (new Set(selectedIds).size !== 2) {
            alert("I due piatti della giornata devono essere diversi.");
            return;
        }

        const dishes = selectedIds.map(getRecipe);

        if (dishes.some(recipe => !recipe)) {
            alert("Una ricetta selezionata non è disponibile.");
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

        // Bonus per due piatti diversi con punteggi simili.
        const difference = Math.abs(
            dishes[0].metrics.score - dishes[1].metrics.score
        );

        revenue += Math.max(0, 5 - difference) * 2;

        const totalCosts =
            ingredientCosts + toolCosts + laborCosts;

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
            "Giorno " + day + " concluso. Utile netto: " + money(netProfit);
    }

    function resetService() {
        if (!confirm(
            "Vuoi iniziare un nuovo ciclo di tre giornate mantenendo il capitale?"
        )) return;

        state.reports = [];
        state.menu = Array(SLOT_COUNT).fill("");
        state.completed = false;

        save();
        render();

        $("#rs-status").textContent =
            "Nuovo ciclo pronto. Assegna sei ricette diverse con ✓.";
    }

    function resetEverything() {
        if (!confirm(
            "Vuoi azzerare il capitale e tutti i risultati?"
        )) return;

        state.capital = INITIAL_CAPITAL;
        state.reports = [];
        state.menu = Array(SLOT_COUNT).fill("");
        state.completed = false;

        save();
        render();

        $("#rs-status").textContent = "Simulazione azzerata.";
    }

    function escapeHTML(value) {
        return safeText(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function render() {
        if (!$("#rs-capital")) return;

        $("#rs-capital").textContent = money(state.capital);

        $("#rs-day").textContent = state.completed
            ? "Ciclo completato"
            : "Giorno " + (state.reports.length + 1) + " / 3";

        const slots = $("#rs-slots");

        slots.innerHTML = state.menu.map((id, index) => {
            const recipe = getRecipe(id);
            const day = Math.floor(index / DISHES_PER_DAY) + 1;
            const dishNumber = index % DISHES_PER_DAY + 1;

            const options = state.recipes.map(item => {
                const usedElsewhere = state.menu.some(
                    (selectedId, slotIndex) =>
                        selectedId === item.id && slotIndex !== index
                );

                return `
                    <option
                        value="${escapeHTML(item.id)}"
                        ${item.id === id ? "selected" : ""}
                        ${usedElsewhere ? "disabled" : ""}
                    >${escapeHTML(item.name)}</option>
                `;
            }).join("");

            let details = `
                <p class="rs-muted">
                    Scegli una ricetta e premi la spunta verde per assegnarla.
                </p>
            `;

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

                    <p class="rs-muted">
                        Ingredienti:
                        ${escapeHTML(recipe.ingredients.join(", ") || "non specificati")}
                    </p>

                    <p class="rs-muted">
                        Tool:
                        ${escapeHTML(recipe.tools.join(", ") || "nessuno specificato")}
                    </p>

                    <p>Ricavo stimato: <b>${money(calculateRevenue(recipe))}</b></p>
                    <p>Costo stimato: <b>${money(costs.total)}</b></p>
                `;
            }

            return `
                <section class="rs-card">
                    <h3>Giorno ${day} · Piatto ${dishNumber}</h3>

                    <select
                        data-slot="${index}"
                        aria-label="Ricetta giorno ${day}, piatto ${dishNumber}"
                    >
                        <option value="">— Seleziona piatto —</option>
                        ${options}
                    </select>

                    <button
                        type="button"
                        class="rs-confirm"
                        data-confirm-slot="${index}"
                    >✓ Conferma ricetta</button>

                    ${details}
                </section>
            `;
        }).join("");

        // La selezione nel menu è provvisoria finché non si preme la spunta.
        slots.querySelectorAll("select[data-slot]").forEach(select => {
            select.addEventListener("change", () => {
                $("#rs-status").textContent =
                    "Selezione provvisoria: premi ✓ Conferma ricetta per salvare lo slot.";
            });
        });

        slots.querySelectorAll("button[data-confirm-slot]").forEach(button => {
            button.addEventListener("click", () => {
                const slotIndex = Number(button.dataset.confirmSlot);
                const select = slots.querySelector(
                    `select[data-slot="${slotIndex}"]`
                );

                const selectedId = select ? select.value : "";

                if (!selectedId) {
                    $("#rs-status").textContent =
                        "Seleziona una ricetta prima di confermare.";
                    return;
                }

                const duplicate = state.menu.some(
                    (id, index) =>
                        index !== slotIndex && id === selectedId
                );

                if (duplicate) {
                    $("#rs-status").textContent =
                        "Questa ricetta è già confermata in un altro slot. Scegline un'altra.";
                    return;
                }

                state.menu[slotIndex] = selectedId;

                save();
                render();

                $("#rs-status").textContent =
                    "✅ Ricetta confermata: giorno " +
                    (Math.floor(slotIndex / DISHES_PER_DAY) + 1) +
                    ", piatto " + (slotIndex % DISHES_PER_DAY + 1) + ".";
            });
        });

        // Sblocca la simulazione solo quando entrambi i piatti del giorno
        // corrente sono confermati e diversi.
        const startIndex = state.reports.length * DISHES_PER_DAY;
        const currentSlots = state.menu.slice(
            startIndex,
            startIndex + DISHES_PER_DAY
        );

        const validDay =
            currentSlots.length === DISHES_PER_DAY &&
            currentSlots.every(Boolean) &&
            new Set(currentSlots).size === DISHES_PER_DAY;

        $("#rs-run-day").disabled = state.completed || !validDay;

        $("#rs-run-day").textContent = state.completed
            ? "Tre giornate completate"
            : "Simula giornata " + (state.reports.length + 1);

        $("#rs-results").innerHTML = state.reports.map(report => `
            <section class="rs-report">
                <h3>Giornata ${report.day}</h3>
                <p>Ricavi lordi: <b>${money(report.revenue)}</b></p>
                <p>Costi ingredienti: ${money(report.ingredientCosts)}</p>
                <p>Costi tool: ${money(report.toolCosts)}</p>
                <p>Costi lavorazione: ${money(report.laborCosts)}</p>
                <p>Costi totali: <b>${money(report.totalCosts)}</b></p>
                <p>
                    Utile netto:
                    <strong class="${report.netProfit >= 0 ? "positive" : "negative"}">
                        ${money(report.netProfit)}
                    </strong>
                </p>
                <p>Capitale dopo il servizio: <b>${money(report.capitalAfter)}</b></p>
                <ul>
                    ${report.dishes.map(dish => `
                        <li>
                            ${escapeHTML(dish.name)}:
                            ricavo ${money(dish.gross)},
                            costo ${money(dish.totalCost)}
                        </li>
                    `).join("")}
                </ul>
            </section>
        `).join("") || `
            <p class="rs-muted">
                Il bilancio apparirà dopo il primo servizio.
            </p>
        `;

        if (state.completed) {
            const totalProfit = state.reports.reduce(
                (sum, report) => sum + report.netProfit,
                0
            );

            $("#rs-summary").innerHTML = `
                <h3>🏆 Risultato finale</h3>
                <p>Utile complessivo del ciclo: <b>${money(totalProfit)}</b></p>
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
                position: fixed;
                inset: 3vh 3vw;
                overflow: auto;
                z-index: 999999;
                display: none;
                max-width: 1200px;
                margin: auto;
                padding: 18px;
                color: #f8f1e7;
                background: #1c211f;
                border: 2px solid #b58b57;
                border-radius: 14px;
                box-shadow: 0 10px 45px #000b;
                font: 14px/1.5 system-ui, Arial, sans-serif;
            }

            #${MOD_ID}-panel * {
                box-sizing: border-box;
            }

            #${MOD_ID}-panel h2 {
                margin-top: 0;
            }

            #${MOD_ID}-panel .rs-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }

            #${MOD_ID}-panel .rs-card {
                min-width: 0;
                padding: 12px;
                background: #292f2c;
                border: 1px solid #49534d;
                border-radius: 9px;
            }

            #${MOD_ID}-panel input,
            #${MOD_ID}-panel select {
                width: 100%;
                padding: 8px;
                margin: 4px 0 8px;
                border-radius: 6px;
                border: 1px solid #626d65;
                background: #121715;
                color: white;
            }

            #${MOD_ID}-panel button {
                padding: 9px 12px;
                margin: 4px 4px 4px 0;
                border: 0;
                border-radius: 7px;
                background: #a96c3b;
                color: white;
                font-weight: bold;
                cursor: pointer;
            }

            #${MOD_ID}-panel button.rs-confirm {
                width: 100%;
                background: #218838;
                color: white;
            }

            #${MOD_ID}-panel button.rs-confirm:hover {
                background: #28a745;
            }

            #${MOD_ID}-panel button:disabled {
                opacity: .45;
                cursor: not-allowed;
            }

            #${MOD_ID}-panel .rs-stat {
                font-size: 24px;
                font-weight: 800;
                color: #ffd18a;
            }

            #${MOD_ID}-panel .rs-muted {
                color: #c5c1b7;
                font-size: 12px;
                overflow-wrap: anywhere;
            }

            #${MOD_ID}-panel .rs-metrics {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 5px;
                margin: 10px 0;
            }

            #${MOD_ID}-panel .rs-metrics span {
                padding: 6px;
                border-radius: 5px;
                background: #3b443e;
                text-align: center;
                font-size: 11px;
            }

            #${MOD_ID}-panel .rs-metrics b {
                display: block;
                color: #ffd18a;
                font-size: 15px;
            }

            #${MOD_ID}-panel .rs-confirmed {
                display: inline-block;
                padding: 4px 8px;
                margin: 5px 0;
                color: #b7f7c4;
                background: #174d2a;
                border-radius: 5px;
                font-weight: bold;
            }

            #${MOD_ID}-panel .rs-report {
                padding: 10px;
                margin: 10px 0;
                border-left: 3px solid #bd8b51;
                background: #292f2c;
            }

            #${MOD_ID}-panel .positive {
                color: #8fe0a0;
            }

            #${MOD_ID}-panel .negative {
                color: #ff9a8d;
            }

            @media (max-width: 700px) {
                #${MOD_ID}-panel {
                    inset: 1vh 1vw;
                    padding: 10px;
                }

                #${MOD_ID}-panel .rs-grid {
                    grid-template-columns: 1fr;
                }
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
                    <div class="rs-muted">
                        Tre giornate · Due piatti al giorno · Sei ricette diverse
                    </div>
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

            <h3>1. Crea le tue ricette</h3>
            <div class="rs-card">
                <label for="rs-name">Nome del piatto</label>
                <input id="rs-name" placeholder="Es. Risotto gourmet al tartufo">

                <label for="rs-ingredients">Ingredienti separati da virgole</label>
                <input id="rs-ingredients" placeholder="riso, tartufo, burro, parmigiano">

                <label for="rs-tools">Tool separati da virgole</label>
                <input id="rs-tools" placeholder="pentola, coltello, frullatore">

                <button id="rs-add">+ Aggiungi ricetta</button>
                <button id="rs-discover">Importa ricette esposte dal gioco</button>

                <div class="rs-muted">
                    Le ricette nuove non vengono assegnate automaticamente.
                    Scegli uno slot e premi la spunta verde per confermare.
                </div>
            </div>

            <h3 style="margin-top:18px">
                2. Menu delle tre giornate — conferma ogni slot con ✓
            </h3>

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
                Economia simulata: i prezzi sono stime, non prezzi ufficiali.
                Gli utili possono essere negativi se i costi superano gli incassi.
            </p>
        `;

        document.body.appendChild(panel);

        launcher.addEventListener("click", () => {
            panel.style.display =
                panel.style.display === "none" ? "block" : "none";
            render();
        });

        $("#rs-close").addEventListener("click", () => {
            panel.style.display = "none";
        });

        $("#rs-add").addEventListener("click", () => {
            const added = addRecipe(
                $("#rs-name").value,
                $("#rs-ingredients").value,
                $("#rs-tools").value
            );

            if (added) {
                $("#rs-name").value = "";
                $("#rs-ingredients").value = "";
                $("#rs-tools").value = "";
            }
        });

        $("#rs-run-day").addEventListener("click", simulateDay);
        $("#rs-reset").addEventListener("click", resetService);
        $("#rs-reset-all").addEventListener("click", resetEverything);

        $("#rs-discover").addEventListener("click", () => {
            const found = discoverRecipes();
            const existing = new Set(
                state.recipes.map(recipe => recipe.name.toLowerCase())
            );

            let imported = 0;

            for (const item of found) {
                if (existing.has(item.name.toLowerCase())) continue;

                const recipe = {
                    ...item,
                    metrics: null
                };

                recipe.metrics = estimateMetrics(recipe);
                state.recipes.push(recipe);
                existing.add(item.name.toLowerCase());
                imported++;
            }

            const ingredients = discoverIngredients();

            $("#rs-status").textContent =
                "Nuove ricette importate: " + imported +
                ". Ricette individuate: " + found.length +
                ". Ingredienti individuati: " + ingredients.length + ".";

            save();
            render();
        });
    }

    function addExampleRecipes() {
        if (state.recipes.length) return;

        const examples = [
            [
                "Risotto gourmet ai funghi",
                "riso, funghi, brodo, parmigiano, burro",
                "pentola, mestolo"
            ],
            [
                "Tartare di pomodoro e basilico",
                "pomodoro, basilico, olio, sale, limone",
                "coltello, tagliere"
            ],
            [
                "Dessert al cioccolato e caramello",
                "cioccolato, panna, zucchero, burro, sale",
                "frusta, pentolino"
            ],
            [
                "Pasta al pesto artigianale",
                "pasta, basilico, pinoli, parmigiano, olio",
                "pentola, frullatore"
            ],
            [
                "Salmone glassato con verdure",
                "salmone, miele, limone, carote, zucchine",
                "padella, coltello"
            ],
            [
                "Torta stratificata ai frutti rossi",
                "farina, uova, zucchero, panna, fragole, lamponi",
                "forno, frusta"
            ]
        ];

        for (const [name, ingredients, tools] of examples) {
            const recipe = {
                id: "example_" + state.recipes.length,
                name,
                ingredients: ingredients.split(",").map(x => x.trim()),
                tools: tools.split(",").map(x => x.trim())
            };

            recipe.metrics = estimateMetrics(recipe);
            state.recipes.push(recipe);
        }
    }

    // Inizializzazione.
    load();

    state.recipes.forEach(recipe => {
        recipe.ingredients = Array.isArray(recipe.ingredients)
            ? recipe.ingredients : [];

        recipe.tools = Array.isArray(recipe.tools)
            ? recipe.tools : [];

        recipe.metrics = estimateMetrics(recipe);
    });

    // Importa ricette esposte dal gioco, se disponibili.
    for (const recipe of discoverRecipes()) {
        if (!state.recipes.some(
            current => current.name.toLowerCase() === recipe.name.toLowerCase()
        )) {
            recipe.metrics = estimateMetrics(recipe);
            state.recipes.push(recipe);
        }
    }

    addExampleRecipes();
    createInterface();
    render();
    save();

    console.info("[Restoration Simulator] Mod caricata.");
})();
