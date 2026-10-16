import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { createGoal, getGoals, removeGoal, updateGoal, WORKOUTS_CHANGED } from "../lib/api.js";
import FormField from "../components/FormField.jsx";
import Icon from "../components/Icon.jsx";
import "./goals.css";

// [value saved in the database, label shown to the user, icon name]
const categories = [
  ["workout", "Workout", "workout"],
  ["nutrition", "Nutrition", "nutrition"],
  ["wellness", "Wellness", "leaf"],
];
// [value saved in the database, label shown to the user]. Only workout goals can count workouts.
const trackingOptions = [
  ["manual", "I'll update it myself"],
  ["workoutCount", "Count my workouts"],
  ["workoutMinutes", "Add up my workout minutes"],
];
// Tracked goals always use these units; the server sets the same ones.
const trackedUnits = { workoutCount: "workouts", workoutMinutes: "minutes" };
const unitSuggestions = ["miles", "km", "workouts", "minutes", "steps", "lbs", "kg", "cal", "glasses", "hours"];
const emptyDraft = {
  title: "", category: "workout", targetValue: "", currentValue: "", unit: "", targetDate: "",
  tracking: "manual", startDate: "",
};
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
// Goal dates are saved as midnight UTC, so they are shown in UTC to display the day that was picked.
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// Today's date as "YYYY-MM-DD" in the user's own timezone.
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Turns a saved goal into form values. Form inputs work with text, so numbers become strings.
// Tracking and start date are included so actions like Mark complete keep a tracked goal tracked.
function toDraft(goal) {
  return {
    title: goal.title,
    category: goal.category,
    targetValue: String(goal.targetValue),
    currentValue: String(goal.currentValue ?? 0),
    unit: goal.unit ?? "",
    targetDate: goal.targetDate.slice(0, 10),
    tracking: goal.tracking ?? "manual",
    startDate: goal.startDate?.slice(0, 10) ?? "",
  };
}

// How far one slider step moves: whole numbers for whole-number targets, hundredths
// for decimal ones, and about 100 to 1,000 steps in total for very large targets.
function sliderStep(target) {
  if (target > 1000) return 10 ** (Math.floor(Math.log10(target)) - 2);
  return Number.isInteger(target) ? 1 : 0.01;
}

export default function GoalsPage() {
  const { user } = useAuth();
  // Keyed by user, so switching accounts starts with a clean page.
  return <GoalsBoard key={user.id} />;
}

