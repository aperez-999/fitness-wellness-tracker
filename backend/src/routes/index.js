import { Router } from "express";

import authRoutes from "./auth.js";
import healthRoutes from "./health.js";
import workoutRoutes from "./workouts.js"

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/workouts", workoutRoutes)

export default router;
