import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch, getToken } from "../lib/api.js";
import FormField from "../components/FormField.jsx";
import Icon from "../components/Icon.jsx";
import NutrientInput, { nutrientControls } from "../components/NutrientInput.jsx";
import MealNameField from "../components/MealNameField.jsx";
import { mealReferences } from "../../../shared/nutritionEstimates.mjs";
import { mealDescriptionError } from "../../../shared/mealDescription.mjs";
import saladBowl from "../assets/nutrition/salad-bowl.svg";
import "./nutrition.css";

const nutrients = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbohydrates", "Carbohydrates", "g"],
  ["fat", "Fat", "g"],
];
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
function emptyDraft() {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { date, foodName: "", calories: "", protein: "", carbohydrates: "", fat: "" };
}

export default function NutritionPage() {
  const { user } = useAuth();
  // A new account gets fresh state, including drafts and pending requests.
  return <NutritionJournal key={user.id} />;
}

function NutritionJournal() {
  const { logout } = useAuth();
  const [draft, setDraft] = useState(emptyDraft);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [previousEstimate, setPreviousEstimate] = useState(null);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [estimating, setEstimating] = useState(false);
  const estimateRequest = useRef(null);
  const [saving, setSaving] = useState(false);
  const readRequest = useRef(null);
  const writeRequest = useRef(null);
  const form = useRef(null);

  const loadEntries = useCallback(async () => {
    readRequest.current?.abort();
    const controller = new AbortController();
    readRequest.current = controller;
    const token = getToken();
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiFetch("/nutrition", { signal: controller.signal, cache: "no-store" });
      if (!controller.signal.aborted && token === getToken()) setEntries(data.entries);
    } catch (error) {
      if (controller.signal.aborted || token !== getToken()) return;
      if (error.status === 401) logout();
      else setLoadError("Could not load your entries. Try again.");
    } finally {
      if (!controller.signal.aborted && token === getToken()) setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadEntries();
    return () => {
      readRequest.current?.abort();
      writeRequest.current?.abort();
      estimateRequest.current?.abort();
    };
  }, [loadEntries]);

  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = setTimeout(() => setRetrySeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [retrySeconds]);

  function update(field, value) {
    setPreviousEstimate(null);
    estimateRequest.current?.abort();
    estimateRequest.current = null;
    setEstimating(false);
    if (field === "foodName") setEstimate(null);
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaved(false);
  }

  function applyEstimate(values, provenance) {
    setPreviousEstimate({ values: Object.fromEntries(nutrients.map(([field]) => [field, draft[field]])), estimate });
    setDraft((current) => ({ ...current, ...values }));
    setEstimate(provenance);
    setErrors({});
    setSaveError("");
    setSaved(false);
    requestAnimationFrame(() => form.current?.querySelector("#nutrition-calories")?.focus());
  }

  function undoEstimate() {
    if (!previousEstimate) return;
    setDraft((current) => ({ ...current, ...previousEstimate.values }));
    setEstimate(previousEstimate.estimate);
    setPreviousEstimate(null);
    setErrors({});
    setSaveError("");
    requestAnimationFrame(() => form.current?.querySelector("#nutrition-calories")?.focus());
  }

  async function estimateFromFood() {
    if (estimateRequest.current || writeRequest.current || retrySeconds > 0) return;
    const inputError = mealDescriptionError(draft.foodName);
    if (inputError) {
      setErrors((current) => ({ ...current, foodName: inputError }));
      return;
    }
    const controller = new AbortController();
    estimateRequest.current = controller;
    const token = getToken();
    setPreviousEstimate(null);
    setEstimating(true);
    setErrors((current) => ({ ...current, foodName: undefined }));
    try {
      const data = await apiFetch("/nutrition/estimate", {
        method: "POST", signal: controller.signal,
        body: JSON.stringify({ foodName: draft.foodName.trim() }),
      });
      if (controller.signal.aborted || token !== getToken()) return;
      applyEstimate(data.values, { receipt: data.receipt, portion: data.portion });
    } catch (error) {
      if (controller.signal.aborted || token !== getToken()) return;
      if (error.status === 401) logout();
      else {
        if (error.status === 429) setRetrySeconds(error.retryAfterSeconds || 60);
        setErrors((current) => ({ ...current, foodName: error.message }));
      }
    } finally {
      if (estimateRequest.current === controller) {
        estimateRequest.current = null;
        if (!controller.signal.aborted && token === getToken()) setEstimating(false);
      }
    }
  }

  async function save(event) {
    event.preventDefault();
    if (writeRequest.current || estimateRequest.current) return;
    setErrors({});
    setSaveError("");
    setSaved(false);
    setSaving(true);
    const controller = new AbortController();
    writeRequest.current = controller;
    const token = getToken();
    try {
      const { entry } = await apiFetch("/nutrition", {
        method: "POST", signal: controller.signal, body: JSON.stringify({ ...draft, estimate }),
      });
      if (controller.signal.aborted || token !== getToken()) return;
      setEntries((current) => [entry, ...current]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b._id.localeCompare(a._id))
        .slice(0, 30));
      setDraft((current) => ({ ...emptyDraft(), date: current.date }));
      setEstimate(null);
      setPreviousEstimate(null);
      setSaved(true);
      void loadEntries();
    } catch (error) {
      if (controller.signal.aborted || token !== getToken()) return;
      if (error.status === 401) logout();
      else {
        setErrors(error.fields || {});
        setSaveError(error.status === 400 ? (error.fields?.estimate || "Check the highlighted fields and save again.") : "Could not save your entry. Your details are still here; try again.");
        requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
      }
    } finally {
      writeRequest.current = null;
      if (!controller.signal.aborted && token === getToken()) setSaving(false);
    }
  }

  return (
    <div className="nutrition-page">
      <header className="nutrition-heading">
        <h1>Nutrition</h1>
        <p>A simple record of what fuels your day.</p>
      </header>
      <div className="nutrition-layout">
        <section className="nutrition-composer" aria-labelledby="nutrition-add-title">
          <h2 id="nutrition-add-title"><span className="nutrition-title-icon"><img src={saladBowl} alt="" width="56" height="42" /></span>Add an entry</h2>
          <p>Record calories and macros for a food, meal, or day.</p>
          <form ref={form} onSubmit={save} noValidate>
            <fieldset disabled={saving}>
              <FormField id="nutrition-date" label="Date" type="date" value={draft.date} error={errors.date} onChange={(event) => update("date", event.target.value)} />
              <MealNameField
                value={draft.foodName} error={errors.foodName}
                onChange={(name) => update("foodName", name)}
                onEstimate={estimateFromFood} estimating={estimating} retrySeconds={retrySeconds}
                hasValues={nutrientControls.some(({ field }) => draft[field] !== "")}
              />
              {estimate && <div className="inline-meal-estimate" role="status">
                <div className="estimate-note-heading">
                  <span className="estimate-note-label"><Icon name="sparkles" size={15} />AI estimate applied</span>
                  {previousEstimate && <button type="button" className="estimate-undo" onClick={undoEstimate} aria-label="Undo AI estimate"><Icon name="undo" size={15} />Undo</button>}
                </div>
                <div className="estimate-portion">
                  <span className="estimate-portion-icon"><Icon name="plate" size={32} /></span>
                  <div>
                    <p className="estimate-portion-caption">Portion we used</p>
                    <p className="estimate-portion-text">{estimate.portion}</p>
                  </div>
                </div>
                <p className="estimate-note-hint">An estimate, with room to adjust. Check the portions and fine-tune the values below.</p>
              </div>}
              <div className="nutrition-adjust-heading"><Icon name="edit" size={16} /><span>Slide, type, make it yours.</span></div>
              <div className="nutrition-inputs">
                {nutrientControls.map((control) => (
                  <NutrientInput key={control.field} {...control}
                    value={draft[control.field]} error={errors[control.field]}
                    onChange={(value) => update(control.field, value)} />
                ))}
              </div>
              <p className="nutrition-hint">All nutrition values are required. Enter 0 when there is none.</p>
              <button className="progress-button" type="submit" disabled={estimating}><Icon name="plus" size={18} />{saving ? "Saving…" : "Save entry"}</button>
            </fieldset>
            {saveError && <p className="nutrition-error" role="alert">{saveError}</p>}
            {saved && <p className="nutrition-success" role="status">Entry saved.</p>}
          </form>
        </section>
        <section className="nutrition-history" aria-labelledby="nutrition-recent-title">
          <header>
            <div>
              <h2 id="nutrition-recent-title">Recent entries</h2>
              <p>Your latest 30 entries, newest date first.</p>
            </div>
            <button className="text-link" type="button" onClick={loadEntries} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
          </header>
          {loadError && <div className="nutrition-error" role="alert">{loadError} <button className="text-link" type="button" onClick={loadEntries}>Try again</button></div>}
          {loading && entries.length === 0 && <p role="status" className="nutrition-empty">Loading your entries…</p>}
          {!loading && !loadError && entries.length === 0 && <div className="nutrition-empty"><h3>Your nutrition journal starts here.</h3><p>Add your first entry to keep your calories and macros in one place.</p></div>}
          <ul className="nutrition-entries" aria-label="Nutrition entries">
            {entries.map((entry) => (
              <li key={entry._id} className="nutrition-entry">
                <div className="nutrition-entry-heading">
                  <h3><Icon name={mealReferences.find((meal) => meal.id === entry.estimate?.referenceId)?.icon || "plate"} size={20} />{entry.foodName || "Nutrition entry"}</h3>
                  <time dateTime={entry.date.slice(0, 10)}>{dateFormat.format(new Date(entry.date))}</time>
                </div>
                {entry.estimate && <p className="nutrition-estimate-label">{entry.estimate.edited ? "Estimate, adjusted" : "Estimated"} · {entry.estimate.provider === "gemini" ? `AI · ${entry.estimate.portion}` : `${entry.estimate.servings} × ${mealReferences.find((meal) => meal.id === entry.estimate.referenceId)?.name}`}</p>}
                <dl className="nutrition-values">
                  {nutrients.map(([field, label, unit]) => <div key={field}><dt>{label}</dt><dd>{entry[field] == null ? "—" : <>{numberFormat.format(entry[field])} <span>{unit}</span></>}</dd></div>)}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
