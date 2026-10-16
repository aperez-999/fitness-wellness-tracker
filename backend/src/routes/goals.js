import mongoose from "mongoose";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { Goal, goalStatuses } from "../models/Goal.js";
import { Workout } from "../models/Workout.js";
import { validateGoal } from "../utils/goalValidation.js";
import { progressWindow, trackedProgress } from "../utils/goalProgress.js";
import { todayInZone } from "../utils/workoutValidation.js";

// The fields sent back to the browser.
const fields =
  "title category targetValue currentValue unit tracking startDate targetDate status createdAt updatedAt userId";
// Soonest deadline first; ties broken by which goal was created first.
const soonestFirst = { targetDate: 1, createdAt: 1, _id: 1 };

// Fills in progress for tracked goals from the user's own workouts, so currentValue
// in every response is the number to show. Manual goals keep their saved progress.
async function withProgress(goals, userId, today) {
  for (const goal of goals) {
    // Goals saved before tracking existed have no value; they're manual.
    goal.tracking ??= "manual";
  }
  const tracked = goals.filter((goal) => goal.tracking !== "manual" && goal.startDate);
  if (!tracked.length) return goals;

  // One query covers every tracked goal: the earliest start through the latest end.
  const windows = tracked.map((goal) => progressWindow(goal, today));
  const from = windows.map((window) => window.start).sort()[0];
  const to = windows.map((window) => window.end).sort().at(-1);
  const workouts = from > to ? [] : await Workout.find({
    userId,
    date: { $gte: new Date(`${from}T00:00:00Z`), $lte: new Date(`${to}T23:59:59.999Z`) },
  })
    .select("date durationMinutes")
    .lean();

  for (const goal of tracked) goal.currentValue = trackedProgress(goal, workouts, today);
  return goals;
}

// `now` can be swapped out in tests so "today" is predictable.
export function createGoalRouter({ now = () => new Date() } = {}) {
  const router = Router();

  // Every goal route requires a valid login token. requireAuth puts the
  // logged-in user's ID on req.user.id, or answers 401 and stops here.
  router.use(requireAuth);
  // Goals are private, so tell the browser not to cache responses.
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // GET /api/goals             -> the user's active goals
  // GET /api/goals?status=completed -> the user's completed goals
  // Optional ?timeZone= decides which day is "today" for tracked progress (default UTC).
  router.get("/", async (req, res, next) => {
    const status = req.query.status ?? "active";
    if (!goalStatuses.includes(status)) {
      return res.status(400).json({ message: "Choose active or completed." });
    }
    let today;
    try {
      today = todayInZone(req.query.timeZone, now());
    } catch {
      return res.status(400).json({ message: "Use a valid timezone." });
    }
    try {
      const goals = await Goal.find({ userId: req.user.id, status })
        .select(fields)
        .sort(soonestFirst)
        .lean();
      res.json({ goals: await withProgress(goals, req.user.id, today) });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/goals -> create a goal for the logged-in user
  router.post("/", async (req, res, next) => {
    const result = validateGoal(req.body, { now: now() });
    if (result.errors) {
      return res
        .status(400)
        .json({ message: "Check the goal details.", errors: result.errors });
    }
    try {
      // The owner comes from the token. Any userId in the request body was
      // already dropped by validateGoal, which only copies known fields.
      const created = await Goal.create({ ...result.goal, userId: req.user.id });
      const [goal] = await withProgress([created.toObject()], req.user.id, todayInZone(req.body.timeZone, now()));
      res.status(201).json({ goal });
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/goals/:id -> replace a goal's details (only if the user owns it)
  router.put("/:id", async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid goal ID." });
    }
    try {
      // Load the saved goal first: an overdue goal may keep its old date, a
      // completed goal keeps full progress even when only progress is sent, and
      // a goal keeps its tracking when the request doesn't send one.
      const existing = await Goal.findOne({ _id: req.params.id, userId: req.user.id })
        .select("targetDate status tracking")
        .lean();
      if (!existing) return res.status(404).json({ message: "Goal not found." });

      const result = validateGoal(req.body, {
        now: now(),
        mode: "update",
        currentTargetDate: existing.targetDate.toISOString().slice(0, 10),
        currentStatus: existing.status,
        currentTracking: existing.tracking,
      });
      if (result.errors) {
        return res
          .status(400)
          .json({ message: "Check the goal details.", errors: result.errors });
      }

      // A cleared unit is removed from the document instead of saved as blank,
      // and a manual goal has no start date.
      const { unit, ...details } = result.goal;
      const update = { $set: details, $unset: {} };
      if (unit) update.$set.unit = unit;
      else update.$unset.unit = 1;
      if (details.tracking === "manual") update.$unset.startDate = 1;
      if (!Object.keys(update.$unset).length) delete update.$unset;

      // The filter includes userId, so a user can never update someone else's goal.
      const saved = await Goal.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        update,
        { new: true, runValidators: true },
      )
        .select(fields)
        .lean();
      if (!saved) return res.status(404).json({ message: "Goal not found." });
      const [goal] = await withProgress([saved], req.user.id, todayInZone(req.body.timeZone, now()));
      res.json({ goal });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/goals/:id -> remove a goal (only if the user owns it)
  router.delete("/:id", async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid goal ID." });
    }
    try {
      const goal = await Goal.findOneAndDelete({
        _id: req.params.id,
        userId: req.user.id,
      });
      if (!goal) return res.status(404).json({ message: "Goal not found." });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createGoalRouter();
