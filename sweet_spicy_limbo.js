
/*
 * Sweet Spicy Limbo
 * Mod per Infinite Chef - R74n
 * 12 nuovi ingredienti dolci e piccanti
 */

addIngredient("inferno_lollipop", {
    color: "#FF3030",
    type: "candy",
    shape: "lollipop",
    meltPoint: 120,
    meltInto: "caramel",
    keywords: "sweet spicy limbo inferno lollipop hot candy"
});

addIngredient("chili_chocolate", {
    color: "#4A1712",
    type: "chocolate",
    shape: "square",
    meltPoint: 40,
    meltInto: "chocolate_icing",
    keywords: "chili chocolate spicy cacao"
});

addIngredient("lava_caramel", {
    color: "#FF5A00",
    type: "liquid",
    shape: "blob",
    meltPoint: 150,
    meltInto: "caramel",
    keywords: "lava caramel spicy sweet hot"
});

addIngredient("dragon_jelly", {
    color: "#B82EFF",
    innerColor: "#FF4F81",
    type: "jelly",
    shape: "blob",
    keywords: "dragon jelly spicy sweet purple"
});

addIngredient("fire_gummy_bear", {
    color: ["#FF2525", "#FF8C00"],
    type: "candy",
    shape: "figure",
    meltPoint: 120,
    meltInto: "caramel",
    keywords: "fire gummy bear spicy candy"
});

addIngredient("sweet_chili_sauce", {
    color: "#D92727",
    type: "liquid",
    shape: "bottle_handle",
    keywords: "sweet chili sauce hot spicy"
});

addIngredient("pepper_cupcake", {
    color: "#C87954",
    innerColor: "#FF4A36",
    type: "cake",
    shape: "cupcake",
    cookColor: "#8C422E",
    keywords: "pepper cupcake dessert spicy cake"
});

addIngredient("inferno_ice_cream", {
    color: "#FF7043",
    type: "dairy",
    shape: "scoop",
    meltPoint: 30,
    meltInto: "cream",
    keywords: "inferno ice cream chili spicy"
});

addIngredient("cinnamon_fire_cookie", {
    color: "#B96B35",
    type: "carb",
    shape: "circle",
    cookColor: "#753819",
    cookName: "burnt_cinnamon_fire_cookie",
    keywords: "cinnamon fire cookie spicy sweet"
});

addIngredient("volcanic_honey", {
    color: "#FF9D00",
    type: "liquid",
    shape: "blob",
    keywords: "volcanic honey hot sweet lava"
});

addIngredient("ghost_pepper_jam", {
    color: "#9E174D",
    type: "liquid",
    shape: "blob",
    keywords: "ghost pepper jam fruit spicy hot"
});

addIngredient("limbo_truffle", {
    color: "#582B40",
    innerColor: "#FF526F",
    type: "chocolate",
    shape: "circle",
    meltPoint: 40,
    meltInto: "chocolate_icing",
    keywords: "limbo truffle chocolate chili sweet spicy"
});

/* Ricette speciali */

addRecipe("chocolate+chili", "chili chocolate");

addRecipe("sugar+chili", "inferno lollipop");

addRecipe("caramel+chili", "lava caramel");

addRecipe("jelly+chili", "dragon jelly");

addRecipe("gummy bear+chili", "fire gummy bear");

addRecipe("honey+chili", "sweet chili sauce");

addRecipe("cake+chili", "pepper cupcake");

addRecipe("ice cream+chili", "inferno ice cream");

addRecipe("cookie+cinnamon+chili", "cinnamon fire cookie");

addRecipe("honey+pepper", "volcanic honey");

addRecipe("jam+ghost pepper", "ghost pepper jam");

addRecipe("chocolate+caramel+chili", "limbo truffle");
