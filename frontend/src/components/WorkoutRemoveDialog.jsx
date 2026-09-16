import { useEffect, useId, useRef, useState } from "react";

import { getToken, removeWorkout } from "../lib/api.js";
import { formatWorkoutDate } from "../lib/workoutProgress.js";
import "./workout-remove-dialog.css";

export default function WorkoutRemoveDialog({ workout, onClose, onRemoved }) {
  const dialog = useRef(null);
  const request = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => {
      request.current?.abort();
      element.close();
    };
  }, []);

  function cancelRemoval() {
    dialog.current.close();
    onClose();
  }

  async function confirmRemoval() {
    if (request.current) return;
    const controller = new AbortController();
    const token = getToken();
    request.current = controller;
    setPending(true);
    setError("");
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      await removeWorkout(workout._id, { signal: controller.signal });
      if (getToken() !== token || !dialog.current?.open) return;
      dialog.current.close();
      onRemoved();
    } catch (failure) {
      if (getToken() !== token || !dialog.current?.open) return;
      setError(
        failure.status === 401
          ? "Your session has expired. Sign in again to remove this workout."
          : "Couldn’t confirm removal. Refresh your workouts or try again.",
      );
    } finally {
      window.clearTimeout(timeout);
      request.current = null;
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="workout-remove-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) cancelRemoval();
      }}
    >
      <h2 id={titleId}>Remove this session?</h2>
      <p id={descriptionId}>
        This deletes the workout from your history and updates your progress.
        You can’t undo this.
      </p>
      <div className="removal-session">
        <strong>{workout.name}</strong>
        <span>{formatWorkoutDate(workout.date, true)}</span>
        <span>
          {Number.isFinite(workout.durationMinutes)
            ? `${workout.durationMinutes} min`
            : "Duration not recorded"}
        </span>
      </div>
      {error && (
        <p className="removal-error" role="alert">
          {error}
        </p>
      )}
      <div className="removal-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={pending}
          onClick={cancelRemoval}
        >
          Keep session
        </button>
        <button
          type="button"
          className="progress-button"
          disabled={pending}
          onClick={confirmRemoval}
        >
          {pending ? "Removing…" : "Remove session"}
        </button>
      </div>
    </dialog>
  );
}
