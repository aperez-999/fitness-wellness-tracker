import Icon from "./Icon.jsx";

export const nutrientControls = [
  { field: "calories", label: "Calories", unit: "kcal", icon: "flame", max: 1200 },
  { field: "protein", label: "Protein", unit: "g", icon: "workout", max: 100 },
  { field: "carbohydrates", label: "Carbohydrates", unit: "g", icon: "grain", max: 150 },
  { field: "fat", label: "Fat", unit: "g", icon: "drop", max: 80 },
];

export default function NutrientInput({ field, label, unit, icon, max, value, error, onChange }) {
  const numeric = Number(value);
  const sliderValue = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  // Typing a larger value expands the slider without limiting precise input.
  const sliderMax = Math.max(max, Math.ceil(sliderValue / 50) * 50);
  const description = `${field}-adjust-hint${error ? ` ${field}-error` : ""}`;
  return (
    <div className={`nutrient-control nutrient-${field}${error ? " has-error" : ""}`}>
      <label htmlFor={`nutrition-${field}`} className="nutrient-label">
        <span className="nutrient-icon"><Icon name={icon} size={18} /></span>
        {label}
      </label>
      <div className="nutrient-number">
        <input
          id={`nutrition-${field}`} type="number" required min="0" step="any"
          inputMode="decimal" placeholder="0" value={value}
          aria-invalid={Boolean(error)} aria-describedby={description}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{unit}</span>
      </div>
      <input
        className="nutrient-slider" type="range" min="0" max={sliderMax} step="1"
        value={sliderValue} aria-label={`Adjust ${label.toLowerCase()}`}
        aria-valuetext={value === "" ? `Not entered; adjust to set ${label.toLowerCase()}` : `${value} ${unit}`}
        aria-describedby={`${field}-adjust-hint`}
        style={{ "--range-fill": `${Math.min(100, sliderValue / sliderMax * 100)}%` }}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Selecting zero on an untouched range must also fill the required field.
          if (value === "" && event.key === "Home") onChange("0");
        }}
        onPointerUp={(event) => { if (value === "") onChange(event.currentTarget.value); }}
      />
      <span id={`${field}-adjust-hint`} className="sr-only">Slide to adjust, or type an exact value in {unit}.</span>
      {error && <p id={`${field}-error`} className="field-error">{error}</p>}
    </div>
  );
}
