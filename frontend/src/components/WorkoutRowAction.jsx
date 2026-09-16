import { useEffect, useId, useRef, useState } from "react";
import useWorkoutMutation from "../hooks/useWorkoutMutation.js";
import useRowReveal from "../hooks/useRowReveal.js";
import { removeWorkout, updateWorkout } from "../lib/api.js";
import { localDateKey, formatWorkoutDate } from "../lib/workoutProgress.js";
import "./workout-row-action.css";

export default function WorkoutRowAction({
  workout,
  mode,
  origin,
  onCancel,
  onDone,
}) {
  const id = useId();
  const root = useRef(null);
  const { pending: saving, error, run } = useWorkoutMutation();
  const { dismiss, isClosing } = useRowReveal(root, origin, onCancel);
  const pending = saving || isClosing;
  const [form, setForm] = useState({
    name: workout.name,
    date: workout.date.slice(0, 10),
    durationMinutes: workout.durationMinutes ?? "",
    notes: workout.notes || "",
  });
  const editing = mode === "edit";
  useEffect(() => {
    root.current
      ?.querySelector("input, button")
      ?.focus({ preventScroll: true });
  }, []);

  function field(name, label, type = "text") {
    const fieldId = `${id}-${name}`;
    return (
      <div className="row-edit-field">
        <label htmlFor={fieldId}>{label}</label>
        <input
          id={fieldId}
          name={name}
          type={type}
          value={form[name]}
          required
          {...(type === "number"
            ? { min: 0, step: "any" }
            : type === "date"
              ? { max: localDateKey() }
              : { maxLength: 120 })}
          aria-invalid={Boolean(error?.fields[name])}
          aria-describedby={
            error?.fields[name] ? `${fieldId}-error` : undefined
          }
          onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        />
        {error?.fields[name] && (
          <p id={`${fieldId}-error`} className="row-action-error">
            {error.fields[name]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={root}
      className={`workout-row-action ${editing ? "is-editing" : "is-removing"}`}
      role="group"
      aria-label={`${editing ? "Edit" : "Remove"} ${workout.name}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !pending) {
          event.preventDefault();
          dismiss();
        }
      }}
    >
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(
              (signal) => updateWorkout(workout._id, form, { signal }),
              () => onDone(`${form.name.trim()} updated.`),
            );
          }}
        >
          <fieldset disabled={pending}>
            <legend>Edit session</legend>
            <div className="row-edit-grid">
              {field("name", "Workout name")}
              {field("date", "Date", "date")}
              {field("durationMinutes", "Minutes", "number")}
            </div>
            <div className="row-edit-field">
              <label htmlFor={`${id}-notes`}>Notes (optional)</label>
              <textarea
                id={`${id}-notes`}
                value={form.notes}
                maxLength={2000}
                rows={2}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </div>
            {error && (
              <p className="row-action-error" role="alert">
                {error.message}
              </p>
            )}
            <div className="row-action-buttons">
              <button
                className="secondary-button"
                type="button"
                onClick={dismiss}
              >
                Cancel
              </button>
              <button className="progress-button" type="submit">
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          <div>
            <p className="row-action-question">Remove {workout.name}?</p>
            <p className="row-action-caption">
              {formatWorkoutDate(workout.date)}
              {Number.isFinite(workout.durationMinutes)
                ? `, ${workout.durationMinutes} min`
                : ""}
              . This can’t be undone.
            </p>
          </div>
          <div className="row-action-buttons">
            <button
              type="button"
              className="secondary-button"
              disabled={pending}
              onClick={dismiss}
            >
              Keep session
            </button>
            <button
              type="button"
              className="progress-button"
              disabled={pending}
              onClick={() =>
                run(
                  (signal) => removeWorkout(workout._id, { signal }),
                  () => onDone(`${workout.name} removed.`),
                )
              }
            >
              {pending ? "Removing…" : "Remove session"}
            </button>
          </div>
          {error && (
            <p className="row-action-error" role="alert">
              {error.message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
