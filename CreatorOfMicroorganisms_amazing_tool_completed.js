
/*
 * Creator of Microorganisms
 * Version 12.0
 *
 * Funzioni:
 * - Clic sul primo ingrediente tramite il tool.
 * - Richiesta del solo ID del secondo ingrediente.
 * - 6 specie e 78 tratti.
 * - Ricette speciali con bonus esclusivi.
 * - Mutazioni casuali estremamente rare.
 * - Registro persistente delle scoperte, se localStorage è disponibile.
 * - Ereditarietà dei tratti dai microrganismi genitori.
 * - Riconoscimento automatico dei trattamenti rilevabili.
 * - Creazione del microrganismo e del relativo uovo.
 *
 * Nota: le ricette e i trattamenti sono regole di questa mod.
 * L'accesso ai dati interni di Infinite Chef dipende dalla versione del gioco.
 */

(function () {
    "use strict";

    const VERSION = "12.0";
    const TOOL_ID = "creator_of_microorganisms";
    const DATABASE_TOOL_ID = "microorganism_trait_database";
    const STORAGE_KEY = "creator_of_microorganisms_discoveries_v12";

    if (typeof window.addIngredient !== "function" ||
        typeof window.addTool !== "function") {
        console.error("[Microorganismi] API addIngredient/addTool non disponibili.");
        return;
    }

    // ============================================================
    // REGISTRO
    // ============================================================

    const registry = window.microorganismRegistry =
        window.microorganismRegistry || {
            version: VERSION,
            microorganisms: {},
            eggs: {},
            traits: {},
            species: {},
            discoveries: {}
        };

    registry.microorganisms = registry.microorganisms || {};
    registry.eggs = registry.eggs || {};
    registry.traits = registry.traits || {};
    registry.species = registry.species || {};
    registry.discoveries = registry.discoveries || {};

    // ============================================================
    // UTILITÀ GENERALI
    // ============================================================

    function unique(values) {
        return Array.from(new Set((values || []).filter(function (v) {
            return v !== null && v !== undefined && v !== "";
        })));
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function num(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function normalize(value) {
        return String(value == null ? "" : value)
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
        let h = 2166136261;
        const str = String(value);

        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return h >>> 0;
    }

    function seededRandom(seed) {
        let state = hashString(seed) || 1;

        return function () {
            state += 0x6D2B79F5;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function pick(list, seed) {
        if (!list || !list.length) return null;
        return list[hashString(seed) % list.length];
    }

    function mixColors(colorA, colorB) {
        function parseColor(value) {
            if (typeof value !== "string") return null;
            let m = value.match(/^#([0-9a-f]{6})$/i);

            if (m) {
                const n = parseInt(m[1], 16);
                return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
            }

            m = value.match(/^#([0-9a-f]{3})$/i);

            if (m) {
                return m[1].split("").map(function (c) {
                    return parseInt(c + c, 16);
                });
            }

            return null;
        }

        const a = parseColor(colorA) || [120, 200, 120];
        const b = parseColor(colorB) || [90, 184, 206];

        return "#" + a.map(function (channel, i) {
            return Math.round((channel + b[i]) / 2)
                .toString(16).padStart(2, "0");
        }).join("");
    }

    function safeStorageGet() {
        try {
            const value = window.localStorage.getItem(STORAGE_KEY);
            return value ? JSON.parse(value) : {};
        } catch (error) {
            console.warn("[Microorganismi] Registro persistente non leggibile.", error);
            return {};
        }
    }

    function safeStorageSet(value) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn("[Microorganismi] Impossibile salvare le scoperte.", error);
            return false;
        }
    }

    const savedDiscoveries = safeStorageGet();

    Object.keys(savedDiscoveries).forEach(function (key) {
        registry.discoveries[key] = savedDiscoveries[key];
    });

    // ============================================================
    // 78 TRATTI
    // Formato: nome, qualità, valore, tag, sapori, consistenze, colore
    // ============================================================

    const RAW_TRAITS = {
        divisione_binaria: ["Divisione binaria",2,3,["riproduzione rapida"],["neutro"],null,"#8BD18B"],
        crescita: ["Crescita rapida",1,3,["crescita rapida"],["delicato"],null,"#A5D77B"],
        sporulazione: ["Sporulazione",3,5,["formazione di spore"],["terroso"],["granuloso"],"#B69B7D"],
        dormienza: ["Dormienza",2,4,["dormienza"],["delicato"],null,"#9CA7B4"],
        rigenerazione: ["Rigenerazione",4,7,["rigenerazione"],["fresco"],null,"#61C5A1"],
        mutazione: ["Mutabilità",1,6,["mutabilità elevata"],["complesso"],null,"#BD83D5"],
        ricombinazione: ["Ricombinazione",4,8,["ricombinazione genetica"],["complesso"],null,"#5AB8CE"],
        fotosintesi: ["Fotosintesi",4,7,["fotosintesi"],["vegetale","fresco"],null,"#43B978"],
        clorofilla: ["Clorofilla",2,4,["pigmento verde"],["erbaceo"],null,"#68B85C"],
        fermentazione: ["Fermentazione",4,8,["fermentazione"],["fermentato","acidulo"],["effervescente"],"#D7A24B"],
        chemosintesi: ["Chemiosintesi",5,9,["produzione energetica chimica"],["minerale"],null,"#C59D68"],
        bioluminescenza: ["Bioluminescenza",6,14,["luminescenza simulata"],["minerale"],null,"#42E5D4"],
        termoresistenza: ["Termoresistenza",4,7,["resistenza al calore"],["tostato"],null,"#D86D36"],
        adattamento_al_freddo: ["Adattamento al freddo",3,6,["tolleranza al freddo"],["fresco"],null,"#73D8EA"],
        acidofilia: ["Acidofilia",3,5,["tolleranza all'acidità"],["acido"],null,"#D5A4E8"],
        alcalofilia: ["Alcalofilia",3,5,["tolleranza all'alcalinità"],["minerale"],null,"#8BB9A2"],
        resistenza_siccita: ["Resistenza alla siccità",3,6,["resistenza alla siccità"],["concentrato"],null,"#C9A66B"],
        resistenza_sale: ["Resistenza al sale",3,5,["tolleranza salina"],["salato","minerale"],null,"#85B7C9"],
        resistenza_tossine: ["Resistenza alle tossine",4,7,["resistenza alle tossine"],["amaro"],null,"#8D7AB6"],
        produzione_enzimi: ["Produzione di enzimi",4,8,["produzione enzimatica"],["umami"],null,"#D6B65D"],
        produzione_vitamine: ["Produzione di vitamine",5,10,["produzione vitaminica simulata"],["vegetale","dolce"],null,"#E6C85C"],
        biodegradazione: ["Biodegradazione",3,6,["decomposizione organica"],["terroso"],null,"#9B875E"],
        motilita: ["Motilità",2,5,["mobilità"],["fresco"],null,"#55B9C8"],
        biofilm: ["Biofilm",3,6,["formazione di biofilm"],["cremoso"],["viscoso"],"#8BBCA6"],
        ife: ["Ife",2,4,["struttura ifale"],["terroso"],["filamentoso"],"#B39AD0"],
        capsula_protettiva: ["Capsula protettiva",4,7,["capsula protettiva"],["neutro"],["gelatinoso"],"#9CC7D7"],
        pigmentazione: ["Pigmentazione",2,5,["pigmentazione speciale"],["vegetale"],null,"#D88FB3"],
        simbiosi: ["Simbiosi",5,10,["simbiosi"],["armonico"],null,"#8BCB9B"],
        parassitismo: ["Parassitismo",1,5,["parassitismo simulato"],["amaro"],null,"#8C719B"],
        predazione: ["Predazione microbica",2,7,["predazione simulata"],["intenso"],null,"#BA7777"],
        produzione_tossine: ["Produzione di tossine",-2,4,["produzione di tossine simulata"],["amaro"],null,"#80699B"],
        riparazione_dna: ["Riparazione del DNA",6,11,["riparazione genetica"],["neutro"],null,"#83A5D4"],
        resistenza_antibiotici: ["Resistenza agli antibiotici",1,5,["resistenza simulata"],["amaro"],null,"#918A72"],
        produzione_proteine: ["Produzione proteica",3,7,["sintesi proteica"],["umami"],null,"#B6A76D"],
        assorbimento_minerali: ["Assorbimento minerale",3,6,["assorbimento minerale"],["minerale"],null,"#9EB4B9"],
        accumulo_energia: ["Accumulo energetico",4,8,["riserva energetica"],["dolce"],null,"#E0B75B"],
        tolleranza_osmotica: ["Tolleranza osmotica",3,6,["tolleranza osmotica"],["salato"],null,"#8FB9C5"],
        chemotassi: ["Chemotassi",2,5,["chemotassi simulata"],["fresco"],null,"#5DB9AE"],
        sporulazione_resistente: ["Spore resistenti",5,9,["spore resistenti"],["terroso"],["granuloso"],"#A88B64"],
        produzione_acidi: ["Produzione di acidi",2,5,["metaboliti acidi"],["acido"],null,"#D8A0D1"],
        produzione_alcoli: ["Produzione di alcoli",3,6,["metaboliti alcolici simulati"],["fruttato","fermentato"],null,"#D8B45C"],
        aroma_fruttato: ["Aroma fruttato",3,7,["profilo aromatico fruttato"],["fruttato"],null,"#D77C9D"],
        aroma_floreale: ["Aroma floreale",3,7,["profilo aromatico floreale"],["floreale"],null,"#D6A4D8"],
        aroma_tostato: ["Aroma tostato",2,5,["profilo aromatico tostato"],["tostato"],null,"#A77B59"],
        umami: ["Profilo umami",4,8,["profilo umami"],["umami","sapido"],null,"#B98C62"],
        dolcezza: ["Profilo dolce",2,5,["profilo dolce"],["dolce"],null,"#E5C56D"],
        acidita: ["Profilo acidulo",2,5,["profilo acidulo"],["acido","acidulo"],null,"#D6D36A"],
        amarezza: ["Profilo amaro",1,3,["profilo amaro"],["amaro"],null,"#8F805C"],
        sapidita: ["Profilo sapido",2,5,["profilo sapido"],["salato","sapido"],null,"#8FAEBB"],
        cremosita: ["Consistenza cremosa",3,6,["consistenza cremosa"],["cremoso"],["cremoso"],"#E1D2A4"],
        viscosita: ["Consistenza viscosa",2,5,["consistenza viscosa"],["neutro"],["viscoso"],"#9DB9A4"],
        croccantezza: ["Consistenza granulosa",1,3,["consistenza granulosa"],["tostato"],["granuloso"],"#C4A47A"],
        adattamento: ["Adattamento ambientale",4,8,["adattabilità"],["complesso"],null,"#7CA6C8"],
        stabilita_genetica: ["Stabilità genetica",6,12,["stabilità genetica"],["pulito"],null,"#80B6C8"],
        metabolismo_estremo: ["Metabolismo estremo",5,10,["metabolismo estremo"],["minerale"],null,"#D18A5E"],
        assorbimento_nutrienti: ["Assorbimento nutrienti",3,6,["assorbimento nutrienti"],["vegetale"],null,"#9CCB78"],
        divisione_lenta: ["Divisione lenta",1,3,["crescita lenta"],["concentrato"],null,"#9BA9A5"],
        resistenza_radiazioni: ["Resistenza alle radiazioni",5,10,["resistenza simulata alle radiazioni"],["minerale"],null,"#B58DCB"],
        aggregazione: ["Aggregazione cellulare",2,5,["aggregazione"],["cremoso"],["aggregato"],"#9FC4B0"],
        secrezione_polimeri: ["Secrezione di polimeri",3,7,["secrezione di polimeri"],["neutro"],["gelatinoso"],"#85B6B5"],
        profilo_neutro: ["Profilo neutro",1,2,["profilo neutro"],["neutro"],null,"#B9B9B0"],
        rigenerazione_avanzata: ["Rigenerazione avanzata",5,9,["rigenerazione avanzata"],["fresco","pulito"],null,"#50C7A5"],
        efficienza_metabolica: ["Efficienza metabolica",4,8,["efficienza metabolica"],["pulito"],null,"#C4C96C"],
        resistenza_pressione: ["Resistenza alla pressione",4,7,["tolleranza alla pressione"],["minerale"],null,"#7196B7"],
        resistenza_uv: ["Resistenza UV",4,8,["resistenza UV simulata"],["minerale"],null,"#A78AD1"],
        crioprotezione: ["Crioprotezione",4,8,["protezione dal congelamento"],["fresco"],null,"#80D5ED"],
        termoregolazione: ["Adattamento termico",4,8,["adattamento termico"],["neutro"],null,"#D98B56"],
        produzione_lipidi: ["Produzione di lipidi",3,7,["produzione lipidica"],["untuoso"],null,"#B6BC69"],
        produzione_pigmenti: ["Produzione di pigmenti",3,7,["produzione di pigmenti"],["vegetale"],null,"#D78CA5"],
        quorum_sensing: ["Comunicazione cellulare",4,8,["comunicazione cellulare simulata"],["armonico"],null,"#6DB8C1"],
        simbiosi_avanzata: ["Simbiosi avanzata",5,10,["simbiosi avanzata"],["armonico","complesso"],null,"#7AC99C"],
        filtrazione: ["Filtrazione ambientale",3,6,["filtrazione simulata"],["pulito"],null,"#9DC6B0"],
        accumulo_risorse: ["Accumulo di risorse",3,7,["accumulo di risorse"],["concentrato"],null,"#C9A65B"],
        fermentazione_lenta: ["Fermentazione lenta",3,7,["fermentazione lenta"],["fermentato","complesso"],null,"#C99B5D"],
        profilo_balsamico: ["Profilo balsamico",3,7,["profilo balsamico"],["balsamico","fresco"],null,"#7AAE85"],
        aroma_legnoso: ["Aroma legnoso",2,5,["profilo aromatico legnoso"],["legnoso"],null,"#997456"],
        aroma_speziato: ["Aroma speziato",3,6,["profilo aromatico speziato"],["speziato"],null,"#C27E53"],
        equilibrio_metabolico: ["Equilibrio metabolico",4,8,["equilibrio metabolico"],["armonico","pulito"],null,"#8ABDA0"],
        membrana_rinforzata: ["Membrana rinforzata",4,8,["membrana rinforzata"],["neutro"],null,"#83A6C4"]
    };

    Object.keys(RAW_TRAITS).forEach(function (id) {
        const t = RAW_TRAITS[id];

        registry.traits[id] = {
            id: id,
            name: t[0],
            quality: t[1],
            value: t[2],
            tags: t[3] || [],
            flavors: t[4] || [],
            textures: t[5] || [],
            color: t[6] || "#9CC7D7"
        };
    });

    // ============================================================
    // SEI SPECIE
    // ============================================================

    const SPECIES = {
        bacterium: {
            name: "Batterio", category: "microbe",
            color: "#78C878", cellType: "procariote", base: 55,
            traits: ["divisione_binaria", "crescita", "motilita", "capsula_protettiva"]
        },
        yeast: {
            name: "Lievito", category: "fungus",
            color: "#E7C56D", cellType: "eucariote", base: 62,
            traits: ["fermentazione", "produzione_alcoli", "produzione_enzimi", "crescita"]
        },
        mold: {
            name: "Muffa", category: "fungus",
            color: "#A88BD0", cellType: "eucariote", base: 58,
            traits: ["ife", "sporulazione", "biodegradazione", "adattamento"]
        },
        archaea: {
            name: "Archeo", category: "microbe",
            color: "#E28D60", cellType: "procariote", base: 72,
            traits: ["metabolismo_estremo", "termoresistenza", "adattamento", "stabilita_genetica"]
        },
        microalgae: {
            name: "Microalga", category: "algae",
            color: "#4DBA91", cellType: "eucariote", base: 65,
            traits: ["fotosintesi", "clorofilla", "produzione_pigmenti", "assorbimento_nutrienti"]
        },
        hybrid: {
            name: "Ibrido", category: "double_helix",
            color: "#5AB8CE", cellType: "misto", base: 80,
            traits: ["ricombinazione", "mutazione", "simbiosi", "equilibrio_metabolico"]
        }
    };

    Object.keys(SPECIES).forEach(function (id) {
        registry.species[id] = SPECIES[id];
    });

    // ============================================================
    // REGOLE DEGLI INGREDIENTI
    // ============================================================

    const INGREDIENT_RULES = [
        { re: /\b(apple|mela|fruit|frutta|berry|berries|banana|pear|pera|grape|uva)\b/,
          traits: ["aroma_fruttato","produzione_vitamine","assorbimento_nutrienti"],
          flavors: ["fruttato","dolce"], quality: 3 },
        { re: /\b(honey|miele|sugar|zucchero|syrup|sciroppo)\b/,
          traits: ["dolcezza","accumulo_energia","fermentazione"],
          flavors: ["dolce"], quality: 3 },
        { re: /\b(water|acqua|ice|ghiaccio)\b/,
          traits: ["adattamento_al_freddo","crioprotezione","profilo_neutro"],
          flavors: ["fresco"], quality: 2 },
        { re: /\b(salt|sale|brine|salamoia|salty|salato)\b/,
          traits: ["resistenza_sale","tolleranza_osmotica","sapidita"],
          flavors: ["salato","minerale"], quality: 2 },
        { re: /\b(lemon|limone|lime|vinegar|aceto|acid|acido)\b/,
          traits: ["acidofilia","produzione_acidi","acidita"],
          flavors: ["acido","acidulo"], quality: 3 },
        { re: /\b(vegetable|verdura|verdure|spinach|spinaci|lettuce|lattuga|cabbage|cavolo)\b/,
          traits: ["fotosintesi","clorofilla","assorbimento_nutrienti"],
          flavors: ["vegetale","erbaceo"], quality: 3 },
        { re: /\b(mushroom|fungus|fungi|fungo|funghi|yeast|lievito|mold|muffa)\b/,
          traits: ["ife","sporulazione","biodegradazione","fermentazione"],
          flavors: ["terroso","fermentato"], quality: 4 },
        { re: /\b(meat|carne|beef|manzo|chicken|pollo|fish|pesce|egg|uovo|eggs|uova)\b/,
          traits: ["produzione_proteine","umami","produzione_enzimi"],
          flavors: ["umami","sapido"], quality: 3 },
        { re: /\b(milk|latte|cream|panna|cheese|formaggio|yogurt)\b/,
          traits: ["cremosita","fermentazione","produzione_enzimi"],
          flavors: ["cremoso","fermentato"], quality: 3 },
        { re: /\b(coffee|caffe|tea|cocoa|cacao|chocolate|cioccolato)\b/,
          traits: ["aroma_tostato","amarezza","metabolismo_estremo"],
          flavors: ["tostato","amaro"], quality: 3 },
        { re: /\b(wood|legno|bark|corteccia|oak|quercia)\b/,
          traits: ["aroma_legnoso","biodegradazione","sporulazione"],
          flavors: ["legnoso","terroso"], quality: 3 },
        { re: /\b(chili|pepper|pepe|spice|spezie|ginger|zenzero)\b/,
          traits: ["aroma_speziato","termoresistenza","produzione_enzimi"],
          flavors: ["speziato","intenso"], quality: 3 },
        { re: /\b(oil|olio|fat|grasso|butter|burro)\b/,
          traits: ["produzione_lipidi","accumulo_energia","membrana_rinforzata"],
          flavors: ["untuoso","cremoso"], quality: 3 },
        { re: /\b(stone|rock|pietra|mineral|minerale|metal|metallo|iron|ferro|crystal|cristallo)\b/,
          traits: ["assorbimento_minerali","chemosintesi","resistenza_pressione"],
          flavors: ["minerale"], quality: 3 },
        { re: /\b(bread|pane|dough|impasto|flour|farina|grain|cereale|rice|riso)\b/,
          traits: ["fermentazione","produzione_alcoli","accumulo_risorse"],
          flavors: ["fermentato","concentrato"], quality: 3 },
        { re: /\b(air|aria|oxygen|ossigeno|gas)\b/,
          traits: ["metabolismo_estremo","efficienza_metabolica","motilita"],
          flavors: ["neutro"], quality: 2 }
    ];

    // ============================================================
    // TRATTAMENTI RICONOSCIBILI DAL NOME/ID/DATI
    // ============================================================

    const TREATMENTS = [
        { id: "salsa", re: /\b(sauce|salsa|ketchup|mustard|senape|mayonnaise|maionese)\b/,
          traits: ["fermentazione","produzione_enzimi","equilibrio_metabolico"],
          flavors: ["complesso","sapido"], quality: 4, value: 6 },
        { id: "innesto", re: /\b(graft|grafted|innesto|innestato|innestata|grafting)\b/,
          traits: ["ricombinazione","simbiosi_avanzata","mutazione"],
          flavors: ["armonico","complesso"], quality: 5, value: 9 },
        { id: "affumicato", re: /\b(smoked|smoke|smoky|affumicato|affumicata|affumicatura)\b/,
          traits: ["termoresistenza","aroma_tostato","stabilita_genetica"],
          flavors: ["tostato","legnoso"], quality: 4, value: 7 },
        { id: "caramellato", re: /\b(caramelized|caramelised|caramel|caramellato|caramellata|caramellatura)\b/,
          traits: ["dolcezza","aroma_tostato","accumulo_energia"],
          flavors: ["dolce","tostato"], quality: 4, value: 7 },
        { id: "plus", re: /\b(plus|premium|enhanced|advanced|potenziato|potenziata|migliorato|migliorata)\b/,
          traits: ["rigenerazione_avanzata","efficienza_metabolica","stabilita_genetica"],
          flavors: ["pulito","complesso"], quality: 5, value: 10 },
        { id: "mod", re: /\b(mod|modded|modified|modificato|modificata|custom)\b/,
          traits: ["mutazione","adattamento","ricombinazione"],
          flavors: ["complesso"], quality: 3, value: 6 }
    ];

    // ============================================================
    // RICETTE SPECIALI
    // Le coppie sono non direzionali: A+B equivale a B+A.
    // ============================================================

    const SPECIAL_RECIPES = [
        {
            id: "frutto_dorato",
            ingredients: ["apple", "honey"],
            name: "Fermento del Frutto Dorato",
            species: "yeast",
            rarity: "rara",
            bonusTraits: ["aroma_fruttato","dolcezza","produzione_vitamine","bioluminescenza"],
            bonusFlavors: ["fruttato","dolce","luminoso"],
            bonusValue: 35,
            bonusQuality: 2,
            color: "#E8B94F"
        },
        {
            id: "cristallo_vivente",
            ingredients: ["water", "crystal"],
            name: "Cristallo Vivente",
            species: "archaea",
            rarity: "rara",
            bonusTraits: ["assorbimento_minerali","resistenza_pressione","stabilita_genetica","bioluminescenza"],
            bonusFlavors: ["minerale","pulito"],
            bonusValue: 45,
            bonusQuality: 2,
            color: "#62D8E5"
        },
        {
            id: "colonia_luminosa",
            ingredients: ["yeast", "sugar"],
            name: "Colonia Luminosa",
            species: "yeast",
            rarity: "rara",
            bonusTraits: ["fermentazione","produzione_alcoli","bioluminescenza","accumulo_energia"],
            bonusFlavors: ["fermentato","dolce"],
            bonusValue: 40,
            bonusQuality: 2,
            color: "#F3D96B"
        },
        {
            id: "spora_del_bosco",
            ingredients: ["mushroom", "wood"],
            name: "Spora del Bosco Antico",
            species: "mold",
            rarity: "rara",
            bonusTraits: ["ife","sporulazione_resistente","biodegradazione","simbiosi_avanzata"],
            bonusFlavors: ["terroso","legnoso"],
            bonusValue: 38,
            bonusQuality: 2,
            color: "#9C7B61"
        },
        {
            id: "alga_solare",
            ingredients: ["water", "sunlight"],
            name: "Microalga Solare",
            species: "microalgae",
            rarity: "rara",
            bonusTraits: ["fotosintesi","clorofilla","produzione_pigmenti","rigenerazione_avanzata"],
            bonusFlavors: ["vegetale","fresco"],
            bonusValue: 40,
            bonusQuality: 2,
            color: "#45D69B"
        },
        {
            id: "ibrido_primordiale",
            ingredients: ["bacterium", "yeast"],
            name: "Ibrido Primordiale",
            species: "hybrid",
            rarity: "leggendaria",
            bonusTraits: ["ricombinazione","mutazione","simbiosi_avanzata","riparazione_dna","bioluminescenza"],
            bonusFlavors: ["armonico","complesso"],
            bonusValue: 100,
            bonusQuality: 4,
            color: "#8C78F2"
        },
        {
            id: "sale_estremo",
            ingredients: ["water", "salt"],
            name: "Archeo dell'Abisso Salino",
            species: "archaea",
            rarity: "rara",
            bonusTraits: ["resistenza_sale","tolleranza_osmotica","metabolismo_estremo","membrana_rinforzata"],
            bonusFlavors: ["salato","minerale"],
            bonusValue: 42,
            bonusQuality: 2,
            color: "#75B9D5"
        },
        {
            id: "latte_fermentato",
            ingredients: ["milk", "yeast"],
            name: "Colonia Cremosa",
            species: "yeast",
            rarity: "rara",
            bonusTraits: ["cremosita","fermentazione_lenta","produzione_enzimi","equilibrio_metabolico"],
            bonusFlavors: ["cremoso","fermentato"],
            bonusValue: 36,
            bonusQuality: 2,
            color: "#E8D6A3"
        },
        {
            id: "fuoco_dolce",
            ingredients: ["sugar", "chili"],
            name: "Ceppo Pirolitico Dolce",
            species: "bacterium",
            rarity: "rara",
            bonusTraits: ["termoresistenza","aroma_speziato","dolcezza","efficienza_metabolica"],
            bonusFlavors: ["dolce","speziato"],
            bonusValue: 44,
            bonusQuality: 2,
            color: "#E98649"
        },
        {
            id: "ombra_affumicata",
            ingredients: ["smoked", "mushroom"],
            name: "Spora d'Ombra Affumicata",
            species: "mold",
            rarity: "leggendaria",
            bonusTraits: ["aroma_tostato","sporulazione_resistente","stabilita_genetica","resistenza_tossine"],
            bonusFlavors: ["tostato","terroso"],
            bonusValue: 85,
            bonusQuality: 3,
            color: "#77658F"
        }
    ];

    function canonicalIngredientId(id) {
        return normalize(id).replace(/\s+/g, "_");
    }

    function recipeKey(a, b) {
        return [canonicalIngredientId(a), canonicalIngredientId(b)]
            .sort()
            .join("+");
    }

    const RECIPE_MAP = {};

    SPECIAL_RECIPES.forEach(function (recipe) {
        RECIPE_MAP[recipeKey(recipe.ingredients[0], recipe.ingredients[1])] = recipe;
    });

    // ============================================================
    // LETTURA ROBUSTA DEGLI ID E DEGLI OGGETTI
    // ============================================================

    function getIngredientId(item) {
        if (typeof item === "string" || typeof item === "number") {
            return String(item);
        }

        if (!item || typeof item !== "object") return null;

        const directKeys = [
            "id", "ingredientId", "ingredient_id", "key",
            "uid", "identifier", "ingredientID"
        ];

        for (const key of directKeys) {
            const value = item[key];

            if (typeof value === "string" || typeof value === "number") {
                return String(value);
            }
        }

        const nestedKeys = [
            "ingredient", "element", "food", "placed",
            "item", "data", "definition"
        ];

        for (const key of nestedKeys) {
            const nested = item[key];

            if (nested && nested !== item && typeof nested === "object") {
                const found = getIngredientId(nested);
                if (found) return found;
            }

            if (typeof nested === "string" || typeof nested === "number") {
                return String(nested);
            }
        }

        // Non usare "type" come ID: spesso descrive solo una categoria.
        return null;
    }

    function findStoreIngredient(store, id) {
        if (!store) return null;

        if (Array.isArray(store)) {
            return store.find(function (item) {
                return getIngredientId(item) === id ||
                    (item && item.name === id);
            }) || null;
        }

        if (typeof store === "object") {
            if (Object.prototype.hasOwnProperty.call(store, id)) {
                return store[id];
            }

            const keys = Object.keys(store);

            for (const key of keys) {
                const item = store[key];

                if (key === id || getIngredientId(item) === id) {
                    return item;
                }
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
            const found = findStoreIngredient(store, wanted);
            if (found) return found;
        }

        // Ingredienti creati dalla mod.
        if (registry.microorganisms[wanted]) {
            return registry.microorganisms[wanted];
        }

        if (registry.eggs[wanted]) {
            return registry.eggs[wanted];
        }

        // L'ID resta utilizzabile anche se l'archivio interno non è pubblico.
        return {
            id: wanted,
            name: wanted,
            unresolved: true
        };
    }

    function describeIngredient(item, fallbackId) {
        const fields = [
            "id", "ingredientId", "ingredient_id", "key", "uid",
            "identifier", "name", "label", "displayName", "title",
            "type", "treatment", "treatments", "process", "state",
            "tags", "description", "category", "shape", "flavors",
            "textures", "species", "microorganismId"
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
                        // Proprietà ignorata se non serializzabile.
                    }
                }
            });
        }

        return parts.join(" ");
    }

    function getIngredientColor(item) {
        if (!item || typeof item !== "object") return null;
        return item.color || item.backgroundColor || item.hex || null;
    }

    function findTreatments(description) {
        const normalized = normalize(description);

        return TREATMENTS.filter(function (treatment) {
            return treatment.re.test(normalized);
        });
    }

    function analyzeIngredient(id, item) {
        const description = describeIngredient(item, id);
        const normalized = normalize(description);
        const traits = [];
        const flavors = [];
        const textures = [];
        const treatments = [];
        let quality = 0;
        let value = 0;

        INGREDIENT_RULES.forEach(function (rule) {
            if (rule.re.test(normalized)) {
                traits.push(...rule.traits);
                flavors.push(...rule.flavors);
                quality += rule.quality;
            }
        });

        findTreatments(description).forEach(function (treatment) {
            treatments.push(treatment.id);
            traits.push(...treatment.traits);
            flavors.push(...treatment.flavors);
            quality += treatment.quality;
            value += treatment.value;
        });

        if (item && typeof item === "object") {
            const tags = Array.isArray(item.tags) ? item.tags : [];
            const explicitFlavors = Array.isArray(item.flavors) ? item.flavors : [];
            const explicitTextures = Array.isArray(item.textures) ? item.textures : [];

            tags.forEach(function (tag) {
                const tagNormalized = normalize(tag);

                Object.keys(registry.traits).forEach(function (traitId) {
                    const trait = registry.traits[traitId];

                    if (normalize(trait.name) === tagNormalized ||
                        traitId === slug(tag)) {
                        traits.push(traitId);
                    }
                });
            });

            flavors.push(...explicitFlavors);
            textures.push(...explicitTextures);
            quality += num(item.quality, 0);
            value += num(item.value, 0);
        }

        // Ereditarietà dei tratti da un microrganismo creato dalla mod.
        const parentId = item && item.microorganismId;
        const parent = parentId && registry.microorganisms[parentId];

        if (parent && Array.isArray(parent.traits)) {
            traits.push(...parent.traits);
            flavors.push(...(parent.flavors || []));
            textures.push(...(parent.textures || []));
        }

        if (item && item.id && registry.microorganisms[item.id]) {
            const ownParent = registry.microorganisms[item.id];
            traits.push(...(ownParent.traits || []));
            flavors.push(...(ownParent.flavors || []));
            textures.push(...(ownParent.textures || []));
        }

        return {
            id: String(id),
            description: description,
            traits: unique(traits.filter(function (traitId) {
                return Boolean(registry.traits[traitId]);
            })),
            flavors: unique(flavors),
            textures: unique(textures),
            treatments: unique(treatments),
            quality: quality,
            value: value,
            color: getIngredientColor(item),
            resolved: !(item && item.unresolved)
        };
    }

    // ============================================================
    // MUTAZIONI MOLTO RARE
    // ============================================================

    const MUTATION_CHANCE = 0.005; // 0,5% per combinazione non speciale.

    const MUTATIONS = [
        {
            id: "luminescenza_primordiale",
            name: "Luminescenza Primordiale",
            traits: ["bioluminescenza","produzione_pigmenti","stabilita_genetica"],
            value: 100,
            quality: 3,
            color: "#42E5D4"
        },
        {
            id: "genoma_perfetto",
            name: "Genoma Perfetto",
            traits: ["riparazione_dna","stabilita_genetica","ricombinazione"],
            value: 120,
            quality: 4,
            color: "#8AB8FF"
        },
        {
            id: "metabolismo_abisso",
            name: "Metabolismo dell'Abisso",
            traits: ["metabolismo_estremo","chemosintesi","resistenza_pressione"],
            value: 110,
            quality: 4,
            color: "#8C78F2"
        },
        {
            id: "rigenerazione_eterea",
            name: "Rigenerazione Eterea",
            traits: ["rigenerazione_avanzata","rigenerazione","efficienza_metabolica"],
            value: 115,
            quality: 4,
            color: "#50E0AD"
        }
    ];

    // ============================================================
    // SCELTA DELLA SPECIE
    // Una ricetta speciale determina la specie; altrimenti la specie
    // viene scelta in modo ripetibile usando gli ID dei genitori.
    // ============================================================

    function chooseSpecies(recipe, firstId, secondId) {
        if (recipe && SPECIES[recipe.species]) {
            return recipe.species;
        }

        const ids = Object.keys(SPECIES);
        return pick(ids, firstId + "|" + secondId + "|species");
    }

    function chooseTraits(firstAnalysis, secondAnalysis, speciesId, seed, recipe, mutation) {
        const species = SPECIES[speciesId];

        let traitIds = unique([
            ...species.traits,
            ...firstAnalysis.traits,
            ...secondAnalysis.traits
        ]);

        // Ricette: i tratti bonus esclusivi hanno priorità.
        if (recipe) {
            traitIds = unique([
                ...recipe.bonusTraits,
                ...traitIds
            ]);
        }

        // Mutazioni: bonus esclusivi prioritari.
        if (mutation) {
            traitIds = unique([
                ...mutation.traits,
                ...traitIds
            ]);
        }

        traitIds = traitIds.filter(function (id) {
            return Boolean(registry.traits[id]);
        });

        const rng = seededRandom(seed);
        const exclusive = unique([
            ...(recipe ? recipe.bonusTraits : []),
            ...(mutation ? mutation.traits : [])
        ]);

        const ordinary = traitIds.filter(function (id) {
            return !exclusive.includes(id);
        });

        // Conserva tutti i tratti esclusivi e un campione ereditato
        // per evitare di perdere ogni volta i tratti dei genitori.
        const inheritedAndSpecies = ordinary.slice().sort(function () {
            return rng() - 0.5;
        }).slice(0, 10);

        return unique([...exclusive, ...inheritedAndSpecies]);
    }

    // ============================================================
    // REGISTRO DELLE SCOPERTE
    // ============================================================

    function registerDiscovery(key, data) {
        const isNew = !registry.discoveries[key];

        if (isNew) {
            registry.discoveries[key] = Object.assign({
                key: key,
                discoveredAt: Date.now()
            }, data || {});

            safeStorageSet(registry.discoveries);
        }

        return isNew;
    }

    // ============================================================
    // CREAZIONE DEL MICRORGANISMO
    // ============================================================

    function createMicroorganismFromClick(placed) {
        const firstId = getIngredientId(placed);

        if (!firstId) {
            console.error(
                "[Microorganismi] Impossibile leggere l'ID dell'ingrediente cliccato:",
                placed
            );

            window.alert(
                "Non riesco a leggere l'ID del primo ingrediente. " +
                "Apri la console del browser per vedere l'oggetto ricevuto."
            );
            return;
        }

        // Unica richiesta relativa agli ingredienti: ID del secondo.
        const secondInput = window.prompt("Inserisci l'ID del secondo ingrediente:");

        if (secondInput === null) return;

        const secondId = secondInput.trim();

        if (!secondId) {
            window.alert("L'ID del secondo ingrediente non può essere vuoto.");
            return;
        }

        const secondIngredient = resolveIngredient(secondId);
        const firstAnalysis = analyzeIngredient(firstId, placed);
        const secondAnalysis = analyzeIngredient(secondId, secondIngredient);

        const key = recipeKey(firstId, secondId);
        const recipe = RECIPE_MAP[key] || null;

        // Il seed rende la generazione ripetibile per gli stessi ingredienti.
        const seed = key + "|" + VERSION;

        // Le mutazioni rare vengono tirate una sola volta per creazione.
        // Le ricette speciali non vengono sostituite dalla mutazione.
        let mutation = null;

        if (!recipe) {
            const rng = seededRandom(seed + "|" + Date.now() + "|" +
                Math.random().toString(36).slice(2));

            if (rng() < MUTATION_CHANCE) {
                mutation = pick(MUTATIONS, seed + "|" + Date.now());
            }
        }

        const speciesId = chooseSpecies(recipe, firstId, secondId);
        const species = SPECIES[speciesId];

        let name;

        if (recipe) {
            name = recipe.name;
        } else if (mutation) {
            name = mutation.name;
        } else {
            name = species.name + " " +
                firstId.replace(/[_-]+/g, " ") + " × " +
                secondId.replace(/[_-]+/g, " ");
        }

        // Se una ricetta è già stata scoperta, il risultato mantiene
        // lo stesso nome e gli stessi bonus.
        const traitIds = chooseTraits(
            firstAnalysis,
            secondAnalysis,
            speciesId,
            seed,
            recipe,
            mutation
        );

        const traits = traitIds.map(function (id) {
            return registry.traits[id];
        }).filter(Boolean);

        const flavors = unique([
            ...firstAnalysis.flavors,
            ...secondAnalysis.flavors,
            ...traits.flatMap(function (t) { return t.flavors || []; }),
            ...(recipe ? recipe.bonusFlavors : []),
            ...(mutation ? ["mutazione", "complesso"] : [])
        ]);

        const textures = unique([
            ...firstAnalysis.textures,
            ...secondAnalysis.textures,
            ...traits.flatMap(function (t) { return t.textures || []; })
        ]);

        const traitQuality = traits.reduce(function (sum, trait) {
            return sum + num(trait.quality, 0);
        }, 0);

        const traitValue = traits.reduce(function (sum, trait) {
            return sum + num(trait.value, 0);
        }, 0);

        let quality = clamp(Math.round(
            species.base / 10 +
            traitQuality / Math.max(1, traits.length) +
            (firstAnalysis.quality + secondAnalysis.quality) / 4 +
            (recipe ? recipe.bonusQuality : 0) +
            (mutation ? mutation.quality : 0)
        ), 1, 10);

        let value = Math.max(1, Math.round(
            species.base +
            traitValue +
            firstAnalysis.value +
            secondAnalysis.value +
            (recipe ? recipe.bonusValue : 0) +
            (mutation ? mutation.value : 0)
        ));

        let color = mixColors(
            firstAnalysis.color || species.color,
            secondAnalysis.color || species.color
        );

        if (recipe && recipe.color) color = recipe.color;
        if (mutation && mutation.color) color = mutation.color;

        const specialId = recipe ? recipe.id : (mutation ? mutation.id : "standard");
        const microorganismId = "microorganism_" +
            slug(name) + "_" +
            hashString(firstId + "|" + secondId + "|" + specialId).toString(16);

        const eggId = microorganismId + "_egg";

        const treatments = unique([
            ...firstAnalysis.treatments,
            ...secondAnalysis.treatments
        ]);

        const microorganism = {
            id: microorganismId,
            name: name,
            type: species.category,
            species: speciesId,
            speciesName: species.name,
            cellType: species.cellType,
            color: color,
            quality: quality,
            value: value,
            traits: traitIds,
            traitNames: traits.map(function (t) { return t.name; }),
            flavors: flavors,
            textures: textures,
            ingredients: [firstId, secondId],
            treatments: treatments,
            recipeId: recipe ? recipe.id : null,
            mutationId: mutation ? mutation.id : null,
            rarity: recipe ? recipe.rarity : (mutation ? "mutazione estremamente rara" : "comune"),
            parentMicroorganisms: unique([
                placed && placed.microorganismId,
                secondIngredient && secondIngredient.microorganismId,
                registry.microorganisms[firstId] ? firstId : null,
                registry.microorganisms[secondId] ? secondId : null
            ]),
            createdAt: Date.now(),
            version: VERSION
        };

        const egg = {
            id: eggId,
            name: "Uovo di " + name,
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

        // Memorizza prima i dati: consente l'ereditarietà nelle generazioni future.
        registry.microorganisms[microorganismId] = microorganism;
        registry.eggs[eggId] = egg;

        // Registra le scoperte speciali in modo persistente.
        let discoveryMessage = "";

        if (recipe) {
            const newDiscovery = registerDiscovery("recipe:" + recipe.id, {
                type: "recipe",
                id: recipe.id,
                name: recipe.name,
                ingredients: recipe.ingredients
            });

            discoveryMessage = newDiscovery
                ? "\nNUOVA RICETTA SCOPERTA!"
                : "\nRicetta già scoperta.";
        } else if (mutation) {
            const newDiscovery = registerDiscovery("mutation:" + mutation.id, {
                type: "mutation",
                id: mutation.id,
                name: mutation.name
            });

            discoveryMessage = newDiscovery
                ? "\nNUOVA MUTAZIONE SCOPERTA!"
                : "\nMutazione già registrata.";
        }

        // Registra il microrganismo.
        try {
            window.addIngredient(microorganismId, {
                name: name,
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
                description: species.name + " generato da " +
                    firstId + " e " + secondId
            });
        } catch (error) {
            console.error("[Microorganismi] Errore registrando il microrganismo:", error);
            window.alert(
                "Il microrganismo è stato calcolato, ma addIngredient ha restituito un errore. " +
                "Controlla la console del browser."
            );
            return;
        }

        // Registra l'uovo.
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
                description: "Uovo di " + name
            });
        } catch (error) {
            console.warn("[Microorganismi] Impossibile registrare l'uovo:", error);
        }

        // Ricetta di collegamento, se supportata.
        if (typeof window.addRecipe === "function") {
            try {
                window.addRecipe(eggId + "+" + microorganismId, eggId);
            } catch (error) {
                console.warn("[Microorganismi] Ricetta dell'uovo non registrata:", error);
            }
        }

        try {
            window.dispatchEvent(new CustomEvent("microorganismCreated", {
                detail: { microorganism: microorganism, egg: egg }
            }));
        } catch (_) {
            // Evento opzionale.
        }

        const rarityLabel = recipe
            ? recipe.rarity
            : mutation
                ? "mutazione estremamente rara"
                : "comune";

        window.alert(
            (recipe ? "RICETTA SPECIALE!\n" :
                mutation ? "MUTAZIONE ESTREMAMENTE RARA!\n" :
                    "Microrganismo creato!\n") +
            "\nNome: " + name +
            "\nSpecie: " + species.name +
            "\nRarità: " + rarityLabel +
            "\nID: " + microorganismId +
            "\nUovo: " + eggId +
            "\nTratti: " + traits.length +
            "\nQualità: " + quality + "/10" +
            "\nValore: " + value +
            "\nTrattamenti riconosciuti: " +
            (treatments.length ? treatments.join(", ") : "nessuno rilevato") +
            discoveryMessage
        );

        console.info("[Microorganismi] Creato:", microorganism);
    }

    // ============================================================
    // TOOL PRINCIPALE
    // ============================================================

    window.addTool(TOOL_ID, {
        name: "Creator of Microorganisms",
        shape: "microbe",

        func: function (placed) {
            createMicroorganismFromClick(placed);
        },

        onSelect: function () {
            console.info(
                "[Creator of Microorganisms " + VERSION + "] " +
                "Clicca il primo ingrediente, poi inserisci l'ID del secondo."
            );
        },

        onDeselect: function () {
            console.info("[Creator of Microorganisms] Tool deselezionato.");
        }
    });

    // ============================================================
    // TOOL DATABASE E REGISTRO DELLE SCOPERTE
    // ============================================================

    window.addTool(DATABASE_TOOL_ID, {
        name: "Microorganism Trait Database",
        shape: "microbe",

        func: function () {
            const traitList = Object.keys(registry.traits).map(function (id) {
                const t = registry.traits[id];

                return {
                    id: id,
                    nome: t.name,
                    qualita: t.quality,
                    valore: t.value,
                    colore: t.color
                };
            });

            const discoveryList = Object.keys(registry.discoveries).map(function (key) {
                const d = registry.discoveries[key];

                return {
                    chiave: key,
                    tipo: d.type,
                    nome: d.name || d.id,
                    data: d.discoveredAt
                        ? new Date(d.discoveredAt).toLocaleString()
                        : ""
                };
            });

            console.table(traitList);
            console.table(discoveryList);

            window.alert(
                "Database caricato.\n" +
                "Tratti: " + traitList.length + "\n" +
                "Specie: " + Object.keys(registry.species).length + "\n" +
                "Ricette speciali definite: " + SPECIAL_RECIPES.length + "\n" +
                "Mutazioni rare definite: " + MUTATIONS.length + "\n" +
                "Scoperte registrate: " + discoveryList.length +
                "\n\nDettagli disponibili nella console del browser."
            );
        },

        onSelect: function () {
            console.info("[Microorganism Trait Database] Database pronto.");
        }
    });

    // ============================================================
    // ESPORTAZIONE DELLE DEFINIZIONI PER DEBUG E ALTRE MOD
    // ============================================================

    registry.version = VERSION;
    registry.recipeDefinitions = SPECIAL_RECIPES;
    registry.mutationDefinitions = MUTATIONS;

    console.info("[Creator of Microorganisms " + VERSION + "] Caricato.", {
        traits: Object.keys(registry.traits).length,
        species: Object.keys(registry.species).length,
        specialRecipes: SPECIAL_RECIPES.length,
        rareMutations: MUTATIONS.length,
        discoveries: Object.keys(registry.discoveries).length
    });
})();
