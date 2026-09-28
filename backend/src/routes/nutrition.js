import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { NutritionLog } from "../models/NutritionLog.js";
import { validateNutrition } from "../utils/nutritionValidation.js";

import { estimateFood, createEstimateLimiter, EstimateError } from "../services/mealEstimate.js";
import { signEstimate } from "../utils/estimateReceipt.js";

const allowEstimate = createEstimateLimiter();
const router = Router();
router.use(requireAuth);
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/estimate", async (req, res, next) => {
  const foodName = req.body?.foodName;
  if (typeof foodName !== "string" || !foodName.trim() || foodName.trim().length > 120) {
    return res.status(400).json({ message: "Enter a food or meal of 120 characters or fewer." });
  }
  if (!allowEstimate(req.user.id)) {
    res.set("Retry-After", "60");
    return res.status(429).json({ message: "Too many estimates. Wait a minute or enter values manually." });
  }
  try {
    const estimate = await estimateFood(foodName);
    res.json({ ...estimate, receipt: signEstimate(estimate, foodName.trim(), req.user.id) });
  } catch (error) {
    if (error instanceof EstimateError) return res.status(error.status).json({ message: error.message });
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const entries = await NutritionLog.find({ userId: req.user.id })
      .select("date foodName mealType calories protein carbohydrates fat createdAt userId estimate")
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .limit(30)
      .lean();
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const result = validateNutrition(req.body, { userId: req.user.id });
  if (result.errors) {
    return res.status(400).json({ message: "Check the nutrition details.", errors: result.errors });
  }
  try {
    const entry = await NutritionLog.create({ ...result.entry, userId: req.user.id });
    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
});

export default router;
