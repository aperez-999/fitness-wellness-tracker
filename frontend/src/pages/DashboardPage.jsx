import { Link } from "react-router-dom";

import PageCard from "../components/PageCard.jsx";
import PlaceholderPanel from "../components/PlaceholderPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const summaryCards = [
  { title: "Workouts", to: "/workouts", text: "Log exercise sessions" },
  { title: "Nutrition", to: "/nutrition", text: "Track meals and calories" },
  { title: "Goals", to: "/goals", text: "Monitor wellness targets" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const name = user?.displayName || user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-6">
      <PageCard
        title={`Welcome back, ${name}`}
        description="Use the sections below to track workouts, nutrition, and goals."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <h2 className="font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{card.text}</p>
            </Link>
          ))}
        </div>
      </PageCard>
      <PlaceholderPanel
        title="Recent activity"
        body="No entries yet. Workout and nutrition logging will populate this section in a future sprint."
      />
    </div>
  );
}
