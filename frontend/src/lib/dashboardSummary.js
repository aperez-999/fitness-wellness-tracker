// How the dashboard words an active goal. Matches the goal cards on the Goals page.

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
// Goal dates are saved as midnight UTC, so they are shown in UTC to display the day that was picked.
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export const formatGoalDate = (value) => dateFormat.format(new Date(value));

// `today` is the "YYYY-MM-DD" date the server used, so the labels agree with its numbers.
export function goalSnapshot(goal, today) {
  const date = goal.targetDate.slice(0, 10);
  const shownDate = formatGoalDate(goal.targetDate);
  return {
    id: goal._id,
    title: goal.title,
    category: goal.category,
    date,
    overdue: date < today,
    dueText: date < today ? `Overdue since ${shownDate}` : date === today ? "Due today" : `Due ${shownDate}`,
    reached: goal.currentValue >= goal.targetValue,
    percent: Math.min(100, (goal.currentValue / goal.targetValue) * 100),
    progressText: `${numberFormat.format(goal.currentValue)} / ${numberFormat.format(goal.targetValue)}${goal.unit ? ` ${goal.unit}` : ""}`,
  };
}
