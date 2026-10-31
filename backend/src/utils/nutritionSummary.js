// The weekly nutrition numbers on the dashboard.

import { dayKey } from "./goalProgress.js";
import { weekBounds } from "./workoutValidation.js";

// The days whose meals count: Monday of this week through today, the same week as the
// workout chart. Meals dated later this week count once their day arrives.
export function nutritionWeek(today) {
  return { start: dayKey(weekBounds(today).start), end: today };
}

// How many meals were logged this week and their total calories.
export function weeklyNutrition(entries, today) {
  const { start, end } = nutritionWeek(today);
  let meals = 0;
  let calories = 0;
  for (const entry of entries) {
    const day = dayKey(entry.date);
    if (day < start || day > end) continue;
    meals += 1;
    // The first nutrition schema allowed a blank calorie count.
    calories += entry.calories ?? 0;
  }
  // Two decimals, like the Nutrition page, so 0.1 + 0.2 comes back as 0.3.
  return { weekStart: start, meals, calories: Number(calories.toFixed(2)) };
}
