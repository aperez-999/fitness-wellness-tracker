import { useEffect, useRef, useState } from "react";

import ActivityArt, { activities } from "./ActivityArt.jsx";
import Icon from "./Icon.jsx";
import { createWorkout, getToken } from "../lib/api.js";
import {
  formatWorkoutDate,
  localDateKey,
  workoutDateKey,
} from "../lib/workoutProgress.js";

const blank = (date) => ({ name: "", date, durationMinutes: "", notes: "" });

export default function WorkoutComposer({
  date,
  initialActivity = "",
  repeat,
  saving,
  disabled,
  onSaving,
  onSaved,
  onExpired,
}) {
  const [form, setForm] = useState(() => ({
    ...blank(date),
    name: initialActivity,
    ...(repeat
      ? { name: repeat.name, durationMinutes: repeat.durationMinutes ?? "" }
      : {}),
  }));
  const [activity, setActivity] = useState(() =>
    repeat
      ? activities.includes(repeat.name)
        ? repeat.name
        : "Custom"
      : initialActivity,
  );
  const [renaming, setRenaming] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(null);
  const formRef = useRef(null);
  const request = useRef(null);
  const today = localDateKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);
  const dateLabel =
    form.date === today
      ? "Today"
      : form.date === yesterday
        ? "Yesterday"
        : formatWorkoutDate(form.date);

  useEffect(
    () => () => {
      if (request.current) {
        request.current.abort();
        request.current = null;
        onSaving(false);
      }
    },
    [onSaving],
  );

  useEffect(() => {
    if (repeat) {
      formRef.current?.scrollIntoView({ block: "nearest" });
      formRef.current
        ?.querySelector('[name="name"], [aria-pressed="true"]')
        ?.focus({ preventScroll: true });
    }
  }, [repeat]);

  useEffect(() => {
    if (saved && !saving) {
      formRef.current
        ?.querySelector(".activity-choice")
        ?.focus({ preventScroll: true });
    }
  }, [saved, saving]);

  useEffect(() => {
    if (activity === "Custom" || renaming) {
      formRef.current?.elements
        .namedItem("name")
        ?.focus({ preventScroll: true });
    }
  }, [activity, renaming]);

  function update(values) {
    setForm((current) => ({ ...current, ...values }));
    setErrors((current) => ({
      ...current,
      ...Object.fromEntries(Object.keys(values).map((key) => [key, undefined])),
      form: undefined,
    }));
    setSaved(null);
  }

  function chooseActivity(value) {
    setActivity(value);
    setRenaming(false);
    update({ name: value === "Custom" ? "" : value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (request.current) return;
    const nextErrors = {};
    if (!form.name.trim())
      nextErrors.name = "Choose an activity or enter a workout name.";
    if (!workoutDateKey(form.date) || form.date > today)
      nextErrors.date = "Choose today or an earlier date.";
    if (
      !String(form.durationMinutes).trim() ||
      !Number.isFinite(Number(form.durationMinutes)) ||
      Number(form.durationMinutes) < 0
    )
      nextErrors.durationMinutes = "Choose a duration or enter your minutes.";
    setErrors(nextErrors);
    setSaved(null);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.date) setDateOpen(true);
      // Wait for any collapsed field to open before moving focus to its error.
      requestAnimationFrame(() => {
        const field = Object.keys(nextErrors)[0];
        (
          formRef.current?.elements.namedItem(field) ||
          formRef.current?.querySelector(".activity-choice")
        )?.focus();
      });
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    onSaving(true);
    const token = getToken();
    const isCurrent = () =>
      request.current === controller && getToken() === token;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const { workout } = await createWorkout(form, {
        signal: controller.signal,
      });
      // Ignore responses from a cancelled draft or a previous account.
      if (!isCurrent() || controller.signal.aborted) return;
      setSaved(workout);
      onSaved(workout);
      setForm(blank(form.date));
      setActivity("");
      setRenaming(false);
      setNotesOpen(false);
    } catch (error) {
      if (!isCurrent()) return;
      const fields = error.fields || {};
      setErrors(
        Object.keys(fields).length
          ? fields
          : {
              form: controller.signal.aborted
                ? "Saving took too long. Check your sessions before trying again."
                : "Couldn’t save your workout. Try again.",
            },
      );
      if (fields.date) setDateOpen(true);
      if (fields.notes) setNotesOpen(true);
      if (error.status === 401) onExpired();
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        onSaving(false);
      }
    }
  }

  function fieldProps(name) {
    return {
      id: `workout-${name}`,
      name,
      value: form[name],
      onChange: (event) => update({ [name]: event.target.value }),
      "aria-invalid": Boolean(errors[name]),
      "aria-describedby": errors[name] ? `error-${name}` : undefined,
    };
  }
  const fieldError = (name) =>
    errors[name] && (
      <p id={`error-${name}`} className="field-error">
        {errors[name]}
      </p>
    );

  return (
    <section className="workout-form-panel" aria-labelledby="log-title">
      <div className="section-heading">
        <div>
          <h2 id="log-title">What got you moving?</h2>
          <p>Pick your activity. Make it part of your day.</p>
        </div>
      </div>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="workout-form"
        noValidate
      >
        <fieldset disabled={saving || disabled}>
          <div
            className="activity-grid"
            role="group"
            aria-label="Activity"
            aria-describedby={errors.name ? "error-name" : undefined}
          >
            {activities.map((item) => (
              <button
                key={item}
                type="button"
                className="activity-choice"
                aria-pressed={activity === item}
                onClick={() => chooseActivity(item)}
              >
                <ActivityArt activity={item} />
                <span>{item}</span>
                {activity === item && (
                  <span className="activity-check">
                    <Icon name="check" size={13} />
                  </span>
                )}
              </button>
            ))}
          </div>
          {activity && activity !== "Custom" && !renaming && (
            <button
              type="button"
              className="rename-workout text-link"
              onClick={() => setRenaming(true)}
            >
              Rename {form.name}
            </button>
          )}
          {(activity === "Custom" || renaming) && (
            <div className="workout-field">
              <label htmlFor="workout-name">Workout name</label>
              <input
                {...fieldProps("name")}
                maxLength={120}
                required
                placeholder="e.g. Evening walk"
              />
            </div>
          )}
          {fieldError("name")}
          <div className="workout-date">
            <span>When?</span>
            <details
              open={dateOpen}
              onToggle={(event) => setDateOpen(event.currentTarget.open)}
            >
              <summary>
                <Icon name="calendar" size={17} />
                {dateLabel}
                <span aria-hidden="true">⌄</span>
              </summary>
              <div className="date-options">
                <div className="quick-dates">
                  {[
                    ["Today", today],
                    ["Yesterday", yesterday],
                  ].map(([label, value]) => (
                    <button
                      type="button"
                      className="choice-chip"
                      aria-pressed={form.date === value}
                      key={label}
                      onClick={() => {
                        update({ date: value });
                        setDateOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="workout-field">
                  <label htmlFor="workout-date">Date</label>
                  <input
                    {...fieldProps("date")}
                    type="date"
                    max={today}
                    required
                  />
                </div>
              </div>
            </details>
          </div>
          {fieldError("date")}
          <div
            className="duration-picker"
            role="group"
            aria-labelledby="duration-title"
          >
            <p id="duration-title">How long?</p>
            <div className="duration-options">
              {[15, 30, 45].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className="choice-chip"
                  aria-pressed={
                    String(form.durationMinutes) === String(minutes)
                  }
                  onClick={() => update({ durationMinutes: String(minutes) })}
                >
                  {minutes} min
                </button>
              ))}
              <div className="workout-field custom-minutes">
                <label className="sr-only" htmlFor="workout-durationMinutes">
                  Minutes
                </label>
                <input
                  {...fieldProps("durationMinutes")}
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="Other"
                />
              </div>
            </div>
            {fieldError("durationMinutes")}
          </div>
          <details
            className="workout-note"
            open={notesOpen}
            onToggle={(event) => setNotesOpen(event.currentTarget.open)}
          >
            <summary>
              <Icon name="plus" size={17} />
              {notesOpen ? "Your note" : "Add a note"}
              <span>Optional</span>
            </summary>
            <div className="workout-field">
              <label htmlFor="workout-notes" className="sr-only">
                Notes
              </label>
              <textarea
                {...fieldProps("notes")}
                rows={2}
                maxLength={2000}
                placeholder="Anything you’d like to remember?"
              />
              {fieldError("notes")}
            </div>
          </details>
          {errors.form && (
            <p className="field-error" role="alert">
              {errors.form}
            </p>
          )}
          <button type="submit" className="progress-button">
            <Icon name="check" />
            {saving ? "Saving…" : "Save workout"}
          </button>
        </fieldset>
        <p className="sr-only" role="status">
          {saved && (
            <>
              <span>{saved.name} saved.</span> {saved.durationMinutes} minutes
              added to {formatWorkoutDate(saved.date)}.
            </>
          )}
        </p>
      </form>
    </section>
  );
}
