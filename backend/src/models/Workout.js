import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    durationMinutes: { type: Number, min: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

workoutSchema.index({ userId: 1, date: -1 });

export const Workout = mongoose.model("Workout", workoutSchema);
