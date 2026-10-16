import { goalCategories, goalStatuses, goalTrackingTypes } from "../models/Goal.js";
import { isCalendarDate, todayInZone } from "./workoutValidation.js";

export const GOAL_TITLE_MAX = 120;
export const GOAL_UNIT_MAX = 30;
export const GOAL_VALUE_MAX = 10_000_000;
// Tracked goals always use these units, so the numbers match what is counted.
export const TRACKED_GOAL_UNITS = { workoutCount: "workouts", workoutMinutes: "minutes", workoutHours: "hours" };

// Turns a number or numeric text ("20", "2.5") into a number.
// Anything else (blank text, "-5", true, [], {}) becomes NaN, which fails the checks below.
function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^(?:\d+\.?\d*|\.\d+)$/.test(value.trim())) {
    return Number(value);
  }
  return NaN;
}

// Checks a goal sent from the browser.
// Returns { errors } with one message per bad field, or { goal } with clean values.
//
// options.now               the current time (tests pass a fixed one)
// options.mode              "create" or "update"
// options.currentTargetDate when updating, the goal's saved date as "YYYY-MM-DD".
//                           Keeping that date is allowed even if it has passed,
//                           so overdue goals can still be edited or completed.
// options.currentStatus     when updating, the goal's saved status. Used when the
//                           request doesn't change the status (like a progress update).
// options.currentTracking   when updating, the goal's saved tracking. Used when the
//                           request doesn't send one.
export function validateGoal(
  body,
  { now = new Date(), mode = "create", currentTargetDate, currentStatus, currentTracking } = {},
) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const errors = {};
  const goal = {};

  // Name
  if (
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.trim().length > GOAL_TITLE_MAX
  ) {
    errors.title = "Enter a goal name between 1 and 120 characters.";
  } else {
    goal.title = input.title.trim();
  }

  // Type
  if (!goalCategories.includes(input.category)) {
    errors.category = "Choose workout, nutrition, or wellness.";
  } else {
    goal.category = input.category;
  }

  // Tracking: where progress comes from. New goals are manual unless they say otherwise.
  // An update that doesn't send tracking keeps the saved choice. Goals saved before
  // tracking existed have no saved value, which means manual.
  const tracking = input.tracking ?? (mode === "update" ? currentTracking ?? "manual" : "manual");
  if (!goalTrackingTypes.includes(tracking)) {
    errors.tracking = "Choose manual, workout count, workout minutes, or workout hours.";
  } else if (tracking !== "manual" && input.category !== "workout") {
    errors.tracking = "Only workout goals can count your workouts.";
  } else {
    goal.tracking = tracking;
  }
  // Tracked goals get their progress and unit from workouts, so the checks below skip those.
  const tracked = goal.tracking != null && goal.tracking !== "manual";

  // Target value: required, above zero
  const target = toNumber(input.targetValue);
  if (!Number.isFinite(target) || target <= 0) {
    errors.targetValue = "Enter a target above zero.";
  } else if (target > GOAL_VALUE_MAX) {
    errors.targetValue = "Keep the target at 10,000,000 or less.";
  } else {
    goal.targetValue = target;
  }

  // Progress: manual goals only. Optional, blank means 0. Going past the target is allowed.
  // Tracked goals leave the saved number alone; switching back to manual saves whatever progress is sent.
  if (!tracked) {
    const blankProgress =
      input.currentValue == null ||
      (typeof input.currentValue === "string" && input.currentValue.trim() === "");
    const progress = blankProgress ? 0 : toNumber(input.currentValue);
    if (!Number.isFinite(progress) || progress < 0) {
      errors.currentValue = "Enter progress of zero or more.";
    } else if (progress > GOAL_VALUE_MAX) {
      errors.currentValue = "Keep progress at 10,000,000 or less.";
    } else {
      goal.currentValue = progress;
    }
  }

  // Unit: fixed for tracked goals, otherwise an optional label like "miles"
  if (tracked) {
    goal.unit = TRACKED_GOAL_UNITS[goal.tracking];
  } else if (input.unit != null) {
    if (typeof input.unit !== "string" || input.unit.trim().length > GOAL_UNIT_MAX) {
      errors.unit = "Keep the unit to 30 characters or fewer.";
    } else {
      goal.unit = input.unit.trim() || undefined;
    }
  }

  // Target date: a real calendar day, today or later in the user's timezone
  let today;
  try {
    today = todayInZone(input.timeZone, now);
  } catch {
    errors.timeZone = "Use a valid timezone.";
  }
  if (input.targetDate == null || input.targetDate === "") {
    errors.targetDate = "Choose a target date.";
  } else if (!isCalendarDate(input.targetDate)) {
    errors.targetDate = "Enter a valid date in YYYY-MM-DD format.";
  } else if (today && input.targetDate < today && input.targetDate !== currentTargetDate) {
    errors.targetDate = "Choose today or a later date.";
  } else {
    goal.targetDate = input.targetDate;
  }

  // Start date: tracked goals only. Workouts from this day through the target date count.
  // Past days are allowed, so a goal for this month can count its first few days.
  if (tracked) {
    if (input.startDate == null || input.startDate === "") {
      errors.startDate = "Choose a start date.";
    } else if (!isCalendarDate(input.startDate)) {
      errors.startDate = "Enter a valid date in YYYY-MM-DD format.";
    } else if (goal.targetDate && input.startDate > goal.targetDate) {
      errors.startDate = "Choose a start date on or before the target date.";
    } else {
      goal.startDate = input.startDate;
    }
  }

  // Status: new goals are always active. Updates may mark a goal completed (or reopen it).
  if (mode === "update" && input.status != null) {
    if (!goalStatuses.includes(input.status)) {
      errors.status = "Choose active or completed.";
    } else {
      goal.status = input.status;
    }
  }

  // A completed goal counts as fully achieved, so its progress is raised to the target.
  // Progress already above the target is kept as is. Tracked goals have no saved
  // progress here, so this only applies to manual goals.
  const status = goal.status ?? (mode === "update" ? currentStatus : undefined);
  if (status === "completed" && goal.targetValue != null && goal.currentValue != null) {
    goal.currentValue = Math.max(goal.currentValue, goal.targetValue);
  }

  return Object.keys(errors).length ? { errors } : { goal };
}
