import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { Goal } from "../models/Goal.js";
import { NutritionLog } from "../models/NutritionLog.js";
import { Workout } from "../models/Workout.js";
import { withProgress } from "./goals.js";
import {
  createInsightGenerator,
  InsightError,
  limitedDataMessage,
  MIN_RECORDS,
  periodStart,
  recordCount,
  summarizeActivity,
} from "../services/wellnessInsight.js";
import { todayInZone } from "../utils/workoutValidation.js";

export function createInsightRouter({ now = () => new Date(), generate = createInsightGenerator() } = {}) {
  const router = Router();
  router.use(requireAuth);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // POST /api/insights -> a Gemini insight built from the signed-in user's own records.
  router.post("/", async (req, res, next) => {
    let today;
    try {
      today = todayInZone(req.body?.timeZone, now());
    } catch {
      return res.status(400).json({ message: "Use a valid timezone." });
    }

    let summary;
    try {
      // Every query is scoped to the token's user; nothing in the request body selects data.
      const userId = req.user.id;
      const range = { $gte: periodStart(today), $lte: new Date(`${today}T23:59:59.999Z`) };
      const [workouts, nutrition, activeGoals, completedGoals] = await Promise.all([
        Workout.find({ userId, date: range }).select("name date durationMinutes").lean(),
        NutritionLog.find({ userId, date: range }).select("date calories protein carbohydrates fat").lean(),
        Goal.find({ userId, status: "active" })
          .select("title category targetValue currentValue unit tracking startDate targetDate")
          .sort({ targetDate: 1, createdAt: 1, _id: 1 })
          .lean(),
        Goal.countDocuments({ userId, status: "completed" }),
      ]);
      summary = summarizeActivity({
        workouts,
        nutrition,
        goals: await withProgress(activeGoals, userId, today),
        completedGoals,
        today,
      });
    } catch (error) {
      return next(error);
    }

    const basedOn = {
      periodDays: summary.periodDays,
      workouts: summary.workouts.sessions,
      nutritionEntries: summary.nutrition.entries,
      activeGoals: summary.goals.active.length,
      completedGoals: summary.goals.completed,
    };
    const count = recordCount(summary);
    if (count < MIN_RECORDS) {
      return res.json({ status: "limited", message: limitedDataMessage(count), basedOn });
    }

    try {
      const insight = await generate(summary, req.user.id);
      res.json({ status: "ready", ...insight, basedOn });
    } catch (error) {
      if (!(error instanceof InsightError)) return next(error);
      if (error.retryAfterSeconds) {
        res.set("Retry-After", String(error.retryAfterSeconds));
        return res.status(error.status).json({ message: error.message, retryAfterSeconds: error.retryAfterSeconds });
      }
      res.status(error.status).json({ message: error.message });
    }
  });

  return router;
}

export default createInsightRouter();
