import { useCallback, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { activities } from "../components/ActivityArt.jsx";
import WorkoutComposer from "../components/WorkoutComposer.jsx";
import WorkoutHistoryPanel from "../components/WorkoutHistoryPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useWorkouts from "../hooks/useWorkouts.js";
import { localDateKey, workoutDateKey } from "../lib/workoutProgress.js";
import "./dashboard.css";
import "./workouts.css";

const encouragements = [
  "You did it!",
  "Great work!",
  "One more in the books!",
  "Keep showing up!",
];

export default function WorkoutsPage() {
  const { user } = useAuth();
  // Switching accounts must discard the previous user's draft and filters.
  return <WorkoutHistory key={user.id} />;
}

function WorkoutHistory() {
  const resource = useWorkouts();
  const [searchParams] = useSearchParams();
  const requestedActivity = searchParams.get("activity");
  const initialActivity =
    activities.includes(requestedActivity) && requestedActivity !== "Custom"
      ? requestedActivity
      : "";
  const requestedDate = searchParams.get("date");
  const date =
    requestedDate &&
    workoutDateKey(requestedDate) === requestedDate &&
    requestedDate <= localDateKey()
      ? requestedDate
      : localDateKey();
  const [repeat, setRepeat] = useState(null);
  const [saving, setSaving] = useState(false);
  // Clear history filters after saving so the new session stays visible.
  const [historyVersion, setHistoryVersion] = useState(0);
  const [celebration, setCelebration] = useState(null);
  const saveCount = useRef(0);
  const finishCelebration = useCallback(() => setCelebration(null), []);

  function workoutSaved(workout) {
    setCelebration({
      id: workout._id,
      message: encouragements[saveCount.current % encouragements.length],
    });
    saveCount.current += 1;
    setHistoryVersion((version) => version + 1);
  }

  function logAgain(workout) {
    setRepeat((current) => ({ workout, version: (current?.version || 0) + 1 }));
  }

  return (
    <div className="progress-dashboard workouts-page">
      <header className="progress-heading">
        <div>
          <p>A record of your movement</p>
          <h1>Your workouts</h1>
        </div>
        <Link className="text-link" to="/dashboard">
          View progress
        </Link>
      </header>
      <div className="workouts-layout">
        <WorkoutComposer
          key={`${date}:${initialActivity}:${repeat?.version || 0}`}
          date={date}
          initialActivity={initialActivity}
          repeat={repeat?.workout}
          saving={saving}
          disabled={resource.sessionExpired}
          onSaving={setSaving}
          onSaved={workoutSaved}
          onExpired={resource.refresh}
        />
        <WorkoutHistoryPanel
          key={historyVersion}
          resource={resource}
          onRepeat={logAgain}
          saving={saving}
          celebration={celebration}
          onCelebrated={finishCelebration}
        />
      </div>
    </div>
  );
}
