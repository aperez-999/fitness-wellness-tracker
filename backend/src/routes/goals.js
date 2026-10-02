import mongoose from "mongoose";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { Goal, goalStatuses } from "../models/Goal.js";
import { validateGoal } from "../utils/goalValidation.js";

// The fields sent back to the browser.
const fields =
  "title category targetValue currentValue unit targetDate status createdAt updatedAt userId";
// Soonest deadline first; ties broken by which goal was created first.
const soonestFirst = { targetDate: 1, createdAt: 1, _id: 1 };

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
  router.get("/", async (req, res, next) => {
    const status = req.query.status ?? "active";
    if (!goalStatuses.includes(status)) {
      return res.status(400).json({ message: "Choose active or completed." });
    }
    try {
      const goals = await Goal.find({ userId: req.user.id, status })
        .select(fields)
        .sort(soonestFirst)
        .lean();
      res.json({ goals });
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
      const goal = await Goal.create({ ...result.goal, userId: req.user.id });
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
      // Load the saved goal first: an overdue goal may keep its old date, and a
      // completed goal keeps full progress even when only progress is sent.
      const existing = await Goal.findOne({ _id: req.params.id, userId: req.user.id })
        .select("targetDate status")
        .lean();
      if (!existing) return res.status(404).json({ message: "Goal not found." });

      const result = validateGoal(req.body, {
        now: now(),
        mode: "update",
        currentTargetDate: existing.targetDate.toISOString().slice(0, 10),
        currentStatus: existing.status,
      });
      if (result.errors) {
        return res
          .status(400)
          .json({ message: "Check the goal details.", errors: result.errors });
      }

      // A cleared unit is removed from the document instead of saved as blank.
      const { unit, ...details } = result.goal;
      const update = { $set: details };
      if (unit) update.$set.unit = unit;
      else update.$unset = { unit: 1 };

      // The filter includes userId, so a user can never update someone else's goal.
      const goal = await Goal.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        update,
        { new: true, runValidators: true },
      )
        .select(fields)
        .lean();
      if (!goal) return res.status(404).json({ message: "Goal not found." });
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
