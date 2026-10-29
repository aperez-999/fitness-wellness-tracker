import { useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext.jsx";
import { getToken, getWellnessInsight } from "../lib/api.js";
import Icon from "./Icon.jsx";
import "./wellness-insight.css";

const topics = {
  consistency: { label: "Workout consistency", icon: "calendar" },
  trends: { label: "Activity trends", icon: "stats" },
  nutrition: { label: "Nutrition logging", icon: "nutrition" },
  goals: { label: "Goal progress", icon: "goals" },
};

function plural(count, word, words = `${word}s`) {
  return `${count} ${count === 1 ? word : words}`;
}

function basedOnText({ periodDays, workouts, nutritionEntries, activeGoals, completedGoals }) {
  const meals = plural(nutritionEntries, "nutrition entry", "nutrition entries");
  const goals = plural(activeGoals + completedGoals, "goal");
  return `Based on ${plural(workouts, "workout")}, ${meals}, and ${goals} from the last ${periodDays} days.`;
}

export default function WellnessInsight() {
  const { logout } = useAuth();
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const request = useRef(null);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = setTimeout(() => setRetrySeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [retrySeconds]);

  async function requestInsight() {
    if (request.current || retrySeconds > 0) return;
    const controller = new AbortController();
    request.current = controller;
    const token = getToken();
    setLoading(true);
    setError("");
    try {
      const data = await getWellnessInsight({ signal: controller.signal });
      if (controller.signal.aborted || token !== getToken()) return;
      setInsight(data);
    } catch (failure) {
      if (controller.signal.aborted || token !== getToken()) return;
      if (failure.status === 401) {
        logout();
        return;
      }
      if (failure.status === 429) setRetrySeconds(failure.retryAfterSeconds || 60);
      setError(failure.message);
    } finally {
      request.current = null;
      if (!controller.signal.aborted && token === getToken()) setLoading(false);
    }
  }

  const ready = insight?.status === "ready";
  const buttonLabel = loading
    ? "Writing your insight…"
    : retrySeconds > 0
      ? `Try again in ${retrySeconds}s`
      : ready
        ? "Refresh insight"
        : "Get my insight";

  return (
    <section className="wellness-insight" aria-labelledby="insight-title">
      <div className="insight-heading">
        <div>
          <p className="insight-eyebrow">
            <Icon name="sparkles" size={15} />
            AI wellness insight
          </p>
          <h2 id="insight-title">What your recent habits say</h2>
          <p>Built from your saved workouts, meals, and goals over the last four weeks.</p>
        </div>
        <button
          type="button"
          className="progress-button"
          onClick={requestInsight}
          disabled={loading || retrySeconds > 0}
          aria-busy={loading}
        >
          <Icon name="sparkles" size={17} />
          {buttonLabel}
        </button>
      </div>

      {error && (
        <p className="insight-error" role="alert">
          {error}
        </p>
      )}

      <div aria-live="polite">
        {insight?.status === "limited" && (
          <div className="insight-limited">
            <p>{insight.message}</p>
            <p className="insight-footnote">{basedOnText(insight.basedOn)}</p>
          </div>
        )}
        {ready && (
          <>
            <p className="insight-headline">{insight.headline}</p>
            <ul className="insight-observations">
              {insight.observations.map((observation) => (
                <li key={observation.topic}>
                  <span className="insight-topic">
                    <Icon name={topics[observation.topic].icon} size={16} />
                    {topics[observation.topic].label}
                  </span>
                  <p>{observation.text}</p>
                </li>
              ))}
            </ul>
            <p className="insight-footnote">
              {basedOnText(insight.basedOn)} Written by Google Gemini. General wellness information,
              not medical advice.
            </p>
          </>
        )}
      </div>

      {!insight && (
        <p className="insight-footnote">
          When you ask, a summary of your activity is sent to Google Gemini. Your notes and account
          details are never shared.
        </p>
      )}
    </section>
  );
}
