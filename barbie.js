
/*
 * BarbieWorld.js
 * Infinite Chef R74n Plus
 *
 * Versione 1.0
 * Aggiunge 30 ingredienti originali a tema Barbie.
 *
 * Dipendenza:
 * - window.addIngredient
 *
 * Caratteristiche:
 * - 30 ingredienti a tema Barbie e glamour
 * - Colori rosa, oro, lilla e pastello
 * - Descrizioni personalizzate
 * - ID univoci con prefisso barbie_
 * - Controllo dei duplicati nella sessione
 */

(function () {
    "use strict";

    const MOD_NAME = "Barbie World";
    const VERSION = "1.0";
    const STORAGE_KEY = "barbie_world_registered_v1";

    if (typeof window.addIngredient !== "function") {
        console.error(
            "[" + MOD_NAME + "] addIngredient non disponibile."
        );
        return;
    }

    // ---------------------------------------------------------
    // DATABASE DEI 30 INGREDIENTI
    // ---------------------------------------------------------

    const BARBIE_INGREDIENTS = [
        {
            id: "barbie_pink_diamond",
            name: "Diamante Rosa",
            color: "#FF69B4",
            innerColor: "#FFD6F0",
            shape: "gem",
            rarity: "Leggendario",
            quality: 10,
            value: 100,
            flavors: ["dolce", "floreale"],
            textures: ["cristallina", "scintillante"],
            description:
                "Un diamante rosa rarissimo che brilla come un gioiello da sogno."
        },
        {
            id: "barbie_glitter",
            name: "Glitter Magico",
            color: "#FFB6E6",
            innerColor: "#FFF0FA",
            shape: "powder",
            rarity: "Raro",
            quality: 8,
            value: 35,
            flavors: ["zuccherino"],
            textures: ["polverosa", "brillante"],
            description:
                "Polvere scintillante capace di trasformare ogni creazione in qualcosa di glamour."
        },
        {
            id: "barbie_lipstick",
            name: "Rossetto Glamour",
            color: "#FF1493",
            innerColor: "#FF8AC4",
            shape: "capsule",
            rarity: "Non comune",
            quality: 7,
            value: 20,
            flavors: ["vaniglia", "fruttato"],
            textures: ["cremosa", "morbida"],
            description:
                "Un rossetto rosa intenso ispirato alle passerelle più eleganti."
        },
        {
            id: "barbie_dreamhouse",
            name: "Dreamhouse",
            color: "#FF91C8",
            innerColor: "#FFF1F8",
            shape: "house",
            rarity: "Leggendario",
            quality: 10,
            value: 90,
            flavors: ["fragola", "vaniglia"],
            textures: ["morbida", "soffice"],
            description:
                "Una casa dei sogni rosa con stanze eleganti e dettagli scintillanti."
        },
        {
            id: "barbie_pink_cupcake",
            name: "Cupcake Rosa",
            color: "#FF8FCF",
            innerColor: "#FFE0F0",
            shape: "food",
            rarity: "Comune",
            quality: 6,
            value: 12,
            flavors: ["fragola", "vaniglia", "zucchero"],
            textures: ["soffice", "cremosa"],
            description:
                "Un cupcake rosa con glassa dolce e decorazioni di zucchero."
        },
        {
            id: "barbie_strawberry_milk",
            name: "Latte alla Fragola",
            color: "#FFB7D5",
            innerColor: "#FFF0F5",
            shape: "liquid",
            rarity: "Comune",
            quality: 6,
            value: 10,
            flavors: ["fragola", "latte", "dolce"],
            textures: ["liquida", "vellutata"],
            description:
                "Una bevanda rosa cremosa dal gusto dolce e fruttato."
        },
        {
            id: "barbie_dream_car",
            name: "Auto dei Sogni",
            color: "#FF4FA3",
            innerColor: "#FFD1E7",
            shape: "car",
            rarity: "Epico",
            quality: 9,
            value: 65,
            flavors: ["ciliegia"],
            textures: ["lucida", "metallica"],
            description:
                "Un'auto rosa brillante pronta per un viaggio glamour."
        },
        {
            id: "barbie_golden_crown",
            name: "Corona Dorata",
            color: "#FFD700",
            innerColor: "#FFF0A8",
            shape: "crown",
            rarity: "Leggendario",
            quality: 10,
            value: 85,
            flavors: ["miele", "vaniglia"],
            textures: ["metallica", "luminosa"],
            description:
                "Una corona dorata degna della più elegante regina delle fiabe."
        },
        {
            id: "barbie_silk_dress",
            name: "Abito di Seta",
            color: "#FF69B4",
            innerColor: "#FFD6EA",
            shape: "fabric",
            rarity: "Raro",
            quality: 8,
            value: 32,
            flavors: ["rosa"],
            textures: ["setosa", "morbida"],
            description:
                "Un abito di seta rosa dalle linee raffinate e dal tocco delicato."
        },
        {
            id: "barbie_diamond_heels",
            name: "Tacchi di Diamante",
            color: "#F7A8FF",
            innerColor: "#FFE6FF",
            shape: "shoe",
            rarity: "Epico",
            quality: 9,
            value: 55,
            flavors: ["vaniglia"],
            textures: ["cristallina", "lucida"],
            description:
                "Scarpe scintillanti decorate con cristalli rosa e lilla."
        },
        {
            id: "barbie_magic_mirror",
            name: "Specchio Incantato",
            color: "#E6B8FF",
            innerColor: "#FFF0FF",
            shape: "mirror",
            rarity: "Leggendario",
            quality: 10,
            value: 80,
            flavors: ["lavanda"],
            textures: ["liscia", "magica"],
            description:
                "Uno specchio incantato che riflette un mondo di bellezza e fantasia."
        },
        {
            id: "barbie_pink_sapphire",
            name: "Zaffiro Rosa",
            color: "#FF4FBF",
            innerColor: "#FFC9EE",
            shape: "gem",
            rarity: "Epico",
            quality: 9,
            value: 60,
            flavors: ["fruttato"],
            textures: ["cristallina", "dura"],
            description:
                "Una gemma rosa dai riflessi intensi e misteriosi."
        },
        {
            id: "barbie_perfume",
            name: "Profumo da Sogno",
            color: "#F6A6D7",
            innerColor: "#FFE5F4",
            shape: "bottle",
            rarity: "Raro",
            quality: 8,
            value: 30,
            flavors: ["rosa", "gelsomino", "vaniglia"],
            textures: ["liquida", "profumata"],
            description:
                "Una fragranza delicata con note floreali e un elegante tocco di vaniglia."
        },
        {
            id: "barbie_unicorn",
            name: "Unicorno Rosa",
            color: "#FF9DE2",
            innerColor: "#D9C2FF",
            shape: "unicorn",
            rarity: "Leggendario",
            quality: 10,
            value: 95,
            flavors: ["zucchero filato", "fragola"],
            textures: ["morbida", "magica"],
            description:
                "Una creatura fantastica con criniera rosa e poteri scintillanti."
        },
        {
            id: "barbie_rainbow",
            name: "Arcobaleno Glam",
            color: "#FF75D8",
            innerColor: "#B8F2FF",
            shape: "rainbow",
            rarity: "Epico",
            quality: 9,
            value: 58,
            flavors: ["frutta", "zucchero"],
            textures: ["luminosa", "magica"],
            description:
                "Un arcobaleno dai colori pastello che illumina ogni ambiente."
        },
        {
            id: "barbie_poodle",
            name: "Barboncino Fashion",
            color: "#FFB3D9",
            innerColor: "#FFF0F7",
            shape: "animal",
            rarity: "Non comune",
            quality: 7,
            value: 18,
            flavors: ["vaniglia"],
            textures: ["soffice", "pelosa"],
            description:
                "Un barboncino elegante con un fiocco rosa e un carattere vivace."
        },
        {
            id: "barbie_heart",
            name: "Cuore di Cristallo",
            color: "#FF3F91",
            innerColor: "#FFD2E5",
            shape: "heart",
            rarity: "Raro",
            quality: 8,
            value: 36,
            flavors: ["fragola", "miele"],
            textures: ["cristallina", "liscia"],
            description:
                "Un cuore di cristallo rosa simbolo di amicizia, amore e gentilezza."
        },
        {
            id: "barbie_pink_cake",
            name: "Torta dei Sogni",
            color: "#FF86C8",
            innerColor: "#FFF0F7",
            shape: "food",
            rarity: "Raro",
            quality: 8,
            value: 28,
            flavors: ["fragola", "panna", "vaniglia"],
            textures: ["soffice", "cremosa"],
            description:
                "Una torta a più strati con panna rosa e decorazioni di zucchero."
        },
        {
            id: "barbie_sparkling_lemonade",
            name: "Limonata Frizzante",
            color: "#FFB7E8",
            innerColor: "#FFF6C9",
            shape: "liquid",
            rarity: "Comune",
            quality: 6,
            value: 11,
            flavors: ["limone", "zucchero"],
            textures: ["frizzante", "liquida"],
            description:
                "Una limonata frizzante con riflessi rosa e un gusto rinfrescante."
        },
        {
            id: "barbie_pink_butterfly",
            name: "Farfalla Rosa",
            color: "#FF76C8",
            innerColor: "#FFD6F0",
            shape: "butterfly",
            rarity: "Raro",
            quality: 8,
            value: 34,
            flavors: ["nettare", "fiore"],
            textures: ["leggera", "setosa"],
            description:
                "Una farfalla dai colori rosa perlati e dalle ali scintillanti."
        },
        {
            id: "barbie_magic_wand",
            name: "Bacchetta Magica",
            color: "#DDA0FF",
            innerColor: "#FFF0FF",
            shape: "wand",
            rarity: "Epico",
            quality: 9,
            value: 52,
            flavors: ["zucchero filato"],
            textures: ["luminosa", "magica"],
            description:
                "Una bacchetta capace di evocare scintille rosa e piccole meraviglie."
        },
        {
            id: "barbie_pink_pearl",
            name: "Perla Rosa",
            color: "#FFC0E2",
            innerColor: "#FFF6FC",
            shape: "pearl",
            rarity: "Raro",
            quality: 8,
            value: 33,
            flavors: ["mare", "vaniglia"],
            textures: ["liscia", "perlacea"],
            description:
                "Una perla rosa dalle sfumature iridescenti, elegante e preziosa."
        },
        {
            id: "barbie_fashion_magazine",
            name: "Rivista Fashion",
            color: "#FF4FAD",
            innerColor: "#FFE1F0",
            shape: "book",
            rarity: "Comune",
            quality: 6,
            value: 13,
            flavors: ["carta", "inchiostro"],
            textures: ["cartacea", "liscia"],
            description:
                "Una rivista piena di idee di moda, outfit e tendenze glamour."
        },
        {
            id: "barbie_pink_sunglasses",
            name: "Occhiali Glam",
            color: "#FF66B8",
            innerColor: "#A7F0FF",
            shape: "glasses",
            rarity: "Non comune",
            quality: 7,
            value: 19,
            flavors: ["ciliegia"],
            textures: ["lucida", "liscia"],
            description:
                "Occhiali rosa alla moda con lenti brillanti e montatura elegante."
        },
        {
            id: "barbie_pink_tiara",
            name: "Tiara delle Stelle",
            color: "#FFB8EC",
            innerColor: "#FFEAA8",
            shape: "crown",
            rarity: "Epico",
            quality: 9,
            value: 56,
            flavors: ["miele", "rosa"],
            textures: ["scintillante", "metallica"],
            description:
                "Una tiara decorata con stelle che brillano come piccoli diamanti."
        },
        {
            id: "barbie_dream_cloud",
            name: "Nuvola dei Sogni",
            color: "#FFC8E8",
            innerColor: "#FFFFFF",
            shape: "cloud",
            rarity: "Raro",
            quality: 8,
            value: 31,
            flavors: ["zucchero filato", "vaniglia"],
            textures: ["soffice", "vaporosa"],
            description:
                "Una nuvola rosa e soffice che sembra fatta di zucchero filato."
        },
        {
            id: "barbie_golden_handbag",
            name: "Borsa Dorata",
            color: "#FFD76A",
            innerColor: "#FF9FD5",
            shape: "bag",
            rarity: "Epico",
            quality: 9,
            value: 54,
            flavors: ["vaniglia"],
            textures: ["setosa", "metallica"],
            description:
                "Una borsa dorata con dettagli rosa e finiture da alta moda."
        },
        {
            id: "barbie_rose_garden",
            name: "Giardino delle Rose",
            color: "#FF75A8",
            innerColor: "#A9E9B4",
            shape: "flower",
            rarity: "Raro",
            quality: 8,
            value: 29,
            flavors: ["rosa", "miele", "floreale"],
            textures: ["petalosa", "morbida"],
            description:
                "Un giardino incantato ricco di rose rosa e profumi primaverili."
        },
        {
            id: "barbie_cosmic_princess",
            name: "Principessa Cosmica",
            color: "#C77DFF",
            innerColor: "#FFB5E8",
            shape: "star",
            rarity: "Leggendario",
            quality: 10,
            value: 100,
            flavors: ["stella", "vaniglia"],
            textures: ["cosmica", "scintillante"],
            description:
                "Una principessa delle stelle avvolta da luce rosa e polvere cosmica."
        },
        {
            id: "barbie_eternal_glam",
            name: "Glamour Eterno",
            color: "#FF1493",
            innerColor: "#FFD700",
            shape: "star",
            rarity: "Leggendario",
            quality: 10,
            value: 120,
            flavors: ["fragola", "miele", "vaniglia"],
            textures: ["cristallina", "magica", "luminosa"],
            description:
                "L'essenza suprema del glamour: una scintilla rosa e dorata senza tempo."
        }
    ];

    // ---------------------------------------------------------
    // REGISTRAZIONE
    // ---------------------------------------------------------

    function loadRegistered() {
        try {
            const data = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return Array.isArray(data) ? data : [];
        } catch (_) {
            return [];
        }
    }

    function saveRegistered(ids) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(ids)
            );
        } catch (error) {
            console.warn(
                "[" + MOD_NAME + "] Impossibile salvare il registro.",
                error
            );
        }
    }

    function registerIngredients() {
        const registered = loadRegistered();
        const newlyRegistered = [];
        const failed = [];

        BARBIE_INGREDIENTS.forEach(function (ingredient) {
            if (registered.includes(ingredient.id)) {
                return;
            }

            try {
                window.addIngredient(ingredient.id, {
                    name: ingredient.name,
                    type: "food",
                    species: "barbie",
                    shape: ingredient.shape,
                    color: ingredient.color,
                    innerColor: ingredient.innerColor,
                    quality: ingredient.quality,
                    value: ingredient.value,
                    flavors: ingredient.flavors,
                    textures: ingredient.textures,
                    description: ingredient.description,

                    barbie: {
                        version: VERSION,
                        rarity: ingredient.rarity,
                        theme: "Barbie",
                        original: true
                    }
                });

                registered.push(ingredient.id);
                newlyRegistered.push(ingredient.name);

            } catch (error) {
                failed.push(ingredient.name);

                console.error(
                    "[" + MOD_NAME + "] Errore per " +
                    ingredient.name + ":",
                    error
                );
            }
        });

        saveRegistered(registered);

        console.info(
            "[" + MOD_NAME + " " + VERSION + "]",
            "Ingredienti nel database:", BARBIE_INGREDIENTS.length,
            "Nuovi registrati:", newlyRegistered.length,
            "Errori:", failed.length
        );

        if (newlyRegistered.length) {
            console.info(
                "[" + MOD_NAME + "] Nuovi ingredienti:",
                newlyRegistered
            );
        }

        if (failed.length) {
            console.warn(
                "[" + MOD_NAME + "] Ingredienti non registrati:",
                failed
            );
        }
    }

    // ---------------------------------------------------------
    // API PUBBLICA
    // ---------------------------------------------------------

    window.barbieWorld = {
        version: VERSION,

        list: function () {
            return BARBIE_INGREDIENTS.map(function (item) {
                return Object.assign({}, item);
            });
        },

        count: function () {
            return BARBIE_INGREDIENTS.length;
        },

        get: function (id) {
            const item = BARBIE_INGREDIENTS.find(
                function (ingredient) {
                    return ingredient.id === id;
                }
            );

            return item ? Object.assign({}, item) : null;
        },

        getByRarity: function (rarity) {
            return BARBIE_INGREDIENTS
                .filter(function (ingredient) {
                    return ingredient.rarity === rarity;
                })
                .map(function (item) {
                    return Object.assign({}, item);
                });
        },

        register: registerIngredients
    };

    // ---------------------------------------------------------
    // AVVIO
    // ---------------------------------------------------------

    registerIngredients();

    console.info(
        "[" + MOD_NAME + "] Mod caricata. Ingredienti definiti:",
        BARBIE_INGREDIENTS.length
    );
})();
