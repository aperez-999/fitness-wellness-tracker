import Icon from "./Icon.jsx";

export default function MealNameField({ value, error, onChange, onEstimate, hasValues, estimating, retrySeconds }) {
  return (
    <div className="form-field meal-name-field">
      <label htmlFor="nutrition-foodName">Food or meal (optional)</label>
      <div className="meal-name-input">
        <input
          id="nutrition-foodName"
          type="text"
          maxLength={120}
          placeholder="e.g. Oatmeal with berries"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={`meal-name-hint${error ? " meal-name-error" : ""}`}
        />
        <button
          className="meal-estimate-trigger"
          type="button"
          aria-label="Estimate nutrition"
          title="Estimate nutrition from this meal"
          onClick={onEstimate}
          disabled={estimating || retrySeconds > 0}
          aria-busy={estimating}
        >
          <Icon name="sparkles" size={20} />
        </button>
      </div>
      <p id="meal-name-hint" className="nutrition-hint" role="status">
        {retrySeconds > 0 ? `Try AI again in ${retrySeconds}s. Manual entry is still available.` : estimating ? "Estimating your meal…" : "Sparkle sends meal text to Gemini. No personal details."}{hasValues && !estimating && retrySeconds <= 0 ? " Replaces values." : ""}
      </p>
      {error && <p id="meal-name-error" className="field-error" role="alert">{error}</p>}
    </div>
  );
}
