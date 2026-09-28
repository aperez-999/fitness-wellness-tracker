import { isCalendarDate } from "./workoutValidation.js";

export const nutritionFields = ["calories", "protein", "carbohydrates", "fat"];
export const mealTypes = ["breakfast", "lunch", "dinner", "snack"];

export function validateNutrition(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const errors = {};
  const entry = {};
  if (!isCalendarDate(input.date)) {
    errors.date = "Enter a valid date in YYYY-MM-DD format.";
  } else {
    entry.date = input.date;
  }

  for (const field of nutritionFields) {
    const value = input[field];
    const isNumeric = typeof value === "number" ||
      (typeof value === "string" && /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()));
    const number = isNumeric ? Number(value) : NaN;
    if (!Number.isFinite(number) || number < 0 || number > Number.MAX_SAFE_INTEGER) {
      errors[field] = "Enter a number of zero or more.";
    } else {
      entry[field] = number;
    }
  }

  if (input.foodName != null) {
    if (typeof input.foodName !== "string" || input.foodName.trim().length > 120) {
      errors.foodName = "Keep the food or meal name to 120 characters or fewer.";
    } else if (input.foodName.trim()) {
      entry.foodName = input.foodName.trim();
    }
  }
  if (input.mealType != null) {
    if (!mealTypes.includes(input.mealType)) errors.mealType = "Choose a valid meal type.";
    else entry.mealType = input.mealType;
  }
  return Object.keys(errors).length ? { errors } : { entry };
}
