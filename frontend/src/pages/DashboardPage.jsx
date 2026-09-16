import { useState } from "react";
import { Link } from "react-router-dom";

import Icon from "../components/Icon.jsx";
import MovementMascot from "../components/MovementMascot.jsx";
import eveningTrail from "../assets/photos/evening-trail.webp";
import WorkoutList from "../components/WorkoutList.jsx";
import WorkoutStatus from "../components/WorkoutStatus.jsx";
import WorkoutAnalytics from "../components/WorkoutAnalytics.jsx";
import InsightView from "../components/InsightView.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useWorkouts from "../hooks/useWorkouts.js";
import {
  formatWorkoutDate,
  getWorkoutProgress,
} from "../lib/workoutProgress.js";
import "./dashboard.css";

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function WeeklyActivity({ progress, selectedDate, onSelectDate }) {
  const maximum = Math.max(1, ...progress.days.map((day) => day.count));
  return (
    <section className="weekly-widget" aria-labelledby="weekly-title">
      <div className="widget-heading">
        <h2 id="weekly-title">Your weekly rhythm</h2>
        <span className="week-range">{progress.weekLabel}</span>
      </div>
      <p className="weekly-total">
        <strong>{progress.count}</strong>
        <span>
          {progress.count === 1 ? "workout" : "workouts"}
          <br />
          this week
        </span>
      </p>
      {progress.comparison && (
        <p className="weekly-comparison">{progress.comparison}</p>
      )}
      <ol className="activity-week" aria-label="Workouts by day">
        {progress.days.map((day) => (
          <li
            key={day.key}
            className={day.isToday ? "activity-day is-today" : "activity-day"}
          >
            <button
              className="day-button"
              disabled={day.isFuture}
              aria-label={`${formatWorkoutDate(day.key, true)}: ${day.isFuture ? "upcoming" : `${day.count} ${day.count === 1 ? "workout" : "workouts"}`}${day.isToday ? ", today" : ""}`}
              aria-pressed={selectedDate === day.key}
              aria-controls="workout-sessions"
              onClick={() =>
                onSelectDate(selectedDate === day.key ? null : day.key)
              }
            >
              <span className="day-count" aria-hidden="true">
                {day.isFuture ? "–" : day.count}
              </span>
              <span className="day-track" aria-hidden="true">
                <span
                  className="day-fill"
                  style={{ height: `${(day.count / maximum) * 100}%` }}
                />
              </span>
              <span className="day-label" aria-hidden="true">
                {day.label}
              </span>
              <span className="day-date" aria-hidden="true">
                {day.day}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="weekly-footnote">
        <span>
          <span className="today-marker" /> Today
        </span>
        <span>Select a day to see its sessions.</span>
      </div>
    </section>
  );
}

function DayWorkouts({ date }) {
  const resource = useWorkouts({ date });
  return (
    <>
      <WorkoutStatus {...resource} />
      {resource.loading ? (
        <p className="session-message" role="status">
          Loading sessions…
        </p>
      ) : (
        resource.updatedAt &&
        (resource.workouts.length ? (
          <WorkoutList workouts={resource.workouts} />
        ) : (
          <div className="day-empty">
            <p className="session-message">
              Nothing logged for {formatWorkoutDate(date)}.
            </p>
            <Link className="progress-button" to={`/workouts?date=${date}`}>
              Log a workout for this day
            </Link>
          </div>
        ))
      )}
    </>
  );
}

function RecentWorkouts({ workouts, selectedDate, onClearDate }) {
  const [showStats, setShowStats] = useState(false);
  const recent = workouts.slice(0, 3);
  return (
    <section
      id="workout-sessions"
      className="recent-workouts"
      aria-labelledby="recent-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="recent-title" tabIndex={-1}>
            {showStats
              ? "Deep Insight"
              : selectedDate
                ? formatWorkoutDate(selectedDate)
                : "Recent workouts"}
          </h2>
          <p>
            {showStats
              ? "Your movement, with a little perspective."
              : selectedDate
                ? "Sessions from your selected day."
                : workouts.length
                  ? `Your latest ${recent.length === 1 ? "session" : `${recent.length} sessions`}. A little time for you.`
                  : "A record of your completed workouts."}
          </p>
        </div>
        <div className="recent-heading-actions">
          <button
            type="button"
            className="insight-button"
            aria-expanded={showStats}
            aria-controls="workout-detail-view"
            onClick={() => setShowStats((show) => !show)}
          >
            <Icon name="search" size={17} />
            {showStats ? "Back to sessions" : "Deep Insight"}
          </button>
          {selectedDate ? (
            <button className="text-link" onClick={onClearDate}>
              Show recent
            </button>
          ) : (
            <Link className="text-link" to="/workouts">
              View all
            </Link>
          )}
        </div>
      </div>
      <div
        id="workout-detail-view"
        className="session-content"
        key={selectedDate || "recent"}
      >
        <InsightView active={showStats}>
          <WorkoutAnalytics />
        </InsightView>
        <InsightView active={!showStats}>
          {selectedDate ? (
            <DayWorkouts key={selectedDate} date={selectedDate} />
          ) : workouts.length ? (
            <>
              <p className="trail-caption">
                Minutes per session, newest first.
              </p>
              <WorkoutList workouts={recent} illustrated />
            </>
          ) : (
            <div className="workout-empty">
              <div className="empty-workout-copy">
                <h3>Your first workout belongs here.</h3>
                <p>A short walk counts, too.</p>
                <div className="empty-workout-actions">
                  <Link
                    className="progress-button"
                    to="/workouts?activity=Walk"
                  >
                    Log a walk
                  </Link>
                  <Link className="text-link" to="/workouts">
                    Choose another activity
                  </Link>
                </div>
              </div>
            </div>
          )}
        </InsightView>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const resource = useWorkouts({ summary: true });
  const { data, loading, pending, refreshing, updatedAt, refresh } = resource;
  const [selectedDate, setSelectedDate] = useState(null);
  const name = user?.displayName || user?.email?.split("@")[0] || "there";
  const progress = getWorkoutProgress(data);
  const selection = progress?.days.some((day) => day.key === selectedDate)
    ? selectedDate
    : null;

  return (
    <div className="progress-dashboard">
      <header className="progress-heading dashboard-hero">
        <img
          className="dashboard-landscape"
          src={eveningTrail}
          alt=""
          width="1600"
          height="600"
          fetchPriority="high"
        />
        <div>
          <p>Welcome back, {name}</p>
          <h1>Your progress</h1>
        </div>
        <Link className="progress-button" to="/workouts">
          <Icon name="plus" />
          Log workout
        </Link>
      </header>
      <div className="progress-toolbar">
        <span>
          <Icon name="calendar" size={17} />
          This week <span className="toolbar-date">{progress?.weekLabel}</span>
        </span>
        <button
          className="refresh-button"
          onClick={() => refresh()}
          disabled={pending}
        >
          <Icon name="refresh" size={16} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <WorkoutStatus {...resource} />
      {loading ? (
        <div className="progress-loading" role="status">
          <Icon name="activity" size={32} />
          <p>Loading your progress…</p>
          <div className="loading-capsules" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </div>
      ) : (
        progress && (
          <>
            <div className="progress-widgets">
              <WeeklyActivity
                progress={progress}
                selectedDate={selection}
                onSelectDate={setSelectedDate}
              />
              <div className="supporting-widgets">
                <section
                  className="minutes-widget"
                  aria-labelledby="minutes-title"
                >
                  <div className="minutes-copy">
                    <h2 id="minutes-title">Time in movement</h2>
                    <p className="metric-value">
                      {progress.durationsRecorded > 0 || progress.count === 0
                        ? number.format(progress.minutes)
                        : "–"}
                      <span>min</span>
                    </p>
                    <p className="metric-caption">
                      {progress.durationsRecorded < progress.count
                        ? `Duration recorded for ${progress.durationsRecorded} of ${progress.count} workouts`
                        : "Recorded this week"}
                    </p>
                  </div>
                  <MovementMascot key={user.id} count={progress.count} />
                </section>
                <section
                  className="active-widget"
                  aria-labelledby="active-title"
                >
                  <div>
                    <h2 id="active-title">Days you moved</h2>
                    <p className="active-value">
                      <strong>{progress.activeDays}</strong>
                      <span>of 7 days</span>
                    </p>
                    <p className="active-caption">
                      {progress.activeDays > 0
                        ? "You made time to move this week."
                        : "Your week has room for movement."}
                    </p>
                  </div>
                </section>
              </div>
            </div>
            <RecentWorkouts
              key={user.id}
              workouts={progress.recent}
              selectedDate={selection}
              onClearDate={() => setSelectedDate(null)}
            />
          </>
        )
      )}
      {updatedAt && (
        <footer className="progress-footer">
          Updated{" "}
          {updatedAt.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          . Refreshes automatically.
        </footer>
      )}
    </div>
  );
}
