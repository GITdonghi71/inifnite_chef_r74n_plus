
/*
 * Distiller.js — Infinite Chef R74n
 * Seleziona 3 ingredienti distinti con il tool Distiller.
 * Imposta la temperatura in °C, a passi di 10.
 * Il risultato è registrato come ingrediente di tipo "liquid".
 *
 * API utilizzate: addIngredient(), addTool()
 */

(function () {
    "use strict";

    if (typeof addIngredient !== "function" ||
        typeof addTool !== "function") {
        console.error(
            "[Distiller] API di Infinite Chef non disponibili."
        );
        return;
    }

    const TOOL_ID = "distiller";
    const MIN_TEMP = -270;
    const MAX_TEMP = 10000;

    let selectedIngredients = [];
    let temperature = 100;
    let instanceCounter = 0;

    function notify(message) {
        if (typeof alert === "function") {
            alert("[Distiller] " + message);
        } else {
            console.log("[Distiller] " + message);
        }
    }

    // Converte il nome dell'ingrediente in un ID valido.
    function normalizeId(value) {
        return String(value)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 50) || "ingredient";
    }

    // Recupera l'identificativo dall'oggetto cliccato.
    function getIngredientId(placed) {
        if (!placed || typeof placed !== "object") {
            return null;
        }

        const candidates = [
            placed.ingredient,
            placed.element,
            placed.name,
            placed.id,
            placed.food,
            placed.key
        ];

        for (const candidate of candidates) {
            if (typeof candidate === "string" &&
                candidate.trim() &&
                candidate !== "liquid") {
                return candidate.trim();
            }
        }

        return null;
    }

    function setTemperature() {
        const answer = prompt(
            "Temperatura di distillazione (°C).\n" +
            "Sono ammessi soltanto multipli di 10.\n" +
            "Intervallo: " + MIN_TEMP + "–" + MAX_TEMP,
            String(temperature)
        );

        if (answer === null) return;

        const value = Number(answer);

        if (
            !Number.isFinite(value) ||
            !Number.isInteger(value) ||
            value < MIN_TEMP ||
            value > MAX_TEMP ||
            value % 10 !== 0
        ) {
            notify(
                "Temperatura non valida. Inserisci un multiplo " +
                "di 10 °C compreso nell'intervallo consentito."
            );
            return;
        }

        temperature = value;
        notify("Temperatura impostata a " + temperature + " °C.");
    }

    function makeDistillate() {
        const parts = selectedIngredients.slice(0, 3);
        const temp = temperature;

        const baseId = "distillate_" +
            parts.map(normalizeId).join("_") +
            "_t" + (temp < 0 ? "m" + Math.abs(temp) : temp);

        // Evita collisioni tra distillati creati nella stessa sessione.
        instanceCounter++;
        const resultId = baseId + "_" + instanceCounter;

        // Il colore cambia con la temperatura.
        const hue = ((temp + 270) * 0.12) % 360;
        const color = "hsl(" + hue + ", 65%, 55%)";

        try {
            addIngredient(resultId, {
                type: "liquid",
                color: color,
                innerColor: color
            });

            console.log("[Distiller] Creato ingrediente:", {
                id: resultId,
                type: "liquid",
                ingredients: parts.slice(),
                temperature: temp
            });

            notify(
                "Distillazione completata!\n\n" +
                "Ingrediente: " + resultId + "\n" +
                "Tipo: liquid\n" +
                "Temperatura: " + temp + " °C\n" +
                "Ingredienti: " + parts.join(", ")
            );

            selectedIngredients = [];
        } catch (error) {
            console.error("[Distiller] Errore:", error);
            notify(
                "Impossibile registrare il distillato. " +
                "Controlla la console."
            );
        }
    }

    function selectIngredient(placed) {
        const id = getIngredientId(placed);

        if (!id) {
            notify(
                "Non riesco a identificare questo ingrediente. " +
                "Prova a cliccare direttamente su un ingrediente."
            );
            return;
        }

        if (selectedIngredients.includes(id)) {
            notify("Ingrediente già selezionato: " + id);
            return;
        }

        selectedIngredients.push(id);

        console.log(
            "[Distiller] Selezione:",
            selectedIngredients.slice()
        );

        if (selectedIngredients.length < 3) {
            notify(
                "Ingrediente " + selectedIngredients.length +
                "/3: " + id + "\n\n" +
                "Seleziona altri " +
                (3 - selectedIngredients.length) +
                " ingredienti distinti."
            );
            return;
        }

        makeDistillate();
    }

    // Registra lo strumento nel sistema di Infinite Chef.
    addTool(TOOL_ID, {
        shape: "liquid",

        onSelect: function () {
            selectedIngredients = [];
            setTemperature();
            notify(
                "Distiller pronto.\n" +
                "Temperatura: " + temperature + " °C.\n" +
                "Clicca su 3 ingredienti distinti."
            );
        },

        func: function (placed) {
            selectIngredient(placed);
        },

        onDeselect: function () {
            selectedIngredients = [];
            console.log("[Distiller] Strumento deselezionato.");
        }
    });

    console.log(
        "[Distiller] Mod caricata. Temperatura iniziale: " +
        temperature + " °C."
    );
})();
