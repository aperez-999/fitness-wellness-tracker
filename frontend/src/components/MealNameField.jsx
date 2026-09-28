import Icon from "./Icon.jsx";

export default function MealNameField({ value, error, onChange, onEstimate, hasValues }) {
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
        >
          <Icon name="sparkles" size={20} />
        </button>
      </div>
      <p id="meal-name-hint" className="nutrition-hint">
        Tap the sparkle for an estimate.{hasValues ? " This replaces the four nutrition values." : ""}
      </p>
      {error && <p id="meal-name-error" className="field-error" role="alert">{error}</p>}
    </div>
  );
}
