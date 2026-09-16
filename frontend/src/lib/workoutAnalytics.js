import { calendarDate, localDateKey } from "./workoutProgress.js";

export function shiftDay(key, offset) {
  const date = calendarDate(key);
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
}

export function totalDays(days) {
  return days.reduce(
    (total, day) => ({
      count: total.count + day.count,
      minutes: total.minutes + day.minutes,
      durationsRecorded: total.durationsRecorded + day.durationsRecorded,
      activeDays: total.activeDays + (day.count > 0 ? 1 : 0),
    }),
    { count: 0, minutes: 0, durationsRecorded: 0, activeDays: 0 },
  );
}

export function getWorkoutAnalytics(data) {
  if (!data) return null;
  const indexed = new Map(data.daily.map((day) => [day.date, day]));
  const dayAt = (date) =>
    indexed.get(date) || { date, count: 0, minutes: 0, durationsRecorded: 0 };
  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = shiftDay(data.weekStart, offset);
    return {
      date,
      future: date > data.today,
      current: dayAt(date),
      previous: dayAt(shiftDay(date, -7)),
    };
  });
  const elapsed = week.filter((day) => !day.future);
  const timeline = Array.from({ length: 28 }, (_, offset) =>
    dayAt(shiftDay(data.windowStart, offset)),
  ).filter((day) => day.date <= data.today);
  return {
    week,
    timeline,
    current: totalDays(elapsed.map((day) => day.current)),
    previous: totalDays(elapsed.map((day) => day.previous)),
  };
}
