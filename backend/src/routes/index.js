import { Router } from "express";

import healthRoutes from "./health.js";

const router = Router();

router.use("/health", healthRoutes);

// Sprint 3: mount auth, workouts, nutrition, and goals routes here.

export default router;