function GoalsBoard() {
  const { logout } = useAuth();
  // Which list is showing: "active" or "completed".
  const [view, setView] = useState("active");
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // null = form closed, "new" = adding a goal, or the goal object being edited.
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  // True while a save, complete, or delete is in progress, to block double clicks.
  const [busy, setBusy] = useState(false);
  // The ID of the goal showing "Delete this goal?", if any.
  const [confirmingId, setConfirmingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const loadRequest = useRef(null);
  const formRef = useRef(null);
  const newButton = useRef(null);
  const listHeading = useRef(null);
  // Set when the form closes, so focus returns to "New goal" once it is clickable again.
  const returnFocus = useRef(false);
  // Set when a save fails, so focus moves to the first bad field once the form is editable again.
  const focusInvalid = useRef(false);

  // Loads the list for the current view. A newer load cancels an older one.
  // A quiet load is a background refresh: the list stays on screen and a failure shows no error.
  const loadGoals = useCallback(async ({ quiet = false } = {}) => {
    loadRequest.current?.abort();
    const controller = new AbortController();
    loadRequest.current = controller;
    if (!quiet) {
      setLoading(true);
      setLoadError("");
    }
    try {
      const data = await getGoals({ status: view, signal: controller.signal });
      if (!controller.signal.aborted) {
        setGoals(data.goals);
        setLoadError("");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.status === 401) logout();
      else if (!quiet) setLoadError("Your goals couldn't be loaded.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [view, logout]);

  // Load when the page opens and whenever the view changes; cancel on leaving the page.
  useEffect(() => {
    loadGoals();
    return () => loadRequest.current?.abort();
  }, [loadGoals]);

  // Tracked goals count workouts, so refresh when workouts change: in this tab, in another
  // tab (which writes to localStorage), or when the user comes back to this tab.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") loadGoals({ quiet: true });
    };
    const refreshOnStorage = (event) => {
      if (event.key === WORKOUTS_CHANGED) refresh();
    };
    window.addEventListener(WORKOUTS_CHANGED, refresh);
    window.addEventListener("storage", refreshOnStorage);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener(WORKOUTS_CHANGED, refresh);
      window.removeEventListener("storage", refreshOnStorage);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadGoals]);

  // When the form opens, put the cursor in its first field.
  useEffect(() => {
    if (editing) formRef.current?.querySelector("input")?.focus();
  }, [editing]);

  // After the form closes and nothing is saving, move focus back to "New goal".
  useEffect(() => {
    if (!editing && !busy && returnFocus.current) {
      returnFocus.current = false;
      newButton.current?.focus();
    }
  }, [editing, busy]);

  useEffect(() => {
    if (!busy && focusInvalid.current) {
      focusInvalid.current = false;
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
    }
  }, [busy]);

  function showView(next) {
    if (next === view) return;
    setGoals([]);
    setConfirmingId(null);
    setNotice("");
    setActionError("");
    setView(next);
  }

  function openForm(goal = null) {
    setEditing(goal ?? "new");
    setDraft(goal ? toDraft(goal) : emptyDraft);
    setErrors({});
    setFormError("");
    setNotice("");
    setActionError("");
    setConfirmingId(null);
  }

  function closeForm() {
    returnFocus.current = true;
    setEditing(null);
  }

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // Only workout goals can count workouts, so other types go back to manual progress.
  function changeCategory(category) {
    setDraft((current) => ({ ...current, category, tracking: category === "workout" ? current.tracking : "manual" }));
    setErrors((current) => ({ ...current, category: undefined, tracking: undefined }));
  }

  // A tracked goal needs a start date, so today is filled in if there isn't one yet.
  function changeTracking(tracking) {
    setDraft((current) => ({ ...current, tracking, startDate: current.startDate || localToday() }));
    setErrors((current) => ({ ...current, tracking: undefined }));
  }

  // Shared handling for failed card actions (complete, reopen, delete).
  function handleActionError(error, message) {
    if (error.status === 401) return logout();
    if (error.status === 404) {
      setActionError("That goal no longer exists, so your list was refreshed.");
      void loadGoals();
      return;
    }
    // No status means the server couldn't be reached; apiFetch's message says so.
    setActionError(error.status ? message : error.message);
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    setFormError("");
    const isNew = editing === "new";
    try {
      if (isNew) await createGoal(draft);
      else await updateGoal(editing._id, { ...draft, status: editing.status });
      setNotice(isNew ? "Goal added." : "Goal updated.");
      closeForm();
      // New goals are always active, so show that list.
      if (isNew && view !== "active") {
        setGoals([]);
        setView("active");
      } else {
        void loadGoals();
      }
    } catch (error) {
      if (error.status === 401) return logout();
      if (error.status === 404) {
        setEditing(null);
        handleActionError(error);
        return;
      }
      setErrors(error.fields || {});
      setFormError(
        error.status === 400
          ? "Check the highlighted fields and try again."
          : error.status
            ? "Your goal couldn't be saved. Your details are still here; try again."
            : error.message,
      );
      focusInvalid.current = true;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(goal, status) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setActionError("");
    try {
      await updateGoal(goal._id, { ...toDraft(goal), status });
      setGoals((current) => current.filter((item) => item._id !== goal._id));
      if (editing?._id === goal._id) setEditing(null);
      setNotice(status === "completed" ? `"${goal.title}" marked complete.` : `"${goal.title}" moved back to active goals.`);
      listHeading.current?.focus();
    } catch (error) {
      handleActionError(error, "That goal couldn't be updated. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // Saves a new progress value from a card's slider. Returns true if it worked.
  async function saveProgress(goal, value) {
    setActionError("");
    try {
      // No status is sent, so moving the slider never completes or reopens a goal.
      const { goal: saved } = await updateGoal(goal._id, { ...toDraft(goal), currentValue: value });
      setGoals((current) => current.map((item) => (item._id === saved._id ? saved : item)));
      return true;
    } catch (error) {
      if (error.status === 404) {
        // The goal was deleted, so there is nothing left to update.
        setGoals((current) => current.filter((item) => item._id !== goal._id));
        return false;
      }
      handleActionError(error, "Your progress couldn't be saved. Try again.");
      return false;
    }
  }

  async function remove(goal) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setActionError("");
    try {
      await removeGoal(goal._id);
      setGoals((current) => current.filter((item) => item._id !== goal._id));
      if (editing?._id === goal._id) setEditing(null);
      setConfirmingId(null);
      setNotice(`"${goal.title}" deleted.`);
      listHeading.current?.focus();
    } catch (error) {
      handleActionError(error, "That goal couldn't be deleted. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const today = localToday();
  const isNew = editing === "new";
  const tracked = draft.tracking !== "manual";
  // Kept in a variable because it appears in two places: on its own, or next to the start date.
  const targetDateField = (
    <FormField
      id="goal-date" label="Target date" type="date" min={isNew ? today : undefined}
      value={draft.targetDate} error={errors.targetDate || errors.timeZone}
      onChange={(event) => update("targetDate", event.target.value)}
    />
  );

  return (
    <div className="goals-page">
      <header className="goals-heading">
        <div>
          <h1>Goals</h1>
          <p>Set a target and a date, then track your progress toward it.</p>
        </div>
        <button ref={newButton} className="progress-button" type="button" onClick={() => openForm()} disabled={busy}>
          <Icon name="plus" size={18} />New goal
        </button>
      </header>

      {editing && (
        <section className="goals-form" aria-labelledby="goal-form-title">
          <h2 id="goal-form-title">{isNew ? "New goal" : "Edit goal"}</h2>
          <form ref={formRef} onSubmit={save} noValidate>
            <fieldset disabled={busy}>
              <FormField
                id="goal-title" label="Goal name" value={draft.title} error={errors.title}
                maxLength={120} placeholder="Run 20 miles this month"
                onChange={(event) => update("title", event.target.value)}
              />
              <div className="form-field">
                <label htmlFor="goal-category">Type</label>
                <select
                  id="goal-category" value={draft.category}
                  aria-invalid={Boolean(errors.category)}
                  aria-describedby={errors.category ? "goal-category-error" : undefined}
                  onChange={(event) => changeCategory(event.target.value)}
                >
                  {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {errors.category && <p id="goal-category-error" className="field-error">{errors.category}</p>}
              </div>
              {draft.category === "workout" && (
                <div className="form-field">
                  <label htmlFor="goal-tracking">Track progress</label>
                  <select
                    id="goal-tracking" value={draft.tracking}
                    aria-invalid={Boolean(errors.tracking)}
                    aria-describedby={errors.tracking ? "goal-tracking-error" : undefined}
                    onChange={(event) => changeTracking(event.target.value)}
                  >
                    {trackingOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {errors.tracking && <p id="goal-tracking-error" className="field-error">{errors.tracking}</p>}
                </div>
              )}
              <div className="goals-form-row">
                <FormField
                  id="goal-target" label={tracked ? `Target ${trackedUnits[draft.tracking]}` : "Target"}
                  type="number" inputMode="decimal" min="0" step="any"
                  value={draft.targetValue} error={errors.targetValue}
                  onChange={(event) => update("targetValue", event.target.value)}
                />
                {!tracked && (
                  <FormField
                    id="goal-unit" label="Unit (optional)" required={false} list="goal-unit-options"
                    maxLength={30} placeholder="miles" value={draft.unit} error={errors.unit}
                    onChange={(event) => update("unit", event.target.value)}
                  />
                )}
              </div>
              {!isNew && !tracked && (
                <FormField
                  id="goal-progress" label="Progress so far" type="number" inputMode="decimal" min="0" step="any"
                  required={false} value={draft.currentValue} error={errors.currentValue}
                  onChange={(event) => update("currentValue", event.target.value)}
                />
              )}
              {tracked ? (
                <div className="goals-form-row">
                  <FormField
                    id="goal-start" label="Start date" type="date" max={draft.targetDate || undefined}
                    hint="Workouts from this day through the target date count."
                    value={draft.startDate} error={errors.startDate}
                    onChange={(event) => update("startDate", event.target.value)}
                  />
                  {targetDateField}
                </div>
              ) : targetDateField}
              <datalist id="goal-unit-options">
                {unitSuggestions.map((unit) => <option key={unit} value={unit} />)}
              </datalist>
              <div className="goals-form-actions">
                <button className="progress-button" type="submit">
                  {busy ? "Saving…" : isNew ? "Add goal" : "Save changes"}
                </button>
                <button className="secondary-button" type="button" onClick={closeForm}>Cancel</button>
              </div>
            </fieldset>
            {formError && <p className="goals-error" role="alert">{formError}</p>}
          </form>
        </section>
      )}

      <section className="goals-list" aria-labelledby="goals-list-title">
        <div className="goals-list-header">
          <h2 id="goals-list-title" ref={listHeading} tabIndex={-1}>
            {view === "active" ? "Active goals" : "Completed goals"}
          </h2>
          <div className="goals-tabs" role="group" aria-label="Show goals">
            {[["active", "Active"], ["completed", "Completed"]].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={view === value} onClick={() => showView(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {notice && <p className="goals-success" role="status">{notice}</p>}
        {actionError && <p className="goals-error" role="alert">{actionError}</p>}
        {loadError && (
          <div className="goals-error" role="alert">
            {loadError} <button className="text-link" type="button" onClick={() => loadGoals()}>Try again</button>
          </div>
        )}
        {loading && goals.length === 0 && <p className="goals-empty" role="status">Loading your goals…</p>}
        {!loading && !loadError && goals.length === 0 && (
          <div className="goals-empty">
            {view === "active" ? (
              <>
                <h3>No active goals yet</h3>
                <p>Add a goal with a target and a date, and it will show up here.</p>
              </>
            ) : (
              <>
                <h3>No completed goals yet</h3>
                <p>Goals you mark complete will move here.</p>
              </>
            )}
          </div>
        )}

        <ul className="goals-cards">
          {goals.map((goal) => (
            <GoalCard
              key={goal._id} goal={goal} today={today} busy={busy}
              confirming={confirmingId === goal._id}
              onEdit={() => openForm(goal)}
              onStatus={(status) => changeStatus(goal, status)}
              onProgress={(value) => saveProgress(goal, value)}
              onAskDelete={() => { setConfirmingId(goal._id); setNotice(""); setActionError(""); }}
              onCancelDelete={() => setConfirmingId(null)}
              onDelete={() => remove(goal)}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

// One goal in the list: name, badges, type, progress, due date, and its buttons.
function GoalCard({ goal, today, busy, confirming, onEdit, onStatus, onProgress, onAskDelete, onCancelDelete, onDelete }) {
  const [, typeLabel, typeIcon] = categories.find(([value]) => value === goal.category) ?? categories[2];
  const active = goal.status === "active";
  // Tracked goals get their progress from workouts, so they show a bar instead of a slider.
  const tracked = goal.tracking === "workoutCount" || goal.tracking === "workoutMinutes";
  const reached = active && goal.currentValue >= goal.targetValue;
  const date = goal.targetDate.slice(0, 10);
  const formattedDate = dateFormat.format(new Date(goal.targetDate));
  const overdue = active && date < today;
  const dueText = !active ? `Target date ${formattedDate}`
    : overdue ? `Overdue since ${formattedDate}`
      : date === today ? "Due today"
        : `Due ${formattedDate}`;
  const percent = Math.min(100, (goal.currentValue / goal.targetValue) * 100);

  return (
    <li className={`goal-card${active ? "" : " is-complete"}`}>
      <div className="goal-card-heading">
        <h3>{goal.title}</h3>
        <div className="goal-badges">
          {!active && <span className="goal-badge is-complete"><Icon name="check" size={16} />Completed</span>}
          {reached && <span className="goal-badge is-reached"><Icon name="sparkles" size={16} />Target reached</span>}
          <span className="goal-type"><Icon name={typeIcon} size={16} />{typeLabel}</span>
        </div>
      </div>
      {active && !tracked ? (
        <ProgressSlider goal={goal} disabled={busy} onSave={onProgress} />
      ) : (
        <>
          {/* The bar is decoration; the numbers below carry the same information for screen readers. */}
          <div className="goal-progress" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
          <p className="goal-numbers">
            {numberFormat.format(goal.currentValue)} / {numberFormat.format(goal.targetValue)}{goal.unit ? ` ${goal.unit}` : ""}
          </p>
        </>
      )}
      {tracked && (
        <p className="goal-source">
          <Icon name="activity" size={15} />
          <span>
            Counting your {goal.tracking === "workoutMinutes" ? "workout minutes" : "workouts"} from{" "}
            <time dateTime={goal.startDate.slice(0, 10)}>{dateFormat.format(new Date(goal.startDate))}</time>
          </span>
        </p>
      )}
      <p className={`goal-due${overdue ? " is-overdue" : ""}`}>
        <Icon name="calendar" size={15} /><time dateTime={date}>{dueText}</time>
      </p>

      {confirming ? (
        <div className="goal-confirm" role="group" aria-label={`Delete ${goal.title}`}>
          <p>Delete this goal? This can't be undone.</p>
          <button className="goal-delete-button" type="button" onClick={onDelete} disabled={busy}>
            {busy ? "Deleting…" : "Delete goal"}
          </button>
          <button className="secondary-button" type="button" onClick={onCancelDelete} disabled={busy} autoFocus>
            Keep goal
          </button>
        </div>
      ) : (
        <div className="goal-actions">
          <button className="secondary-button" type="button" onClick={onEdit} disabled={busy}>
            <Icon name="edit" size={16} />Edit
          </button>
          <button className="secondary-button" type="button" onClick={() => onStatus(active ? "completed" : "active")} disabled={busy}>
            <Icon name={active ? "check" : "undo"} size={16} />{active ? "Mark complete" : "Move back to active"}
          </button>
          <button className="secondary-button goal-delete-start" type="button" onClick={onAskDelete} disabled={busy}>
            <Icon name="trash" size={16} />Delete
          </button>
        </div>
      )}
    </li>
  );
}

// Drag the slider (or use the arrow keys) to change progress.
// It saves by itself half a second after the last change.
function ProgressSlider({ goal, disabled, onSave }) {
  const [value, setValue] = useState(goal.currentValue);
  const [saveState, setSaveState] = useState(""); // "", "saving", or "saved"
  // While waiting to save: { timer, value }. Otherwise null.
  const pending = useRef(null);
  // Always points at the newest onSave, so a delayed save uses the goal's latest details.
  const latestSave = useRef(onSave);
  useEffect(() => {
    latestSave.current = onSave;
  });

  // Follow saved changes made elsewhere (like the Edit form), unless the slider is mid-change.
  useEffect(() => {
    if (!pending.current) setValue(goal.currentValue);
  }, [goal.currentValue]);

  // If the card disappears before the save runs (for example, switching lists), save right away.
  useEffect(() => () => {
    if (pending.current) {
      clearTimeout(pending.current.timer);
      latestSave.current(pending.current.value);
      pending.current = null;
    }
  }, []);

  async function save(next) {
    setSaveState("saving");
    const ok = await latestSave.current(next);
    setSaveState(ok ? "saved" : "");
    // On failure, go back to the last saved value.
    if (!ok && !pending.current) setValue(goal.currentValue);
  }

  function change(event) {
    const next = Number(event.target.value);
    setValue(next);
    setSaveState("");
    clearTimeout(pending.current?.timer);
    pending.current = {
      value: next,
      timer: setTimeout(() => {
        pending.current = null;
        save(next);
      }, 500),
    };
  }

  const target = goal.targetValue;
  const unit = goal.unit ? ` ${goal.unit}` : "";
  // Progress past the target shows as a full slider; the numbers still show the real value.
  const shown = Math.min(value, target);

  return (
    <div className="goal-progress-control">
      <input
        type="range" className="goal-slider"
        min="0" max={target} step={sliderStep(target)} value={shown}
        disabled={disabled} onChange={change}
        aria-label={`Progress for ${goal.title}`}
        aria-valuetext={`${numberFormat.format(value)} of ${numberFormat.format(target)}${unit}`}
        style={{ "--fill": `${(shown / target) * 100}%` }}
      />
      <p className="goal-numbers">
        {numberFormat.format(value)} / {numberFormat.format(target)}{unit}
        <span className="goal-save-state" aria-live="polite">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
        </span>
      </p>
    </div>
  );
}
