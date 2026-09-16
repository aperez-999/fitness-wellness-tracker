const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const fullDate = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function localDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

// Date-only workout inputs are stored at UTC midnight. Preserve their calendar day.
export function workoutDateKey(value) {
  const key = typeof value === "string" ? value.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;

  const date = new Date(`${key}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(key)
    ? key
    : null;
}

export function calendarDate(key) {
  return new Date(`${key}T12:00:00`);
}

export function formatWorkoutDate(value, full = false) {
  const key = workoutDateKey(value);
  return key
    ? (full ? fullDate : shortDate).format(calendarDate(key))
    : "Date unavailable";
}

export function relativeWorkoutDate(value) {
  const date = workoutDateKey(value);
  if (date === localDateKey()) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date === localDateKey(yesterday)
    ? "Yesterday"
    : formatWorkoutDate(value, true);
}

export function getWorkoutProgress(summary) {
  if (!summary) return null;
  const { today, weekStart, daily, recent } = summary;
  const monday = calendarDate(weekStart);
  const byDate = new Map(daily.map((day) => [day.date, day]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    const key = localDateKey(date);
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      day: date.getDate(),
      isToday: key === today,
      isFuture: key > today,
      count: byDate.get(key)?.count || 0,
    };
  });

  return {
    days,
    count: daily.reduce((sum, day) => sum + day.count, 0),
    activeDays: daily.filter((day) => day.count > 0).length,
    minutes: daily.reduce((sum, day) => sum + day.minutes, 0),
    durationsRecorded: daily.reduce(
      (sum, day) => sum + day.durationsRecorded,
      0,
    ),
    recent,
    comparison: summary.previousWeek
      ? (() => {
          const count = daily.reduce((sum, day) => sum + day.count, 0);
          const previous = summary.previousWeek.daily.reduce(
            (sum, day) => sum + day.count,
            0,
          );
          const difference = count - previous;
          return difference === 0
            ? "Same workout count as these days last week."
            : `${Math.abs(difference)} ${Math.abs(difference) === 1 ? "workout" : "workouts"} ${difference > 0 ? "more" : "fewer"} than these days last week.`;
        })()
      : null,
    weekLabel: `${shortDate.format(monday)} – ${shortDate.format(calendarDate(days[6].key))}`,
  };
}
