import mongoose from "mongoose";

export const goalCategories = ["workout", "nutrition", "wellness"];
export const goalStatuses = ["active", "completed"];
export const goalTrackingTypes = ["manual", "workoutCount", "workoutMinutes"];

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 120 },
       category: { type: String, enum: goalCategories, required: true },
    targetValue: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => Number.isFinite(value) && value > 0,
        message: "Target value must be a number above zero.",
      },
    },
    currentValue: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isFinite,
    },
    unit: { type: String, trim: true, maxlength: 30 },
    tracking: { type: String, enum: goalTrackingTypes, default: "manual" },
    startDate: { type: Date },
    targetDate: { type: Date, required: true },
    status: { type: String, enum: goalStatuses, default: "active" },
  },
  { timestamps: true },
);

goalSchema.index({ userId: 1, status: 1, targetDate: 1 });

export const Goal = mongoose.model("Goal", goalSchema);
