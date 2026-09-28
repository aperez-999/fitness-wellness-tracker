import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { estimateMeal, findMealReference, mealReferences } from "../../../shared/nutritionEstimates.mjs";

export default function MealEstimator({ foodName, hasValues, onApply, onChoose }) {
  const [servings, setServings] = useState(1);
  const [expanded, setExpanded] = useState(true);
  const reference = findMealReference(foodName);
  useEffect(() => {
    setServings(1);
    if (reference) setExpanded(true);
  }, [reference?.id]);
  const validServings = Number.isFinite(Number(servings)) && Number(servings) >= 0.25 && Number(servings) <= 10;

  return (
    <div className="meal-estimator">
      <button className="meal-estimator-heading" type="button" aria-expanded={expanded} aria-controls="meal-estimator-controls" onClick={() => setExpanded((current) => !current)}>
        <Icon name="sparkles" size={18} />
        <span>Quick meal estimate</span>
        <span className="meal-estimator-toggle" aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      <div id="meal-estimator-controls" hidden={!expanded}>
      <p className="meal-estimator-intro">Choose a reference meal, then adjust its portion.</p>
      <label className="sr-only" htmlFor="meal-reference">Reference meal</label>
      <select id="meal-reference" value={reference?.id || ""} onChange={(event) => {
        const meal = mealReferences.find((item) => item.id === event.target.value);
        if (meal) { onChoose(meal.name); setServings(1); }
      }}>
        <option value="" disabled>Pick a meal to try</option>
        {mealReferences.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}
      </select>
      {reference ? (
        <>
          <p className="meal-portion"><strong>One reference serving:</strong> {reference.portion}</p>
          <div className="meal-serving-row">
            <label htmlFor="meal-servings">Servings</label>
            <div className="meal-serving-control">
              <button type="button" aria-label="Decrease servings" disabled={!validServings || Number(servings) <= 0.25} onClick={() => setServings(Math.max(0.25, Number(servings) - 0.25))}>−</button>
              <input id="meal-servings" type="number" min="0.25" max="10" step="0.25" value={servings} onChange={(event) => setServings(event.target.value)} aria-describedby="meal-servings-hint" />
              <button type="button" aria-label="Increase servings" disabled={!validServings || Number(servings) >= 10} onClick={() => setServings(Math.min(10, Number(servings) + 0.25))}>+</button>
            </div>
          </div>
          <p id="meal-servings-hint" className={validServings ? "sr-only" : "field-error"}>Choose 0.25 to 10 servings.</p>
          <button type="button" className="estimate-button" disabled={!validServings} onClick={() => {
            onApply(estimateMeal(reference.id, Number(servings)), { referenceId: reference.id, servings: Number(servings) });
            setExpanded(false);
          }}>
            <Icon name="sparkles" size={17} />{hasValues ? "Replace values with estimate" : "Fill with estimate"}
          </button>
          <a href={reference.url} target="_blank" rel="noreferrer" className="meal-source">Reference: {reference.source}</a>
        </>
      ) : foodName.trim() ? <p className="meal-unsupported" role="status">No reference for this meal yet. Enter values manually, or choose a reference above.</p> : null}
      </div>
      <p className="meal-disclaimer"><Icon name="info" size={15} />Approximate values for the portion shown. Ingredients, brands and preparation vary. Check the label or recipe and adjust before saving.</p>
    </div>
  );
}
