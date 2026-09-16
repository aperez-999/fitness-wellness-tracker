import mongoose from "mongoose";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { Workout } from "../models/Workout.js";
import {
  isCalendarDate,
  todayInZone,
  validateWorkout,
  weekBounds,
} from "../utils/workoutValidation.js";

const fields = "name date durationMinutes notes createdAt userId";
const recentFirst = { date: -1, createdAt: -1, _id: -1 };

export function createWorkoutRouter({ now = () => new Date() } = {}) {
  const router = Router();
  router.use(requireAuth);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  router.get("/summary", async (req, res, next) => {
    let today;
    try {
      today = todayInZone(req.query.timeZone, now());
    } catch {
      return res.status(400).json({ message: "Use a valid timezone." });
    }

    try {
      const { start, end } = weekBounds(today);
      const userId = new mongoose.Types.ObjectId(req.user.id);
      const [allDays, recent] = await Promise.all([
        aggregateDays(userId, shiftDate(start, -7), end),
        Workout.find({ userId, date: { $lt: end } })
          .select(fields)
          .sort(recentFirst)
          .limit(5)
          .lean(),
      ]);
      res.json({
        today,
        weekStart: start.toISOString().slice(0, 10),
        daily: allDays.filter((day) => day.date >= dateKey(start)),
        previousWeek: {
          start: dateKey(shiftDate(start, -7)),
          through: dateKey(shiftDate(end, -8)),
          daily: allDays.filter(
            (day) => day.date < dateKey(shiftDate(end, -7)),
          ),
        },
        recent,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/analytics", async (req, res, next) => {
    let today;
    try {
      today = todayInZone(req.query.timeZone, now());
    } catch {
      return res.status(400).json({ message: "Use a valid timezone." });
    }
    try {
      const { start, end } = weekBounds(today);
      const windowStart = shiftDate(start, -21);
      const daily = await aggregateDays(
        new mongoose.Types.ObjectId(req.user.id),
        windowStart,
        end,
      );
      res.json({
        today,
        weekStart: dateKey(start),
        windowStart: dateKey(windowStart),
        daily,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    if (req.query.date !== undefined && !isCalendarDate(req.query.date)) {
      return res.status(400).json({ message: "Enter a valid workout date." });
    }
    try {
      const filter = { userId: req.user.id };
      if (req.query.date) {
        const start = new Date(`${req.query.date}T00:00:00Z`);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        filter.date = { $gte: start, $lt: end };
      }
      const workouts = await Workout.find(filter)
        .select(fields)
        .sort(recentFirst)
        .lean();
      res.json({ workouts });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const result = validateWorkout(req.body, now());
    if (result.errors) {
      return res
        .status(400)
        .json({ message: "Check the workout details.", errors: result.errors });
    }
    try {
      const workout = await Workout.create({
        ...result.workout,
        userId: req.user.id,
      });
      res.status(201).json({ workout });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid workout ID." });
    }
    const result = validateWorkout(req.body, now());
    if (result.errors)
      return res
        .status(400)
        .json({ message: "Check the workout details.", errors: result.errors });
    try {
      const { notes, ...details } = result.workout;
      const update = { $set: details };
      if (notes) update.$set.notes = notes;
      else update.$unset = { notes: 1 };
      // Update only validated fields, scoped to the authenticated owner.
      const workout = await Workout.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        update,
        { new: true, runValidators: true },
      )
        .select(fields)
        .lean();
      if (!workout)
        return res.status(404).json({ message: "Workout not found." });
      res.json({ workout });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid workout ID." });
    }
    try {
      // Scope the mutation itself to the owner; never trust a client user ID.
      const workout = await Workout.findOneAndDelete({
        _id: req.params.id,
        userId: req.user.id,
      });
      if (!workout) {
        return res.status(404).json({ message: "Workout not found." });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createWorkoutRouter();

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}
function shiftDate(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function aggregateDays(userId, start, end) {
  return Workout.aggregate([
    { $match: { userId, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
            timezone: "UTC",
          },
        },
        count: { $sum: 1 },
        minutes: { $sum: "$durationMinutes" },
        durationsRecorded: {
          $sum: { $cond: [{ $isNumber: "$durationMinutes" }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        count: 1,
        minutes: 1,
        durationsRecorded: 1,
      },
    },
    { $sort: { date: 1 } },
  ]);
}
