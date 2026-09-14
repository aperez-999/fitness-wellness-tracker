import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { Workout } from "../models/Workout.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const workouts = await Workout.find({ userId: req.user.id })
      .sort({ date: -1 });

    res.json({ workouts });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, date, durationMinutes, notes } = req.body ?? {};

    if (!name || !date) {
      return res.status(400).json({
        message: "Workout name and date are required",
      });
    }

    const workout = await Workout.create({
      userId: req.user.id,
      name: name.trim(),
      date,
      durationMinutes:
        durationMinutes === "" || durationMinutes == null
          ? undefined
          : Number(durationMinutes),
      notes: notes?.trim() || undefined,
    });

    res.status(201).json({ workout });
  } catch (error) {
    next(error);
  }
});

export default router;