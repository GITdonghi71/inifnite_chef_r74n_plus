
 // Back to Christmas — mod per Infinite Chef (R74n)
// Aggiunge ingredienti natalizi e ricette a tema.

addIngredient("christmas_candy_cane", {
    color: "#FFFFFF",
    type: "candy",
    shape: "cane_striped",
    meltPoint: 120,
    meltInto: "caramel",
    keywords: "christmas, candy cane, peppermint, natale, bastoncino"
});

addIngredient("gingerbread_cookie", {
    color: "#B8753D",
    type: "carb",
    shape: "figure",
    cookColor: "#8C4E2A",
    keywords: "christmas, gingerbread, cookie, natale, biscotto"
});

addIngredient("christmas_star", {
    color: "#FFD34E",
    type: "candy",
    shape: "stellated_octahedron",
    glow: "#FFF1A8",
    meltPoint: 120,
    meltInto: "caramel",
    keywords: "christmas, star, natale, stella"
});

addIngredient("christmas_pudding", {
    color: "#6B3827",
    innerColor: "#B8753D",
    type: "cake",
    shape: "blob_short",
    keywords: "christmas, pudding, dessert, natale, budino"
});

addIngredient("holiday_cookie", {
    color: "#D9A15B",
    type: "carb",
    shape: "rectangle_vertical_round",
    cookColor: "#A96B36",
    keywords: "holiday, christmas, cookie, natale, biscotto"
});

addIngredient("snowball_truffle", {
    color: "#FFFDF5",
    innerColor: "#6B3827",
    type: "chocolate",
    shape: "circle",
    meltPoint: 35,
    meltInto: "chocolate_icing",
    keywords: "snowball, truffle, chocolate, christmas, tartufo"
});

addIngredient("christmas_wreath", {
    color: "#23834A",
    innerColor: "#D82F3D",
    type: "vegetable",
    shape: "circle",
    keywords: "christmas, wreath, holly, natale, ghirlanda"
});

addIngredient("holiday_cocoa", {
    color: "#6B3827",
    type: "liquid",
    shape: "blob_short",
    keywords: "hot chocolate, cocoa, christmas, natale, cioccolata calda"
});

addIngredient("christmas_tree_cookie", {
    color: "#27864B",
    type: "carb",
    shape: "triangle_round",
    cookColor: "#176235",
    keywords: "christmas tree, cookie, natale, albero"
});

// Ricette natalizie
addRecipe("sugar+christmas_candy_cane", "peppermint candy");
addRecipe("gingerbread_cookie+icing", "decorated gingerbread cookie");
addRecipe("gingerbread_cookie+chocolate icing", "chocolate gingerbread cookie");
addRecipe("christmas_star+sugar", "shining christmas star");
addRecipe("christmas_tree_cookie+icing", "decorated christmas tree cookie");
addRecipe("christmas_tree_cookie+sprinkles", "festive christmas tree cookie");
addRecipe("snowball_truffle+coconut", "snowball truffle");
addRecipe("chocolate+cream+sugar", "christmas chocolate ganache");
addRecipe("holiday_cocoa+milk+sugar", "hot chocolate");
addRecipe("christmas_pudding+icing", "iced christmas pudding");
addRecipe("christmas_wreath+christmas_star", "christmas centerpiece");
addRecipe("gingerbread_cookie+christmas_candy_cane", "christmas cookie platter");
addRecipe("christmas_pudding+christmas_star", "holiday feast");
