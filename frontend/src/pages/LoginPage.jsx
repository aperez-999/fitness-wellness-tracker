import { Link } from "react-router-dom";

import PageCard from "../components/PageCard.jsx";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <PageCard
        title="Log in"
        description="Authentication wiring is planned for Sprint 3. This page matches the wireframe layout."
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="you@example.com"
              disabled
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="••••••••"
              disabled
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white opacity-60"
            disabled
          >
            Log in (coming soon)
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          No account?{" "}
          <Link to="/signup" className="font-medium text-emerald-700">
            Sign up
          </Link>
        </p>
      </PageCard>
    </div>
  );
}
