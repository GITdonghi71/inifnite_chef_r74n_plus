// ============================================================
// INNESTATORE.JS — Infinite Chef
// Innesti di livello 1 e 2
// Forme selezionate dal catalogo ufficiale R74n Shapes
// ID descrittivi, nessun nome casuale, nessuna addRecipe()
// ============================================================

(function () {
    "use strict";

    if (typeof addIngredient !== "function" ||
        typeof addTool !== "function") {
        console.error("[Innestatore] API di Infinite Chef non disponibili.");
        return;
    }

    // --------------------------------------------------------
    // FORME UFFICIALI — LIVELLO 1
    // --------------------------------------------------------

    const emojiL1 = [
        "fruit",
        "fruit_bi",
        "fruit_bipod",
        "fruit_bipod_stem",
        "fruit_bipod_thin",
        "fruit_bipod_thin_stem",
        "fruit_extrude",
        "fruit_long",
        "fruit_long_stem",
        "fruit_long_thorny",
        "fruit_nub",
        "fruit_nub_thick",
        "fruit_nubs",
        "fruit_nubs_rough",
        "fruit_pick_stem",
        "fruit_stem",
        "fruit_wide",
        "fruit_wide_stem",
        "leaf",
        "leaf_ginkgo",
        "leaf_maple",
        "leaf_needle",
        "leaf_rough",
        "leaf_stem",
        "leaf_vegetable",
        "leaves_stem",
        "algae",
        "clover",
        "clover_round",
        "flower",
        "flower_circle_leaves",
        "flower_clover",
        "flower_hex",
        "flower_lipped",
        "flower_rose",
        "flower_stem",
        "flower_wavy",
        "flower_x",
        "flower_x_thin",
        "fungus",
        "fungus_flat",
        "fungus_flared",
        "fungus_flared_tall",
        "fungus_flat_tall",
        "fungus_flat_wide",
        "fungus_mounted",
        "fungus_pointy",
        "fungus_pointy_porous",
        "fungus_splayed",
        "fungus_spotted",
        "fungus_tall",
        "fungus_wide",
        "grass",
        "foliage",
        "foliage_bar",
        "foliage_cone",
        "foliage_s",
        "tree",
        "tree_triangle",
        "twig",
        "lotus",
        "cactus",
        "bean",
        "peanut",
        "loaf",
        "poultry",
        "cutlet",
        "tooth",
        "paw",
        "arachnid",
        "arachnid_venomous",
        "bug",
        "clam",
        "crustacean",
        "fish",
        "jellyfish",
        "larva",
        "lobster",
        "worm",
        "heart",
        "heart_s",
        "hearts_bi",
        "star",
        "star_tiny",
        "star_four_point",
        "star_four_point_round",
        "stars_some",
        "sun",
        "sun_eclipse",
        "crescent",
        "flame",
        "cloud_droplets",
        "liquid",
        "liquid_splat",
        "powder",
        "powder_rough",
        "powder_wavy",
        "crystal",
        "crystal_tiny",
        "jewel",
        "microbe",
        "double_helix",
        "atom",
        "brain",
        "gear",
        "handwheel",
        "anchor",
        "bell",
        "book",
        "house",
        "house_chimney",
        "hat",
        "medal",
        "lock",
        "lock_open",
        "shell",
        "popsicle",
        "pretzel",
        "noodles",
        "puddle",
        "droplets_some",
        "droplets_some_flat",
        "egg_yolk",
        "embryo",
        "envelope",
        "eye",
        "face",
        "face_smile",
        "face_frown",
        "skull",
        "hexagon",
        "pentagon",
        "octagon",
        "triangle",
        "oval",
        "circle",
        "square",
        "diamond",
        "heart_broken",
        "snowflake",
        "zap",
        "zap_straight"
    ];

    // --------------------------------------------------------
    // FORME UFFICIALI — LIVELLO 2
    // --------------------------------------------------------

    const emojiL2 = [
        "fruit_bi",
        "fruit_bipod_thin_stem",
        "fruit_long_thorny",
        "fruit_nub_thick",
        "fruit_nubs_rough",
        "fruit_pick_stem",
        "fruit_wide_stem",
        "leaf_ginkgo",
        "leaf_maple",
        "leaf_needle",
        "leaf_rough",
        "leaf_vegetable",
        "leaves_stem",
        "flower_circle_leaves",
        "flower_clover",
        "flower_lipped",
        "flower_rose",
        "flower_wavy",
        "flower_x_thin",
        "fungus_flared",
        "fungus_flared_tall",
        "fungus_flat_tall",
        "fungus_flat_wide",
        "fungus_pointy_porous",
        "fungus_splayed",
        "fungus_mounted",
        "fungus_spotted",
        "arachnid_venomous",
        "heart_broken",
        "heart_hollow",
        "hearts_bi",
        "star_four_point",
        "star_four_point_round",
        "star_prism",
        "stars_some",
        "octagram",
        "octagram_compass",
        "octagram_emblem",
        "octagram_outward",
        "octagram_square",
        "hexagram",
        "hexagram_triangle",
        "hexagon_bevel",
        "hexagon_hole",
        "hexagon_pyramid",
        "hexagon_turned",
        "hexagonal_prism",
        "hexagonal_pyramid",
        "hexagonal_pyramid_top",
        "hexagonal_pyramid_top_turned",
        "pentagon_bevel",
        "pentagonal_prism",
        "pentagonal_pyramid",
        "pentagonal_pyramid_top",
        "octagon_bevel",
        "octagon_bevel_square",
        "octagon_opu",
        "octagonal_prism",
        "octagonal_pyramid",
        "octagonal_pyramid_top",
        "icosahedron",
        "octahedron",
        "dodecahedron",
        "decahedron",
        "tetrahedron",
        "stellated_octahedron",
        "pyramid",
        "pyramid_flat_bottom",
        "pyramid_flat_top",
        "pyramid_segmented",
        "pyramid_tiered",
        "pyramid_top",
        "pyramid_top_turned",
        "hyperboloid",
        "hyperboloid_topless",
        "hemisphere",
        "hemisphere_core",
        "hemisphere_topless",
        "gibbous",
        "jewel",
        "crystal",
        "crystal_tiny",
        "double_helix",
        "helix_strand",
        "honeycomb",
        "jigsaw",
        "chain",
        "lock",
        "lock_open",
        "bottle_ridged",
        "bottle_smooth",
        "bottle_handle",
        "liquid_splat",
        "powder_wavy",
        "powder_rough",
        "clumps",
        "swirl",
        "swirl_pile",
        "blob_pile",
        "jellyfish",
        "lobster",
        "microbe",
        "brain",
        "atom",
        "gear",
        "handwheel",
        "sun_eclipse",
        "crescent_thin",
        "flame",
        "snowflake",
        "circle_bevel",
        "circle_lattice",
        "circle_orbits",
        "circle_porous",
        "circle_ridged",
        "circle_rough",
        "circle_scored",
        "circle_seared",
        "circle_shelled",
        "circle_thorny",
        "circle_thorny_ml",
        "cube",
        "cube_simple",
        "cube_stack",
        "cube_wireframe",
        "cuboid",
        "cuboid_long",
        "cuboid_tall",
        "cylinder",
        "cylinder_disc_stack",
        "cylinder_hole",
        "cylinder_short",
        "cylinder_short_hole",
        "cylinder_topless",
        "torus",
        "torus_thick",
        "torus_thin",
        "wheel",
        "turbine",
        "fan",
        "aperture",
        "hourglass",
        "jigsaw",
        "lattice_straight",
        "polygon_irregular",
        "triangular_prism",
        "triforce",
        "triquetra",
        "quatrefoil",
        "trefoil",
        "peace",
        "taijitu",
        "venn_intersection",
        "venn_union",
        "venn_difference",
        "venn_complement_absolute",
        "venn_complement_relative",
        "zap",
        "zap_straight"
    ];

    // --------------------------------------------------------
// FORME EXTRA DAL CATALOGO UFFICIALE R74n SHAPES
// --------------------------------------------------------

// --------------------------------------------------------
// FORME EXTRA DAL CATALOGO UFFICIALE R74n SHAPES
// --------------------------------------------------------

const formeExtraL1 = [
    "acute_angle", "algae", "angle_left", "angle_right",
    "arbelos", "arch", "arch_thick", "archway",
    "arrow_clockwise", "arrow_counterclockwise",
    "asterisk", "atom", "ball_strung", "banner",
    "bean_tiny", "beans_some", "bell", "blob",
    "blob_short", "bone", "boomerang", "chart_line_increase",
    "chart_pie", "check", "circle_arc", "circle_bi",
    "circle_dot", "circle_leafed", "circle_pile",
    "circle_sector", "circles_five", "circles_nine",
    "clock", "clubs", "coil", "comb", "cone",
    "connector", "crosshair", "crosshair_x", "crossed",
    "cursor_full", "curve", "cyclic_heart",
    "cyclic_star", "decagon", "dial", "die_one",
    "die_two", "die_three", "die_four", "die_five",
    "die_six", "disc", "disc_hole", "dot",
    "dots_some", "dropper", "ear", "elbow",
    "exclamation", "fence", "figure", "fisheye",
    "flat_bottom", "flat_plane", "fluffy", "fork",
    "four_splay", "gas", "gas_thin", "grate",
    "grate_horizontal", "grate_vertical", "heptagon",
    "hook", "hook_stem", "houndstooth", "hypercross",
    "intersection_left", "joystick", "kite", "knife",
    "ladder", "lens", "mallet", "multicross",
    "needle", "nonagon", "obelus", "omnicross",
    "ovoid", "pawn", "peg", "percent",
    "pick", "pickaxe", "plus", "plus_circle",
    "plus_double", "pointer_down", "pointer_up",
    "power", "root", "sail", "scissors",
    "scoop", "shield", "shrimp", "signpost",
    "snail", "snowman", "speaker", "spiral",
    "sprout", "sword", "tag", "talon",
    "tangent", "tongs", "toy_brick", "unknown",
    "web", "window", "whisk", "x_circle",
    "x_curved", "x_sharp"
];

const formeExtraL2 = [
    "angle_bracket_up_thin_top", "arch_rectangle",
    "arch_rectangle_thick", "arch_square",
    "archway_lens", "arrow_diagonal_backward",
    "arrow_clockwise_bi", "arrow_counterclockwise_bi",
    "barrier_circle", "barrier_square", "battery",
    "battery_low", "blob_pile", "circle_bi_stem",
    "circle_chord", "circle_ears", "circle_m",
    "circle_ml", "circle_ms", "circle_ms_calyx",
    "circle_ms_leafed", "circle_quad", "circle_quadrant",
    "circle_quadrant_full", "circle_quadrant_negative",
    "circle_three_dots", "circle_three_dots_vertical",
    "circle_two_dots", "circle_xs", "circle_xs_tri",
    "cone_flat_bottom", "cone_flat_bottom_topless",
    "cone_flat_top", "cone_flat_top_hole",
    "cone_hole", "cone_topless", "cone_up",
    "cuboid_stairs", "cuboid_stairs_corner",
    "cuboid_stairs_corner_inner", "cuboid_stairs_top",
    "cuboid_topless", "cuboid_tall_topless",
    "cuboid_wireframe", "cube_eighth", "cube_fourth",
    "cube_half", "cube_six_eighths",
    "cube_three_eighths", "cube_topless",
    "cyclic_rectangle", "cyclic_rectangle_horizontal",
    "cyclic_rhombus", "cyclic_square", "cyclic_triangle",
    "cylinder_flat", "cylinder_short_topless",
    "decagonal_prism", "diagonal_stripe", "dither",
    "dither_backward", "disc_stack", "disc_stack_hole",
    "dot_pyramid", "dots_some_flat", "drain",
    "droplets_some_flat", "elbow_connector",
    "elbow_connector_smooth", "envelope_open",
    "envelope_open_letter", "figure_eight", "fisheye_dark",
    "fork_bi", "fork_down", "four_splay", "h",
    "h_doublestruck", "helix_strand", "hemisphere",
    "heptagon", "hyperboloid_topless", "i",
    "i_thin", "l_thick", "l_top_left_fold",
    "lens_quad", "lens_vertical", "note_eighth_bi",
    "octagram", "oval_bi", "oval_horizontal",
    "oval_leafy", "oval_thick", "oval_thick_hole",
    "oval_thick_horizontal", "oval_thinner",
    "parabola", "parabolic_curve", "patonce",
    "pentagon", "piano_keyboard", "plus_curved",
    "plus_round", "plus_thick", "rectangle_fold_top_right",
    "rectangle_fold_top_right_bi", "rectangle_handle",
    "rectangle_handle_split", "rectangle_lipped",
    "rectangle_long", "rectangle_punched_sides",
    "rectangle_rough", "rectangle_round",
    "rectangle_round_handle", "rectangle_round_handle_split",
    "rectangle_round_rough", "rectangle_tab",
    "rectangle_thick", "rectangle_thick_round",
    "rectangle_thin", "rectangle_thin_nub",
    "rectangle_thin_round", "rectangle_thinner",
    "rectangle_thinner_ridged", "rectangle_thinner_ring",
    "rectangle_thinner_round", "rectangle_thinner_round_porous",
    "rectangle_thinner_tablet", "rectangle_thinnest",
    "rectangle_thinnish_round_point", "rectangle_torn_top",
    "rectangle_vertical", "rectangle_vertical_ribbed",
    "rectangle_vertical_round", "rectangle_vertical_thick",
    "rectangle_vertical_thick_round", "rectangle_vertical_thinnest",
    "rectangular_prism", "rectangular_prism_flared",
    "rectangled_punched_sides_hole", "reel", "rhomboid",
    "rhombus", "rhombus_bevel", "rhombus_quad",
    "rhombus_thin", "ribbed", "ribbed_hole",
    "ribbed_sharp", "ribbed_thick", "ribbon",
    "ribbon_flat", "rock", "rock_ball", "rod",
    "rod_bulbous", "rod_bumpy", "rod_circle",
    "rod_circle_flared", "rod_flared", "rod_flared_leafy",
    "rod_flat_top", "rod_hollow", "rod_lip",
    "rod_point", "rod_rough", "rod_rough_thin",
    "rod_small", "rod_thin", "rod_thin_splits",
    "rod_tiny", "rod_to_thick", "rod_to_thin",
    "rod_wavy", "rods_some", "rombus_negative",
    "semicircle_bottom", "semicircle_diagonal",
    "semicircle_left", "semicircle_right", "semicircle_top",
    "semiheart", "semioval_left", "semioval_thick_left",
    "semirhombus", "semistar", "semitorus_thick_hollow",
    "semitorus_thick_left", "semitorus_thin_left",
    "semitriangle", "shield_flat", "signpost_arrow_right",
    "signpost_text", "silhouette", "silhouette_hair_long",
    "sine", "spades", "speech_balloon", "speech_oval",
    "speech_rectangle", "spheroid_prolate", "spike_ball",
    "spike_ball_quad", "spike_strip", "spinny_blade",
    "spiral_bi", "spiral_s", "splat", "splat_yolk",
    "square_axes_top_left", "square_bevel",
    "square_curve_left_top", "square_curve_top",
    "square_curve_top_bottom", "square_fold_bottom_right",
    "square_handle", "square_handle_split",
    "square_hollow", "square_hollow_half", "square_knob",
    "square_m", "square_ms", "square_pile",
    "square_quad", "square_quad_leftward", "square_ridged",
    "square_rough", "square_round_diagonal",
    "square_round_hollow", "square_round_rough",
    "square_round_top_both", "square_round_top_both_bottom_left",
    "square_round_top_right", "square_s",
    "square_snip_diagonal", "square_snip_top_both",
    "square_snip_top_both_bottom_left", "square_snip_top_right",
    "square_three_fourths", "square_tiny", "square_two_thirds",
    "square_u_down", "square_u_left", "square_u_right",
    "square_u_thin_top", "square_u_up", "stack",
    "stars_some_flat", "stripes_diagonal", "sus",
    "t", "tack_bi", "tack_bi_fused", "tack_thick_left",
    "thought_balloon", "torus_fourth", "torus_fourth_full",
    "torus_m", "torus_side", "torus_three_fourths",
    "trapezoid", "trapezoid_full", "trapezoid_full_down",
    "trapezoid_l", "triangle_bevel", "triangle_curved",
    "triangle_diagonal", "triangle_diagonal_barbed",
    "triangle_down", "triangle_facing_right",
    "triangle_hollow", "triangle_left_bi",
    "triangle_left_bi_bar", "triangle_m", "triangle_right",
    "triangle_right_bars", "triangle_right_bi",
    "triangle_right_bi_bar", "triangle_right_hollow",
    "triangle_round", "triangle_round_ml", "triangle_s",
    "triangle_tiny", "triangle_up_bar_below",
    "triangle_warning", "triangles_some", "triangles_some_flat",
    "u", "unequal", "venn_tri", "wavy_sheet",
    "wavy_sheet_flat", "wavy_sheet_flat_top", "wedge",
    "wedge_porous", "wedge_right", "wedge_rough",
    "whorl_circle", "x_circles", "x_square", "x_squares",
    "x_thick", "y", "z"
];

// Unisci le forme esistenti con quelle aggiuntive, senza duplicati.
const formeL1Complete = [...new Set([...emojiL1, ...formeExtraL1])];
const formeL2Complete = [...new Set([...emojiL2, ...formeExtraL2])];
    // --------------------------------------------------------
    // PALETTE COLORI
    // --------------------------------------------------------

    const coloriL1 = [
        "#ef476f", "#f94144", "#f3722c", "#f8961e",
        "#f9c74f", "#90be6d", "#43aa8b", "#4d908e",
        "#577590", "#277da1", "#4895ef", "#4361ee",
        "#7209b7", "#b5179e", "#f15bb5", "#9b5de5",
        "#00bbf9", "#00f5d4", "#8ac926", "#6a994e",
        "#bc6c25", "#dda15e", "#e9c46a", "#e76f51",
        "#ffadad", "#ffd6a5", "#fdffb6", "#caffbf",
        "#9bf6ff", "#a0c4ff", "#bdb2ff", "#ffc6ff",
        "#d8e2dc", "#f1faee", "#a8dadc", "#457b9d",
        "#e63946", "#ff595e", "#ffca3a", "#8ac926",
        "#1982c4", "#6a4c93", "#bc6c25", "#606c38",
        "#dda15e", "#283618", "#ff7b00", "#8338ec"
    ];

    const coloriL2 = [
        "#d00000", "#9d0208", "#e85d04", "#f48c06",
        "#faa307", "#ffba08", "#80b918", "#55a630",
        "#2b9348", "#007f5f", "#0096c7", "#0077b6",
        "#023e8a", "#3a0ca3", "#560bad", "#7209b7",
        "#b5179e", "#f72585", "#ff006e", "#8338ec",
        "#3a86ff", "#00b4d8", "#00f5d4", "#70e000",
        "#ccff33", "#f4a261", "#e76f51", "#9c6644",
        "#7f5539", "#b08968", "#ddb892", "#ede0d4",
        "#6d6875", "#b5838d", "#e5989b", "#ffcdb2",
        "#355070", "#6d597a", "#b56576", "#e56b6f",
        "#eaac8b", "#264653", "#2a9d8f", "#e9c46a",
        "#f4a261", "#e76f51", "#606c38", "#283618"
    ];

    const coloriInterniL1 = [
        "#fff1e6", "#ffe5ec", "#fff0bd", "#e9ffdb",
        "#d8f3dc", "#caf0f8", "#dbe7ff", "#e7c6ff",
        "#f1faee", "#fefae0", "#fff3b0", "#f8edeb"
    ];

    const coloriInterniL2 = [
        "#fff0f3", "#ffe8d6", "#fff3b0", "#e9ffdb",
        "#d8f3dc", "#caf0f8", "#dbe7ff", "#e7c6ff",
        "#f1faee", "#fefae0", "#fae1dd", "#e2ece9"
    ];

    // --------------------------------------------------------
    // STATO INTERNO
    // --------------------------------------------------------

    const livelli = Object.create(null);
    const coppieCreate = Object.create(null);
    const oggettiIngredienti = Object.create(null);

    let ingredienteA = null;
    let livelloA = null;
    let ultimoId = null;
    let ultimoTimestamp = 0;

    function casuale(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    function pulisciId(id) {
        return String(id)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function ricavaId(placed) {
        if (typeof placed === "string") {
            return placed;
        }

        if (!placed || typeof placed !== "object") {
            return null;
        }

        const chiavi = [
            "ingredientId",
            "ingredient_id",
            "ingredient",
            "id",
            "element",
            "item",
            "ingredientName",
            "name"
        ];

        for (let i = 0; i < chiavi.length; i++) {
            const valore = placed[chiavi[i]];

            if (typeof valore === "string" &&
                valore.length > 0) {
                if (ingredients && ingredients[valore]) {
                    return valore;
                }

                if (livelli[valore] !== undefined) {
                    return valore;
                }
            }

            if (valore && typeof valore === "object") {
                if (typeof valore.id === "string") {
                    return valore.id;
                }

                if (typeof valore.name === "string") {
                    return valore.name;
                }
            }
        }

        if (typeof placed.type === "string") {
            if (ingredients && ingredients[placed.type]) {
                return placed.type;
            }
        }

        if (typeof ingredients === "object") {
            for (const id in oggettiIngredienti) {
                if (placed === oggettiIngredienti[id]) {
                    return id;
                }
            }
        }

        return null;
    }

    function livelloDi(id) {
        if (livelli[id] !== undefined) {
            return livelli[id];
        }

        // Gli ingredienti preesistenti sono considerati base.
        return 0;
    }

    function creaIdInnesto(idA, idB, livello) {
        // L'ordine non cambia il risultato della coppia.
        const coppia = [idA, idB].sort();

        return "innesto_" +
            pulisciId(coppia[0]) +
            "_con_" +
            pulisciId(coppia[1]) +
            "_liv" + livello;
    }

function hashStringa(testo) {
    let hash = 2166136261;

    for (let i = 0; i < testo.length; i++) {
        hash ^= testo.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function sceltaDeterministica(array, chiave) {
    return array[hashStringa(chiave) % array.length];
}


    function creaIngrediente(idA, idB, livello) {
        const nuovoId = creaIdInnesto(idA, idB, livello);

        if (ingredients && ingredients[nuovoId]) {
            livelli[nuovoId] = livello;
            return nuovoId;
        }

        const chiaveCoppia = [idA, idB].sort().join("||")
            + "||liv" + livello;

        if (coppieCreate[chiaveCoppia]) {
            return coppieCreate[chiaveCoppia];
        }

        const forme = livello === 1
    ? formeL1Complete
    : formeL2Complete;
        const palette = livello === 1 ? coloriL1 : coloriL2;
        const paletteInterna =
            livello === 1 ? coloriInterniL1 : coloriInterniL2;

      
const coppiaOrdinata = [idA, idB].sort().join("||");
const chiaveDeterministica = coppiaOrdinata + "||liv" + livello;

const forma = sceltaDeterministica(forme, chiaveDeterministica + "||forma");
const colore = sceltaDeterministica(palette, chiaveDeterministica + "||colore");
const coloreInterno = sceltaDeterministica(
    paletteInterna,
    chiaveDeterministica + "||coloreInterno"
);

        const dati = {
            name: nuovoId,
            color: colore,
            innerColor: coloreInterno,
            type: "solid",
            shape: forma
        };

        try {
            addIngredient(nuovoId, dati);

            if (typeof ingredients === "object" &&
                ingredients[nuovoId]) {
                Object.assign(ingredients[nuovoId], dati);
                oggettiIngredienti[nuovoId] = ingredients[nuovoId];
            }

            livelli[nuovoId] = livello;
            coppieCreate[chiaveCoppia] = nuovoId;

            console.log(
                "[Innestatore] Creato:",
                nuovoId,
                "| Livello:", livello,
                "| Forma:", forma,
                "| Colore:", colore
            );

            return nuovoId;
        } catch (errore) {
            console.error(
                "[Innestatore] Errore nella creazione di",
                nuovoId,
                errore
            );
            return null;
        }
    }

    // --------------------------------------------------------
    // LOGICA INNESTATORE
    // --------------------------------------------------------

    function innesta(placed) {
        const id = ricavaId(placed);

        if (!id) {
            console.warn(
                "[Innestatore] Non riesco a identificare l'ingrediente.",
                placed
            );
            return;
        }

        // Evita doppie chiamate ravvicinate sullo stesso ingrediente.
        const adesso = Date.now();

        if (id === ultimoId && adesso - ultimoTimestamp < 180) {
            return;
        }

        ultimoId = id;
        ultimoTimestamp = adesso;

        const livello = livelloDi(id);

        if (livello >= 2) {
            console.log(
                "[Innestatore] Livello massimo raggiunto:",
                id
            );
            ingredienteA = null;
            livelloA = null;
            return;
        }

        if (!ingredienteA) {
            ingredienteA = id;
            livelloA = livello;

            console.log(
                "[Innestatore] Primo ingrediente selezionato:",
                id,
                "| Livello:", livello
            );
            return;
        }

        if (ingredienteA === id) {
            console.log(
                "[Innestatore] Seleziona un ingrediente diverso."
            );
            return;
        }

        const idPrimo = ingredienteA;
        const livelloPrimo = livelloA;

        ingredienteA = null;
        livelloA = null;

        const livelloNuovo = Math.max(livelloPrimo, livello) + 1;

        if (livelloNuovo > 2) {
            console.log(
                "[Innestatore] Non è possibile superare il livello 2."
            );
            return;
        }

        creaIngrediente(idPrimo, id, livelloNuovo);
    }

    // --------------------------------------------------------
    // REGISTRAZIONE STRUMENTO
    // --------------------------------------------------------

    addTool("innestatore", {
        name: "Innestatore",
        color: "#a55eea",
        shape: "liquid",
        func: innesta
    });

    console.log(
    "[Innestatore] Caricato correttamente.",
    "| Forme L1:", formeL1Complete.length,
    "| Forme L2:", formeL2Complete.length,
    "| Forme L1 originali:", emojiL1.length,
    "| Forme L2 originali:", emojiL2.length
);
})();

addRecipe("innesto_ice_cube_con_innesto_cream_con_pokemon_squirtle_liv1_liv2+milkoid+rice", "Girbobble Pleasure");
