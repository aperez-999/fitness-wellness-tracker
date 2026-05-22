import mongoose from "mongoose";

const mealTypes = ["breakfast", "lunch", "dinner", "snack"];

const nutritionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    foodName: { type: String, required: true, trim: true },
    calories: { type: Number, min: 0 },
    date: { type: Date, required: true },
    mealType: { type: String, enum: mealTypes },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

nutritionLogSchema.index({ userId: 1, date: -1 });

export const NutritionLog = mongoose.model("NutritionLog", nutritionLogSchema);
