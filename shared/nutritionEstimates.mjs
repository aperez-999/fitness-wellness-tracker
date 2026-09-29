// Published recipe values per serving, checked 2026-09-28.
// These reference recipes are approximate matches, not analysis of a user's meal.
export const mealReferences = [
  {
    id: "berry-oatmeal", name: "Oatmeal with berries", icon: "bowl",
    aliases: ["oats with berries", "porridge with berries", "porridge with yoghurt and berries"],
    portion: "37.5 g dry oats, 2 tbsp low-fat yogurt and 25 g berries; cooked with water.",
    source: "NHS Healthier Families",
    url: "https://www.nhs.uk/healthier-families/recipes/porridge-with-yoghurt-and-berries/",
    nutrients: { calories: 207, protein: 8.4, carbohydrates: 33.8, fat: 3.9 },
  },
  {
    id: "yogurt-parfait", name: "Yogurt parfait", icon: "bowl",
    aliases: ["yoghurt parfait", "yogurt berry parfait", "yogurt with fruit and granola"],
    portion: "1 parfait (214 g): low-fat vanilla yogurt, banana, berries and granola.",
    source: "USDA MyPlate",
    url: "https://myplate-stg.kwaps.platform.usda.gov/recipes/yogurt-berry-parfait",
    nutrients: { calories: 259, protein: 9, carbohydrates: 43, fat: 6 },
  },
  {
    id: "eggs-toast", name: "Scrambled eggs on toast", icon: "egg",
    aliases: ["eggs on toast", "scrambled eggs with toast", "super scrambled eggs"],
    portion: "2 eggs, 1 slice wholemeal toast, tomato and mushrooms; a little milk and spread.",
    source: "NHS Healthier Families",
    url: "https://www.nhs.uk/healthier-families/recipes/super-scrambled-eggs/",
    nutrients: { calories: 255, protein: 17, carbohydrates: 19, fat: 13 },
  },
  {
    id: "chicken-wrap", name: "Chicken wrap", icon: "leaf",
    aliases: ["tasty chicken wrap", "tasty chicken wraps"],
    portion: "1 flour tortilla with chicken, soft cheese, yogurt, sweetcorn, cucumber and lettuce.",
    source: "NHS Healthier Families",
    url: "https://www.nhs.uk/healthier-families/recipes/tasty-chicken-wraps/",
    nutrients: { calories: 307, protein: 20.2, carbohydrates: 40.4, fat: 6.4 },
  },
  {
    id: "roast-chicken", name: "Roast chicken dinner", icon: "plate",
    aliases: ["roast chicken with potatoes and vegetables"],
    portion: "1/6 of the reference chicken dinner, including potatoes, mixed vegetables and gravy.",
    source: "NHS Healthier Families",
    url: "https://www.nhs.uk/healthier-families/recipes/roast-dinner/",
    nutrients: { calories: 525, protein: 52, carbohydrates: 48, fat: 15.5 },
  },
];

const normalize = (value) => typeof value === "string"
  ? value.trim().toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ") : "";

export function findMealReference(name) {
  const normalized = normalize(name);
  return mealReferences.find((meal) => [meal.name, ...meal.aliases]
    .some((alias) => normalize(alias) === normalized));
}

export function estimateMeal(id, servings = 1) {
  const meal = mealReferences.find((item) => item.id === id);
  if (!meal || typeof servings !== "number" || !Number.isFinite(servings) || servings < 0.25 || servings > 10) return null;
  return Object.fromEntries(Object.entries(meal.nutrients)
    .map(([field, value]) => [field, Math.round(value * servings * 10) / 10]));
}
