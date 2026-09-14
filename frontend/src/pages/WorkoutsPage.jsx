import { useEffect, useState } from "react";

import PageCard from "../components/PageCard.jsx";
import { createWorkout, getWorkouts } from "../lib/api.js";

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadWorkouts() {
    try {
      const data = await getWorkouts();
      setWorkouts(data.workouts);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadWorkouts();
  }, []);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const { workout } = await createWorkout(form);

      setWorkouts((current) => [workout, ...current]);

      setForm({
        name: "",
        date: new Date().toISOString().slice(0, 10),
        durationMinutes: "",
        notes: "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageCard
        title="Workouts"
        description="Log a workout and view your recent activity."
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Workout name"
            required
            className="rounded border p-2"
          />

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            className="rounded border p-2"
          />

          <input
            type="number"
            name="durationMinutes"
            value={form.durationMinutes}
            onChange={handleChange}
            placeholder="Duration in minutes"
            min="0"
            className="rounded border p-2"
          />

          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Notes"
            className="rounded border p-2"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-emerald-600 px-4 py-2 text-white"
          >
            {saving ? "Saving..." : "Add Workout"}
          </button>
        </form>
      </PageCard>

      <PageCard
        title="Recent Workouts"
        description="Your saved workouts."
      >
        {workouts.length === 0 ? (
          <p className="text-sm text-slate-600">
            No workouts logged yet.
          </p>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <div
                key={workout._id}
                className="rounded border border-slate-200 p-4"
              >
                <h3 className="font-semibold">
                  {workout.name}
                </h3>

                <p className="text-sm text-slate-600">
                  {new Date(workout.date).toLocaleDateString()}
                  {workout.durationMinutes
                    ? ` · ${workout.durationMinutes} min`
                    : ""}
                </p>

                {workout.notes && (
                  <p className="mt-2 text-sm">
                    {workout.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </PageCard>
    </div>
  );
}