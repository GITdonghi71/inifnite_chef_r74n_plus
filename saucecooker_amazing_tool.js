
/*
 * SauceFryer — Infinite Chef R74n+
 * Frittura universale in salsa, riservata a Bowl Mode.
 *
 * Compatibilità:
 * - SauceMaker: ingredients[id].sauceMaker / sauceIngredients
 * - Smoker: conserva i metadati e registra con addIngredient()
 * - Innestatore: il risultato è un normale ingrediente del database
 *
 * Nota: il rilevamento di Bowl Mode dipende dalla versione del gioco.
 * Il tool non cuoce se la modalità non è riconosciuta.
 */

(function () {
    "use strict";

    const PREFIX = "sauce-fryer";
    const DB_KEY = "infinite_chef_sauce_fryer_db_v1";
    const PROFILE_KEY = "infinite_chef_sauce_fryer_profiles_v1";

    if (
        typeof window.ingredients !== "object" ||
        typeof window.addIngredient !== "function" ||
        typeof window.addTool !== "function"
    ) {
        console.error("[SauceFryer] API di Infinite Chef non disponibili.");
        return;
    }

    Object.defineProperty(window, "__sauceFryerIngredients", {
    configurable: true,
    get() {
        return window.ingredients;
    }
});

const ingredients = new Proxy({}, {
    get(_target, prop) {
        return window.ingredients?.[prop];
    },
    set(_target, prop, value) {
        window.ingredients[prop] = value;
        return true;
    },
    ownKeys() {
        return Reflect.ownKeys(window.ingredients || {});
    },
    getOwnPropertyDescriptor(_target, prop) {
        const descriptor = Object.getOwnPropertyDescriptor(
            window.ingredients || {},
            prop
        );
        return descriptor
            ? { ...descriptor, configurable: true }
            : undefined;
    },
    has(_target, prop) {
        return prop in (window.ingredients || {});
    }
});

    let selectedSauce = null;
    let heatEnabled = false;
    let panel = null;
    let statusElement = null;
    let sauceSelect = null;
    let heatButton = null;

    let database = [];
    let profiles = {};

    try {
        const saved = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
        database = Array.isArray(saved) ? saved : [];
    } catch (_) {
        database = [];
    }

    try {
        const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
        profiles = saved && typeof saved === "object" ? saved : {};
    } catch (_) {
        profiles = {};
    }

    function saveDatabase() {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(database));
            localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
        } catch (error) {
            console.warn("[SauceFryer] Salvataggio non riuscito:", error);
        }
    }

    function status(message) {
        console.log("[SauceFryer]", message);
        if (statusElement) statusElement.textContent = message;
    }

    // --------------------------------------------------
    // MODALITÀ: fail closed se Bowl Mode non è verificabile
    // --------------------------------------------------

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    
function isBowlMode() {
    const bowlButton = document.getElementById("button-bowl");
    const stackButton = document.getElementById("button-stack");

    // Metodo usato dalla versione attuale di Infinite Chef
    if (bowlButton) {
        return bowlButton.hasAttribute("selected");
    }

    // Fallback per eventuali versioni differenti
    const mode =
        window.mode ??
        window.gameMode ??
        window.currentMode ??
        window.playMode ??
        window.game?.mode ??
        window.gameState?.mode ??
        window.settings?.mode;

    if (typeof mode === "string") {
        return mode.toLowerCase() === "bowl";
    }

    return false;
}

    // --------------------------------------------------
    // IDENTIFICAZIONE DEGLI INGREDIENTI
    // --------------------------------------------------

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

    function isSauce(id) {
        const def = ingredients[id];
        return !!(
            def &&
            (
                def.sauceMaker === true ||
                (
                    id.startsWith("sauce_") &&
                    Array.isArray(def.sauceIngredients)
                )
            )
        );
    }

    function getColor(value) {
        if (typeof value === "number" && Number.isFinite(value)) {
            return "#" + Math.max(0, Math.min(0xFFFFFF, value))
                .toString(16).padStart(6, "0");
        }

        if (typeof value !== "string") return null;

        if (/^#[0-9a-f]{6}$/i.test(value)) return value;

        if (/^#[0-9a-f]{3}$/i.test(value)) {
            return "#" + value.slice(1).split("")
                .map(c => c + c).join("");
        }

        return null;
    }

    function darkenColor(color, factor) {
        const hex = getColor(color) || "#b87545";
        const n = parseInt(hex.slice(1), 16);

        const r = (n >> 16) & 255;
        const g = (n >> 8) & 255;
        const b = n & 255;

        return "#" + [r, g, b]
            .map(v => Math.round(v * factor)
                .toString(16).padStart(2, "0"))
            .join("");
    }

    function sauceProfile(sauceId) {
        if (profiles[sauceId]) return profiles[sauceId];

        /*
         * La firma completa dell'ID è la chiave univoca del profilo.
         * Il numero hash viene usato per le caratteristiche numeriche,
         * ma non è usato come identificatore del profilo.
         */
        let hash = 2166136261;

        for (let i = 0; i < sauceId.length; i++) {
            hash ^= sauceId.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        hash >>>= 0;

        const chars = Array.from(sauceId)
            .reduce((sum, char) => sum + char.codePointAt(0), 0);

        const profile = {
            sauceId: sauceId,
            signature: sauceId,
            heatFactor: 0.65 + (hash % 71) / 100,
            browning: 0.48 + ((hash >>> 8) % 45) / 100,
            moistureRetention: 0.2 + ((hash >>> 16) % 65) / 100,
            flavorIndex: (chars + hash) % 997,
            cookStages: 1 + ((hash ^ chars) % 5),
            createdAt: new Date().toISOString()
        };

        profiles[sauceId] = profile;
        saveDatabase();

        return profile;
    }

    // --------------------------------------------------
    // INTERFACCIA
    // --------------------------------------------------

    function makeButton(label, callback) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.style.cssText =
            "padding:8px 11px;margin:4px;border:0;border-radius:7px;" +
            "background:#a65332;color:white;cursor:pointer;";
        button.addEventListener("click", callback);
        return button;
    }

function renderSauces() {
    if (!sauceSelect) return;

    const currentIngredients = window.ingredients || {};
    const sauceIds = Object.keys(currentIngredients)
        .filter(id => {
            const def = currentIngredients[id];

            return !!(
                def &&
                (
                    def.sauceMaker === true ||
                    (
                        id.startsWith("sauce_") &&
                        Array.isArray(def.sauceIngredients)
                    )
                )
            );
        })
        .sort();

    const previousSelection = selectedSauce;

    sauceSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Scegli una salsa --";
    sauceSelect.appendChild(placeholder);

    for (const id of sauceIds) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = id;
        sauceSelect.appendChild(option);
    }

    if (previousSelection && sauceIds.includes(previousSelection)) {
        sauceSelect.value = previousSelection;
    } else {
        sauceSelect.value = "";
        selectedSauce = null;
    }

    console.log(
        "[SauceFryer] Elenco aggiornato:",
        sauceIds.length,
        "salse",
        sauceIds
    );
}

    function renderDatabase() {
        if (!panel) return;

        const list = panel.querySelector("#" + PREFIX + "-list");
        if (!list) return;

        list.replaceChildren();

        database.forEach(item => {
            const row = document.createElement("div");
            row.style.cssText =
                "padding:8px;margin:5px 0;background:#30231f;" +
                "border-radius:6px;overflow-wrap:anywhere;";

            const title = document.createElement("strong");
            title.textContent = item.id;

            const swatch = document.createElement("span");
            swatch.style.cssText =
                "display:inline-block;width:12px;height:12px;" +
                "border-radius:50%;margin-left:8px;background:" +
                (getColor(item.color) || "#654321");

            const details = document.createElement("div");
            details.style.cssText = "font-size:12px;color:#ddd;";
            details.textContent =
                "Salsa: " + item.sauceId +
                " | Ingrediente originale: " + item.originalId;

            row.append(title, swatch, details);
            list.appendChild(row);
        });
    }

    function createPanel() {
        if (panel) return;

        panel = document.createElement("div");
        panel.id = PREFIX + "-panel";
        panel.style.cssText =
            "position:fixed;right:14px;bottom:120px;width:350px;" +
            "max-width:calc(100vw - 28px);max-height:65vh;overflow:auto;" +
            "z-index:999999;background:#211a18;color:#fff;" +
            "border:2px solid #a65332;border-radius:12px;padding:12px;" +
            "font:14px Arial,sans-serif;box-shadow:0 5px 25px #0009;";

        const title = document.createElement("h3");
        title.textContent = "🍳 SauceFryer — Frittura in salsa";

        const explanation = document.createElement("p");
        explanation.textContent =
            "Scegli una salsa, attiva il calore e usa il tool " +
            "sull'ingrediente da cuocere.";

        sauceSelect = document.createElement("select");
        sauceSelect.style.cssText =
            "box-sizing:border-box;width:100%;padding:9px;margin:5px 0;";

        sauceSelect.addEventListener("change", () => {
            selectedSauce = sauceSelect.value || null;
            status(
                selectedSauce
                    ? "Salsa selezionata: " + selectedSauce
                    : "Seleziona una salsa."
            );
        });

        heatButton = makeButton("🔥 Calore: SPENTO", () => {
            heatEnabled = !heatEnabled;
            heatButton.textContent = heatEnabled
                ? "🔥 Calore: ATTIVO"
                : "🔥 Calore: SPENTO";

            heatButton.style.background = heatEnabled
                ? "#b52e22"
                : "#66534d";

            status(heatEnabled
                ? "Calore attivo. Seleziona l'ingrediente con il tool."
                : "Calore disattivato.");
        });

        statusElement = document.createElement("div");
        statusElement.style.cssText =
            "padding:8px 0;color:#ffd4ad;font-size:12px;";

        const dbTitle = document.createElement("h4");
        dbTitle.textContent = "Ingredienti fritti registrati";

        const list = document.createElement("div");
        list.id = PREFIX + "-list";

        const clearPanelButton = makeButton("🧹 Pulisci pannello", () => {
    if (!panel) return;

    // Pulisce soltanto l'elenco visibile nel pannello.
    const list = panel.querySelector("#" + PREFIX + "-list");

    if (list) {
        list.replaceChildren();
    }

    status("Pannello pulito. I dati salvati non sono stati cancellati.");
});

        panel.append(
    title,
    explanation,
    sauceSelect,
    heatButton,
    statusElement,
    dbTitle,
    list,
    makeButton("Aggiorna elenco salse", renderSauces),
    clearPanelButton,
    makeButton("Chiudi", () => {
        panel.style.display = "none";
    })
);

        document.body.appendChild(panel);

        renderSauces();
        renderDatabase();
    }

    // --------------------------------------------------
    // COTTURA
    // --------------------------------------------------

    function fry(placed) {
        if (!isBowlMode()) {
            status(
                "Cottura annullata: Bowl Mode non riconosciuto. " +
                "Verifica il rilevamento della modalità per la tua versione."
            );
            return;
        }

        if (!heatEnabled) {
            status("Cottura annullata: attiva prima il calore.");
            return;
        }

        if (!selectedSauce || !isSauce(selectedSauce)) {
            status("Seleziona prima una salsa creata con SauceMaker.");
            return;
        }

        const originalId = getId(placed);

        if (!originalId) {
            status("Ingrediente non riconosciuto.");
            return;
        }

        if (originalId === selectedSauce || isSauce(originalId)) {
            status("Seleziona un ingrediente da cuocere, non una salsa.");
            return;
        }

        if (placed && typeof placed === "object" &&
            placed.sauceFryerProcessing) {
            return;
        }

        if (placed && typeof placed === "object") {
            placed.sauceFryerProcessing = true;
        }

        try {
            const original = ingredients[originalId] || {};
            const sauce = ingredients[selectedSauce];
            const profile = sauceProfile(selectedSauce);

            /*
             * Il nome della salsa è incluso nell'ID.
             * Salse diverse producono ID diversi anche quando
             * vengono usate sullo stesso ingrediente.
             */
            const resultId = (
                originalId + "_fried_in_" + selectedSauce
            ).replace(/[^a-zA-Z0-9_-]/g, "_");

            const baseColor =
                getColor(placed && placed.color) ||
                getColor(original.color) ||
                getColor(original.colour) ||
                "#c78b55";

            const colorFactor = Math.max(
                0.25,
                Math.min(0.72, 0.72 - profile.browning * 0.35)
            );

            const cookedColor = darkenColor(baseColor, colorFactor);

            const definition = {
                name: resultId,
                type: original.type || "food",
                color: cookedColor,
                innerColor: darkenColor(
                    getColor(original.innerColor) || baseColor,
                    Math.max(0.25, colorFactor - 0.12)
                ),
                reactions: {},

                sauceFried: true,
                sauceFryerVersion: 1,

                originalIngredient: originalId,
                cookingMedium: selectedSauce,
                cookingMediumType: "sauce",

                sauceIngredients: Array.isArray(sauce.sauceIngredients)
                    ? sauce.sauceIngredients.slice()
                    : [],

                sauceCookingProfile: {
                    signature: profile.signature,
                    heatFactor: profile.heatFactor,
                    browning: profile.browning,
                    moistureRetention: profile.moistureRetention,
                    flavorIndex: profile.flavorIndex,
                    cookStages: profile.cookStages
                },

                sauceCookingResult: {
                    color: cookedColor,
                    heatActivated: true,
                    bowlMode: true,
                    cookedAt: new Date().toISOString()
                }
            };

            // Conserva le proprietà visuali originali non sostituite.
            [
                "shape", "width", "height", "size", "texture",
                "emoji", "image", "h", "s", "l"
            ].forEach(key => {
                if (original[key] !== undefined) {
                    definition[key] = original[key];
                }
                if (placed && placed[key] !== undefined) {
                    definition[key] = placed[key];
                }
            });

            if (!ingredients[resultId]) {
                addIngredient(resultId, definition);
            }

            if (!ingredients[resultId]) {
                throw new Error("addIngredient non ha registrato " + resultId);
            }

            Object.assign(ingredients[resultId], definition);

            // Se il gioco fornisce un oggetto piazzato, trasformalo.
            if (placed && typeof placed === "object") {
                Object.assign(placed, definition);
                placed.id = resultId;
                placed.name = resultId;
                placed.color = cookedColor;
                placed.sauceFried = true;
                placed.sauceFryerProcessing = false;
                placed.sauceFryerDone = true;
            }

            const record = {
                id: resultId,
                originalId: originalId,
                sauceId: selectedSauce,
                color: cookedColor,
                profileSignature: profile.signature,
                heatFactor: profile.heatFactor,
                browning: profile.browning,
                createdAt: new Date().toISOString()
            };

            const index = database.findIndex(
                item => item.id === resultId
            );

            if (index >= 0) database[index] = record;
            else database.unshift(record);

            saveDatabase();
            renderDatabase();

            status("Cottura riuscita: " + resultId);
            console.log("[SauceFryer] Nuovo ingrediente:", definition);
        } catch (error) {
            if (placed && typeof placed === "object") {
                placed.sauceFryerProcessing = false;
            }

            console.error("[SauceFryer] Errore durante la cottura:", error);
            status("Errore durante la cottura: " + error.message);
        }
    }

    // --------------------------------------------------
    // TOOL DI GIOCO
    // --------------------------------------------------

    window.addTool("sauce_fryer", {
        name: "SauceFryer — Frittura in salsa",
        color: "#a65332",
        shape: "liquid",
        spin: true,

        onSelect: function () {
            createPanel();
            panel.style.display = "block";
            renderSauces();

            status(
                "Bowl Mode richiesto. Scegli una salsa e attiva il calore."
            );
        },

        func: function (placed) {
            const id = getId(placed);

            if (!isBowlMode()) {
                status("Operazione consentita solo in Bowl Mode.");
                return;
            }

            // Permette di scegliere la salsa cliccandola con il tool.
            if (id && isSauce(id)) {
                selectedSauce = id;

                if (sauceSelect) sauceSelect.value = id;

                status("Mezzo di cottura selezionato: " + id);
                return;
            }

            fry(placed);
        }
    });

    function initialize() {
        createPanel();

        if (!document.getElementById(PREFIX + "-launcher")) {
            const launcher = makeButton(
                "🍳 SauceFryer",
                () => {
                    createPanel();
                    panel.style.display =
                        panel.style.display === "none" ? "block" : "none";
                    renderSauces();
                    renderDatabase();
                }
            );

            launcher.id = PREFIX + "-launcher";
            launcher.style.cssText +=
                "position:fixed;right:14px;bottom:14px;" +
                "z-index:999999;padding:11px;border:2px solid #d98b67;";

            document.body.appendChild(launcher);
        }

        console.log("[SauceFryer] Caricato.");
        status("Pronto. Seleziona una salsa per iniziare.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();
