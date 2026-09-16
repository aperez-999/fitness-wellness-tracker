export function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().startsWith(value)
  );
}

export function todayInZone(timeZone = "UTC", now = new Date()) {
  if (typeof timeZone !== "string" || timeZone.length > 100) {
    throw new RangeError("Invalid timezone");
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function weekBounds(today) {
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function validateWorkout(body, now = new Date()) {
  const { name, date, durationMinutes, notes, timeZone } = body ?? {};
  const errors = {};
  let today;
  try {
    today = todayInZone(timeZone, now);
  } catch {
    errors.timeZone = "Use a valid timezone.";
  }

  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
    errors.name = "Enter a workout name between 1 and 120 characters.";
  }
  if (!isCalendarDate(date)) {
    errors.date = "Enter a valid date in YYYY-MM-DD format.";
  } else if (today && date > today) {
    errors.date = "Choose today or an earlier date for a completed workout.";
  }

  const hasDuration =
    typeof durationMinutes === "number" ||
    (typeof durationMinutes === "string" && durationMinutes.trim() !== "");
  const duration = hasDuration ? Number(durationMinutes) : NaN;
  if (!Number.isFinite(duration) || duration < 0) {
    errors.durationMinutes = "Enter a duration of zero minutes or more.";
  }
  if (notes != null && (typeof notes !== "string" || notes.length > 2000)) {
    errors.notes = "Keep notes under 2,001 characters.";
  }

  if (Object.keys(errors).length) return { errors };
  return {
    workout: {
      name: name.trim(),
      date,
      durationMinutes: duration,
      notes: notes?.trim() || undefined,
    },
  };
}
