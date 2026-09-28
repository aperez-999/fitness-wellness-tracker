import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { NutritionLog } from "../models/NutritionLog.js";
import { validateNutrition } from "../utils/nutritionValidation.js";

const router = Router();
router.use(requireAuth);
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
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
  const result = validateNutrition(req.body);
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
