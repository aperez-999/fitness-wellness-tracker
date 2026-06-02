import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { checkHealth } from "../lib/api.js";

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    checkHealth()
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          CIS 3950 Capstone
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Fitness & Wellness Tracker
        </h1>
        <p className="mt-4 text-slate-600">
          Starter template with planned navigation, documentation, and API
          health check. Authentication and data features arrive in Sprint 3.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          API status:{" "}
          <span
            className={
              apiStatus === "ok"
                ? "font-medium text-emerald-700"
                : apiStatus === "offline"
                  ? "font-medium text-rose-600"
                  : "font-medium text-amber-600"
            }
          >
            {apiStatus === "ok"
              ? "connected"
              : apiStatus === "offline"
                ? "offline (start backend)"
                : "checking..."}
          </span>
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign up
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View dashboard shell
          </Link>
        </div>
      </div>
    </div>
  );
}
