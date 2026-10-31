import { Link } from "react-router-dom";

import Icon from "./Icon.jsx";
import { goalSnapshot } from "../lib/dashboardSummary.js";
import "./dashboard-summary.css";

const wholeNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
// [label, icon] for each goal category, as on the Goals page.
const categories = {
  workout: ["Workout", "workout"],
  nutrition: ["Nutrition", "nutrition"],
  wellness: ["Wellness", "leaf"],
};

function MealsCard({ nutrition }) {
  return (
    <section className="summary-card meals-summary" aria-labelledby="meals-title">
      <div className="summary-heading">
        <h2 id="meals-title">Meals this week</h2>
        {nutrition.meals > 0 && (
          <Link className="text-link" to="/nutrition">
            View meals
          </Link>
        )}
      </div>
      {nutrition.meals > 0 ? (
        <>
          <div className="summary-metrics">
            <p>
              <strong>{nutrition.meals}</strong>
              <span>{nutrition.meals === 1 ? "meal logged" : "meals logged"}</span>
            </p>
            <p>
              <strong>{wholeNumber.format(nutrition.calories)}</strong>
              <span>kcal recorded</span>
            </p>
          </div>
          <p className="summary-caption">From your saved entries, Monday through today.</p>
        </>
      ) : (
        <div className="summary-empty">
          <p>No meals logged this week.</p>
          <Link className="secondary-button" to="/nutrition">
            <Icon name="plus" size={17} />
            Log a meal
          </Link>
        </div>
      )}
    </section>
  );
}

function GoalsCard({ goals, today }) {
  const shown = goals.active.map((goal) => goalSnapshot(goal, today));
  const more = goals.total - shown.length;
  return (
    <section className="summary-card goals-summary" aria-labelledby="goals-title">
      <div className="summary-heading">
        <h2 id="goals-title">Active goals</h2>
        {shown.length > 0 && (
          <Link className="text-link" to="/goals">
            View all goals
          </Link>
        )}
      </div>
      {shown.length ? (
        <>
          <ul className="summary-goals">
            {shown.map((goal) => {
              const [label, icon] = categories[goal.category] ?? categories.wellness;
              return (
                <li key={goal.id}>
                  <div className="summary-goal-heading">
                    <h3>{goal.title}</h3>
                    {goal.reached && (
                      <span className="summary-badge is-reached">
                        <Icon name="sparkles" size={14} />
                        Target reached
                      </span>
                    )}
                    <span className="summary-badge">
                      <Icon name={icon} size={14} />
                      {label}
                    </span>
                  </div>
                  {/* The bar is decoration; the numbers below carry the same information. */}
                  <div className="summary-goal-bar" aria-hidden="true">
                    <span style={{ width: `${goal.percent}%` }} />
                  </div>
                  <p className="summary-goal-meta">
                    <span>{goal.progressText}</span>
                    <time dateTime={goal.date} className={goal.overdue ? "is-overdue" : undefined}>
                      {goal.dueText}
                    </time>
                  </p>
                </li>
              );
            })}
          </ul>
          {more > 0 && (
            <p className="summary-caption">
              {more} more {more === 1 ? "goal" : "goals"} on the Goals page.
            </p>
          )}
        </>
      ) : (
        <div className="summary-empty">
          <p>No active goals right now.</p>
          <Link className="secondary-button" to="/goals">
            <Icon name="plus" size={17} />
            Set a goal
          </Link>
        </div>
      )}
    </section>
  );
}

// This week's meals and the soonest active goals, shown below the workout widgets.
export default function DashboardSummary({ data, loading, error, refresh }) {
  if (loading) {
    return (
      <div className="summary-row" role="status">
        <p className="summary-loading">Loading your meals and goals…</p>
      </div>
    );
  }
  return (
    <>
      {error && (
        <div className="progress-error summary-error" role="alert">
          <p>
            {error} {data && "Showing the last numbers loaded."}
          </p>
          <button className="text-link" onClick={() => refresh()}>
            Try again
          </button>
        </div>
      )}
      {data && (
        <div className="summary-row">
          <GoalsCard goals={data.goals} today={data.today} />
          <MealsCard nutrition={data.nutrition} />
        </div>
      )}
    </>
  );
}
