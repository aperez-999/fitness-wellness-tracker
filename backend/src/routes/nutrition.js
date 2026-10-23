import mongoose from "mongoose";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { NutritionLog } from "../models/NutritionLog.js";
import { nutritionFields, validateNutrition } from "../utils/nutritionValidation.js";

import { createMealEstimator, EstimateError } from "../services/mealEstimate.js";
import { signEstimate } from "../utils/estimateReceipt.js";

const estimateForUser = createMealEstimator();
const entryFields = "date foodName mealType calories protein carbohydrates fat createdAt userId estimate";
const router = Router();

function rejectInvalidId(id, res) {
  if (mongoose.isObjectIdOrHexString(id)) return false;
  res.status(400).json({ message: "Invalid nutrition entry ID." });
  return true;
}
router.use(requireAuth);
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/estimate", async (req, res, next) => {
  const foodName = req.body?.foodName;
  try {
    const estimate = await estimateForUser(foodName, req.user.id);
    res.json({ ...estimate, receipt: signEstimate(estimate, foodName.trim(), req.user.id) });
  } catch (error) {
    if (error instanceof EstimateError) {
      if (error.retryAfterSeconds) res.set("Retry-After", String(error.retryAfterSeconds));
      return res.status(error.status).json({ message: error.message, ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}) });
    }
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const entries = await NutritionLog.find({ userId: req.user.id })
      .select(entryFields)
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
    const fields = { ...result.entry, userId: req.user.id };
    if (fields.mealType == null) delete fields.mealType;
    const entry = await NutritionLog.create(fields);
    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  if (rejectInvalidId(req.params.id, res)) return;
  const result = validateNutrition(req.body, { userId: req.user.id });
  if (result.errors) {
    return res.status(400).json({ message: "Check the nutrition details.", errors: result.errors });
  }
  try {
    const existing = await NutritionLog.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existing) return res.status(404).json({ message: "Nutrition entry not found." });

    const $set = { ...result.entry };
    const $unset = {};
    if ($set.foodName == null) {
      delete $set.foodName;
      $unset.foodName = "";
    }
    // Null means the client cleared meal type. An omitted value leaves the stored type alone.
    if ($set.mealType === null) {
      delete $set.mealType;
      $unset.mealType = "";
    } else if ($set.mealType == null) {
      delete $set.mealType;
    }
    if (!$set.estimate && existing.estimate) {
      const provenance = existing.estimate.toObject();
      const nutrientsChanged = nutritionFields.some((field) => $set[field] !== existing[field]);
      $set.estimate = { ...provenance, edited: nutrientsChanged ? true : Boolean(provenance.edited) };
    }
    const update = { $set };
    if (Object.keys($unset).length) update.$unset = $unset;

    const entry = await NutritionLog.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true, runValidators: true },
    )
      .select(entryFields)
      .lean();
    if (!entry) return res.status(404).json({ message: "Nutrition entry not found." });
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  if (rejectInvalidId(req.params.id, res)) return;
  try {
    const entry = await NutritionLog.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!entry) return res.status(404).json({ message: "Nutrition entry not found." });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
