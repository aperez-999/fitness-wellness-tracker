// Progress for goals that count workouts instead of a number the user sets.

// "YYYY-MM-DD" for a date saved at midnight UTC, which is how goal and workout dates are stored.
export const dayKey = (date) => date.toISOString().slice(0, 10);

// The days whose workouts count toward a tracked goal: its start date through its
// target date, but never past today, so workouts dated in the future don't count yet.
export function progressWindow(goal, today) {
  const target = dayKey(goal.targetDate);
  return { start: dayKey(goal.startDate), end: target < today ? target : today };
}

// A tracked goal's progress: how many of the user's workouts fall in its window, or how
// many minutes they recorded. Workouts saved without a duration add no minutes.
export function trackedProgress(goal, workouts, today) {
  const { start, end } = progressWindow(goal, today);
  let total = 0;
  for (const workout of workouts) {
    const day = dayKey(workout.date);
    if (day < start || day > end) continue;
    if (goal.tracking === "workoutCount") total += 1;
    else if (typeof workout.durationMinutes === "number") total += workout.durationMinutes;
  }
  // Completed goals show this real count too. Unlike manual goals, nothing is raised to the target.
  return total;
}
