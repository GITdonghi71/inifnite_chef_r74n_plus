
/*
 * iphones.js — Infinite Chef
 * Dimensioni a gruppi e 18 tonalità grigio-azzurre uniche.
 */

const iphoneModels = [
  // iPhone 1–6: grandi
  { id: "iphone_1",  color: "#A7B4C2", shape: "rectangle_vertical_thick_round" },
  { id: "iphone_2",  color: "#9AAFC0", shape: "rectangle_vertical_thick_round" },
  { id: "iphone_3",  color: "#8FA8BC", shape: "rectangle_vertical_thick_round" },
  { id: "iphone_4",  color: "#829FB8", shape: "rectangle_vertical_thick_round" },
  { id: "iphone_5",  color: "#7797B3", shape: "rectangle_vertical_thick_round" },
  { id: "iphone_6",  color: "#6D8EAD", shape: "rectangle_vertical_thick_round" },

  // iPhone 7–12: medi
  { id: "iphone_7",  color: "#AEBAC6", shape: "rectangle_vertical_round" },
  { id: "iphone_8",  color: "#9EB3C5", shape: "rectangle_vertical_round" },
  { id: "iphone_9",  color: "#8DAAC1", shape: "rectangle_vertical_round" },
  { id: "iphone_10", color: "#7EA1BE", shape: "rectangle_vertical_round" },
  { id: "iphone_11", color: "#6F98BA", shape: "rectangle_vertical_round" },
  { id: "iphone_12", color: "#608DB3", shape: "rectangle_vertical_round" },

  // iPhone 13–18: piccoli
  { id: "iphone_13", color: "#BBC5CF", shape: "rectangle_thinner_tablet" },
  { id: "iphone_14", color: "#AABCCB", shape: "rectangle_thinner_tablet" },
  { id: "iphone_15", color: "#98B2C8", shape: "rectangle_thinner_tablet" },
  { id: "iphone_16", color: "#87A8C3", shape: "rectangle_thinner_tablet" },
  { id: "iphone_17", color: "#759DBD", shape: "rectangle_thinner_tablet" },
  { id: "iphone_18", color: "#648FB4", shape: "rectangle_thinner_tablet" }
];

for (const phone of iphoneModels) {
  addIngredient(phone.id, {
    color: phone.color,
    innerColor: "#202B36",
    type: "fruit",
    shape: phone.shape
  });
}
