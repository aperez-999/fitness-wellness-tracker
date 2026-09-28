import mongoose from "mongoose";
import { mealTypes } from "../utils/nutritionValidation.js";

const nutrient = () => ({
  type: Number,
  required: true,
  min: 0,
  max: Number.MAX_SAFE_INTEGER,
  validate: Number.isFinite,
});

const nutritionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    foodName: { type: String, trim: true, maxlength: 120 },
    date: { type: Date, required: true },
    calories: nutrient(),
    protein: nutrient(),
    carbohydrates: nutrient(),
    fat: nutrient(),
    mealType: { type: String, enum: mealTypes },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

nutritionLogSchema.index({ userId: 1, date: -1, createdAt: -1, _id: -1 });

export const NutritionLog = mongoose.model("NutritionLog", nutritionLogSchema);
