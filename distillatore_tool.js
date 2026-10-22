
/*
 * Distiller.js — Infinite Chef r74n
 *
 * Funzioni:
 * - Tool dedicato per selezionare 3 ingredienti tramite click
 * - Temperatura regolabile con incrementi di 10 °C
 * - Risultato univoco per ingredienti + temperatura
 * - Nuovo ingrediente con type: "liquid"
 * - Colore del distillato derivato dagli ingredienti originali
 * - Riutilizzo dei risultati già esistenti
 */

(function () {
    "use strict";

    const MOD_ID = "distiller";
    const TOOL_ID = "distiller_tool";
    const DEFAULT_TEMP = 100;
    const TEMP_STEP = 10;

    // Evita di installare due volte la stessa mod.
    if (window.__distillerInstalled) {
        console.warn("[Distiller] Mod già caricata.");
        return;
    }

    window.__distillerInstalled = true;

    let temperature = DEFAULT_TEMP;
    let selected = [];
    let lastResult = null;

    // --------------------------------------------------
    // REGISTRO DEGLI INGREDIENTI
    // --------------------------------------------------

    function getIngredients() {
        return window.ingredients ||
            window.ingredientData ||
            {};
    }

    // Ricava l'ID di un ingrediente selezionato.
    function ingredientId(placed) {
        if (typeof placed === "string") {
            return placed;
        }

        if (!placed || typeof placed !== "object") {
            return null;
        }

        const candidates = [
            placed.name,
            placed.ingredient,
            placed.element,
            placed.id,
            placed.key
        ];

        const database = getIngredients();

        for (const candidate of candidates) {
            if (
                typeof candidate === "string" &&
                database[candidate]
            ) {
                return candidate;
            }
        }

        return null;
    }

    // --------------------------------------------------
    // ID UNIVOCO DEL DISTILLATO
    // --------------------------------------------------

    function normalizeId(id) {
        return String(id)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "") || "ingredient";
    }

    function uniqueDistillateId(ids, temp) {
        // L'ordine di selezione non influenza il risultato.
        const sorted = [...ids].sort();

        return "distillate_" +
            sorted.map(normalizeId).join("_") +
            "_" + temp + "c";
    }

    // --------------------------------------------------
    // COLORE DETERMINISTICO DI RISERVA
    // --------------------------------------------------

    function hashColor(text) {
        let hash = 2166136261;

        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        const hue = (hash >>> 0) % 360;

        return `hsl(${hue}, 65%, 55%)`;
    }

    // --------------------------------------------------
    // COLORE DEL DISTILLATO
    // Media RGB dei colori dei 3 ingredienti.
    // Supporta #RGB e #RRGGBB.
    // --------------------------------------------------

    function blendIngredientColors(ids) {
        const database = getIngredients();

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (const id of ids) {
            const ingredient = database[id];

            if (!ingredient) {
                continue;
            }

            const color = ingredient.color;

            if (typeof color !== "string") {
                continue;
            }

            const match = color.match(
                /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
            );

            if (!match) {
                continue;
            }

            let hex = match[1];

            // Converte #RGB in #RRGGBB.
            if (hex.length === 3) {
                hex = hex
                    .split("")
                    .map(c => c + c)
                    .join("");
            }

            r += parseInt(hex.slice(0, 2), 16);
            g += parseInt(hex.slice(2, 4), 16);
            b += parseInt(hex.slice(4, 6), 16);

            count++;
        }

        // Se non ci sono colori esadecimali validi,
        // genera comunque un colore stabile.
        if (count === 0) {
            return hashColor(
                ids.slice().sort().join("_")
            );
        }

        const toHex = value =>
            Math.round(value / count)
                .toString(16)
                .padStart(2, "0");

        return "#" +
            toHex(r) +
            toHex(g) +
            toHex(b);
    }

    // --------------------------------------------------
    // MESSAGGI
    // --------------------------------------------------

    function notify(message) {
        console.info("[Distiller] " + message);

        const output =
            document.getElementById("distiller-status");

        if (output) {
            output.textContent = message;
        }
    }

    // --------------------------------------------------
    // INTERFACCIA DEL DISTILLATORE
    // --------------------------------------------------

    function renderPanel() {
        let panel =
            document.getElementById("distiller-panel");

        if (!panel) {
            panel = document.createElement("div");
            panel.id = "distiller-panel";

            Object.assign(panel.style, {
                position: "fixed",
                right: "12px",
                bottom: "12px",
                width: "270px",
                padding: "14px",
                background: "#20252b",
                color: "#f3f3f3",
                border: "2px solid #8ab4c7",
                borderRadius: "10px",
                boxShadow: "0 4px 16px #0008",
                fontFamily: "sans-serif",
                fontSize: "13px",
                zIndex: "99999"
            });

            panel.innerHTML = `
                <div style="
                    font-size:17px;
                    font-weight:bold;
                    margin-bottom:8px;
                ">
                    ⚗️ Distiller
                </div>

                <div style="margin-bottom:8px">
                    Temperatura:
                    <strong id="distiller-temp"></strong>
                </div>

                <div style="
                    display:flex;
                    gap:6px;
                    margin-bottom:10px;
                ">
                    <button id="distiller-minus">
                        −10 °C
                    </button>

                    <button id="distiller-plus">
                        +10 °C
                    </button>
                </div>

                <div style="margin-bottom:8px">
                    Ingredienti selezionati:
                </div>

                <ol id="distiller-selection" style="
                    padding-left:24px;
                    min-height:48px;
                "></ol>

                <div style="
                    display:flex;
                    gap:6px;
                    margin:8px 0;
                ">
                    <button id="distiller-reset">
                        Azzera
                    </button>
                </div>

                <div id="distiller-status" style="
                    overflow-wrap:anywhere;
                    line-height:1.4;
                ">
                    Seleziona il tool Distiller e clicca
                    tre ingredienti.
                </div>
            `;

            document.body.appendChild(panel);

            function styleButton(button) {
                if (!button) return;

                Object.assign(button.style, {
                    cursor: "pointer",
                    padding: "6px 9px",
                    border: "1px solid #8ab4c7",
                    borderRadius: "5px",
                    background: "#343e47",
                    color: "#fff"
                });
            }

            panel
                .querySelectorAll("button")
                .forEach(styleButton);

            document.getElementById(
                "distiller-minus"
            ).onclick = function () {
                temperature -= TEMP_STEP;
                updatePanel();
            };

            document.getElementById(
                "distiller-plus"
            ).onclick = function () {
                temperature += TEMP_STEP;
                updatePanel();
            };

            document.getElementById(
                "distiller-reset"
            ).onclick = function () {
                selected = [];
                lastResult = null;

                updatePanel();

                notify("Selezione azzerata.");
            };
        }

        updatePanel();
    }

    // --------------------------------------------------
    // AGGIORNAMENTO DELL'INTERFACCIA
    // --------------------------------------------------

    function updatePanel() {
        const temp =
            document.getElementById("distiller-temp");

        const list =
            document.getElementById("distiller-selection");

        if (!temp || !list) {
            return;
        }

        temp.textContent = temperature + " °C";

        list.replaceChildren();

        for (let i = 0; i < 3; i++) {
            const li = document.createElement("li");

            li.style.marginBottom = "4px";
            li.textContent = selected[i] || "—";

            list.appendChild(li);
        }
    }

    // --------------------------------------------------
    // DISTILLAZIONE
    // --------------------------------------------------

    function distill() {
        if (selected.length !== 3) {
            return;
        }

        const ids = [...selected];
        const sorted = [...ids].sort();

        const resultId = uniqueDistillateId(
            sorted,
            temperature
        );

        const database = getIngredients();

        // Calcola il colore a partire dagli ingredienti.
        const resultColor = blendIngredientColors(ids);

        // Se il risultato non esiste, registralo.
        if (!database[resultId]) {
            if (
                typeof window.addIngredient !== "function"
            ) {
                notify(
                    "Errore: addIngredient() non disponibile."
                );

                return;
            }

            window.addIngredient(resultId, {
                type: "liquid",
                color: resultColor
            });
        }

        lastResult = resultId;

        console.info(
            "[Distiller] Distillazione completata:",
            {
                ingredients: sorted,
                temperature: temperature,
                result: resultId,
                type: "liquid",
                color: resultColor
            }
        );

        notify(
            "Distillato creato: " +
            resultId +
            " (" + temperature + " °C)."
        );

        // Prepara una nuova distillazione.
        selected = [];

        updatePanel();
    }

    // --------------------------------------------------
    // SELEZIONE DEGLI INGREDIENTI
    // --------------------------------------------------

    function selectIngredient(placed) {
        const id = ingredientId(placed);

        if (!id) {
            notify(
                "Ingrediente non riconosciuto: " +
                "clicca un ingrediente valido."
            );

            return;
        }

        if (id === TOOL_ID) {
            return;
        }

        if (!getIngredients()[id]) {
            notify(
                "Ingrediente non presente nel registro: " +
                id
            );

            return;
        }

        if (selected.length >= 3) {
            notify(
                "Hai già selezionato tre ingredienti. " +
                "Azzera per ricominciare."
            );

            return;
        }

        selected.push(id);

        updatePanel();

        if (selected.length < 3) {
            notify(
                "Selezionato " +
                selected.length +
                "/3: " +
                id
            );
        } else {
            distill();
        }
    }

    // --------------------------------------------------
    // INSTALLAZIONE DEL TOOL
    // --------------------------------------------------

    function install() {
        if (
            typeof window.addTool !== "function" ||
            typeof window.addIngredient !== "function"
        ) {
            console.warn(
                "[Distiller] API non disponibili. " +
                "La mod deve essere caricata dopo " +
                "le funzioni del gioco."
            );

            window.__distillerInstalled = false;

            return;
        }

        renderPanel();

        window.addTool(TOOL_ID, {
            shape: "liquid",

            onSelect: function () {
                notify(
                    "Tool attivo: clicca tre ingredienti " +
                    "sul piano di gioco."
                );
            },

            func: function (placed) {
                selectIngredient(placed);
            }
        });

        console.info(
            "[Distiller] Installato correttamente. " +
            "Temperatura iniziale: " +
            temperature +
            " °C."
        );
    }

    // --------------------------------------------------
    // AVVIO
    // --------------------------------------------------

    install();

})();
