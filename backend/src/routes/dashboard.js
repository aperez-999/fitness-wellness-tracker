import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { Goal } from "../models/Goal.js";
import { NutritionLog } from "../models/NutritionLog.js";
import { soonestFirst, withProgress } from "./goals.js";
import { nutritionWeek, weeklyNutrition } from "../utils/nutritionSummary.js";
import { todayInZone } from "../utils/workoutValidation.js";

// The dashboard lists this many active goals; the Goals page has the rest.
export const GOAL_PREVIEW_LIMIT = 3;
const goalFields = "title category targetValue currentValue unit tracking startDate targetDate";

export function createDashboardRouter({ now = () => new Date() } = {}) {
  const router = Router();
  router.use(requireAuth);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // GET /api/dashboard/summary?timeZone= -> this week's meals and the soonest active goals.
  router.get("/summary", async (req, res, next) => {
    let today;
    try {
      today = todayInZone(req.query.timeZone, now());
    } catch {
      return res.status(400).json({ message: "Use a valid timezone." });
    }
    try {
      // Every query is scoped to the token's user; nothing in the request selects data.
      const userId = req.user.id;
      const { start, end } = nutritionWeek(today);
      const [entries, goals, total] = await Promise.all([
        NutritionLog.find({
          userId,
          date: { $gte: new Date(`${start}T00:00:00Z`), $lte: new Date(`${end}T23:59:59.999Z`) },
        })
          .select("date calories")
          .lean(),
        Goal.find({ userId, status: "active" })
          .select(goalFields)
          .sort(soonestFirst)
          .limit(GOAL_PREVIEW_LIMIT)
          .lean(),
        Goal.countDocuments({ userId, status: "active" }),
      ]);
      res.json({
        today,
        nutrition: weeklyNutrition(entries, today),
        goals: { active: await withProgress(goals, userId, today), total },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createDashboardRouter();
