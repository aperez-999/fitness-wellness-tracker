import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

import AuthLayout from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = location.state?.from || "/dashboard";

  if (!loading && isAuthenticated) return <Navigate to={redirectTo} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Could not sign in. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      description="Your workouts, right where you left them."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <fieldset disabled={submitting}>
          <FormField
            id="login-email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <FormField
            id="login-password"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="progress-button">
            {submitting ? "Signing in…" : "Log in"}
          </button>
        </fieldset>
      </form>
      <p className="auth-footer">
        New to Dayform?{" "}
        <Link to="/signup" state={location.state} className="text-link">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
