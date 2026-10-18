/*
 * Creator of Microorganisms
 * Versione 11.0
 *
 * Utilizzo:
 * 1. Seleziona il tool.
 * 2. Clicca sul primo ingrediente.
 * 3. Inserisci l'ID del secondo ingrediente.
 * 4. Il tool analizza automaticamente gli ingredienti e i trattamenti
 *    che riesce a leggere dai loro ID e dalle loro proprietà.
 *
 * Compatibilità: API addIngredient, addRecipe e addTool di Infinite Chef.
 */

(function () {
    "use strict";

    const VERSION = "11.0";
    const TOOL_ID = "creator_of_microorganisms";
    const DATABASE_ID = "microorganism_trait_database";

    if (
        typeof window.addIngredient !== "function" ||
        typeof window.addTool !== "function"
    ) {
        console.error(
            "[Creator of Microorganisms] API addIngredient/addTool non disponibili."
        );
        return;
    }

    const registry = window.microorganismRegistry =
        window.microorganismRegistry || {
            version: VERSION,
            microorganisms: {},
            eggs: {},
            traits: {},
            species: {}
        };

    // ------------------------------------------------------------
    // UTILITÀ
    // ------------------------------------------------------------

    function unique(values) {
        return [...new Set(
            (values || []).filter(function (value) {
                return value !== null &&
                    value !== undefined &&
                    value !== "";
            })
        )];
    }

    function numberOr(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function normalize(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function slug(value) {
        return normalize(value).replace(/\s+/g, "_") || "unknown";
    }

    function hashString(value) {
        let hash = 2166136261;
        const str = String(value);

        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return hash >>> 0;
    }

    function chooseDeterministic(list, seed) {
        if (!list || list.length === 0) return null;
        return list[hashString(seed) % list.length];
    }

    function mixColors(colorA, colorB) {
        function parseColor(color) {
            if (typeof color !== "string") return null;

            const hex = color.match(/^#([0-9a-f]{6})$/i);
            if (hex) {
                const n = parseInt(hex[1], 16);
                return [
                    (n >> 16) & 255,
                    (n >> 8) & 255,
                    n & 255
                ];
            }

            const short = color.match(/^#([0-9a-f]{3})$/i);
            if (short) {
                return short[1].split("").map(function (c) {
                    return parseInt(c + c, 16);
                });
            }

            return null;
        }

        const a = parseColor(colorA) || [115, 190, 160];
        const b = parseColor(colorB) || [130, 165, 205];

        const mixed = a.map(function (channel, index) {
            return Math.round((channel + b[index]) / 2);
        });

        return "#" + mixed.map(function (channel) {
            return channel.toString(16).padStart(2, "0");
        }).join("");
    }

    // ------------------------------------------------------------
    // DATABASE DEI 78 TRATTI
    // Formato:
    // [nome, qualità, valore, tag, sapori, consistenze, colore]
    // ------------------------------------------------------------

    const RAW_TRAITS = {
        divisione_binaria: ["Divisione binaria", 2, 3, ["riproduzione rapida"], ["neutro"], null, "#8BD18B"],
        crescita: ["Crescita rapida", 1, 3, ["crescita rapida"], ["delicato"], null, "#A5D77B"],
        sporulazione: ["Sporulazione", 3, 5, ["formazione di spore"], ["terroso"], ["granuloso"], "#B69B7D"],
        dormienza: ["Dormienza", 2, 4, ["dormienza"], ["delicato"], null, "#9CA7B4"],
        rigenerazione: ["Rigenerazione", 4, 7, ["rigenerazione"], ["fresco"], null, "#61C5A1"],
        mutazione: ["Mutabilità", 1, 6, ["mutabilità elevata"], ["complesso"], null, "#BD83D5"],
        ricombinazione: ["Ricombinazione", 4, 8, ["ricombinazione genetica"], ["complesso"], null, "#5AB8CE"],
        fotosintesi: ["Fotosintesi", 4, 7, ["fotosintesi"], ["vegetale", "fresco"], null, "#43B978"],
        clorofilla: ["Clorofilla", 2, 4, ["pigmento verde"], ["erbaceo"], null, "#68B85C"],
        fermentazione: ["Fermentazione", 4, 8, ["fermentazione"], ["fermentato", "acidulo"], ["effervescente"], "#D7A24B"],
        chemosintesi: ["Chemiosintesi", 5, 9, ["produzione energetica chimica"], ["minerale"], null, "#C59D68"],
        bioluminescenza: ["Bioluminescenza", 6, 14, ["luminescenza simulata"], ["minerale"], null, "#42E5D4"],
        termoresistenza: ["Termoresistenza", 4, 7, ["resistenza al calore"], ["tostato"], null, "#D86D36"],
        adattamento_al_freddo: ["Adattamento al freddo", 3, 6, ["tolleranza al freddo"], ["fresco"], null, "#73D8EA"],
        acidofilia: ["Acidofilia", 3, 5, ["tolleranza all'acidità"], ["acido"], null, "#D5A4E8"],
        alcalofilia: ["Alcalofilia", 3, 5, ["tolleranza all'alcalinità"], ["minerale"], null, "#8BB9A2"],
        resistenza_siccita: ["Resistenza alla siccità", 3, 6, ["resistenza alla siccità"], ["concentrato"], null, "#C9A66B"],
        resistenza_sale: ["Resistenza al sale", 3, 5, ["tolleranza salina"], ["salato", "minerale"], null, "#85B7C9"],
        resistenza_tossine: ["Resistenza alle tossine", 4, 7, ["resistenza alle tossine"], ["amaro"], null, "#8D7AB6"],
        produzione_enzimi: ["Produzione di enzimi", 4, 8, ["produzione enzimatica"], ["umami"], null, "#D6B65D"],
        produzione_vitamine: ["Produzione di vitamine", 5, 10, ["produzione vitaminica simulata"], ["vegetale", "dolce"], null, "#E6C85C"],
        biodegradazione: ["Biodegradazione", 3, 6, ["decomposizione organica"], ["terroso"], null, "#9B875E"],
        motilita: ["Motilità", 2, 5, ["mobilità"], ["fresco"], null, "#55B9C8"],
        biofilm: ["Biofilm", 3, 6, ["formazione di biofilm"], ["cremoso"], ["viscoso"], "#8BBCA6"],
        ife: ["Ife", 2, 4, ["struttura ifale"], ["terroso"], ["filamentoso"], "#B39AD0"],
        capsula_protettiva: ["Capsula protettiva", 4, 7, ["capsula protettiva"], ["neutro"], ["gelatinoso"], "#9CC7D7"],
        pigmentazione: ["Pigmentazione", 2, 5, ["pigmentazione speciale"], ["vegetale"], null, "#D88FB3"],
        simbiosi: ["Simbiosi", 5, 10, ["simbiosi"], ["armonico"], null, "#8BCB9B"],
        parassitismo: ["Parassitismo", 1, 5, ["parassitismo simulato"], ["amaro"], null, "#8C719B"],
        predazione: ["Predazione microbica", 2, 7, ["predazione simulata"], ["intenso"], null, "#BA7777"],
        produzione_tossine: ["Produzione di tossine", -2, 4, ["produzione di tossine simulata"], ["amaro"], null, "#80699B"],
        riparazione_dna: ["Riparazione del DNA", 6, 11, ["riparazione genetica"], ["neutro"], null, "#83A5D4"],
        resistenza_antibiotici: ["Resistenza agli antibiotici", 1, 5, ["resistenza simulata"], ["amaro"], null, "#918A72"],
        produzione_proteine: ["Produzione proteica", 3, 7, ["sintesi proteica"], ["umami"], null, "#B6A76D"],
        assorbimento_minerali: ["Assorbimento minerale", 3, 6, ["assorbimento minerale"], ["minerale"], null, "#9EB4B9"],
        accumulo_energia: ["Accumulo energetico", 4, 8, ["riserva energetica"], ["dolce"], null, "#E0B75B"],
        tolleranza_osmotica: ["Tolleranza osmotica", 3, 6, ["tolleranza osmotica"], ["salato"], null, "#8FB9C5"],
        chemotassi: ["Chemotassi", 2, 5, ["chemotassi simulata"], ["fresco"], null, "#5DB9AE"],
        sporulazione_resistente: ["Spore resistenti", 5, 9, ["spore resistenti"], ["terroso"], ["granuloso"], "#A88B64"],
        produzione_acidi: ["Produzione di acidi", 2, 5, ["metaboliti acidi"], ["acido"], null, "#D8A0D1"],
        produzione_alcoli: ["Produzione di alcoli", 3, 6, ["metaboliti alcolici simulati"], ["fruttato", "fermentato"], null, "#D8B45C"],
        aroma_fruttato: ["Aroma fruttato", 3, 7, ["profilo aromatico fruttato"], ["fruttato"], null, "#D77C9D"],
        aroma_floreale: ["Aroma floreale", 3, 7, ["profilo aromatico floreale"], ["floreale"], null, "#D6A4D8"],
        aroma_tostato: ["Aroma tostato", 2, 5, ["profilo aromatico tostato"], ["tostato"], null, "#A77B59"],
        umami: ["Profilo umami", 4, 8, ["profilo umami"], ["umami", "sapido"], null, "#B98C62"],
        dolcezza: ["Profilo dolce", 2, 5, ["profilo dolce"], ["dolce"], null, "#E5C56D"],
        acidita: ["Profilo acidulo", 2, 5, ["profilo acidulo"], ["acido", "acidulo"], null, "#D6D36A"],
        amarezza: ["Profilo amaro", 1, 3, ["profilo amaro"], ["amaro"], null, "#8F805C"],
        sapidita: ["Profilo sapido", 2, 5, ["profilo sapido"], ["salato", "sapido"], null, "#8FAEBB"],
        cremosita: ["Consistenza cremosa", 3, 6, ["consistenza cremosa"], ["cremoso"], ["cremoso"], "#E1D2A4"],
        viscosita: ["Consistenza viscosa", 2, 5, ["consistenza viscosa"], ["neutro"], ["viscoso"], "#9DB9A4"],
        croccantezza: ["Consistenza granulosa", 1, 3, ["consistenza granulosa"], ["tostato"], ["granuloso"], "#C4A47A"],
        adattamento: ["Adattamento ambientale", 4, 8, ["adattabilità"], ["complesso"], null, "#7CA6C8"],
        stabilita_genetica: ["Stabilità genetica", 6, 12, ["stabilità genetica"], ["pulito"], null, "#80B6C8"],
        metabolismo_estremo: ["Metabolismo estremo", 5, 10, ["metabolismo estremo"], ["minerale"], null, "#D18A5E"],
        assorbimento_nutrienti: ["Assorbimento nutrienti", 3, 6, ["assorbimento nutrienti"], ["vegetale"], null, "#9CCB78"],
        divisione_lenta: ["Divisione lenta", 1, 3, ["crescita lenta"], ["concentrato"], null, "#9BA9A5"],
        resistenza_radiazioni: ["Resistenza alle radiazioni", 5, 10, ["resistenza simulata alle radiazioni"], ["minerale"], null, "#B58DCB"],
        aggregazione: ["Aggregazione cellulare", 2, 5, ["aggregazione"], ["cremoso"], ["aggregato"], "#9FC4B0"],
        secrezione_polimeri: ["Secrezione di polimeri", 3, 7, ["secrezione di polimeri"], ["neutro"], ["gelatinoso"], "#85B6B5"],
        profilo_neutro: ["Profilo neutro", 1, 2, ["profilo neutro"], ["neutro"], null, "#B9B9B0"],
        rigenerazione_avanzata: ["Rigenerazione avanzata", 5, 9, ["rigenerazione avanzata"], ["fresco", "pulito"], null, "#50C7A5"],
        efficienza_metabolica: ["Efficienza metabolica", 4, 8, ["efficienza metabolica"], ["pulito"], null, "#C4C96C"],
        resistenza_pressione: ["Resistenza alla pressione", 4, 7, ["tolleranza alla pressione"], ["minerale"], null, "#7196B7"],
        resistenza_uv: ["Resistenza UV", 4, 8, ["resistenza UV simulata"], ["minerale"], null, "#A78AD1"],
        crioprotezione: ["Crioprotezione", 4, 8, ["protezione dal congelamento"], ["fresco"], null, "#80D5ED"],
        termoregolazione: ["Adattamento termico", 4, 8, ["adattamento termico"], ["neutro"], null, "#D98B56"],
        produzione_lipidi: ["Produzione di lipidi", 3, 7, ["produzione lipidica"], ["untuoso"], null, "#B6BC69"],
        produzione_pigmenti: ["Produzione di pigmenti", 3, 7, ["produzione di pigmenti"], ["vegetale"], null, "#D78CA5"],
        quorum_sensing: ["Comunicazione cellulare", 4, 8, ["comunicazione cellulare simulata"], ["armonico"], null, "#6DB8C1"],
        simbiosi_avanzata: ["Simbiosi avanzata", 5, 10, ["simbiosi avanzata"], ["armonico", "complesso"], null, "#7AC99C"],
        filtrazione: ["Filtrazione ambientale", 3, 6, ["filtrazione simulata"], ["pulito"], null, "#9DC6B0"],
        accumulo_risorse: ["Accumulo di risorse", 3, 7, ["accumulo di risorse"], ["concentrato"], null, "#C9A65B"],
        fermentazione_lenta: ["Fermentazione lenta", 3, 7, ["fermentazione lenta"], ["fermentato", "complesso"], null, "#C99B5D"],
        profilo_balsamico: ["Profilo balsamico", 3, 7, ["profilo balsamico"], ["balsamico", "fresco"], null, "#7AAE85"],
        aroma_legnoso: ["Aroma legnoso", 2, 5, ["profilo aromatico legnoso"], ["legnoso"], null, "#997456"],
        aroma_speziato: ["Aroma speziato", 3, 6, ["profilo aromatico speziato"], ["speziato"], null, "#C27E53"],
        equilibrio_metabolico: ["Equilibrio metabolico", 4, 8, ["equilibrio metabolico"], ["armonico", "pulito"], null, "#8ABDA0"],
        membrana_rinforzata: ["Membrana rinforzata", 4, 8, ["membrana rinforzata"], ["neutro"], null, "#83A6C4"]
    };

    Object.keys(RAW_TRAITS).forEach(function (id) {
        const item = RAW_TRAITS[id];

        registry.traits[id] = {
            id: id,
            name: item[0],
            quality: item[1],
            value: item[2],
            tags: item[3] || [],
            flavors: item[4] || [],
            textures: item[5] || [],
            color: item[6] || "#9CC7D7"
        };
    });

    // ------------------------------------------------------------
    // SPECIE
    // ------------------------------------------------------------

    const SPECIES = {
        bacterium: {
            name: "Batterio",
            category: "microbe",
            color: "#78C878",
            cellType: "procariote",
            base: 55,
            traits: ["divisione_binaria", "crescita", "motilita", "capsula_protettiva"]
        },
        yeast: {
            name: "Lievito",
            category: "fungus",
            color: "#E7C56D",
            cellType: "eucariote",
            base: 62,
            traits: ["fermentazione", "produzione_alcoli", "produzione_enzimi", "crescita"]
        },
        mold: {
            name: "Muffa",
            category: "fungus",
            color: "#A88BD0",
            cellType: "eucariote",
            base: 58,
            traits: ["ife", "sporulazione", "biodegradazione", "adattamento"]
        },
        archaea: {
            name: "Archeo",
            category: "microbe",
            color: "#E28D60",
            cellType: "procariote",
            base: 72,
            traits: ["metabolismo_estremo", "termoresistenza", "adattamento", "stabilita_genetica"]
        },
        microalgae: {
            name: "Microalga",
            category: "algae",
            color: "#4DBA91",
            cellType: "eucariote",
            base: 65,
            traits: ["fotosintesi", "clorofilla", "produzione_pigmenti", "assorbimento_nutrienti"]
        },
        hybrid: {
            name: "Ibrido",
            category: "double_helix",
            color: "#5AB8CE",
            cellType: "misto",
            base: 80,
            traits: ["ricombinazione", "mutazione", "simbiosi", "equilibrio_metabolico"]
        }
    };

    Object.keys(SPECIES).forEach(function (id) {
        registry.species[id] = SPECIES[id];
    });

    // ------------------------------------------------------------
    // REGOLE PER GLI INGREDIENTI
    // ------------------------------------------------------------

    const INGREDIENT_RULES = [
        {
            pattern: /\b(water|acqua|ice|ghiaccio)\b/,
            traits: ["adattamento_al_freddo", "crioprotezione", "profilo_neutro"],
            flavors: ["fresco"],
            quality: 2
        },
        {
            pattern: /\b(sugar|zucchero|honey|miele|syrup|sciroppo)\b/,
            traits: ["dolcezza", "accumulo_energia", "fermentazione"],
            flavors: ["dolce"],
            quality: 3
        },
        {
            pattern: /\b(salt|sale|salty|salato|brine|salamoia)\b/,
            traits: ["resistenza_sale", "tolleranza_osmotica", "sapidita"],
            flavors: ["salato", "minerale"],
            quality: 2
        },
        {
            pattern: /\b(lemon|limone|lime|vinegar|aceto|acid|acido)\b/,
            traits: ["acidofilia", "produzione_acidi", "acidita"],
            flavors: ["acido", "acidulo"],
            quality: 3
        },
        {
            pattern: /\b(apple|mela|berry|berries|frutti|fruit|frutta|banana|pear|pera|grape|uva)\b/,
            traits: ["aroma_fruttato", "produzione_vitamine", "assorbimento_nutrienti"],
            flavors: ["fruttato", "dolce"],
            quality: 3
        },
        {
            pattern: /\b(vegetable|vegetables|verdura|verdure|spinach|spinaci|lettuce|lattuga|cabbage|cavolo)\b/,
            traits: ["fotosintesi", "clorofilla", "assorbimento_nutrienti"],
            flavors: ["vegetale", "erbaceo"],
            quality: 3
        },
        {
            pattern: /\b(mushroom|fungus|fungi|fungo|funghi|yeast|lievito|mold|muffa)\b/,
            traits: ["ife", "sporulazione", "biodegradazione", "fermentazione"],
            flavors: ["terroso", "fermentato"],
            quality: 4
        },
        {
            pattern: /\b(meat|carne|beef|manzo|chicken|pollo|fish|pesce|egg|uovo|eggs|uova)\b/,
            traits: ["produzione_proteine", "umami", "produzione_enzimi"],
            flavors: ["umami", "sapido"],
            quality: 3
        },
        {
            pattern: /\b(milk|latte|cream|panna|cheese|formaggio|yogurt)\b/,
            traits: ["cremosita", "fermentazione", "produzione_enzimi"],
            flavors: ["cremoso", "fermentato"],
            quality: 3
        },
        {
            pattern: /\b(coffee|caffe|tea|tè|cocoa|cacao|chocolate|cioccolato)\b/,
            traits: ["aroma_tostato", "amarezza", "metabolismo_estremo"],
            flavors: ["tostato", "amaro"],
            quality: 3
        },
        {
            pattern: /\b(wood|legno|bark|corteccia|oak|quercia)\b/,
            traits: ["aroma_legnoso", "biodegradazione", "sporulazione"],
            flavors: ["legnoso", "terroso"],
            quality: 3
        },
        {
            pattern: /\b(chili|pepper|pepe|chili pepper|spice|spezie|ginger|zenzero)\b/,
            traits: ["aroma_speziato", "termoresistenza", "produzione_enzimi"],
            flavors: ["speziato", "intenso"],
            quality: 3
        },
        {
            pattern: /\b(oil|olio|fat|grasso|butter|burro)\b/,
            traits: ["produzione_lipidi", "accumulo_energia", "membrana_rinforzata"],
            flavors: ["untuoso", "cremoso"],
            quality: 3
        },
        {
            pattern: /\b(stone|rock|stone|pietra|rock|mineral|minerale|metal|metallo|iron|ferro)\b/,
            traits: ["assorbimento_minerali", "chemosintesi", "resistenza_pressione"],
            flavors: ["minerale"],
            quality: 3
        },
        {
            pattern: /\b(smoke|smoked|affumicato|affumicata|fumo)\b/,
            traits: ["aroma_tostato", "termoresistenza", "stabilita_genetica"],
            flavors: ["tostato", "legnoso"],
            quality: 4
        },
        {
            pattern: /\b(caramel|caramelized|caramello|caramellato|caramellata)\b/,
            traits: ["dolcezza", "aroma_tostato", "accumulo_energia"],
            flavors: ["dolce", "tostato"],
            quality: 4
        },
        {
            pattern: /\b(sauce|salsa|ketchup|mustard|senape|mayonnaise|maionese)\b/,
            traits: ["produzione_enzimi", "fermentazione", "equilibrio_metabolico"],
            flavors: ["complesso", "sapido"],
            quality: 4
        },
        {
            pattern: /\b(graft|grafted|innesto|innestato|innestata|hybrid|ibrido)\b/,
            traits: ["ricombinazione", "mutazione", "simbiosi_avanzata"],
            flavors: ["complesso", "armonico"],
            quality: 5
        },
        {
            pattern: /\b(bread|pane|dough|impasto|flour|farina|grain|cereale|rice|riso)\b/,
            traits: ["fermentazione", "produzione_alcoli", "accumulo_risorse"],
            flavors: ["fermentato", "concentrato"],
            quality: 3
        },
        {
            pattern: /\b(air|aria|oxygen|ossigeno|gas)\b/,
            traits: ["metabolismo_estremo", "efficienza_metabolica", "motilita"],
            flavors: ["neutro"],
            quality: 2
        }
    ];

    // ------------------------------------------------------------
    // TRATTAMENTI RICONOSCIUTI AUTOMATICAMENTE
    // ------------------------------------------------------------

    const TREATMENTS = [
        {
            id: "salsa",
            pattern: /\b(sauce|salsa|ketchup|mustard|senape|mayonnaise|maionese)\b/,
            traits: ["fermentazione", "produzione_enzimi", "equilibrio_metabolico"],
            flavors: ["complesso", "sapido"],
            quality: 4,
            value: 6
        },
        {
            id: "innesto",
            pattern: /\b(graft|grafted|innesto|innestato|innestata|grafting)\b/,
            traits: ["ricombinazione", "simbiosi_avanzata", "mutazione"],
            flavors: ["armonico", "complesso"],
            quality: 5,
            value: 9
        },
        {
            id: "affumicato",
            pattern: /\b(smoked|smoke|smoky|affumicato|affumicata|affumicatura)\b/,
            traits: ["termoresistenza", "aroma_tostato", "stabilita_genetica"],
            flavors: ["tostato", "legnoso"],
            quality: 4,
            value: 7
        },
        {
            id: "caramellato",
            pattern: /\b(caramelized|caramelised|caramel|caramellato|caramellata|caramellatura)\b/,
            traits: ["dolcezza", "aroma_tostato", "accumulo_energia"],
            flavors: ["dolce", "tostato"],
            quality: 4,
            value: 7
        },
        {
            id: "plus",
            pattern: /\b(plus|premium|enhanced|advanced|potenziato|potenziata|migliorato|migliorata)\b/,
            traits: ["rigenerazione_avanzata", "efficienza_metabolica", "stabilita_genetica"],
            flavors: ["pulito", "complesso"],
            quality: 5,
            value: 10
        },
        {
            id: "mod",
            pattern: /\b(mod|modded|modified|modificato|modificata|custom)\b/,
            traits: ["mutazione", "adattamento", "ricombinazione"],
            flavors: ["complesso"],
            quality: 3,
            value: 6
        }
    ];

    function describeIngredient(item, fallbackId) {
        const fields = [
            "id", "ingredientId", "ingredient_id", "key", "uid",
            "identifier", "name", "label", "displayName", "title",
            "type", "treatment", "treatments", "process", "state",
            "tags", "description", "category", "shape"
        ];

        const parts = [String(fallbackId || "")];

        if (item && typeof item === "object") {
            fields.forEach(function (field) {
                const value = item[field];

                if (typeof value === "string" || typeof value === "number") {
                    parts.push(String(value));
                } else if (Array.isArray(value)) {
                    parts.push(value.map(String).join(" "));
                } else if (value && typeof value === "object") {
                    try {
                        parts.push(JSON.stringify(value));
                    } catch (_) {
                        // Ignora proprietà non serializzabili.
                    }
                }
            });
        }

        return parts.join(" ");
    }

    function findTreatment(description) {
        const normalized = normalize(description);
        const found = [];

        TREATMENTS.forEach(function (treatment) {
            if (treatment.pattern.test(normalized)) {
                found.push(treatment);
            }
        });

        return found;
    }

    function getIngredientId(item) {
        if (typeof item === "string" || typeof item === "number") {
            return String(item);
        }

        if (!item || typeof item !== "object") {
            return null;
        }

        const keys = [
            "id", "ingredientId", "ingredient_id",
            "key", "uid", "identifier"
        ];

        for (const key of keys) {
            const value = item[key];

            if (
                typeof value === "string" ||
                typeof value === "number"
            ) {
                return String(value);
            }
        }

        return null;
    }

    function resolveIngredient(id) {
        const wanted = String(id || "").trim();
        if (!wanted) return null;

        const stores = [
            window.ingredients,
            window.ingredientRegistry,
            window.ingredientDatabase,
            window.ingredientData,
            window.ingredientMap
        ];

        for (const store of stores) {
            if (!store) continue;

            if (
                typeof store === "object" &&
                Object.prototype.hasOwnProperty.call(store, wanted)
            ) {
                return store[wanted];
            }

            if (Array.isArray(store)) {
                const found = store.find(function (item) {
                    return getIngredientId(item) === wanted ||
                        (item && item.name === wanted);
                });

                if (found) return found;
            }
        }

        // Prova anche l'eventuale registry della mod.
        if (
            registry.microorganisms &&
            registry.microorganisms[wanted]
        ) {
            return registry.microorganisms[wanted];
        }

        // L'ID viene mantenuto anche quando il gioco non espone
        // pubblicamente l'oggetto dell'ingrediente.
        return {
            id: wanted,
            name: wanted,
            unresolved: true
        };
    }

    function getIngredientColor(item) {
        if (!item || typeof item !== "object") return null;

        return item.color ||
            item.backgroundColor ||
            item.background ||
            item.hex ||
            null;
    }

    function analyzeIngredient(id, item) {
        const description = describeIngredient(item, id);
        const normalized = normalize(description);
        const traitIds = [];
        const flavors = [];
        const textures = [];
        let quality = 0;
        let value = 0;
        const detectedTreatments = [];

        INGREDIENT_RULES.forEach(function (rule) {
            if (rule.pattern.test(normalized)) {
                traitIds.push(...rule.traits);
                flavors.push(...rule.flavors);
                quality += rule.quality;
            }
        });

        findTreatment(description).forEach(function (treatment) {
            detectedTreatments.push(treatment.id);
            traitIds.push(...treatment.traits);
            flavors.push(...treatment.flavors);
            quality += treatment.quality;
            value += treatment.value;
        });

        if (item && typeof item === "object") {
            const explicitTags = Array.isArray(item.tags) ? item.tags : [];
            const explicitFlavors = Array.isArray(item.flavors) ? item.flavors : [];
            const explicitTextures = Array.isArray(item.textures) ? item.textures : [];

            explicitTags.forEach(function (tag) {
                const normalizedTag = normalize(tag);

                Object.keys(RAW_TRAITS).forEach(function (traitId) {
                    const trait = registry.traits[traitId];

                    if (
                        normalize(trait.name) === normalizedTag ||
                        traitId === slug(tag)
                    ) {
                        traitIds.push(traitId);
                    }
                });
            });

            flavors.push(...explicitFlavors);
            textures.push(...explicitTextures);

            quality += numberOr(item.quality, 0);
            value += numberOr(item.value, 0);
        }

        // Nessun ingrediente viene trattato come un errore soltanto
        // perché il registro interno del gioco non è accessibile.
        if (traitIds.length === 0) {
            const fallback = chooseDeterministic(
                Object.keys(RAW_TRAITS),
                String(id)
            );

            if (fallback) traitIds.push(fallback);
        }

        return {
            id: String(id),
            description: description,
            traits: unique(traitIds),
            flavors: unique(flavors),
            textures: unique(textures),
            quality: quality,
            value: value,
            treatments: unique(detectedTreatments),
            color: getIngredientColor(item),
            resolved: !(item && item.unresolved)
        };
    }

    // ------------------------------------------------------------
    // SCELTA DEL NOME E DELLA SPECIE
    // ------------------------------------------------------------

    function askForSpecies() {
        const options = [
            "bacterium",
            "yeast",
            "mold",
            "archaea",
            "microalgae",
            "hybrid"
        ];

        const message =
            "Scegli la specie del microrganismo:\n\n" +
            "1 = Batterio\n" +
            "2 = Lievito\n" +
            "3 = Muffa\n" +
            "4 = Archeo\n" +
            "5 = Microalga\n" +
            "6 = Ibrido\n\n" +
            "Inserisci un numero da 1 a 6.";

        const answer = window.prompt(message, "1");
        if (answer === null) return null;

        const index = Number(answer.trim()) - 1;

        if (!Number.isInteger(index) || index < 0 || index >= options.length) {
            window.alert("Scelta non valida. Operazione annullata.");
            return null;
        }

        return options[index];
    }

    function askForName(defaultName) {
        const answer = window.prompt(
            "Nome del microrganismo:",
            defaultName
        );

        if (answer === null) return null;

        return answer.trim() || defaultName;
    }

    function selectTraits(firstAnalysis, secondAnalysis, speciesId, seed) {
        const species = SPECIES[speciesId];
        const candidates = unique([
            ...species.traits,
            ...firstAnalysis.traits,
            ...secondAnalysis.traits
        ]).filter(function (id) {
            return Boolean(registry.traits[id]);
        });

        const ordered = candidates.slice().sort(function (a, b) {
            return hashString(seed + a) - hashString(seed + b);
        });

        // Mantiene un insieme utile di tratti senza selezionare
        // indiscriminatamente l'intero database.
        const selected = ordered.slice(0, Math.min(10, ordered.length));

        return unique(selected.length ? selected : species.traits);
    }

    // ------------------------------------------------------------
    // CREAZIONE DEL MICRORGANISMO
    // ------------------------------------------------------------

    function createMicroorganismFromClick(placed) {
        const firstId = getIngredientId(placed);

        if (!firstId) {
            console.error(
                "[Creator of Microorganisms] Oggetto ricevuto senza ID riconoscibile:",
                placed
            );

            window.alert(
                "Non riesco a leggere l'ID del primo ingrediente.\n" +
                "Apri la console del browser e controlla l'oggetto stampato."
            );

            return;
        }

        // Viene richiesto soltanto l'ID del secondo ingrediente.
        const secondIdInput = window.prompt(
            "Inserisci l'ID del secondo ingrediente:",
            ""
        );

        if (secondIdInput === null) return;

        const secondId = secondIdInput.trim();

        if (!secondId) {
            window.alert("Devi inserire l'ID del secondo ingrediente.");
            return;
        }

        const secondIngredient = resolveIngredient(secondId);

        const speciesId = askForSpecies();
        if (!speciesId) return;

        const species = SPECIES[speciesId];
        const defaultName =
            species.name + " " +
            firstId.replace(/[_-]+/g, " ") + " × " +
            secondId.replace(/[_-]+/g, " ");

        const microorganismName = askForName(defaultName);
        if (!microorganismName) return;

        const firstAnalysis = analyzeIngredient(firstId, placed);
        const secondAnalysis = analyzeIngredient(secondId, secondIngredient);

        const seed = [
            firstId,
            secondId,
            speciesId,
            microorganismName
        ].join("|");

        const traitIds = selectTraits(
            firstAnalysis,
            secondAnalysis,
            speciesId,
            seed
        );

        const traits = traitIds.map(function (id) {
            return registry.traits[id];
        }).filter(Boolean);

        const flavors = unique([
            ...firstAnalysis.flavors,
            ...secondAnalysis.flavors,
            ...traits.flatMap(function (trait) {
                return trait.flavors;
            })
        ]);

        const textures = unique([
            ...firstAnalysis.textures,
            ...secondAnalysis.textures,
            ...traits.flatMap(function (trait) {
                return trait.textures;
            })
        ]);

        const qualityTotal = traits.reduce(function (sum, trait) {
            return sum + numberOr(trait.quality, 0);
        }, 0);

        const traitValueTotal = traits.reduce(function (sum, trait) {
            return sum + numberOr(trait.value, 0);
        }, 0);

        const quality = clamp(
            Math.round(
                species.base / 10 +
                qualityTotal / Math.max(1, traits.length) +
                (firstAnalysis.quality + secondAnalysis.quality) / 4
            ),
            1,
            10
        );

        const value = Math.max(
            1,
            Math.round(
                species.base +
                traitValueTotal +
                firstAnalysis.value +
                secondAnalysis.value
            )
        );

        const color = mixColors(
            firstAnalysis.color || species.color,
            secondAnalysis.color || species.color
        );

        const microorganismId =
            "microorganism_" + slug(microorganismName) + "_" +
            hashString(seed).toString(16);

        const eggId = microorganismId + "_egg";

        const detectedTreatments = unique([
            ...firstAnalysis.treatments,
            ...secondAnalysis.treatments
        ]);

        const microorganism = {
            id: microorganismId,
            name: microorganismName,
            type: species.category,
            species: speciesId,
            speciesName: species.name,
            cellType: species.cellType,
            color: color,
            quality: quality,
            value: value,
            traits: traitIds,
            traitNames: traits.map(function (trait) {
                return trait.name;
            }),
            flavors: flavors,
            textures: textures,
            ingredients: [firstId, secondId],
            treatments: detectedTreatments,
            createdAt: Date.now(),
            version: VERSION
        };

        const egg = {
            id: eggId,
            name: "Uovo di " + microorganismName,
            type: "egg",
            color: color,
            innerColor: species.color,
            shape: "egg",
            microorganismId: microorganismId,
            species: speciesId,
            quality: quality,
            value: Math.max(1, Math.round(value / 2)),
            traits: traitIds,
            flavors: flavors,
            textures: textures
        };

        registry.microorganisms[microorganismId] = microorganism;
        registry.eggs[eggId] = egg;

        // Registrazione dell'ingrediente nel gioco.
        try {
            window.addIngredient(microorganismId, {
                name: microorganismName,
                color: color,
                innerColor: species.color,
                type: species.category,
                shape: "microbe",
                quality: quality,
                value: value,
                traits: traitIds,
                flavors: flavors,
                textures: textures,
                species: speciesId,
                cellType: species.cellType,
                description:
                    species.name + " generato da " +
                    firstId + " e " + secondId
            });
        } catch (error) {
            console.error(
                "[Creator of Microorganisms] Errore registrando il microrganismo:",
                error
            );

            window.alert(
                "Il microrganismo è stato preparato, ma il gioco non è riuscito " +
                "a registrarlo come ingrediente. Controlla la console."
            );

            return;
        }

        try {
            window.addIngredient(eggId, {
                name: egg.name,
                color: color,
                innerColor: species.color,
                type: "egg",
                shape: "egg",
                quality: quality,
                value: egg.value,
                microorganismId: microorganismId,
                species: speciesId,
                traits: traitIds,
                description: "Uovo di " + microorganismName
            });
        } catch (error) {
            console.warn(
                "[Creator of Microorganisms] Errore registrando l'uovo:",
                error
            );
        }

        // Ricetta utile per collegare uovo e microrganismo.
        if (typeof window.addRecipe === "function") {
            try {
                window.addRecipe(eggId + "+" + microorganismId, eggId);
            } catch (error) {
                console.warn(
                    "[Creator of Microorganisms] Ricetta non registrata:",
                    error
                );
            }
        }

        // Evento informativo per altre mod che ascoltano la creazione.
        try {
            window.dispatchEvent(new CustomEvent(
                "microorganismCreated",
                {
                    detail: {
                        microorganism: microorganism,
                        egg: egg
                    }
                }
            ));
        } catch (_) {
            // La creazione non dipende dalla disponibilità di CustomEvent.
        }

        const treatmentText = detectedTreatments.length
            ? detectedTreatments.join(", ")
            : "nessun trattamento riconosciuto nei dati disponibili";

        window.alert(
            "Microrganismo creato!\n\n" +
            "Nome: " + microorganismName + "\n" +
            "Specie: " + species.name + "\n" +
            "ID: " + microorganismId + "\n" +
            "Uovo: " + eggId + "\n" +
            "Tratti: " + traits.length + "\n" +
            "Qualità: " + quality + "/10\n" +
            "Valore: " + value + "\n" +
            "Trattamenti riconosciuti: " + treatmentText
        );

        console.info(
            "[Creator of Microorganisms] Creato:",
            microorganism
        );
    }

    // ------------------------------------------------------------
    // TOOL PRINCIPALE
    // Il gioco passa al callback l'ingrediente cliccato.
    // ------------------------------------------------------------

    window.addTool(TOOL_ID, {
        name: "Creator of Microorganisms",
        shape: "microbe",

        func: function (placed) {
            createMicroorganismFromClick(placed);
        },

        onSelect: function () {
            console.info(
                "[Creator of Microorganisms " + VERSION + "] " +
                "Clicca un ingrediente per iniziare."
            );
        },

        onDeselect: function () {
            console.info(
                "[Creator of Microorganisms] Tool deselezionato."
            );
        }
    });

    // ------------------------------------------------------------
    // TOOL DATABASE
    // ------------------------------------------------------------

    window.addTool(DATABASE_ID, {
        name: "Microorganism Trait Database",
        shape: "microbe",

        func: function () {
            const traitNames = Object.keys(registry.traits).map(function (id) {
                const trait = registry.traits[id];

                return id + " — " + trait.name +
                    " (qualità " + trait.quality +
                    ", valore " + trait.value + ")";
            });

            const preview = traitNames.slice(0, 25).join("\n");

            window.alert(
                "Database dei tratti: " + traitNames.length + "\n\n" +
                preview +
                (traitNames.length > 25
                    ? "\n\n... Altri tratti disponibili nella console."
                    : "")
            );

            console.table(registry.traits);
            console.info("Database completo:", registry.traits);
        },

        onSelect: function () {
            console.info(
                "[Microorganism Trait Database] " +
                Object.keys(registry.traits).length +
                " tratti caricati."
            );
        }
    });

    console.info(
        "[Creator of Microorganisms " + VERSION + "] Caricato correttamente.",
        {
            traits: Object.keys(registry.traits).length,
            species: Object.keys(registry.species).length,
            tool: TOOL_ID,
            databaseTool: DATABASE_ID
        }
    );
})();
