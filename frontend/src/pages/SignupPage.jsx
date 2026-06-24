import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";

import FormField from "../components/FormField.jsx";
import PageCard from "../components/PageCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

export default function SignupPage() {
  const { signup, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError("Password must be at least 8 characters and include 1 number and 1 symbol");
      return;
    }

    setSubmitting(true);

    try {
      await signup({ email, password, confirmPassword });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Could not create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <PageCard
        title="Create account"
        description="Your fitness data stays private to your account."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField
            id="signup-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <FormField
            id="signup-password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <FormField
            id="signup-confirm"
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-emerald-700">
            Log in
          </Link>
        </p>
      </PageCard>
    </div>
  );
}
