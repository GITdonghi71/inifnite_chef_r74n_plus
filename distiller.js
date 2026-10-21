
// Distiller.js — Infinite Chef (R74n)
// Seleziona 2 ingredienti con click + alcohol sempre incluso.
// Inserisci la temperatura in °C per creare un nuovo liquido.

(() => {
    const DISTILLER_NAME = "distiller";
    const ALCOHOL_ID = "alcohol";
    const selectedIngredients = [];
    const createdDistillates = new Set();

    // Recupera l'ID dell'ingrediente cliccato.
    function getIngredientId(placed) {
        if (!placed) return null;

        const possibleIds = [
            placed.id,
            placed.ingredient,
            placed.name,
            placed.element,
            placed.type
        ];

        for (const id of possibleIds) {
            if (typeof id === "string" && id.length > 0) {
                if (window.ingredients && window.ingredients[id]) {
                    return id;
                }
            }
        }

        return null;
    }

    function slugify(value) {
        return String(value)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 45);
    }

    function hashString(value) {
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
        }
        return Math.abs(hash).toString(36);
    }

    function resetSelection() {
        selectedIngredients.length = 0;
    }

    function createDistillate(first, second, temperature) {
        const ingredients = window.ingredients;

        if (!ingredients ||
            !ingredients[ALCOHOL_ID] ||
            !ingredients[first] ||
            !ingredients[second]) {
            alert("Errore: alcohol o uno degli ingredienti non esiste.");
            return;
        }

        // Alcohol è sempre presente nella composizione.
        const composition = [
            ALCOHOL_ID,
            first,
            second
        ].sort();

        const recipeKey =
            composition.join("+") + "@" + temperature;

        const id = "distillate_" +
            slugify(first) + "_" +
            slugify(second) + "_" +
            hashString(recipeKey);

        if (createdDistillates.has(id) || ingredients[id]) {
            alert("Questo distillato esiste già: " + id);
            return;
        }

        // Temperatura utilizzata per determinare il colore.
        const hue = ((temperature * 1.7) % 360 + 360) % 360;
        const color = `hsl(${hue}, 65%, 55%)`;

        const ingredientName =
            `${first.replace(/_/g, " ")} + ` +
            `${second.replace(/_/g, " ")} ` +
            `Distillate (${temperature}°C)`;

        // Crea un ingrediente liquido indipendente e riutilizzabile.
        addIngredient(id, {
            name: ingredientName,
            type: "liquid",
            color: color,
            adj: "distilled",
            desc:
                `Distillato di ${first}, ${second} e alcohol, ` +
                `ottenuto a ${temperature}°C.`
        });

        // Registra la ricetta con alcohol sempre incluso.
        addRecipe(
            `${ALCOHOL_ID}+${first}+${second}`,
            id
        );

        createdDistillates.add(id);

        alert(
            "Distillato creato!\n\n" +
            "ID: " + id + "\n" +
            "Tipo: liquid\n" +
            "Ingredienti: alcohol + " + first + " + " + second +
            "\nTemperatura: " + temperature + "°C"
        );
    }

    // Tool principale: clicca gli ingredienti presenti sul piano.
    addTool(DISTILLER_NAME, {
        shape: "liquid",

        onSelect: function () {
            resetSelection();
            alert(
                "DISTILLER\n\n" +
                "Alcohol è sempre incluso automaticamente.\n" +
                "Clicca due ingredienti sul piano.\n" +
                "Dopo il secondo click sceglierai la temperatura."
            );
        },

        func: function (placed) {
            const id = getIngredientId(placed);

            if (!id) {
                alert("Non riesco a identificare questo ingrediente.");
                return;
            }

            if (id === ALCOHOL_ID) {
                alert("Alcohol è già incluso automaticamente!");
                return;
            }

            if (selectedIngredients.includes(id)) {
                alert("Hai già selezionato " + id + ".");
                return;
            }

            if (selectedIngredients.length >= 2) {
                resetSelection();
            }

            selectedIngredients.push(id);

            if (selectedIngredients.length === 1) {
                alert(
                    "Primo ingrediente: " + id +
                    "\nOra clicca il secondo ingrediente."
                );
                return;
            }

            const first = selectedIngredients[0];
            const second = selectedIngredients[1];

            const input = prompt(
                "Temperatura di distillazione (°C):",
                "78"
            );

            if (input === null || input.trim() === "") {
                resetSelection();
                return;
            }

            const temperature = Number(input);

            if (!Number.isFinite(temperature) ||
                temperature < -273.15 ||
                temperature > 10000) {
                alert("Inserisci una temperatura valida.");
                resetSelection();
                return;
            }

            createDistillate(first, second, temperature);
            resetSelection();
        }
    });

    console.log(
        "[Distiller] Caricato. Alcohol è sempre incluso."
    );
})();

