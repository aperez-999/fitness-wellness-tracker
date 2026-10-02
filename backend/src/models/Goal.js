import mongoose from "mongoose";

// Allowed values, exported so the validation code (Step 2) and the tests can
// reuse the exact same lists instead of retyping them.
export const goalCategories = ["workout", "nutrition", "wellness"];
export const goalStatuses = ["active", "completed"];

const goalSchema = new mongoose.Schema(
  {
    // Owner of the goal. The route always fills this in from the logged-in
    // user's token, never from anything the browser sends.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The goal's name, e.g. "Run 20 miles this month".
    title: { type: String, required: true, trim: true, maxlength: 120 },
    // The goal's type.
    category: { type: String, enum: goalCategories, required: true },
    // What "done" looks like, e.g. 20. Must be a real number above zero.
    targetValue: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => Number.isFinite(value) && value > 0,
        message: "Target value must be a number above zero.",
      },
    },
    // Progress so far. New goals start at 0.
    currentValue: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isFinite,
    },
    // Optional label for the numbers, e.g. "miles", "workouts", "glasses".
    unit: { type: String, trim: true, maxlength: 30 },
    // Deadline. Stored as midnight UTC of the chosen day, the same way
    // workout dates are stored.
    targetDate: { type: Date, required: true },
    // Only "active" goals appear in the main list.
    status: { type: String, enum: goalStatuses, default: "active" },
  },
  // Adds createdAt and updatedAt automatically.
  { timestamps: true },
);

// Speeds up the main query: "this user's active goals, soonest deadline first".
goalSchema.index({ userId: 1, status: 1, targetDate: 1 });

export const Goal = mongoose.model("Goal", goalSchema);
