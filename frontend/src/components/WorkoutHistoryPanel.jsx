import { useEffect, useState } from "react";

import Icon from "./Icon.jsx";
import WorkoutList from "./WorkoutList.jsx";
import WorkoutStatus from "./WorkoutStatus.jsx";
import { localDateKey } from "../lib/workoutProgress.js";
import "./workout-history-panel.css";

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export default function WorkoutHistoryPanel({
  resource,
  onRepeat,
  saving,
  celebration,
  onCelebrated,
}) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [visibleCount, setVisibleCount] = useState(10);
  useEffect(() => {
    if (!celebration) return;
    const index = resource.workouts.findIndex(
      (workout) => workout._id === celebration.id,
    );
    if (index >= 0) setVisibleCount((count) => Math.max(count, index + 1));
  }, [celebration, resource.workouts]);
  const today = localDateKey();
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekStart = localDateKey(monday);
  const search = query.trim().toLocaleLowerCase();
  const sessions = resource.workouts.filter((workout) => {
    const date = workout.date.slice(0, 10);
    return (
      (period === "all" || (date >= weekStart && date <= today)) &&
      (!search ||
        `${workout.name} ${workout.notes || ""}`
          .toLocaleLowerCase()
          .includes(search))
    );
  });
  const recorded = sessions.filter((workout) =>
    Number.isFinite(workout.durationMinutes),
  );
  const minutes = recorded.reduce(
    (total, workout) => total + workout.durationMinutes,
    0,
  );
  const filtered = query !== "" || period !== "all";

  function clearFilters() {
    setQuery("");
    setPeriod("all");
    setVisibleCount(10);
  }

  return (
    <section className="workout-history" aria-labelledby="history-title">
      <header className="history-heading">
        <div>
          <h2 id="history-title" tabIndex={-1}>
            Your sessions
          </h2>
          <p>Your workout history, newest first.</p>
        </div>
        <button
          className="refresh-button"
          onClick={() => resource.refresh()}
          disabled={resource.pending}
          aria-label="Refresh workouts"
        >
          <Icon name="refresh" />
        </button>
      </header>
      <WorkoutStatus {...resource} />
      {resource.workouts.length > 0 && (
        <>
          <div className="history-toolbar">
            <label className="history-search">
              <span className="sr-only">Search sessions</span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(10);
                }}
                placeholder="Search names or notes"
              />
            </label>
            <div
              className="history-period"
              role="group"
              aria-label="History period"
            >
              <button
                type="button"
                aria-pressed={period === "all"}
                onClick={() => {
                  setPeriod("all");
                  setVisibleCount(10);
                }}
              >
                All time
              </button>
              <button
                type="button"
                aria-pressed={period === "week"}
                onClick={() => {
                  setPeriod("week");
                  setVisibleCount(10);
                }}
              >
                This week
              </button>
            </div>
          </div>
          <div className="history-overview">
            <p aria-live="polite">
              <strong>{sessions.length}</strong>{" "}
              {sessions.length === 1 ? "session" : "sessions"}
              <span aria-hidden="true"> / </span>
              <span>
                {recorded.length
                  ? `${number.format(minutes)} min recorded`
                  : "No duration recorded"}
              </span>
            </p>
            {filtered && (
              <button className="text-link" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </>
      )}
      {resource.loading ? (
        <p className="session-message" role="status">
          Loading workouts…
        </p>
      ) : (
        resource.updatedAt &&
        (sessions.length ? (
          <>
            <WorkoutList
              workouts={sessions.slice(0, visibleCount)}
              grouped
              onRepeat={onRepeat}
              repeatDisabled={saving || resource.sessionExpired}
              celebration={celebration}
              onCelebrated={onCelebrated}
            />
            {sessions.length > 10 && (
              <div className="history-pagination">
                <p>
                  Showing {Math.min(visibleCount, sessions.length)} of{" "}
                  {sessions.length} sessions
                </p>
                {visibleCount < sessions.length && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setVisibleCount((count) => count + 10)}
                  >
                    Show more sessions
                  </button>
                )}
              </div>
            )}
          </>
        ) : resource.workouts.length ? (
          <div className="history-empty">
            <h3>No sessions match</h3>
            <p>Try another name or a different date range.</p>
            <button className="secondary-button" onClick={clearFilters}>
              Show all sessions
            </button>
          </div>
        ) : (
          <div className="history-empty">
            <span className="history-empty-line" aria-hidden="true" />
            <h3>Your first session starts here</h3>
            <p>
              Choose an activity and a duration. Your completed sessions will
              build a history here.
            </p>
          </div>
        ))
      )}
    </section>
  );
}
