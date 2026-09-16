import { useState } from "react";
import useWorkouts from "../hooks/useWorkouts.js";
import { calendarDate, formatWorkoutDate } from "../lib/workoutProgress.js";
import { getWorkoutAnalytics } from "../lib/workoutAnalytics.js";
import WorkoutStatus from "./WorkoutStatus.jsx";
import "./workout-analytics.css";

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const valueLabel = (day, metric) =>
  metric === "minutes" && day.count > 0 && day.durationsRecorded === 0
    ? "Not recorded"
    : number.format(day[metric]);

export default function WorkoutAnalytics() {
  const resource = useWorkouts({ analytics: true });
  const [metric, setMetric] = useState("count");
  const [view, setView] = useState("week");
  const [selected, setSelected] = useState(null);
  const progress = getWorkoutAnalytics(resource.data);
  const unit = metric === "count" ? "workouts" : "min";
  const difference = progress
    ? progress.current[metric] - progress.previous[metric]
    : 0;

  return (
    <div className="workout-analytics">
      <WorkoutStatus {...resource} />
      {resource.loading ? (
        <p role="status" className="session-message">
          Loading your stats…
        </p>
      ) : (
        progress && (
          <>
            <div className="analytics-controls">
              <div
                className="analytics-switch"
                role="group"
                aria-label="Chart view"
              >
                {[
                  ["week", "Week comparison"],
                  ["timeline", "4-week timeline"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={view === key}
                    onClick={() => {
                      setView(key);
                      setSelected(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                className="analytics-switch"
                role="group"
                aria-label="Chart metric"
              >
                {[
                  ["count", "Workouts"],
                  ["minutes", "Minutes"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={metric === key}
                    onClick={() => setMetric(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="analytics-comparison">
              <p>
                <span>This week so far</span>
                <strong>
                  {valueLabel(progress.current, metric)} <small>{unit}</small>
                </strong>
              </p>
              <p>
                <span>Same days last week</span>
                <strong>
                  {valueLabel(progress.previous, metric)} <small>{unit}</small>
                </strong>
              </p>
              <p className="analytics-context">
                <span className="analytics-delta">
                  {progress.previous.count === 0
                    ? "Your comparison starts here"
                    : difference === 0
                      ? "On par with last week"
                      : `${number.format(Math.abs(difference))} ${unit} ${difference > 0 ? "more" : "fewer"} than last week`}
                </span>
                {formatWorkoutDate(resource.data.weekStart)}–
                {formatWorkoutDate(resource.data.today)} compared with the same
                weekdays last week.{" "}
                {progress.previous.count === 0
                  ? "No sessions recorded in that earlier period."
                  : "Every week can look different."}
              </p>
            </div>
            <div className="analytics-chart-heading">
              <h3>
                {view === "week" ? "Your daily rhythm" : "The longer view"}
              </h3>
              <p>
                {view === "week"
                  ? "The same weekdays, side by side."
                  : "Small sessions, seen over time."}
              </p>
            </div>
            {metric === "minutes" &&
              progress.timeline.some(
                (day) => day.durationsRecorded < day.count,
              ) && (
                <p className="analytics-note">
                  Some sessions have no duration. Minute totals include recorded
                  durations only; hollow timeline markers mean no duration.
                </p>
              )}
            {view === "week" ? (
              <WeekChart
                days={progress.week}
                metric={metric}
                selected={selected}
                onSelect={setSelected}
              />
            ) : (
              <Timeline
                days={progress.timeline}
                metric={metric}
                selected={selected}
                onSelect={setSelected}
              />
            )}
            <p className="analytics-reading" aria-live="polite">
              {selectionDescription(progress, view, selected, metric, unit)}
            </p>
            {view === "timeline" && (
              <p className="timeline-scroll-hint">
                Scroll the timeline to explore all four weeks.
              </p>
            )}
            <details className="analytics-table">
              <summary>View data table</summary>
              <div className="analytics-table-scroll">
                <table>
                  <caption>
                    Recorded activity across four calendar weeks, through today
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Workouts</th>
                      <th scope="col">Recorded minutes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.timeline.map((day) => (
                      <tr key={day.date}>
                        <th scope="row">{formatWorkoutDate(day.date)}</th>
                        <td>{day.count}</td>
                        <td>{valueLabel(day, "minutes")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )
      )}
    </div>
  );
}

function WeekChart({ days, metric, selected, onSelect }) {
  const maximum = Math.max(
    1,
    ...days
      .filter((day) => !day.future)
      .flatMap((day) => [day.current[metric], day.previous[metric]]),
  );
  return (
    <figure className="week-comparison-chart">
      <figcaption>
        <span className="chart-key current-key">This week</span>
        <span className="chart-key previous-key">Last week</span>
      </figcaption>
      <div className="paired-bars">
        {days.map((day) => (
          <button
            key={day.date}
            disabled={day.future}
            aria-pressed={selected === day.date}
            aria-label={`${formatWorkoutDate(day.date, true)}: ${day.future ? "upcoming" : `${valueLabel(day.current, metric)} this week, ${valueLabel(day.previous, metric)} last week`}`}
            onClick={() => onSelect(day.date)}
          >
            <span className="paired-values" aria-hidden="true">
              {day.future ? "—" : valueLabel(day.current, metric)}
            </span>
            <span className="paired-tracks" aria-hidden="true">
              <span
                className="comparison-bar is-current"
                style={{
                  height: `${day.future ? 0 : (day.current[metric] / maximum) * 100}%`,
                }}
              />
              <span
                className="comparison-bar is-previous"
                style={{
                  height: `${day.future ? 0 : (day.previous[metric] / maximum) * 100}%`,
                }}
              />
            </span>
            <span>
              {calendarDate(day.date).toLocaleDateString(undefined, {
                weekday: "short",
              })}
            </span>
          </button>
        ))}
      </div>
    </figure>
  );
}

function Timeline({ days, metric, selected, onSelect }) {
  const maximum = Math.max(1, ...days.map((day) => day[metric]));
  const points = days.map((day, index) => ({
    ...day,
    missing:
      metric === "minutes" && day.count > 0 && day.durationsRecorded === 0,
    x: 32 + (index / Math.max(1, days.length - 1)) * 656,
    y: 176 - (day[metric] / maximum) * 140,
  }));
  let connected = false;
  const path = points
    .map((day) => {
      // Leave gaps for unknown durations instead of drawing them as recorded zero.
      if (day.missing) {
        connected = false;
        return "";
      }
      const command = `${connected ? "L" : "M"}${day.x},${day.y}`;
      connected = true;
      return command;
    })
    .join(" ");
  return (
    <figure className="activity-timeline">
      <figcaption>
        Daily {metric === "count" ? "workouts" : "recorded minutes"} across four
        calendar weeks
      </figcaption>
      <svg
        viewBox="0 0 720 220"
        role="group"
        aria-label="Daily activity timeline"
      >
        {[0, maximum / 2, maximum].map((value, index) => (
          <g key={index} aria-hidden="true">
            <line
              x1="32"
              x2="688"
              y1={176 - (value / maximum) * 140}
              y2={176 - (value / maximum) * 140}
              className="timeline-grid"
            />
            <text x="24" y={180 - (value / maximum) * 140} textAnchor="end">
              {number.format(value)}
            </text>
          </g>
        ))}
        <path d={path} className="timeline-line" aria-hidden="true" />
        {points.map((day) => (
          <g
            key={day.date}
            tabIndex={0}
            role="button"
            aria-pressed={selected === day.date}
            aria-label={`${formatWorkoutDate(day.date, true)}: ${valueLabel(day, metric)} ${metric === "count" ? "workouts" : "minutes"}`}
            onClick={() => onSelect(day.date)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(day.date);
              }
            }}
          >
            <circle cx={day.x} cy={day.y} r="11" className="timeline-hit" />
            <circle
              cx={day.x}
              cy={day.y}
              r={selected === day.date || day.missing ? 5 : 3}
              className={`timeline-dot${day.missing ? " is-missing" : ""}`}
            />
          </g>
        ))}
        {[points[0], points.at(-1)].map((day, index) => (
          <text
            key={day.date}
            x={day.x}
            y="209"
            textAnchor={index ? "end" : "start"}
            aria-hidden="true"
          >
            {formatWorkoutDate(day.date)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

function selectionDescription(progress, view, selected, metric, unit) {
  const days = view === "week" ? progress.week : progress.timeline;
  const day = days.find((item) => item.date === selected);
  if (!day) return "Select a day in the graph to see its details.";
  const current = view === "week" ? day.current : day;
  const description = `${formatWorkoutDate(day.date, true)}: ${valueLabel(current, metric)} ${unit}.`;
  return view === "week"
    ? `${description} Same weekday last week: ${valueLabel(day.previous, metric)} ${unit}.`
    : description;
}
