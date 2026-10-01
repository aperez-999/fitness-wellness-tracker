import { Router } from "express";

import authRoutes from "./auth.js";
import healthRoutes from "./health.js";
import nutritionRoutes from "./nutrition.js";
import workoutRoutes from "./workouts.js";
import goalsRoutes from "./goals.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/workouts", workoutRoutes);
router.use("/nutrition", nutritionRoutes);
router.use("/goals", goalsRoutes);

export default router;
