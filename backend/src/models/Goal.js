import mongoose from "mongoose";

const goalCategories = ["workout", "nutrition", "wellness"];

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: goalCategories, default: "wellness" },
    targetValue: { type: Number, min: 0 },
    currentValue: { type: Number, default: 0, min: 0 },
    unit: { type: String, trim: true },
    targetDate: { type: Date },
  },
  { timestamps: true },
);

goalSchema.index({ userId: 1, createdAt: -1 });

export const Goal = mongoose.model("Goal", goalSchema);
